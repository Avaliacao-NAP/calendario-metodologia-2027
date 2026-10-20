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

type ActivityTable={row:number;column:number;group:string};
const groupName=(value:unknown)=>{
  const name=normalized(value);
  return /^disciplinas? 0?1 e 0?2$/.test(name)?"Disciplinas 1 e 2":/^disciplinas? 0?3$/.test(name)?"Disciplina 3":undefined;
};
const displayActivity=(value:string)=>value
  .replace(/^ATIVIDADE DE ESTUDO/i,"Atividade de Estudo")
  .replace(/^HUB DE ATUALIDADES/i,"HUB de Atualidades")
  .replace(/^PROVA SUB PRESENCIAL \(POLO\)/i,"Prova SUB presencial (polo)")
  .replace(/^PROVA PRESENCIAL \(POLO\)/i,"Prova presencial (polo)")
  .replace(/^MAPA SUBSTITUTIVO/i,"MAPA substitutivo");
const eventKey=(module:string,kind:string,group:string,title:string)=>
  [module,kind,group==="Disciplina 3"?"portfolio":"regular",normalized(title).replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"")].join("-");

export function parseWorkbook(bytes:ArrayBuffer|Uint8Array,fetchedAt=new Date().toISOString()):CalendarData{
  // Apenas as abas de metodologia; títulos e seções definem as posições das tabelas.
  const names=XLSX.read(bytes,{type:"array",bookSheets:true}).SheetNames;
  const selected=names.filter(name=>/^calendario metodologia \d+[./]\d{4}$/.test(normalized(name)));
  if(selected.length!==4)throw new Error("As quatro abas de metodologia não foram encontradas. A última leitura foi preservada.");
  const workbook=XLSX.read(bytes,{type:"array",cellStyles:true,cellDates:false,sheets:selected});
  const events:CalendarEvent[]=[],marks:CalendarMark[]=[],modules:string[]=[];
  let academicYear=0;
  const addMark=(event:CalendarEvent,color:string)=>{
    if(event.highlight)for(const date of dayRange(event.start,event.end))
      marks.push({date,kind:event.highlight,label:event.title,color,module:event.module,sourceCell:event.id});
  };
  const addEvent=(event:CalendarEvent)=>{
    if(events.some(item=>item.id===event.id))throw new Error("Atividade ou data duplicada em "+event.sourceSheet+": "+event.sourceText+".");
    events.push(event);
  };
  for(const name of selected){
    const match=normalized(name).match(/(\d+)[./](\d{4})$/)!;
    const module=match[1],year=Number(match[2]);
    if(academicYear&&academicYear!==year)throw new Error("Anos divergentes nas abas de metodologia.");
    academicYear=year;modules.push(module);
    const sheet=workbook.Sheets[name],range=XLSX.utils.decode_range(sheet["!ref"]||"A1");
    const address=(column:number,row:number)=>XLSX.utils.encode_cell({c:column,r:row});
    const at=(column:number,row:number,merged=false):XLSX.CellObject|undefined=>{
      const cell=sheet[address(column,row)];
      if(cell?.v!==undefined||!merged)return cell;
      const area=sheet["!merges"]?.find(item=>item.s.c<=column&&item.e.c>=column&&item.s.r<=row&&item.e.r>=row);
      return area?sheet[address(area.s.c,area.s.r)]:cell;
    };
    const tables:ActivityTable[]=[],releaseHeaders:{row:number;column:number}[]=[];
    for(let row=range.s.r;row<=range.e.r;row++)for(let column=range.s.c;column<=range.e.c;column++){
      const label=normalized(at(column,row)?.v);
      if(label==="atividade"){
        const fields=[0,1,2,3,4,5].map(offset=>normalized(at(column+offset,row)?.v));
        if(fields[1]!=="tipo"||fields[2]!=="inicio"||!["fim","termino"].includes(fields[3])||fields[4]!=="nota"||fields[5]!=="total")
          throw new Error("Cabeçalho de atividades inválido em "+name+"!"+address(column,row)+".");
        const group=groupName(at(column-1,row,true)?.v);
        if(!group)throw new Error("Disciplina não identificada em "+name+"!"+address(column,row)+".");
        tables.push({row,column,group});
      }
      if(/^liberacao de notas?$/.test(label))releaseHeaders.push({row,column});
    }
    if(tables.length!==2||new Set(tables.map(table=>table.group)).size!==2||releaseHeaders.length!==2)
      throw new Error("As duas tabelas de disciplinas e de liberação de notas não foram encontradas em "+name+".");
    const regular:CalendarEvent[]=[];
    for(let index=0;index<tables.length;index++){
      const table=tables[index],lastRow=(tables[index+1]?.row??range.e.r+1)-1;
      const items:CalendarEvent[]=[];
      let sectionTotal:XLSX.CellObject|undefined;
      for(let row=table.row+1;row<=lastRow;row++){
        const cells=[0,1,2,3,4,5].map(offset=>at(table.column+offset,row));
        if(cells.every(cell=>clean(cell?.v)===""))continue;
        const raw=clean(cells[0]?.v),type=clean(cells[1]?.v);
        if(!raw||!type)throw new Error("Atividade ou tipo ausente em "+name+", linha "+(row+1)+".");
        const key=normalized(raw),sub=/\bsub(?:\b|stitut)/.test(key),exam=/\bprova\b/.test(key);
        const start=dateValue(cells[2],name+"!"+address(table.column+2,row));
        const end=dateValue(cells[3],name+"!"+address(table.column+3,row));
        if(start>end)throw new Error("Período inválido em "+name+", linha "+(row+1)+".");
        const totalCell=at(table.column+5,row,true);
        if(clean(totalCell?.v)!=="")sectionTotal=totalCell;
        const grade=numeric(cells[4],name+"!"+address(table.column+4,row));
        const total=numeric(sectionTotal,name+"!"+address(table.column+5,row));
        if(grade<0||total<=0||grade>total)throw new Error("Nota fora do total da disciplina em "+name+", linha "+(row+1)+".");
        const title=displayActivity(raw)+(table.group==="Disciplina 3"?" · Disciplina 3":"");
        const event:CalendarEvent={
          id:eventKey(module,"activity",table.group,raw),title,category:table.group,module,start,end,
          sourceCell:address(table.column,row)+":"+address(table.column+5,row),sourceText:raw,sourceSheet:name,
          kind:"activity",group:table.group,assessmentType:type,grade,total,
          ...(sub?{highlight:"substitute"}:exam?{highlight:"exam"}:{})
        };
        addEvent(event);items.push(event);
        if(table.group==="Disciplinas 1 e 2"&&!sub)regular.push(event);
        const sourceColor=(cells[0]?.s as {fgColor?:{rgb?:string}})?.fgColor?.rgb?.slice(-6);
        addMark(event,sub&&sourceColor&&/^[0-9a-f]{6}$/i.test(sourceColor)?"#"+sourceColor:MODULE_COLORS[module]||"#60a5fa");
      }
      const curricular=items.filter(event=>event.highlight!=="substitute");
      if(!curricular.length)throw new Error("Tabela sem atividades curriculares em "+name+": "+table.group+".");
      const total=curricular[0].total!;
      if(curricular.some(event=>event.total!==total)||Math.abs(curricular.reduce((sum,event)=>sum+event.grade!,0)-total)>.001)
        throw new Error("A soma das notas difere do total em "+name+": "+table.group+".");
    }
    for(let index=0;index<releaseHeaders.length;index++){
      const header=releaseHeaders[index],group=tables[index].group;
      if(header.column<=tables[index].column+5)throw new Error("Tabela de liberação de notas inválida em "+name+".");
      const lastRow=(releaseHeaders[index+1]?.row??range.e.r+1)-1;
      let count=0;
      for(let row=header.row+1;row<=lastRow;row++){
        const raw=clean(at(header.column,row)?.v),dateCell=at(header.column+1,row);
        if(!raw&&clean(dateCell?.v)==="")continue;
        if(!raw)throw new Error("Descrição de liberação ausente em "+name+", linha "+(row+1)+".");
        const date=dateValue(dateCell,name+"!"+address(header.column+1,row)),key=normalized(raw);
        const publication=/^publicacao de notas?\b/.test(key),cancel=/^cancelamento de questao\b/.test(key);
        const activity=displayActivity(raw.replace(/\s*\(LIBERAÇÃO DE NOTA E GABARITO\)/i,""));
        const title=publication?"Publicação de notas":cancel?"Cancelamento de questão":
          (/gabarito/.test(key)?"Nota e gabarito":"Liberação de nota")+" · "+activity+(group==="Disciplina 3"?" · Disciplina 3":"");
        const event:CalendarEvent={
          id:eventKey(module,"release",group,raw),title,category:cancel?"Cancelamento de questão":publication?"Publicação de notas":"Notas e gabaritos",
          module,start:date,end:date,sourceCell:address(header.column,row)+":"+address(header.column+1,row),
          sourceText:raw,sourceSheet:name,kind:"activity",group,...(!cancel?{highlight:"results"}:{})
        };
        addEvent(event);addMark(event,publication?"#38bdf8":"#67e8f9");count++;
      }
      if(!count)throw new Error("Tabela de liberação sem datas em "+name+": "+group+".");
    }
    addEvent({
      id:module+"-period",title:"Atividades regulares",category:"Períodos de atividades",module,
      start:regular.reduce((date,event)=>event.start<date?event.start:date,regular[0].start),
      end:regular.reduce((date,event)=>event.end>date?event.end:date,regular[0].end),
      sourceCell:regular.map(event=>event.sourceCell).join("; "),sourceText:"Atividades regulares",sourceSheet:name,kind:"period"
    });
  }
  modules.sort();
  if(modules.join(",")!=="51,52,53,54")throw new Error("Módulos de metodologia divergentes.");
  const years=[...new Set([academicYear,...events.flatMap(event=>[Number(event.start.slice(0,4)),Number(event.end.slice(0,4))])])].sort();
  return{title:"Calendário Metodologia "+academicYear,sheetName:selected.join("; "),academicYear,years,modules,moduleColors:MODULE_COLORS,events,marks,notes:[],warnings:[],version:"",fetchedAt};
}

export async function fetchCalendar(signal?:AbortSignal):Promise<CalendarData>{
  const response=await fetch(SOURCE_DOWNLOAD+`&t=${Math.floor(Date.now()/10000)}`,{cache:"no-store",credentials:"omit",signal});
  if(!response.ok)throw new Error(`A planilha respondeu com erro ${response.status}.`);
  const bytes=await response.arrayBuffer();if(bytes.byteLength>8*1024*1024)throw new Error("A planilha excedeu o limite de leitura.");
  const header=new Uint8Array(bytes,0,Math.min(bytes.byteLength,2));if(header[0]!==80||header[1]!==75)throw new Error("O arquivo não ficou disponível para atualização.");
  const data=parseWorkbook(bytes),stable=JSON.stringify({...data,version:undefined,fetchedAt:undefined});
  const digest=await crypto.subtle.digest("SHA-256",new TextEncoder().encode(stable));data.version=Array.from(new Uint8Array(digest)).map(b=>b.toString(16).padStart(2,"0")).join("");return data;
}
