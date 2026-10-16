import {EXAM_COLORS,NOTE_RELEASE_COLOR,SUBSTITUTE_EXAM_COLOR,moduleColor} from "@/lib/calendar";
import {activityIdentity} from "@/lib/activity-identity";
import type {CalendarEvent} from "@/lib/calendar-types";

type LegendItem={label:string;color:string};

function LegendGroup({title,items}:{title:string;items:LegendItem[]}){
  if(!items.length)return null;
  return <div className="calendar-legend-group"><h4>{title}</h4><ul>{items.map(item=><li key={item.label}><span className="calendar-legend-swatch" style={{backgroundColor:item.color}} aria-hidden="true"/><span>{item.label}</span></li>)}</ul></div>;
}

export default function CalendarColorLegend({modules,events,colors}:{modules:string[];events:CalendarEvent[];colors:Record<string,string>}){
  const activityItems=modules.map(module=>({label:`Módulo ${module}`,color:moduleColor(module,colors)}));
  const examItems=modules.filter(module=>events.some(event=>event.module===module&&event.highlight==="exam")).map(module=>({label:`Módulo ${module}`,color:EXAM_COLORS[module]}));
  const otherItems:LegendItem[]=[];
  if(events.some(event=>event.highlight==="substitute"&&activityIdentity(event).icon==="exam"))otherItems.push({label:"Prova substitutiva",color:SUBSTITUTE_EXAM_COLOR});
  if(events.some(event=>event.highlight==="results"||activityIdentity(event).id==="publication"))otherItems.push({label:"Liberação de notas e gabaritos",color:NOTE_RELEASE_COLOR});
  return <section className="calendar-color-legend" aria-labelledby="calendar-legend-title">
    <h3 id="calendar-legend-title">Cores do calendário</h3>
    <div className={`calendar-legend-groups ${examItems.length?"has-exams":""}`}>
      <LegendGroup title="Atividades por módulo" items={activityItems}/>
      <LegendGroup title="Provas curriculares" items={examItems}/>
      <LegendGroup title="Outras datas" items={otherItems}/>
    </div>
  </section>;
}
