import {ChevronDown} from "lucide-react";

// Modelo geral das imagens incorporadas às quatro abas Calendário_Metodologia
// do arquivo 1AKTNmWtD7JsYijMohQ0-K7sdyng3FYgo, conferido em 14/10/2026.
type ModelRow={name:string;type?:string;start:number;end:number;points?:number;course?:boolean;tone:"course"|"mapa"|"study"|"hub"|"exam"};
const normal:ModelRow[]=[
  {name:"Disciplina 1",start:1,end:10,course:true,tone:"course"},
  {name:"Disciplina 2",start:1,end:10,course:true,tone:"course"},
  {name:"MAPA",type:"Anexo",start:1,end:7,points:1.5,tone:"mapa"},
  {name:"Atividade de Estudo 1",type:"Objetiva",start:2,end:8,points:0.5,tone:"study"},
  {name:"Atividade de Estudo 2",type:"Objetiva",start:2,end:8,points:0.5,tone:"study"},
  {name:"HUB de Atualidades",type:"Objetiva",start:3,end:7,points:1.5,tone:"hub"},
  {name:"Prova curricular",type:"Presencial no polo",start:9,end:10,points:6,tone:"exam"},
];
const portfolio:ModelRow[]=[
  {name:"Disciplina 3",start:1,end:10,course:true,tone:"course"},
  {name:"MAPA",type:"Anexo",start:1,end:7,points:10,tone:"mapa"},
];
const points=(value:number)=>value.toLocaleString("pt-BR",{minimumFractionDigits:1});

function ModelTimeline({rows,label}:{rows:ModelRow[];label:string}){
  return <div className="methodology-timeline-scroll" tabIndex={0} role="region" aria-label={`${label}. Organização das atividades por semana.`}>
    <table className="methodology-timeline">
      <caption className="sr-only">{label}: semanas de realização e valor das atividades em pontos.</caption>
      <colgroup><col className="methodology-name-column"/>{Array.from({length:10},(_,i)=><col key={i}/>)}<col className="methodology-points-column"/></colgroup>
      <thead><tr><th scope="col">Atividade</th>{Array.from({length:10},(_,i)=><th key={i} scope="col" aria-label={`Semana ${i+1}`}>S{i+1}</th>)}<th scope="col">Nota</th></tr></thead>
      <tbody>{rows.map(row=><tr className={row.course?"methodology-course-row":""} data-model-tone={row.tone} key={row.name}>
        <th scope="row"><span>{row.name}</span>{row.type&&<small>{row.type}</small>}</th>
        {row.start>1&&<td colSpan={row.start-1}/>}
        <td colSpan={row.end-row.start+1} className="methodology-window"><span className="methodology-span" aria-label={`Semanas ${row.start} a ${row.end}`}><span aria-hidden="true">S{row.start}–S{row.end}</span></span></td>
        {row.end<10&&<td colSpan={10-row.end}/>}
        <td className="methodology-points">{typeof row.points==="number"?<span aria-label={`${points(row.points)} pontos`}>{points(row.points)}</span>:<span aria-label="Sem nota">—</span>}</td>
      </tr>)}</tbody>
    </table>
  </div>;
}

export default function MethodologyOverview(){
  return <section className="panel methodology-overview" aria-labelledby="methodology-title">
    <div className="methodology-heading"><div><span className="eyebrow">GERAL PARA TODOS OS MÓDULOS</span><h2 id="methodology-title">Modelo da metodologia</h2><p>Organização das atividades e composição das notas ao longo das semanas.</p></div><span className="methodology-cycle">Ciclo de <strong>10 semanas</strong></span></div>
    <div className="methodology-models">
      <article className="methodology-model" aria-labelledby="normal-model-title">
        <div className="methodology-model-heading"><div><span className="methodology-model-type">Enturmação N · Normal</span><h3 id="normal-model-title">Disciplinas 1 e 2</h3></div><span className="methodology-total"><strong>10,0</strong> pts por disciplina</span></div>
        <ModelTimeline rows={normal} label="Enturmação normal"/>
        <div className="methodology-model-footer"><span>Notas indicadas em pontos</span><span className="methodology-approval" data-model-tone="approval">Média para aprovação <strong>7,0</strong></span></div>
      </article>
      <div className="methodology-side">
        <article className="methodology-model" aria-labelledby="portfolio-model-title">
          <div className="methodology-model-heading"><div><span className="methodology-model-type">Enturmação Portfólio / Online</span><h3 id="portfolio-model-title">Disciplina 3</h3></div><span className="methodology-total"><strong>10,0</strong> pts</span></div>
          <ModelTimeline rows={portfolio} label="Enturmação Portfólio / Online"/>
          <div className="methodology-substitute" data-model-tone="substitute"><span>MAPA substitutivo</span><span><strong>10,0</strong> pts</span></div>
        </article>
        <aside className="methodology-followup" aria-labelledby="followup-title"><div><span className="methodology-model-type">Após o ciclo regular</span><h3 id="followup-title">No módulo seguinte</h3></div><ol><li><span className="methodology-week-label">Semana <strong>2</strong></span><span>Publicação de notas</span></li><li><span className="methodology-week-label">Semana <strong>4</strong></span><span>Solicitação substitutiva</span></li></ol></aside>
      </div>
    </div>
    <details className="methodology-exams"><summary><span>Composição das provas <small>Disciplinas 1 e 2</small></span><ChevronDown size={17} aria-hidden="true"/></summary><div className="methodology-exam-grid">
      <article data-model-tone="exam"><h3>Prova curricular <span>6,0 pts</span></h3><dl><div><dt>1 questão discursiva</dt><dd>2,0 pts</dd></div><div><dt>8 questões objetivas</dt><dd>4,0 pts</dd></div></dl></article>
      <article data-model-tone="substitute"><h3>Prova substitutiva <span>10,0 pts</span></h3><dl><div><dt>2 questões discursivas</dt><dd>4,0 pts</dd></div><div><dt>6 questões objetivas</dt><dd>6,0 pts</dd></div></dl></article>
    </div></details>
    <p className="methodology-note">As semanas representam o modelo geral. Consulte as datas específicas no calendário abaixo.</p>
  </section>;
}
