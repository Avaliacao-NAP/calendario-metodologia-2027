import assert from 'node:assert/strict';
import * as XLSX from 'xlsx';
import {parseWorkbook} from '../lib/calendar-source.ts';
import {buildMethodologyModel} from '../lib/methodology-model.ts';
import {mkdtemp,readFile,rm,writeFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {syncCalendar} from './sync-calendar.mjs';
import {calendarDataIsFresh,fetchLiveCalendar,SYNC_FRESHNESS_MS} from '../lib/calendar-client.ts';
import {eventsForDisciplineTrack,focusForDisciplineTrack,toggleDisciplineTrack} from '../lib/discipline-tracks.ts';
import {calendarMonthsForEvents} from '../lib/calendar.ts';


// Cópia tabular das quatro abas públicas em 20/10/2026, com a nova metodologia.
const fixture=JSON.parse(await readFile('scripts/fixtures/methodology-2026-10-20.json','utf8'));
const workbookFor=(sheets=fixture)=>{
  const workbook=XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook,XLSX.utils.aoa_to_sheet([['Ignorar esta aba']]),'Calendário Acadêmico 2027');
  for(const {name,rows} of sheets){
    const values=rows.map(row=>row.map(value=>typeof value==='string'&&/^\d{4}-\d\d-\d\d$/.test(value)?new Date(value+'T00:00:00Z'):value));
    XLSX.utils.book_append_sheet(workbook,XLSX.utils.aoa_to_sheet(values),name);
  }
  return workbook;
};
const parse=(workbook)=>parseWorkbook(XLSX.write(workbook,{type:'buffer',bookType:'xlsx'}),'2026-10-20T19:01:42.372Z');
const current=parse(workbookFor());
assert.equal(current.events.length,60,'Nova metodologia: 15 registros por módulo.');
assert.ok(current.events.every(event=>!event.title.includes('HUB')));
assert.equal(new Set(current.events.map(event=>event.id)).size,current.events.length);
for(const module of current.modules){
  const events=current.events.filter(event=>event.module===module);
  assert.equal(eventsForDisciplineTrack(events,'regular').length,11);
  assert.equal(eventsForDisciplineTrack(events,'portfolio').length,4);
  assert.deepEqual(events.filter(event=>event.group==='Disciplinas 1 e 2'&&typeof event.grade==='number').map(event=>event.grade),[2,1,1,6,10]);
  assert.equal(events.find(event=>event.kind==='period').end,events.find(event=>event.highlight==='exam').end,'A substitutiva não prolonga o ciclo regular.');
}
const regular51=current.events.filter(event=>event.module==='51'&&event.group==='Disciplinas 1 e 2');
assert.equal(regular51.find(event=>event.title==='Atividade de Estudo 2').start,'2027-03-08');
assert.equal(regular51.find(event=>event.title==='Atividade de Estudo 2').end,'2027-04-25');
assert.equal(regular51.find(event=>event.title==='Nota e gabarito · AE2').start,'2027-04-26');
assert.ok(current.events.some(event=>event.module==='54'&&event.group==='Disciplina 3'&&event.start==='2028-02-04'));
const model=buildMethodologyModel(current);
assert.deepEqual(model.normal.filter(row=>!row.course).map(row=>row.points),[2,1,1,6]);
assert.equal(model.normal.find(row=>row.name==='Atividade de Estudo 2').start,3);
assert.equal(model.normal.find(row=>row.name==='Atividade de Estudo 2').end,9);
assert.equal(model.weeks,10);
assert.equal(model.portfolioTotal,10);

// Alterações de posição não trocam datas, grupos nem identificadores.
const moved=fixture.map(sheet=>({...sheet,rows:[[],[],...sheet.rows.flatMap((row,index)=>index===5?[[],['','',...row]]:[['','',...row]])]}));
const withoutLocations=data=>data.events.map(({sourceCell,...event})=>event);
assert.deepEqual(withoutLocations(parse(workbookFor(moved))),withoutLocations(current));

// Totais mesclados e valores calculados pelo Excel continuam sendo lidos.
const merged=workbookFor();
for(const name of merged.SheetNames.filter(name=>name.includes('Metodologia'))){
  const sheet=merged.Sheets[name];
  sheet['!merges']=[XLSX.utils.decode_range('G4:G7')];
  sheet.D4.f='DATE('+String(current.academicYear)+','+String(new Date(fixture.find(item=>item.name===name).rows[3][3]).getUTCMonth()+1)+','+String(new Date(fixture.find(item=>item.name===name).rows[3][3]).getUTCDate())+')';
}
assert.deepEqual(withoutLocations(parse(merged)),withoutLocations(current));

