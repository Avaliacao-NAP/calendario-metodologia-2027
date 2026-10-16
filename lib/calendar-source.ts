import * as XLSX from "xlsx";
import type {CalendarData,CalendarEvent,CalendarMark} from "./calendar-types";
import {MODULE_COLORS} from "./calendar.ts";

// Mesmo arquivo público usado no calendário acadêmico de referência.
export const SOURCE_ID="1AKTNmWtD7JsYijMohQ0-K7sdyng3FYgo";
export const SOURCE_DOWNLOAD=`https://drive.usercontent.google.com/download?id=${SOURCE_ID}&export=download`;
const normalized=(v:unknown)=>String(v??"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase().replace(/[_\s]+/g," ").trim();
const clean=(v:unknown)=>String(v??"").replace(/\s+/g," ").trim();
function dateValue(cell:XLSX.CellObject|undefined,location:string):string{
  const value=cell?.v;let result:string;
  if(typeof value==="number"){
    if(!Number.isFinite(value))throw new Error(`Data inválida: ${location}`);
    result=new Date(Date.UTC(1899,11,30)+Math.floor(value)*86400000).toISOString().slice(0,10);
  }else if(value instanceof Date)result=value.toISOString().slice(0,10);
  else{
    const s=clean(value),match=s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    result=match?`${match[3]}-${match[2].padStart(2,"0")}-${match[1].padStart(2,"0")}`:s;
  }
  if(!/^\d{4}-\d{2}-\d{2}$/.test(result)||!Number.isFinite(Date.parse(result+"T12:00:00Z"))||new Date(result+"T12:00:00Z").toISOString().slice(0,10)!==result)throw new Error(`Data ausente ou inválida: ${location}`);
  return result;
}
function numeric(cell:XLSX.CellObject|undefined,location:string){if(typeof cell?.v!=="number"||!Number.isFinite(cell.v))throw new Error(`Nota ausente ou inválida: ${location}`);return cell.v;}
const dayRange=(start:string,end:string)=>Array.from({length:Math.round((Date.parse(end)-Date.parse(start))/86400000)+1},(_,i)=>new Date(Date.parse(start+"T12:00:00Z")+i*86400000).toISOString().slice(0,10));

export function parseWorkbook(bytes:ArrayBuffer|Uint8Array,fetchedAt=new Date().toISOString()):CalendarData{
  // Não lê valores, datas ou cores da aba Calendário Acadêmico 2027.
  const names=XLSX.read(bytes,{type:"array",bookSheets:true}).SheetNames;
  const selected=names.filter(name=>/^calendario metodologia \d+[./]\d{4}$/.test(normalized(name)));
  if(selected.length!==4)throw new Error("As quatro abas de metodologia não foram encontradas. A última leitura foi preservada.");
  const workbook=XLSX.read(bytes,{type:"array",cellStyles:true,cellDates:false,sheets:selected});
  const events:CalendarEvent[]=[],marks:CalendarMark[]=[],modules:string[]=[];
  let academicYear=0;
  const addMark=(e:CalendarEvent,color:string)=>{if(e.highlight)for(const date of dayRange(e.start,e.end))marks.push({date,kind:e.highlight,label:e.title,color,module:e.module,sourceCell:e.id});};
  for(const name of selected){
    const match=normalized(name).match(/(\d+)[./](\d{4})$/)!;const module=match[1],year=Number(match[2]);
    if(academicYear&&academicYear!==year)throw new Error("Anos divergentes nas abas de metodologia.");academicYear=year;modules.push(module);
    const sheet=workbook.Sheets[name],at=(c:string)=>sheet[c];
    if(normalized(at("B3")?.v)!=="atividade"||normalized(at("D3")?.v)!=="inicio"||normalized(at("E3")?.v)!=="fim"||normalized(at("B11")?.v)!=="atividade")throw new Error(`Estrutura alterada em ${name}.`);
    const regular:CalendarEvent[]=[];
    for(const row of [4,5,6,7,8,9,12,13]){
      const group=row>=12?"Disciplina 3":"Disciplinas 1 e 2",raw=clean(at(`B${row}`)?.v);
      if(!raw)throw new Error(`Atividade ausente em ${name}, linha ${row}.`);
      const n=normalized(raw),sub=/sub/.test(n),exam=/prova/.test(n);
      const title=raw.replace(/^ATIVIDADE DE ESTUDO/,'Atividade de Estudo').replace(/^HUB DE ATUALIDADES/,'HUB de Atualidades').replace(/^PROVA SUB PRESENCIAL \(POLO\)/,'Prova SUB presencial (polo)').replace(/^PROVA PRESENCIAL \(POLO\)/,'Prova presencial (polo)').replace(/^MAPA SUBSTITUTIVO/,'MAPA substitutivo')+(row>=12?' · Disciplina 3':'');
      const start=dateValue(at(`D${row}`),`${name}!D${row}`),end=dateValue(at(`E${row}`),`${name}!E${row}`);
      if(start>end)throw new Error(`Período inválido em ${name}, linha ${row}.`);
      const type=clean(at(`C${row}`)?.v);if(!type)throw new Error(`Tipo ausente em ${name}, linha ${row}.`);
      const event:CalendarEvent={id:`${module}-activity-${row}`,title,category:group,module,start,end,sourceCell:`B${row}:G${row}`,sourceText:raw,sourceSheet:name,kind:"activity",group,assessmentType:type,grade:numeric(at(`F${row}`),`${name}!F${row}`),total:numeric(at(`G${row<9?4:row}`),`${name}!G${row<9?4:row}`),...(sub?{highlight:"substitute"}:exam?{highlight:"exam"}:{})};
      events.push(event);if(row<=8)regular.push(event);
      const sourceColor=(at(`B${row}`)?.s as {fgColor?:{rgb?:string}})?.fgColor?.rgb?.slice(-6);
      addMark(event,sub&&sourceColor&&/^[0-9a-f]{6}$/i.test(sourceColor)?`#${sourceColor}`:MODULE_COLORS[module]||"#60a5fa");
    }
    for(const row of [2,3,4,5,6,8,12,13]){
      const raw=clean(at(`I${row}`)?.v);if(!raw)throw new Error(`Liberação ausente em ${name}, linha ${row}.`);
      const date=dateValue(at(`J${row}`),`${name}!J${row}`),group=row>=12?"Disciplina 3":"Disciplinas 1 e 2";
      const publication=row===8,cancel=row===6;
      const activity=raw.replace(/\s*\(LIBERAÇÃO DE NOTA E GABARITO\)/i,'').replace('HUB DE ATUALIDADES','HUB de Atualidades').replace('MAPA SUBSTITUTIVO','MAPA substitutivo');
      const title=publication?'Publicação de notas':cancel?'Cancelamento de questão':`${row>=3&&row<=5?'Nota e gabarito':'Liberação de nota'} · ${activity}${row>=12?' · Disciplina 3':''}`;
      const event:CalendarEvent={id:`${module}-release-${row}`,title,category:cancel?'Cancelamento de questão':publication?'Publicação de notas':'Notas e gabaritos',module,start:date,end:date,sourceCell:`I${row}:J${row}`,sourceText:raw,sourceSheet:name,kind:"activity",group,...(!cancel?{highlight:"results"}:{})};
      events.push(event);addMark(event,publication?'#38bdf8':'#67e8f9');
    }
    // Intervalo de atividades regulares, derivado exclusivamente da metodologia.
    events.push({id:`${module}-period`,title:"Atividades regulares",category:"Períodos de atividades",module,start:regular.reduce((d,e)=>e.start<d?e.start:d,regular[0].start),end:regular.reduce((d,e)=>e.end>d?e.end:d,regular[0].end),sourceCell:"D4:E8",sourceText:"Atividades regulares",sourceSheet:name,kind:"period"});
  }
  modules.sort();if(modules.join(',')!=='51,52,53,54')throw new Error("Módulos de metodologia divergentes.");
  const years=[...new Set([academicYear,...events.flatMap(e=>[Number(e.start.slice(0,4)),Number(e.end.slice(0,4))])])].sort();
  return {title:`Calendário Metodologia ${academicYear}`,sheetName:selected.join('; '),academicYear,years,modules,moduleColors:MODULE_COLORS,events,marks,notes:[],warnings:[],version:"",fetchedAt};
}

export async function fetchCalendar(signal?:AbortSignal):Promise<CalendarData>{
  const response=await fetch(SOURCE_DOWNLOAD+`&t=${Math.floor(Date.now()/10000)}`,{cache:"no-store",credentials:"omit",signal});
  if(!response.ok)throw new Error(`A planilha respondeu com erro ${response.status}.`);
  const bytes=await response.arrayBuffer();if(bytes.byteLength>8*1024*1024)throw new Error("A planilha excedeu o limite de leitura.");
  const header=new Uint8Array(bytes,0,Math.min(bytes.byteLength,2));if(header[0]!==80||header[1]!==75)throw new Error("O arquivo não ficou disponível para atualização.");
  const data=parseWorkbook(bytes),stable=JSON.stringify({...data,version:undefined,fetchedAt:undefined});
  const digest=await crypto.subtle.digest("SHA-256",new TextEncoder().encode(stable));data.version=Array.from(new Uint8Array(digest)).map(b=>b.toString(16).padStart(2,"0")).join("");return data;
}
