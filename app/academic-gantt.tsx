"use client";

import {Fragment,useMemo,useState,type CSSProperties} from "react";
import {CalendarDays,Eye,EyeOff} from "lucide-react";
import {Tooltip,TooltipContent,TooltipProvider,TooltipTrigger} from "@/components/ui/tooltip";
import {br,daysBetween,ganttMonths,ganttRange,ganttRows,moduleColor,moduleContrast,status} from "@/lib/calendar";
import type {CalendarEvent} from "@/lib/calendar-types";
import {activityIdentity,activityStyle} from "@/lib/activity-identity";
import {ActivitySymbol} from "@/components/activity-symbol";
import {DisciplineSymbol} from "@/components/discipline-symbol";
import {DISCIPLINE_GROUPS,eventsForDisciplineTrack} from "@/lib/discipline-tracks";

type Props={events:CalendarEvent[];year:number;startDate:string;endDate:string;colors:Record<string,string>;module:string;disciplineLabel:string;separateTracks?:boolean;today:string;onEvent:(event:CalendarEvent)=>void};

export default function AcademicGantt({events,year,startDate,endDate,colors,module,disciplineLabel,separateTracks=false,today,onEvent}:Props){
  const[showGrid,setShowGrid]=useState(true);
  const referenceDate=today;
  const isAnnual=module==="all",scopeLabel=isAnnual?"Todos os módulos":`Módulo ${module}`;
  const range=useMemo(()=>ganttRange(year,endDate,startDate),[year,endDate,startDate]);
  const rowSections=useMemo(()=>separateTracks
    ?DISCIPLINE_GROUPS.map(track=>({track,rows:ganttRows(eventsForDisciplineTrack(events,track.id),year,range.end,range.begin)})).filter(section=>section.rows.length)
    :[{track:null,rows:ganttRows(events,year,range.end,range.begin)}],[events,year,range.end,range.begin,separateTracks]);
  const rows=rowSections.flatMap(section=>section.rows);
  const months=useMemo(()=>ganttMonths(year,range.end,range.begin),[year,range.end,range.begin]);
  const inRange=referenceDate>=range.begin&&referenceDate<=range.end;
  const referencePosition=inRange?(daysBetween(range.begin,referenceDate)+.5)/range.total*100:null;

  return <div className="panel academic-gantt" aria-labelledby="gantt-title">
    <div className="gantt-toolbar">
      <div><h3 id="gantt-title">Cronograma · {isAnnual?"Anual":scopeLabel}</h3><p>{disciplineLabel} · Atividades e prazos de {br(startDate)} a {br(endDate)}.</p></div>
      <div className="gantt-controls">
        <button className={`icon-btn gantt-grid-toggle ${showGrid?"selected":""}`} onClick={()=>setShowGrid(value=>!value)} aria-pressed={showGrid} aria-label={showGrid?"Ocultar grade mensal":"Mostrar grade mensal"}>{showGrid?<Eye size={16}/>:<EyeOff size={16}/>}Grade</button>
      </div>
    </div>
    <div className="gantt-reference-controls"><span className="gantt-reference-date"><CalendarDays size={15}/>{referenceDate?`Hoje: ${br(referenceDate)}${!inRange?" · fora do período exibido":""}`:"Carregando data atual"}</span><span className="gantt-reference-note">Mesma data de referência do calendário.</span></div>

    <TooltipProvider delayDuration={180}><div className="gantt-viewport" tabIndex={0} role="region" aria-label={`Cronograma de ${disciplineLabel}, ${scopeLabel}, de ${br(startDate)} até ${br(endDate)}. Role para consultar todas as atividades e meses.`}>
      <div className="gantt-chart" style={{minWidth:Math.max(800,280+months.length*68)}}>
        <div className="gantt-heading"><div className="gantt-name">Atividades e datas</div><div className="gantt-month-heading">{months.map(month=><span key={month.key} className={month.year>year?"gantt-continuation-month":""} style={{width:`${month.width}%`}} aria-label={`${month.name} de ${month.year}`}>{month.name.slice(0,3)}{month.year>year&&<small>{month.year}</small>}</span>)}{referencePosition!==null&&rows.length>0&&<span className="gantt-reference-label" style={{left:`clamp(35px, ${referencePosition}%, calc(100% - 35px))`}}>Hoje</span>}</div></div>
        <div className="gantt-body">
          {referencePosition!==null&&rows.length>0&&<div className="gantt-reference-layer" aria-hidden="true"><div className="gantt-reference-line" style={{left:`${referencePosition}%`}}><i/></div></div>}
          {rowSections.map(section=><Fragment key={section.track?.id||"selected"}>
          {section.track&&<div className="gantt-discipline-row activity-tone" style={activityStyle({module:isAnnual?"Geral":module},colors)}><div className="discipline-section-heading"><DisciplineSymbol track={section.track.id}/><strong>{section.track.menuTitle}</strong></div></div>}
          {section.rows.map(row=><div className="gantt-row activity-tone" style={activityStyle(isAnnual?{module:"Geral"}:row.periods[0].event,colors)} key={row.key}>
            <div className="gantt-name"><span className="gantt-category">{row.category}</span><span className="gantt-activity-name"><ActivitySymbol event={row.periods[0].event} size={16}/><strong>{row.title}</strong></span></div>
            <div className="gantt-timeline" style={{minHeight:Math.max(76,row.lanes*36+20)}}>
              {showGrid&&<div className="gantt-month-grid" aria-hidden="true">{months.map(month=><span key={month.key} style={{width:`${month.width}%`}}/>)}</div>}
              {row.periods.map(period=>{
                const event=period.event,current=referenceDate?status(event,referenceDate):"Previsto",state=current==="Em andamento"?"active":current==="Prazo encerrado"?"past":"upcoming",milestone=event.start===event.end;
                const identity=activityIdentity(event);
                const css={"--module-color":moduleColor(event.module,colors),"--module-contrast":moduleContrast(moduleColor(event.module,colors)),left:milestone?`clamp(7px, ${period.left+period.width/2}%, calc(100% - 7px))`:`${period.left}%`,width:milestone?14:`${period.width}%`,top:14+period.lane*36} as CSSProperties;
                return <Tooltip key={event.id}><TooltipTrigger asChild><button type="button" className={`gantt-bar ${state} ${milestone?"milestone":""}`} style={css} onClick={()=>onEvent(event)} aria-label={`${event.title}, módulo ${event.module}, início ${br(event.start)}, término ${br(event.end)}. ${current}. Ver detalhes.`}>{milestone?<span className="gantt-milestone-shape"/>:<span className="gantt-bar-text">{isAnnual?`M${event.module} · ${identity.shortLabel}`:identity.shortLabel}</span>}</button></TooltipTrigger><TooltipContent side="top" sideOffset={8} collisionPadding={12} className="gantt-tooltip activity-tone" style={activityStyle(event,colors)}><div className="gantt-tooltip-heading"><span>{event.category}</span><span className={`gantt-tooltip-status ${state}`}>{current}</span></div><strong>{event.title}</strong><dl><div><dt>Módulo</dt><dd>{event.module}</dd></div><div><dt>Início</dt><dd>{br(event.start)}</dd></div><div><dt>Término</dt><dd>{br(event.end)}</dd></div><div><dt>Duração</dt><dd>{daysBetween(event.start,event.end)+1} {milestone?"dia":"dias corridos"}</dd></div></dl><p>Selecione para abrir os detalhes.</p></TooltipContent></Tooltip>;
              })}
            </div>
          </div>)}</Fragment>)}
          {!rows.length&&<p className="empty-inline">Nenhuma atividade para o ano e os filtros selecionados.</p>}
        </div>
      </div>
    </div></TooltipProvider>
    <div className="gantt-legend"><span>{disciplineLabel} · {scopeLabel}</span><div className="gantt-status-legend"><span className="upcoming">Previsto</span><span className="active">Em andamento</span><span className="past">Prazo encerrado</span></div></div>
  </div>;
}