// A estrutura anterior, com HUB, também é reconhecida.
const oldFixture=structuredClone(fixture);
for(const sheet of oldFixture){
  const rows=sheet.rows;
  rows[3][5]=1.5;rows[4][5]=.5;rows[5][5]=.5;
  const hubStart=rows[5][3],hubEnd=rows[3][4];
  rows[5][3]=rows[4][3];rows[5][4]=rows[4][4];rows[3][9]=rows[2][9];
  rows[4][8]='HUB DE ATUALIDADES (LIBERAÇÃO DE NOTA E GABARITO)';
  rows[4][9]=new Date(Date.parse(hubEnd+'T12:00:00Z')+86400000).toISOString().slice(0,10);
  rows.splice(6,0,['','HUB DE ATUALIDADES','OBJ',hubStart,hubEnd,1.5,'','','','']);
}
const legacy=parse(workbookFor(oldFixture));
assert.equal(legacy.events.length,68);
assert.equal(legacy.events.filter(event=>event.title.includes('HUB')).length,8);
assert.equal(buildMethodologyModel(legacy).normal.find(row=>row.name==='MAPA').points,1.5);

// Leitura incompleta ou incoerente deve falhar antes de substituir os dados válidos.
for(const [edit,pattern] of [
  [rows=>{rows[9][1]='';},/tabelas/],
  [rows=>{rows[3][3]='31/02/2027';},/Data ausente ou inválida/],
  [rows=>{rows[3][9]='';},/Data ausente ou inválida/],
  [rows=>{rows[3][5]=3;},/soma das notas/],
  [rows=>{rows.splice(4,0,[...rows[3].slice(0,8),'','']);},/duplicada/],
]){
  const broken=structuredClone(fixture);edit(broken[0].rows);
  assert.throws(()=>parse(workbookFor(broken)),pattern);
}

const data=JSON.parse(await readFile('public/data/calendar.json','utf8'));
let selection='regular';
selection=toggleDisciplineTrack(selection,'portfolio');
assert.equal(selection,'all','Selecionar Portfólio preserva a seleção de Regulares.');
selection=toggleDisciplineTrack(selection,'regular');
assert.equal(selection,'portfolio','Desmarcar Regulares mantém Portfólio selecionado.');
selection=toggleDisciplineTrack(selection,'portfolio');
assert.equal(selection,'none');
assert.equal(eventsForDisciplineTrack(data.events,selection).length,0);
selection=toggleDisciplineTrack(selection,'regular');
assert.equal(selection,'regular');
assert.equal(toggleDisciplineTrack('all','portfolio'),'regular');
assert.equal(toggleDisciplineTrack('portfolio','regular'),'all');
assert.deepEqual(data.modules,['51','52','53','54']);
for(const module of data.modules){
  const events=data.events.filter(event=>event.module===module);
  assert.equal(events.filter(event=>event.kind==='period').length,1);
  const regular=eventsForDisciplineTrack(events,'regular'),portfolio=eventsForDisciplineTrack(events,'portfolio');
  assert.ok(regular.length>1&&portfolio.length>0);
  assert.equal(regular.length+portfolio.length,events.length);
  const combined=eventsForDisciplineTrack(events,'all');
  assert.deepEqual(combined.map(event=>event.id).sort(),events.map(event=>event.id).sort(),'A seleção conjunta mantém todas as datas, sem duplicar.');
  assert.equal(focusForDisciplineTrack(combined,'all')?.kind,'period','O foco da seleção conjunta acompanha o período regular do módulo.');
}
const allEvents=eventsForDisciplineTrack(data.events,'all');
const lastDate=allEvents.reduce((last,event)=>event.end>last?event.end:last,data.academicYear+'-12-31');
assert.equal(calendarMonthsForEvents(allEvents,data.academicYear).at(-1).key,lastDate.slice(0,7),'A visão conjunta inclui as datas finais da fonte.');
assert.equal(new Set(data.events.map(event=>event.id)).size,data.events.length);
const originalFetch=globalThis.fetch, directory=await mkdtemp(join(tmpdir(),'methodology-sync-'));
try{
  let requested;
  globalThis.fetch=async url=>{requested=String(url);return Response.json(data);};
  assert.equal((await fetchLiveCalendar('/calendario-metodologia-2027/')).version,data.version);
  assert.match(requested,/^\/calendario-metodologia-2027\/data\/calendar\.json\?t=\d+$/);
  const time=Date.parse(data.fetchedAt);
  assert.equal(calendarDataIsFresh(data,time+1000),true);
  assert.equal(calendarDataIsFresh(data,time+SYNC_FRESHNESS_MS+1),false);
  globalThis.fetch=async()=>new Response('<html>Login</html>',{headers:{'Content-Type':'text/html'}});
  await assert.rejects(fetchLiveCalendar(''),/inválida/);
  const destination=join(directory,'calendar.json');
  await writeFile(destination,JSON.stringify(data));
  globalThis.fetch=async()=>new Response('Unavailable',{status:503});
  await assert.rejects(syncCalendar(destination),/503/);
  assert.equal((JSON.parse(await readFile(destination,'utf8'))).version,data.version);
  console.log('OK: estruturas antiga e nova, 60 registros da nova metodologia, linhas/colunas deslocadas, notas e modelo dinâmicos, seleção de disciplinas e última leitura preservada em falhas.');
}finally{
  globalThis.fetch=originalFetch;
  await rm(directory,{recursive:true,force:true});
}
