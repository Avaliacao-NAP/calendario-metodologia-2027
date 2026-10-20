import type {CalendarData,CalendarEvent} from "./calendar-types";
import {daysBetween} from "./calendar.ts";

export type ModelRow={name:string;type?:string;start:number;end:number;points?:number;course?:boolean;tone:"course"|"mapa"|"study"|"hub"|"exam"};

export function buildMethodologyModel(data:CalendarData){
  const events=data.events.filter(event=>event.module===data.modules[0]);
  const period=events.find(event=>event.kind==="period");
  if(!period)return null;
  const graded=events.filter(event=>typeof event.grade==="number");
  const curricular=graded.filter(event=>event.highlight!=="substitute");
  const regular=curricular.filter(event=>event.group==="Disciplinas 1 e 2");
  const portfolio=curricular.filter(event=>event.group==="Disciplina 3");
  if(!regular.length||!portfolio.length)return null;
  const week=(date:string)=>Math.max(1,Math.floor(daysBetween(period.start,date)/7)+1);
  const weeks=week(period.end);
  const row=(event:CalendarEvent):ModelRow=>{
    const name=event.title.replace(/ · Disciplina 3$/,"");
    const tone:ModelRow["tone"]=event.highlight==="exam"?"exam":/^MAPA/i.test(name)?"mapa":/^HUB/i.test(name)?"hub":"study";
    return{name:tone==="exam"?"Prova curricular":name,
      type:tone==="exam"?"Presencial no polo":event.assessmentType==="DIS"?"Anexo":event.assessmentType==="OBJ"?"Objetiva":event.assessmentType,
      start:week(event.start),end:week(event.end),points:event.grade,tone};
  };
  const course=(name:string):ModelRow=>({name,start:1,end:weeks,course:true,tone:"course"});
  return{
    weeks,
    normal:[course("Disciplina 1"),course("Disciplina 2"),...regular.map(row)],
    portfolio:[course("Disciplina 3"),...portfolio.map(row)],
    regularTotal:regular[0].total??regular.reduce((sum,event)=>sum+event.grade!,0),
    portfolioTotal:portfolio[0].total??portfolio.reduce((sum,event)=>sum+event.grade!,0),
    portfolioSubstitute:graded.find(event=>event.group==="Disciplina 3"&&event.highlight==="substitute")?.grade
  };
}
