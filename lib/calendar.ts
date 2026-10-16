import type {CalendarEvent} from "./calendar-types";
export const MONTHS=["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];
// Paleta do calendário acadêmico de referência da Avaliação NAP.
export const MODULE_COLORS:Record<string,string>={"51":"#CFE2F3","52":"#FCE5CD","53":"#D9EAD3","54":"#FFF2CC",Geral:"#94a3b8"};
export const EXAM_COLORS:Record<string,string>={"51":"#00B0F0","52":"#C55A11","53":"#A8D08D","54":"#FFD965"};
export const SUBSTITUTE_EXAM_COLOR="#CC66FF";
export const NOTE_RELEASE_COLOR="#0070C0";
export const moduleColor=(module:string,colors:Record<string,string>=MODULE_COLORS)=>colors[module]||MODULE_COLORS[module]||"#94a3b8";
export function moduleContrast(color:string){const rgb=[1,3,5].map(index=>parseInt(color.slice(index,index+2),16)/255).map(value=>value<=.04045?value/12.92:((value+.055)/1.055)**2.4);return rgb[0]*.2126+rgb[1]*.7152+rgb[2]*.0722>.179?"#111827":"#ffffff";}
export const CATEGORIES=["Disciplinas 1 e 2","Disciplina 3","Notas e gabaritos","Publicação de notas","Cancelamento de questão"];
export const dateISO=(y:number,m:number,d:number)=>`${y}-${String(m+1).padStart(2,"0")}-${String(d).padStart(2,"0")}`;
export const br=(date:string,year=true)=>date?`${date.slice(8,10)}/${date.slice(5,7)}${year?`/${date.slice(0,4)}`:""}`:"—";
export const daysBetween=(a:string,b:string)=>Math.round((Date.parse(b+"T12:00:00Z")-Date.parse(a+"T12:00:00Z"))/86400000);
export const status=(e:CalendarEvent,today:string)=>e.start>today?"Previsto":e.end<today?"Prazo encerrado":"Em andamento";
export const periodProgress=(e:CalendarEvent,today:string)=>today?Math.max(0,Math.min(100,Math.round(daysBetween(e.start,today)/Math.max(1,daysBetween(e.start,e.end))*100))):0;
export function deadlineProgress(event:Pick<CalendarEvent,"start"|"end">,today:string){
  const single=event.start===event.end;
  if(!today)return{value:0,label:"Carregando data",single};
  if(today<event.start){
    const days=daysBetween(today,event.start);
    return{value:0,label:single?"":`Começa em ${days} ${days===1?"dia":"dias"}`,single};
  }
  if(today>event.end)return{value:100,label:single?"Data encerrada":"Prazo encerrado",single};
  if(single)return{value:0,label:"Hoje",single};
  const remaining=daysBetween(today,event.end);
  const value=Math.max(0,Math.min(100,Math.round(daysBetween(event.start,today)/daysBetween(event.start,event.end)*100)));
  return{value,label:remaining===0?"Termina hoje":today===event.start?"Começa hoje":`${remaining} ${remaining===1?"dia restante":"dias restantes"}`,single};
}
export const upcomingEvents=(events:CalendarEvent[],today:string)=>events.filter(e=>e.kind!=="period"&&(!today||e.end>=today)).map(e=>({...e,target:today&&e.start<today?e.end:e.start})).sort((a,b)=>a.target.localeCompare(b.target)||a.title.localeCompare(b.title)).slice(0,7);
export const isCalendarDate=(value:string)=>/^\d{4}-\d{2}-\d{2}$/.test(value)&&Number.isFinite(Date.parse(`${value}T12:00:00Z`))&&new Date(`${value}T12:00:00Z`).toISOString().slice(0,10)===value;
export const normalize=(s:string)=>s.normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase();
export function todayBR(){const p=new Intl.DateTimeFormat("en-CA",{timeZone:"America/Sao_Paulo",year:"numeric",month:"2-digit",day:"2-digit"}).formatToParts(new Date());return`${p.find(x=>x.type==="year")?.value}-${p.find(x=>x.type==="month")?.value}-${p.find(x=>x.type==="day")?.value}`;}
export function monthDays(y:number,m:number){const offset=new Date(Date.UTC(y,m,1)).getUTCDay(),count=new Date(Date.UTC(y,m+1,0)).getUTCDate();return Array.from({length:42},(_,i)=>i<offset||i>=offset+count?null:dateISO(y,m,i-offset+1));}

// A grade começa no domingo, como a planilha. Uma semana pode aparecer em dois meses.
export function moduleWeeksForRow(dates:(string|null)[],events:CalendarEvent[],selectedModule="all"){
  const first=dates.find((date):date is string=>!!date);if(!first)return[];
  const sunday=(date:string)=>{const d=new Date(`${date}T12:00:00Z`);d.setUTCDate(d.getUTCDate()-d.getUTCDay());return d.toISOString().slice(0,10);};
  const start=sunday(first),endDate=new Date(`${start}T12:00:00Z`);endDate.setUTCDate(endDate.getUTCDate()+6);
  const end=endDate.toISOString().slice(0,10);
  return events.filter(event=>event.kind==="period"&&(selectedModule==="all"||event.module===selectedModule)&&event.start<=end&&event.end>=start).map(event=>({module:event.module,number:Math.floor(daysBetween(sunday(event.start),start)/7)+1,start,end}));
}

export function eventsForAcademicYear(events:CalendarEvent[],year:number){
  const begin=`${year}-01-01`,end=`${year}-12-31`;
  return events.filter(event=>event.end>=begin&&(event.start<=end||event.module==="54"));
}

export function calendarMonthsForEvents(events:CalendarEvent[],fullYear?:number){
  if(!events.length&&fullYear===undefined)return[];
  const first=events.reduce((date,event)=>event.start<date?event.start:date,fullYear===undefined?events[0].start:`${fullYear}-01-01`);
  const last=events.reduce((date,event)=>event.end>date?event.end:date,fullYear===undefined?events[0].end:`${fullYear}-12-31`);
  const firstMonth=Number(first.slice(0,4))*12+Number(first.slice(5,7))-1;
  const lastMonth=Number(last.slice(0,4))*12+Number(last.slice(5,7))-1;
  return Array.from({length:lastMonth-firstMonth+1},(_,index)=>{
    const value=firstMonth+index,year=Math.floor(value/12),month=value%12;
    return{year,month,key:dateISO(year,month,1).slice(0,7)};
  });
}

export function moduleInFocus(events:CalendarEvent[],today:string){
  const periods=events.filter(event=>event.kind==="period").sort((a,b)=>a.start.localeCompare(b.start));
  // Nas pausas entre módulos, apresenta o próximo; após o ciclo, mantém o último.
  return (periods.find(event=>event.start<=today&&event.end>=today)
    ||periods.find(event=>event.start>today)
    ||periods[periods.length-1])?.module;
}

export type GanttPeriod={event:CalendarEvent;left:number;width:number;lane:number;clippedStart:string;clippedEnd:string};
export type GanttRow={key:string;title:string;category:string;periods:GanttPeriod[];lanes:number};
export function ganttRange(year:number,lastDate=`${year}-12-31`,firstDate?:string){
  const begin=firstDate?`${firstDate.slice(0,7)}-01`:`${year}-01-01`,last=firstDate?lastDate:lastDate>`${year}-12-31`?lastDate:`${year}-12-31`;
  const end=new Date(Date.UTC(Number(last.slice(0,4)),Number(last.slice(5,7)),0)).toISOString().slice(0,10);
  return{begin,end,total:daysBetween(begin,end)+1};
}
export function ganttMonths(year:number,lastDate=`${year}-12-31`,firstDate?:string){
  const{begin,end,total}=ganttRange(year,lastDate,firstDate),firstMonth=Number(begin.slice(5,7))-1,firstYear=Number(begin.slice(0,4)),count=(Number(end.slice(0,4))-firstYear)*12+Number(end.slice(5,7))-firstMonth;
  return Array.from({length:count},(_,index)=>{
    const month=(firstMonth+index)%12,monthYear=firstYear+Math.floor((firstMonth+index)/12),key=dateISO(monthYear,month,1);
    return{key,name:MONTHS[month],year:monthYear,left:daysBetween(begin,key)/total*100,width:new Date(Date.UTC(monthYear,month+1,0)).getUTCDate()/total*100};
  });
}
export function ganttRows(events:CalendarEvent[],year:number,lastDate=`${year}-12-31`,firstDate?:string):GanttRow[]{
  const{begin,end,total}=ganttRange(year,lastDate,firstDate),groups=new Map<string,CalendarEvent[]>();
  for(const event of events){if(event.start>end||event.end<begin)continue;const key=`${event.category}::${event.title}`;groups.set(key,[...(groups.get(key)||[]),event]);}
  return Array.from(groups,([key,items])=>{
    const laneEnds:string[]=[];
    const periods=items.slice().sort((a,b)=>a.start.localeCompare(b.start)||a.end.localeCompare(b.end)||a.module.localeCompare(b.module)).map(event=>{
      const clippedStart=event.start<begin?begin:event.start,clippedEnd=event.end>end?end:event.end;
      let lane=laneEnds.findIndex(last=>last<clippedStart);if(lane<0)lane=laneEnds.length;laneEnds[lane]=clippedEnd;
      return{event,left:daysBetween(begin,clippedStart)/total*100,width:(daysBetween(clippedStart,clippedEnd)+1)/total*100,lane,clippedStart,clippedEnd};
    });
    return{key,title:items[0].title,category:items[0].category,periods,lanes:laneEnds.length};
  });
}
