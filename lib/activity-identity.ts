import type {CSSProperties} from "react";
import type {CalendarEvent} from "./calendar-types";
import {moduleColor,moduleContrast} from "./calendar";

type ActivityEvent=Pick<CalendarEvent,"title"|"category"|"kind">;
export type ActivityIconName="mapa"|"study"|"hub"|"exam"|"publication"|"cancel"|"period";
export type ActivityIdentity={id:string;shortLabel:string;icon:ActivityIconName};

// O símbolo identifica a família; as atividades usam a identidade do módulo.
const IDENTITIES:Record<string,ActivityIdentity>={
  mapa:{id:"mapa",shortLabel:"MAPA",icon:"mapa"},
  ae1:{id:"ae1",shortLabel:"AE1",icon:"study"},
  ae2:{id:"ae2",shortLabel:"AE2",icon:"study"},
  hub:{id:"hub",shortLabel:"HUB",icon:"hub"},
  exam:{id:"exam",shortLabel:"Prova",icon:"exam"},
  "sub-exam":{id:"sub-exam",shortLabel:"Prova SUB",icon:"exam"},
  "mapa-three":{id:"mapa-three",shortLabel:"MAPA D3",icon:"mapa"},
  "sub-mapa":{id:"sub-mapa",shortLabel:"MAPA SUB",icon:"mapa"},
  "result-mapa":{id:"result-mapa",shortLabel:"Nota MAPA",icon:"mapa"},
  "result-ae1":{id:"result-ae1",shortLabel:"Nota AE1",icon:"study"},
  "result-ae2":{id:"result-ae2",shortLabel:"Nota AE2",icon:"study"},
  "result-hub":{id:"result-hub",shortLabel:"Nota HUB",icon:"hub"},
  "result-mapa-three":{id:"result-mapa-three",shortLabel:"Nota MAPA D3",icon:"mapa"},
  "result-sub-mapa":{id:"result-sub-mapa",shortLabel:"Nota MAPA SUB",icon:"mapa"},
  publication:{id:"publication",shortLabel:"Publicação",icon:"publication"},
  cancel:{id:"cancel",shortLabel:"Cancelamento",icon:"cancel"},
  period:{id:"period",shortLabel:"Período regular",icon:"period"},
};

export function activityIdentity(event:ActivityEvent):ActivityIdentity{
  const title=event.title.normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase();
  if(event.kind==="period")return IDENTITIES.period;
  if(title.includes("publicacao de notas"))return IDENTITIES.publication;
  if(title.includes("cancelamento"))return IDENTITIES.cancel;
  const third=title.includes("disciplina 3")||event.category==="Disciplina 3";
  const result=event.category==="Notas e gabaritos"||title.includes("liberacao de nota")||title.includes("nota e gabarito");
  let key="";
  if(title.includes("mapa"))key=title.includes("substitutivo")?"sub-mapa":third?"mapa-three":"mapa";
  else if(/(?:estudo\s*1|ae\s*1)/.test(title))key="ae1";
  else if(/(?:estudo\s*2|ae\s*2)/.test(title))key="ae2";
  else if(title.includes("hub"))key="hub";
  else if(title.includes("prova"))key=title.includes("sub")?"sub-exam":"exam";
  return IDENTITIES[result?`result-${key}`:key]||{...IDENTITIES.period,id:title,shortLabel:event.title};
}

export function activityStyle(event:Pick<CalendarEvent,"module">,colors:Record<string,string>):CSSProperties{
  const color=moduleColor(event.module,colors);
  return{"--module-color":color,"--module-contrast":moduleContrast(color)} as CSSProperties;
}
