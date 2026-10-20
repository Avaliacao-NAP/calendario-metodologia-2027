import assert from 'node:assert/strict';
import {readFile,access} from 'node:fs/promises';
import {join} from 'node:path';
import {calendarMonthsForEvents} from '../lib/calendar.ts';
import {eventsForDisciplineTrack} from '../lib/discipline-tracks.ts';
const data=JSON.parse(await readFile('out/data/calendar.json','utf8'));
const source=JSON.parse(await readFile('public/data/calendar.json','utf8'));
assert.deepEqual(data,source,'Os dados publicados devem corresponder à leitura validada da planilha.');
const months=calendarMonthsForEvents(eventsForDisciplineTrack(data.events,'regular'),data.academicYear).length;
const base=process.env.NEXT_PUBLIC_BASE_PATH??'/calendario-metodologia-2027';
const html=await readFile('out/index.html','utf8');
assert.match(html,/Calendário anual/);
assert.doesNotMatch(html,/Todas as disciplinas/);
const disciplineOptions=html.match(/<button\b[^>]*class="discipline-option\b[^>]*>/g)||[];
assert.equal(disciplineOptions.length,2,'Somente os dois tipos de disciplinas devem aparecer.');
disciplineOptions.forEach(button=>assert.match(button,/role="checkbox"/));
assert.match(html,/Disciplinas Regulares - 1 e 2/);
assert.match(html,/Disciplinas Portifólio \/ Online - 3/);
assert.match(html,/Manrope|Modelo da metodologia|Metodologia/);
assert.equal((html.match(/class="month-card/g)||[]).length,months,'O calendário inicial cobre as datas regulares atualizadas.');
assert.match(html,/Módulo 54/);
assert.doesNotMatch(html,/Simular outra data|Simulação ativa|Data única/);
const resources=[...html.matchAll(/<(?:script|link|img)\b[^>]*(?:src|href)="([^"]+)"/g)].map(match=>match[1]).filter(value=>value.startsWith('/'));
let fonts=0;
for(const resource of resources){
  const url=resource.replaceAll('&amp;','&');
  assert.ok(url.startsWith(base+'/'),`Recurso fora da subpasta: ${url}`);
  const pathname=new URL(url,'https://example.test').pathname;
  const file=join('out',decodeURIComponent(pathname.slice(base.length)));
  await access(file);
  if(file.endsWith('.css')){
    const css=await readFile(file,'utf8');
    for(const match of css.matchAll(/url\(([^)]+)\)/g)){
      const href=match[1].replace(/^['"]|['"]$/g,'');
      if(href.startsWith('data:'))continue;
      const resolved=new URL(href,'https://example.test'+pathname).pathname;
      assert.ok(resolved.startsWith(base+'/'),`Recurso CSS fora da subpasta: ${resolved}`);
      await access(join('out',resolved.slice(base.length)));
      if(resolved.endsWith('.woff2'))fonts++;
    }
  }
}
assert.ok(fonts>=2,'As duas variantes locais da Manrope devem estar acessíveis.');
await access('out/.nojekyll');
assert.ok(data.events.length>0);
console.log(`OK: exportação estática com ${months} meses, ${resources.length} recursos, fontes locais, ${data.events.length} atividades/períodos e caminhos corretos em ${base}.`);
