"use client";

import {Fragment,useCallback,useEffect,useMemo,useRef,useState,type CSSProperties} from "react";
import {CalendarDays,CalendarRange,GraduationCap,RefreshCw,Search,Sun,Moon,Printer,Clock3,LayoutGrid,ChartNoAxesGantt,ChevronLeft,ChevronRight,Maximize2,Globe,WifiOff,BookOpen,X,ListFilter,CalendarCheck2,Check} from "lucide-react";
import {Select,SelectTrigger,SelectValue,SelectContent,SelectItem} from "@/components/ui/select";
import {Tabs,TabsList,TabsTrigger,TabsContent} from "@/components/ui/tabs";
import {Dialog,DialogContent,DialogHeader,DialogTitle,DialogDescription} from "@/components/ui/dialog";
import {Table,TableHeader,TableBody,TableRow,TableHead,TableCell} from "@/components/ui/table";
import {Progress} from "@/components/ui/progress";
import {Tooltip,TooltipContent,TooltipProvider,TooltipTrigger} from "@/components/ui/tooltip";
import {MONTHS,CATEGORIES,EXAM_COLORS,SUBSTITUTE_EXAM_COLOR,NOTE_RELEASE_COLOR,br,calendarMonthsForEvents,daysBetween,deadlineProgress,eventsForAcademicYear,moduleColor,moduleContrast,moduleInFocus,moduleWeeksForRow,monthDays,normalize,status,todayBR,upcomingEvents} from "@/lib/calendar";
import type {CalendarData,CalendarEvent} from "@/lib/calendar-types";
import seed from "@/lib/calendar-seed.json";
import AcademicGantt from "./academic-gantt";
import {calendarDataIsFresh,fetchLiveCalendar} from "@/lib/calendar-client";
import {activityIdentity,activityStyle} from "@/lib/activity-identity";
import {ActivitySymbol} from "@/components/activity-symbol";
import MethodologyOverview from "@/components/methodology-overview";
import {DISCIPLINE_GROUPS,eventsForDisciplineTrack,focusForDisciplineTrack,toggleDisciplineTrack,type DisciplineGroupId,type DisciplineTrackId} from "@/lib/discipline-tracks";
import {DisciplineSymbol} from "@/components/discipline-symbol";
import CalendarColorLegend from "@/components/calendar-color-legend";

const BASE=process.env.NEXT_PUBLIC_BASE_PATH||"";
const moduleStyle=(module:string,colors:Record<string,string>)=>({"--module-color":moduleColor(module,colors),"--module-contrast":moduleContrast(moduleColor(module,colors))} as CSSProperties);
const intersects=(e:CalendarEvent,start:string,end:string)=>e.start<=end&&e.end>=start;
const timeBR=(date:string)=>new Intl.DateTimeFormat("pt-BR",{timeZone:"America/Sao_Paulo",hour:"2-digit",minute:"2-digit",second:"2-digit"}).format(new Date(date));
const eventLabel=(e:CalendarEvent)=>e.module==="Geral"?"Entre módulos":`Módulo ${e.module}`;

