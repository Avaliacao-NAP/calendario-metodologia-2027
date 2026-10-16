import assert from 'node:assert/strict';
import {mkdtemp,readFile,rm,writeFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {syncCalendar} from './sync-calendar.mjs';
import {calendarDataIsFresh,fetchLiveCalendar,SYNC_FRESHNESS_MS} from '../lib/calendar-client.ts';
import {eventsForDisciplineTrack,focusForDisciplineTrack,toggleDisciplineTrack} from '../lib/discipline-tracks.ts';
import {calendarMonthsForEvents} from '../lib/calendar.ts';

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
  assert.equal(events.length,17,`Módulo ${module}: 16 atividades/datas e um período.`);
  assert.equal(eventsForDisciplineTrack(events,'regular').length,13);
  assert.equal(eventsForDisciplineTrack(events,'portfolio').length,4);
  const combined=eventsForDisciplineTrack(events,'all');
  assert.deepEqual(combined.map(event=>event.id).sort(),events.map(event=>event.id).sort(),'A seleção conjunta mantém todas as datas, sem duplicar.');
  assert.equal(focusForDisciplineTrack(combined,'all')?.kind,'period','O foco da seleção conjunta acompanha o período regular do módulo.');
}
const allEvents=eventsForDisciplineTrack(data.events,'all');
assert.equal(calendarMonthsForEvents(allEvents,data.academicYear).at(-1).key,'2028-02','A visão conjunta inclui também as últimas notas de Portfólio / Online.');
assert.equal(eventsForDisciplineTrack(allEvents.filter(event=>event.category==='Notas e gabaritos'),'portfolio').length,8,'As notas de Portfólio / Online mantêm sua separação.');
assert.ok(data.events.some(event=>event.module==='54'&&event.group==='Disciplina 3'&&event.start==='2028-02-04'));
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
  console.log('OK: quatro módulos, seleção individual e conjunta de disciplinas, prazos de 2028, dados antigos sinalizados e última leitura preservada em falhas.');
}finally{
  globalThis.fetch=originalFetch;
  await rm(directory,{recursive:true,force:true});
}
