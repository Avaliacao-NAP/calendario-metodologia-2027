import assert from 'node:assert/strict';
import {mkdtemp,readFile,rm,writeFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {syncCalendar} from './sync-calendar.mjs';
import {calendarDataIsFresh,fetchLiveCalendar,SYNC_FRESHNESS_MS} from '../lib/calendar-client.ts';
import {eventsForDisciplineTrack} from '../lib/discipline-tracks.ts';

const data=JSON.parse(await readFile('public/data/calendar.json','utf8'));
assert.deepEqual(data.modules,['51','52','53','54']);
for(const module of data.modules){
  const events=data.events.filter(event=>event.module===module);
  assert.equal(events.length,17,`Módulo ${module}: 16 atividades/datas e um período.`);
  assert.equal(eventsForDisciplineTrack(events,'regular').length,13);
  assert.equal(eventsForDisciplineTrack(events,'portfolio').length,4);
}
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
  console.log('OK: quatro módulos, disciplinas separadas, prazos de 2028, dados antigos sinalizados e última leitura preservada em falhas.');
}finally{
  globalThis.fetch=originalFetch;
  await rm(directory,{recursive:true,force:true});
}