function Choice({value,onChange,label,options}:{value:string;onChange:(v:string)=>void;label:string;options:{value:string;label:string}[]}){
  return <Select value={value} onValueChange={onChange}><SelectTrigger aria-label={label} className="choice"><SelectValue/></SelectTrigger><SelectContent>{options.map(o=><SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent></Select>;
}
function EventCard({event,today,colors,onSelect}:{event:CalendarEvent;today:string;colors:Record<string,string>;onSelect?:(e:CalendarEvent)=>void}){
  const s=status(event,today);
  return <button className="event-card activity-tone" style={activityStyle(event,colors)} onClick={()=>onSelect?.(event)}><span className="event-card-top"><span className="module-tag">{eventLabel(event)}</span><span className={`status-badge ${s==="Em andamento"?"active":""}`}>{s}</span></span><span className="event-card-title"><ActivitySymbol event={event}/><strong>{event.title}</strong></span><span className="event-dates"><CalendarRange size={14}/>{event.start===event.end?br(event.start):`${br(event.start)} a ${br(event.end)}`}</span></button>;
}

export default function CalendarApp(){
  const[data,setData]=useState<CalendarData>(seed as CalendarData);
  const modStyle=(module:string)=>moduleStyle(module,data.moduleColors);
  const year=data.academicYear;
  const[module,setModule]=useState<string>("all"),[category,setCategory]=useState("all"),[query,setQuery]=useState("");
  const isAnnual=module==="all",scopeLabel=isAnnual?"Todos os módulos":`Módulo ${module}`,scopeColor=isAnnual?"Geral":module;
  const[disciplineTrack,setDisciplineTrack]=useState<DisciplineTrackId>("regular");
  const selectedTrack=disciplineTrack==="all"
    ?{label:"Regulares e Portfólio / Online",subtitle:"Disciplinas 1, 2 e 3"}
    :disciplineTrack==="none"
      ?{label:"Nenhuma disciplina selecionada",subtitle:""}
      :DISCIPLINE_GROUPS.find(track=>track.id===disciplineTrack)!;
  const[theme,setTheme]=useState("dark"),[sync,setSync]=useState<"loading"|"live"|"offline">("loading"),[checkedAt,setCheckedAt]=useState("");
  const[busy,setBusy]=useState(false),[today,setToday]=useState("");
  const[selectedDay,setSelectedDay]=useState<string|null>(null),[selectedEvent,setSelectedEvent]=useState<CalendarEvent|null>(null),[expandedMonth,setExpandedMonth]=useState<number|null>(null);
  const[view,setView]=useState("matrix");
  const inflight=useRef(false),controller=useRef<AbortController|null>(null),latestVersion=useRef(seed.version);
  const refresh=useCallback(async()=>{
    if(inflight.current)return;inflight.current=true;setBusy(true);
    const abort=new AbortController();controller.current=abort;const timeout=setTimeout(()=>abort.abort(),18000);
    try{
      const fresh=await fetchLiveCalendar(BASE,abort.signal);
      if(latestVersion.current!==fresh.version){latestVersion.current=fresh.version;setData(fresh);setModule(m=>m==="all"||fresh.modules.includes(m)?m:"all");setSelectedEvent(e=>e?fresh.events.find(item=>item.id===e.id)??null:null);}
      setCheckedAt(fresh.fetchedAt);setSync(calendarDataIsFresh(fresh)?"live":"offline");
    }catch{setSync("offline");}
    finally{clearTimeout(timeout);inflight.current=false;setBusy(false);setToday(todayBR());}
  },[]);
  useEffect(()=>{
    setToday(todayBR());try{const saved=localStorage.getItem("methodology-calendar-theme");if(saved==="light")setTheme("light");}catch{}
    void refresh();const tick=setInterval(()=>{if(document.visibilityState==="visible")void refresh();},20000);
    const resume=()=>{if(document.visibilityState==="visible")void refresh();};document.addEventListener("visibilitychange",resume);window.addEventListener("online",resume);
    return()=>{clearInterval(tick);controller.current?.abort();document.removeEventListener("visibilitychange",resume);window.removeEventListener("online",resume);};
  },[refresh]);
  useEffect(()=>{document.documentElement.dataset.theme=theme;},[theme]);
  function toggleTheme(){const next=theme==="dark"?"light":"dark";setTheme(next);try{localStorage.setItem("methodology-calendar-theme",next);}catch{}}
  const academicEvents=useMemo(()=>eventsForAcademicYear(data.events,year),[data.events,year]);
  const moduleEvents=useMemo(()=>isAnnual?academicEvents:academicEvents.filter(event=>event.module===module),[academicEvents,module,isAnnual]);
  const trackEvents=useMemo(()=>eventsForDisciplineTrack(moduleEvents,disciplineTrack),[moduleEvents,disciplineTrack]);
  const moduleMonths=useMemo(()=>calendarMonthsForEvents(trackEvents,isAnnual?year:undefined),[trackEvents,isAnnual,year]);
  const activeMonth=expandedMonth===null?null:moduleMonths[expandedMonth];
  const timelineStart=trackEvents.reduce((start,event)=>event.start<start?event.start:start,isAnnual?`${year}-01-01`:trackEvents[0]?.start||`${year}-01-01`);
  const timelineEnd=trackEvents.reduce((end,event)=>event.end>end?event.end:end,isAnnual?`${year}-12-31`:trackEvents[0]?.end||`${year}-12-31`);
  const filtered=useMemo(()=>trackEvents.filter(e=>(category==="all"||e.category===category)&&(!query||normalize(`${e.title} ${e.category} módulo ${e.module}`).includes(normalize(query)))),[trackEvents,category,query]);
  const filteredMarks=useMemo(()=>data.marks.filter(mark=>filtered.some(event=>event.id===mark.sourceCell)),[data.marks,filtered]);
  const dayEvents=useCallback((date:string)=>filtered.filter(e=>e.start<=date&&e.end>=date),[filtered]);
  const dayMarks=useCallback((date:string)=>filteredMarks.filter(m=>m.date===date),[filteredMarks]);
  const visibleModules=isAnnual?data.modules:[module];
  const focusModule=isAnnual?moduleInFocus(academicEvents,today):module;
  const focusPeriod=focusForDisciplineTrack(trackEvents.filter(event=>event.module===focusModule),disciplineTrack);
  const focusState=focusPeriod&&today?status(focusPeriod,today):"Previsto";
  const focusRemaining=focusPeriod&&today?daysBetween(today,focusState==="Previsto"?focusPeriod.start:focusPeriod.end):0;
  const nextEvents=today?upcomingEvents(filtered,today):[];
  const trackSections=useMemo(()=>DISCIPLINE_GROUPS
    .filter(track=>disciplineTrack==="all"||track.id===disciplineTrack)
    .map(track=>({track,events:eventsForDisciplineTrack(filtered,track.id).filter(event=>event.kind!=="period")}))
    .filter(section=>section.events.length),[filtered,disciplineTrack]);
  const activeFilters=category!=="all"||!!query;
  const syncLabel=sync==="live"?"Sincronizado":sync==="offline"?"Desconectado":"Conectando";
  const syncDetail=sync==="live"?`Última sincronização às ${timeBR(checkedAt)} (Brasília).`:sync==="offline"?`Atualização pendente.${checkedAt?` Última leitura: ${br(checkedAt.slice(0,10))} às ${timeBR(checkedAt)} (Brasília).`:""}`:"Verificando a conexão.";
  function clearFilters(){setCategory("all");setQuery("");}
  function selectModule(value:string){
    setModule(value);clearFilters();setSelectedDay(null);setSelectedEvent(null);setExpandedMonth(null);
  }
  function selectDisciplineTrack(value:DisciplineGroupId){
    setDisciplineTrack(current=>toggleDisciplineTrack(current,value));clearFilters();setSelectedDay(null);setSelectedEvent(null);setExpandedMonth(null);
  }
  function printView(){setExpandedMonth(null);setSelectedDay(null);setSelectedEvent(null);setTimeout(()=>window.print(),50);}
  function jumpMonth(month:number){setExpandedMonth(month);}

  function renderWeekdays(large=false){
    return <div className={`weekdays ${large?"full-weekdays":""}`}><abbr className="week-caption" title="Semana do módulo">Sem.</abbr>{(large?["Dom","Seg","Ter","Qua","Qui","Sex","Sáb"]:["D","S","T","Q","Q","S","S"]).map((day,index)=><span key={index} className={index===0?"sunday":""}>{day}</span>)}</div>;
  }
  function renderMonthDays(month:number,monthYear=year,large=false){
    const dates=monthDays(monthYear,month);
    return Array.from({length:6},(_,row)=>{
      const days=dates.slice(row*7,row*7+7),weeks=moduleWeeksForRow(days,data.events,module);
      return [<span key={`week-${row}`} className="module-week">{weeks.map(week=><span key={week.module} className="week-number" style={modStyle(week.module)} title={`Semana ${week.number} do módulo ${week.module}`} aria-label={`Semana ${week.number} do módulo ${week.module}`}>{week.number}</span>)}</span>,...days.map((date,index)=>renderDay(date,row*7+index,large))];
    }).flat();
  }

  function renderDay(date:string|null,index:number,large=false){
    if(!date)return <span key={`empty-${index}`} className="day-empty"/>;
    const events=dayEvents(date),marks=dayMarks(date),holiday=marks.find(m=>m.kind==="holiday"||m.kind==="bridge"),currentPeriod=focusForDisciplineTrack(events,disciplineTrack),activities=events.filter(e=>e.kind!=="period");
    const dayModules=Array.from(new Set(activities.map(event=>event.module)));
    const priority=(event:CalendarEvent)=>activityIdentity(event).id==="publication"?-1:event.highlight==="exam"||event.highlight==="substitute"?0:event.highlight==="results"?1:2;
    const ordered=activities.slice().sort((a,b)=>priority(a)-priority(b));
    const leading=ordered[0],publication=leading&&activityIdentity(leading).id==="publication";
    const exam=activities.find(event=>activityIdentity(event).icon==="exam");
    const releases=activities.some(event=>event.highlight==="results");
    const highlightColor=publication||(!exam&&releases)?NOTE_RELEASE_COLOR:exam?(exam.highlight==="substitute"?SUBSTITUTE_EXAM_COLOR:EXAM_COLORS[exam.module]):undefined;
    const notable=activities.filter(e=>e.start===date||e.end===date).length;
    const isToday=date===today;
    const summary=[...new Set([...events.map(e=>`${e.title} (Módulo ${e.module})`),...marks.filter(m=>!events.some(e=>e.id===m.sourceCell)).map(m=>m.label)])].join("; ");
    const dayStyle={...modStyle(currentPeriod?.module||leading?.module||scopeColor),...(highlightColor?{"--day-highlight":highlightColor,"--day-highlight-contrast":moduleContrast(highlightColor)}:{})} as CSSProperties;
    return <button key={date} onClick={()=>setSelectedDay(date)} data-date={date} data-highlight={leading?.highlight} className={`day ${leading?"activity-tone":""} ${isToday?"today":""} ${holiday?.kind||""} ${currentPeriod?"in-period":""} ${leading?.highlight?"activity-day-highlight":""} ${highlightColor?"day-highlight":""} ${large?"large-day":""} ${events.length||marks.length?"has-events":""} ${today&&date<today?"past-day":""}`} style={dayStyle} title={`${br(date)}${summary?`: ${summary}`:" · Sem atividades"}`} aria-label={`${br(date)}${summary?`: ${summary}`:" · Sem atividades"}`}>
      <span className="day-number">{Number(date.slice(8))}</span>{large&&holiday&&<span className="holiday-label">{holiday.label}</span>}
      {large&&<span className="large-day-events">{ordered.slice(0,2).map(e=><span className="day-event activity-tone" key={e.id} style={activityStyle(e,data.moduleColors)}>{activityIdentity(e).shortLabel}{isAnnual&&` · M${e.module}`}</span>)}{activities.length>2&&<span className="more-events">+{activities.length-2} atividades</span>}</span>}
      {!!activities.length&&<span className={`day-activity-marks ${isAnnual?"annual-day-marks":""}`} aria-hidden="true">{isAnnual?dayModules.map(m=><i key={m} className="day-module-mark" style={{background:moduleColor(m,data.moduleColors)}}/>):<i/>}{activities.length>1&&<small>{activities.length}</small>}</span>}
      {!large&&notable>0&&<span className="boundary-mark"/>}
    </button>;
  }

  return <main className="app-shell">
    <header className="site-header">
      <div className="brand"><img src={`${BASE}/logo_${theme==="dark"?"white":"blue"}.png`} alt="UniCesumar" width="150" height="40"/><span className="brand-divider"/><div><span className="eyebrow">GRADUAÇÃO · METODOLOGIA</span><h1>Calendário Metodologia <span>{data.academicYear}</span></h1></div></div>
      <div className="header-actions"><button className="icon-btn" onClick={toggleTheme} aria-label={theme==="dark"?"Ativar tema claro":"Ativar tema escuro"}>{theme==="dark"?<Sun size={18}/>:<Moon size={18}/>}</button><button className="icon-btn" onClick={printView} aria-label="Imprimir calendário"><Printer size={18}/></button></div>
    </header>

    <section className="panel module-selector" aria-labelledby="module-selector-title">
      <div className="module-selector-intro"><span className="eyebrow" id="module-selector-title">Módulos</span><p>Selecione para consultar</p></div>
      <nav className="module-selector-grid" aria-label="Módulos da metodologia">
        <button type="button" className={`module-selector-card annual-selector-card ${isAnnual?"is-selected":""}`} style={modStyle("Geral")} aria-pressed={isAnnual} aria-controls="module-content" onClick={()=>selectModule("all")}>
          <span className="module-selector-icon" aria-hidden="true"><CalendarDays size={21}/></span>
          <span className="module-selector-meta"><strong>Anual</strong><span>Todos os módulos</span></span>
          {isAnnual&&<span className="module-selected-line" aria-hidden="true"/>}
        </button>
        {data.modules.map(value=>{
        const period=academicEvents.find(event=>event.module===value&&event.kind==="period");
        return <button type="button" key={value} className={`module-selector-card ${module===value?"is-selected":""}`} style={modStyle(value)} aria-pressed={module===value} aria-controls="module-content" onClick={()=>selectModule(value)}>
          <span className="module-selector-icon" aria-hidden="true"><BookOpen size={21}/></span>
          <span className="module-selector-meta"><strong>Módulo {value}</strong><span>{period?`${br(period.start,false)} a ${br(period.end,false)}`:`Metodologia ${year}`}</span></span>
          {module===value&&<span className="module-selected-line" aria-hidden="true"/>}
        </button>;
      })}</nav>
    </section>
    <p className="sr-only" role="status">Exibindo calendário, atividades e prazos de {selectedTrack.label}, {selectedTrack.subtitle}. {scopeLabel}.</p>

    <div id="module-content" className={`module-content ${isAnnual?"annual-scope":""}`}>
    {isAnnual&&<MethodologyOverview/>}
    <section className="discipline-selector activity-tone" style={modStyle(scopeColor)} aria-labelledby="discipline-selector-title">
      <div className="discipline-selector-heading"><h2 id="discipline-selector-title">Selecione as disciplinas</h2><span>{scopeLabel}</span></div>
      <div className="discipline-selector-options" role="group" aria-label={`Grupos de disciplinas · ${scopeLabel}`}>{DISCIPLINE_GROUPS.map(track=>{
        const selected=disciplineTrack==="all"||track.id===disciplineTrack;
        return <button type="button" key={track.id} role="checkbox" className={`discipline-option ${selected?"is-selected":""}`} aria-checked={selected} aria-controls="discipline-content" onClick={()=>selectDisciplineTrack(track.id)}>
          <span className="discipline-option-icon"><DisciplineSymbol track={track.id}/></span>
          <strong className="discipline-option-title">{track.menuTitle}</strong>
          <span className="discipline-option-check" aria-hidden="true">{selected&&<Check size={13} strokeWidth={3}/>}</span>
        </button>;
      })}</div>
    </section>
    {disciplineTrack==="none"&&<div className="panel discipline-empty" role="status"><ListFilter size={22}/><p>Selecione um ou os dois tipos de disciplinas para consultar o calendário e os prazos.</p></div>}
    <div id="discipline-content" hidden={disciplineTrack==="none"}>
    <section className="annual-section" aria-labelledby="annual-title">
      <div className="annual-heading"><div><span className="eyebrow">{isAnnual?"VISÃO ANUAL":scopeLabel.toUpperCase()} · METODOLOGIA {year}</span><h2 id="annual-title"><CalendarDays size={25}/>{isAnnual?"Calendário anual":"Calendário do módulo"}</h2><p className="module-calendar-description"><strong>{selectedTrack.label}</strong> · {selectedTrack.subtitle}<span className="discipline-date-range">Atividades e datas de {br(timelineStart)} a {br(timelineEnd)}.</span></p></div><div className="annual-tools">
        <TooltipProvider delayDuration={200}><Tooltip><TooltipTrigger asChild><span className={`sync-status ${sync}`} tabIndex={0} role="status" aria-live="polite" aria-atomic="true" aria-label={syncLabel}>
          {sync==="live"?<Globe size={15} aria-hidden="true"/>:sync==="offline"?<WifiOff size={15} aria-hidden="true"/>:<RefreshCw size={15} className="spin" aria-hidden="true"/>}
        </span></TooltipTrigger><TooltipContent side="bottom" sideOffset={8} className="sync-tooltip">{syncDetail}</TooltipContent></Tooltip></TooltipProvider>
        <button className="icon-btn" disabled={busy} onClick={()=>void refresh()} aria-label="Atualizar agora"><RefreshCw size={17} className={busy?"spin":""}/></button>
      </div></div>
      <div className="calendar-controls module-content-filters"><div className="search-box"><Search size={17}/><input value={query} onChange={e=>setQuery(e.target.value)} aria-label={`Buscar atividade em ${selectedTrack.label} · ${scopeLabel}`} placeholder={disciplineTrack==="all"?"Buscar em todas as disciplinas...":"Buscar neste grupo de disciplinas..."}/>{query&&<button onClick={()=>setQuery("")} aria-label="Limpar busca"><X size={16}/></button>}</div><Choice label="Categoria de atividades" value={category} onChange={setCategory} options={[{value:"all",label:"Todas as categorias"},...CATEGORIES.filter(c=>trackEvents.some(event=>event.category===c)).map(c=>({value:c,label:c}))]}/></div>
      <div className="calendar-meta"><p>Clique em um dia para consultar os prazos ou amplie um mês.</p><span>{filtered.filter(e=>e.kind!=="period").length} atividades e datas{activeFilters&&<button className="text-button" onClick={clearFilters}>Limpar filtros</button>}</span></div>
      <div className={`annual-grid module-calendar-grid ${isAnnual?"annual-calendar-grid":""}`}>{moduleMonths.map(({year:monthYear,month,key},index)=>{
        const name=MONTHS[month],activities=filtered.filter(e=>e.kind!=="period"&&intersects(e,`${key}-01`,`${key}-31`));
        return <article className={`month-card ${today.startsWith(key)?"current-month":""}`} key={key}><div className="month-title"><h3>{name}<span>{monthYear}</span></h3><button className="month-expand" onClick={()=>jumpMonth(index)} aria-label={`Ampliar ${name} de ${monthYear}`}><Maximize2 size={14}/></button></div>{renderWeekdays()}<div className="month-days">{renderMonthDays(month,monthYear)}</div><button className="month-footer" onClick={()=>jumpMonth(index)}><span>{activities.length?`${activities.length} atividades no mês`:"Sem atividades"}</span><CalendarRange size={13}/></button></article>;
      })}</div>
      {isAnnual&&<CalendarColorLegend modules={data.modules} events={trackEvents} colors={data.moduleColors}/>}
    </section>

    <section className="overview" aria-label={`Acompanhamento de ${selectedTrack.label} · ${scopeLabel}`}><div className="panel module-overview"><div className="section-heading"><h2><GraduationCap size={20}/>Módulo em foco</h2><span className="quiet">{br(today)}</span></div><div className="module-cards">{focusPeriod?
      <article className="period-card module-focus activity-tone" style={modStyle(focusPeriod.module)} aria-label={`${selectedTrack.label}, módulo ${focusPeriod.module}: ${focusState}`}>
        <div className="focus-heading"><div className="focus-module-title"><strong>Módulo {focusPeriod.module}</strong><span>{disciplineTrack==="portfolio"?"Portfólio / Online · Período do MAPA":"Disciplinas regulares"}</span></div><span className={`focus-status ${focusState==="Em andamento"?"active":"inactive"}`}><i/>{focusState}</span></div>
        <MatrixProgress event={focusPeriod} today={today}/>
        <dl className="focus-dates"><div><dt>Início</dt><dd>{br(focusPeriod.start)}</dd></div><div><dt>Término</dt><dd>{br(focusPeriod.end)}</dd></div><div><dt>{focusState==="Previsto"?"Começa em":focusState==="Prazo encerrado"?"Situação":"Restam"}</dt><dd className="focus-remaining">{!today?"—":focusState==="Prazo encerrado"?"Encerrado":focusRemaining===0?"Termina hoje":`${focusRemaining} ${focusRemaining===1?"dia":"dias"}`}</dd></div></dl>
      </article>:<div className="focus-empty" role="status"><CalendarRange size={32}/><strong>Período não informado</strong><p>Consulte as datas das atividades em {scopeLabel.toLowerCase()}.</p></div>
    }</div><p className="panel-note">{disciplineTrack==="portfolio"?"Período de entrega do MAPA. Consulte o MAPA substitutivo e as liberações de notas nos prazos abaixo.":"Do início das atividades regulares ao término da prova presencial."}{disciplineTrack==="all"&&" Os prazos de Portfólio / Online também estão incluídos no calendário e nas atividades abaixo."}</p></div><div className="panel deadlines"><div className="section-heading"><h2 id="deadlines-title"><Clock3 size={23}/>Próximos prazos</h2></div><div className="deadline-list" role="region" aria-labelledby="deadlines-title" tabIndex={0}>{nextEvents.length?nextEvents.map(e=>{
      const days=today?daysBetween(today,e.target):0,starting=e.target===e.start;
      return <button className="deadline activity-tone" style={activityStyle(e,data.moduleColors)} key={e.id} onClick={()=>setSelectedEvent(e)}>
        <ActivitySymbol event={e}/>
        <span className="deadline-main"><strong>{e.title}</strong>{disciplineTrack==="all"&&<span className="deadline-discipline">{e.group==="Disciplina 3"?"Portfólio / Online":"Regulares"}</span>}<span className="deadline-count">{days===0?`${starting?"Começa":"Termina"} hoje`:`${starting?"Começa":"Termina"} em ${days} ${days===1?"dia":"dias"}`}</span></span>
        <span className="deadline-meta"><span className="deadline-module">{eventLabel(e)}</span><span className="deadline-date">{starting?"Início":"Fim"} em <time dateTime={e.target}>{br(e.target)}</time></span></span>
      </button>;
    }):<p className="empty-inline">Nenhum prazo futuro para os filtros selecionados.</p>}</div></div></section>

    <section className="details-section" aria-labelledby="details-title"><Tabs value={view} onValueChange={setView}><div className="detail-heading"><div><span className="eyebrow">{isAnnual?"VISÃO ANUAL":scopeLabel.toUpperCase()} · {selectedTrack.label}</span><h2 id="details-title">Atividades e prazos</h2></div><TabsList className="view-tabs"><TabsTrigger value="matrix"><LayoutGrid size={16}/>Matriz geral</TabsTrigger><TabsTrigger value="gantt"><ChartNoAxesGantt size={17}/>Cronograma</TabsTrigger></TabsList></div>
      <TabsContent value="matrix"><div className="panel matrix-panel"><div className="matrix-caption"><span><ListFilter size={16}/>{activeFilters?`${selectedTrack.subtitle} · Filtros aplicados`:`${selectedTrack.label} · ${selectedTrack.subtitle}`}</span><span>Barras indicam o tempo decorrido do prazo</span></div><Table className={`matrix ${isAnnual?"annual-matrix":"module-matrix"}`} containerLabel={`Matriz de atividades · ${selectedTrack.label} · ${scopeLabel}`} style={{...modStyle(scopeColor),minWidth:`calc(var(--matrix-activity-width) + ${visibleModules.length} * var(--matrix-module-width))`}}><TableHeader><TableRow className="matrix-module-row"><TableHead className="activity-col" rowSpan={2} scope="col"><span className="matrix-activity-heading"><span>Atividade</span><span>Nota</span></span></TableHead>{visibleModules.map(m=><TableHead key={m} colSpan={2} scope="colgroup" className={`matrix-module-header module-${m}`} style={modStyle(m)}>Módulo {m}</TableHead>)}</TableRow><TableRow className="matrix-date-row">{visibleModules.flatMap(m=>[<TableHead key={`${m}-start`} scope="col" className="module-start">Início</TableHead>,<TableHead key={`${m}-end`} scope="col" className="module-end">Término</TableHead>])}</TableRow></TableHeader><TableBody>{trackSections.map(({track,events})=><Fragment key={track.id}>
        {disciplineTrack==="all"&&<TableRow className="matrix-discipline-row activity-tone"><TableCell colSpan={visibleModules.length*2+1}><div className="discipline-section-heading"><DisciplineSymbol track={track.id}/><strong>{track.menuTitle}</strong></div></TableCell></TableRow>}
        {CATEGORIES.map(cat=>{
          const titles=Array.from(new Set(events.filter(event=>event.category===cat).map(event=>event.title)));if(!titles.length)return null;
          return <MatrixGroup key={cat} category={cat} titles={titles} events={events} modules={visibleModules} colors={data.moduleColors} today={today} onEvent={setSelectedEvent} showCategory={disciplineTrack!=="all"||cat!==track.sourceGroup}/>;
        })}
      </Fragment>)}{!trackSections.length&&<TableRow><TableCell colSpan={visibleModules.length*2+1}><div className="empty-inline">Nenhuma atividade na tabela para estes filtros.{category==="Feriados e pontes"&&" Consulte as datas destacadas no calendário anual."}</div></TableCell></TableRow>}</TableBody></Table></div></TabsContent>
      <TabsContent value="gantt"><AcademicGantt events={filtered.filter(e=>e.kind!=="period")} year={year} startDate={timelineStart} endDate={timelineEnd} colors={data.moduleColors} module={module} disciplineLabel={selectedTrack.label} separateTracks={disciplineTrack==="all"} today={today} onEvent={setSelectedEvent}/></TabsContent>
    </Tabs></section>
    </div>
    </div>
    
    <footer><span>UniCesumar · Calendário Metodologia {data.academicYear}</span></footer>

    <Dialog open={expandedMonth!==null} onOpenChange={open=>{if(!open)setExpandedMonth(null);}}><DialogContent className="month-dialog"><DialogHeader><DialogTitle>{activeMonth?`${MONTHS[activeMonth.month]} ${activeMonth.year}`:isAnnual?"Calendário anual":"Calendário do módulo"}</DialogTitle><DialogDescription>{selectedTrack.label} · {selectedTrack.subtitle} · {scopeLabel}. Selecione um dia para consultar as atividades.</DialogDescription></DialogHeader>{activeMonth&&expandedMonth!==null&&<><div className="month-dialog-nav"><button className="icon-btn" aria-label="Mês anterior" disabled={expandedMonth===0} onClick={()=>setExpandedMonth(Math.max(0,expandedMonth-1))}><ChevronLeft size={18}/></button><span>{MONTHS[activeMonth.month]} {activeMonth.year}</span><button className="icon-btn" aria-label="Mês seguinte" disabled={expandedMonth>=moduleMonths.length-1} onClick={()=>setExpandedMonth(Math.min(moduleMonths.length-1,expandedMonth+1))}><ChevronRight size={18}/></button></div>{renderWeekdays(true)}<div className="month-days large-month">{renderMonthDays(activeMonth.month,activeMonth.year,true)}</div></>}</DialogContent></Dialog>
    <Dialog open={selectedDay!==null} onOpenChange={open=>{if(!open)setSelectedDay(null);}}><DialogContent className="day-dialog"><DialogHeader><DialogTitle>{selectedDay?br(selectedDay):""}</DialogTitle><DialogDescription>{selectedTrack.label} · {selectedTrack.subtitle}. Períodos e atividades vigentes neste dia.</DialogDescription></DialogHeader>{selectedDay&&<div className="day-details">{dayMarks(selectedDay).filter(mark=>!dayEvents(selectedDay).some(event=>event.id===mark.sourceCell)).map(m=><div className={`source-marker ${m.kind} ${["exam","substitute","results"].includes(m.kind)?"academic-highlight":""}`} style={{"--day-highlight":m.color,"--day-highlight-contrast":moduleContrast(m.color)} as CSSProperties} key={m.sourceCell}><CalendarCheck2 size={17}/><span><strong>{m.label}</strong></span></div>)}{dayEvents(selectedDay).map(e=><EventCard key={e.id} event={e} today={today} colors={data.moduleColors} onSelect={setSelectedEvent}/>)}{!dayEvents(selectedDay).length&&!dayMarks(selectedDay).length&&<p className="empty-inline">Nenhuma atividade ou marcação neste dia para os filtros selecionados.</p>}</div>}</DialogContent></Dialog>
    <Dialog open={!!selectedEvent} onOpenChange={open=>{if(!open)setSelectedEvent(null);}}><DialogContent className="event-dialog activity-tone" style={selectedEvent?activityStyle(selectedEvent,data.moduleColors):undefined}><DialogHeader><DialogTitle><span className="event-dialog-title">{selectedEvent&&<ActivitySymbol event={selectedEvent} size={22}/>}<span>{selectedEvent?.title}</span></span></DialogTitle><DialogDescription>{selectedTrack.label} · {selectedEvent?.group||selectedTrack.subtitle} · {selectedEvent&&eventLabel(selectedEvent)}</DialogDescription></DialogHeader>{selectedEvent&&<><div className="event-period"><div><span>Início</span><strong>{br(selectedEvent.start)}</strong></div><div><span>Término</span><strong>{br(selectedEvent.end)}</strong></div></div>{selectedEvent.assessmentType&&<dl className="assessment-summary"><div><dt>Tipo</dt><dd>{selectedEvent.assessmentType==="DIS"?"Discursiva":selectedEvent.assessmentType==="OBJ"?"Objetiva":"Objetiva / discursiva"}</dd></div><div><dt>Nota da atividade</dt><dd>{selectedEvent.grade?.toLocaleString("pt-BR",{minimumFractionDigits:1})}</dd></div><div><dt>Total da disciplina</dt><dd>{selectedEvent.total?.toLocaleString("pt-BR",{minimumFractionDigits:1})}</dd></div></dl>}<span className="status-badge">{status(selectedEvent,today)}</span><p className="quiet">{daysBetween(selectedEvent.start,selectedEvent.end)+1} {selectedEvent.start===selectedEvent.end?"dia":"dias corridos"}, incluindo as datas inicial e final.</p></>}</DialogContent></Dialog>
  </main>;
}

const formatPoints=(value:number)=>value.toLocaleString("pt-BR",{minimumFractionDigits:1,maximumFractionDigits:2});
const assessmentLabel=(type:string)=>type==="DIS"?"Discursiva":type==="OBJ"?"Objetiva":type==="OBJ/DIS"?"Objetiva e discursiva":type;

function ActivityGrade({grade}:{grade:number}){
  return <span className="activity-grade" aria-label={`Vale ${formatPoints(grade)} ${grade===1?"ponto":"pontos"}`}>
    <span className="activity-grade-value"><strong>{formatPoints(grade)}</strong><span>pts</span></span>
  </span>;
}

function MatrixActivity({title,events}:{title:string;events:CalendarEvent[]}){
  const first=events[0];
  const sameGrade=events.every(event=>event.grade===first?.grade);
  const sameType=events.every(event=>event.assessmentType===first?.assessmentType);
  const varies=!sameGrade||!sameType;
  const hasGrade=events.some(event=>typeof event.grade==="number");
  return <div className="matrix-activity-summary">
    <div className="matrix-activity-main">{first&&<ActivitySymbol event={first}/>}<div className="matrix-activity-text"><strong className="activity-name">{title}</strong>
      {sameType&&first?.assessmentType&&<span className="activity-type">{assessmentLabel(first.assessmentType)}</span>}
    </div></div>
    {!varies&&typeof first?.grade==="number"&&<ActivityGrade grade={first.grade}/>}
    {varies&&hasGrade&&<div className="activity-module-grades">{events.map(event=><div key={event.id} className="activity-module-grade">
      <div><span>Módulo {event.module}</span>{!sameType&&event.assessmentType&&<small>{assessmentLabel(event.assessmentType)}</small>}</div>
      {typeof event.grade==="number"?<ActivityGrade grade={event.grade}/>:<span className="quiet">Nota não informada</span>}
    </div>)}</div>}
  </div>;
}

function MatrixProgress({event,today,showStatus=false}:{event:CalendarEvent;today:string;showStatus?:boolean}){
  const progress=deadlineProgress(event,today);
  const state=!today?"loading":today<event.start?"upcoming":today>event.end?"past":"current";
  const detail=progress.single?`${progress.label?`${progress.label}. `:""}${br(event.start)}.`:`${progress.value}% do prazo decorrido. ${progress.label}.`;
  return <div className={`matrix-window-progress ${progress.single?"single-date":""}`} data-state={state} style={{"--elapsed":`${progress.value}%`} as CSSProperties} title={today?`${detail} Referência: ${br(today)}.`:"Carregando data de referência"}>
    {progress.single?progress.label&&<div className="matrix-milestone-status">{showStatus&&state==="current"&&<i className="matrix-status-dot" aria-hidden="true"/>}{progress.label}</div>:<div className="matrix-progress-heading"><span className={showStatus&&state==="current"?"matrix-current-label":undefined}>{showStatus&&state==="current"?<><i className="matrix-status-dot" aria-hidden="true"/>Em andamento</>:"Tempo decorrido"}</span><span className="matrix-progress-value">{today?<>{progress.value}<small>%</small></>:"—"}</span></div>}
    {progress.single?<div className="matrix-milestone-track" role="img" aria-label={detail}><i aria-hidden="true"/></div>:<>
      <div className="matrix-progress-rail">
        <Progress className="matrix-progress-track" value={today?progress.value:null} aria-label={`Tempo decorrido do prazo de ${event.title}`} aria-valuetext={today?detail:"Carregando data de referência"}/>
        <span className="matrix-progress-ticks" aria-hidden="true"><i/><i/><i/></span>
        {state==="current"&&progress.value>0&&progress.value<100&&<i className="matrix-progress-position" aria-hidden="true"/>}
      </div>
      <div className="matrix-progress-caption"><span>{progress.label}</span></div>
    </>}
  </div>;
}

function MatrixGroup({category,titles,events,modules,colors,today,onEvent,showCategory=true}:{category:string;titles:string[];events:CalendarEvent[];modules:string[];colors:Record<string,string>;today:string;onEvent:(e:CalendarEvent)=>void;showCategory?:boolean}){
  const categoryEvents=events.filter(event=>event.category===category&&modules.includes(event.module));
  return <>{showCategory&&<TableRow className="category-row"><TableCell colSpan={modules.length*2+1}><div className="matrix-category-heading">
    <strong>{category}</strong>
  </div></TableCell></TableRow>}{titles.map(title=>{
    const rowEvents=categoryEvents.filter(event=>event.title===title);
    const style=modules.length>1?moduleStyle("Geral",colors):rowEvents[0]?activityStyle(rowEvents[0],colors):undefined;
    const state=(event:CalendarEvent)=>!today?"":status(event,today)==="Em andamento"?"is-active":status(event,today)==="Prazo encerrado"?"is-past":"";
    return <Fragment key={title}>
      <TableRow className="matrix-activity-row activity-tone" style={style}>
        <TableCell className="activity-col" rowSpan={2}><MatrixActivity title={title} events={rowEvents}/></TableCell>
        {modules.flatMap(m=>{
          const event=rowEvents.find(item=>item.module===m);
          if(event&&event.start===event.end)return [<TableCell key={`${m}-single-date`} colSpan={2} style={moduleStyle(m,colors)} className={`matrix-date-cell activity-tone module-end ${state(event)}`}><button className="matrix-date" onClick={()=>onEvent(event)} aria-label={`Início e término: ${br(event.start)}. ${event.title}, módulo ${m}`}><time dateTime={event.start}>{br(event.start)}</time></button></TableCell>];
          return (["start","end"] as const).map(edge=><TableCell key={`${m}-${edge}`} style={moduleStyle(m,colors)} className={`matrix-date-cell activity-tone module-${edge} ${event?state(event):""}`}>{event?<button className="matrix-date" onClick={()=>onEvent(event)} aria-label={`${edge==="start"?"Início":"Término"}: ${br(event[edge])}. ${event.title}, módulo ${m}`}><time dateTime={event[edge]}>{br(event[edge])}</time></button>:<span className="quiet">—</span>}</TableCell>);
        })}
      </TableRow>
      <TableRow className="matrix-progress-row activity-tone" style={style}>{modules.map(m=>{
        const event=rowEvents.find(item=>item.module===m);
        return <TableCell key={m} colSpan={2} style={moduleStyle(m,colors)} className={`matrix-progress-cell activity-tone module-end ${event?state(event):""}`}>{event&&<MatrixProgress event={event} today={today} showStatus/>}</TableCell>;
      })}</TableRow>
    </Fragment>;
  })}</>;
}
