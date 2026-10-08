const el = id => document.getElementById(id);
const make = (tag, text, cls) => { const n=document.createElement(tag); if(text!==undefined)n.textContent=text; if(cls)n.className=cls; return n; };
const keys=Object.keys(productionData);
const sections=['activities','documents','indicators','resources','control'];
const sectionRoutes={activities:'actividades',documents:'documentos',indicators:'indicadores',resources:'recursos',control:'control'};
const states=Object.fromEntries(keys.map(k=>[k,{index:0,section:'activities'}]));
let current='ensamble';
const topTabs=Array.from(document.querySelectorAll('.production-tabs [role="tab"]'));
const detailTabs=Array.from(document.querySelectorAll('.detail-tabs [role="tab"]'));
function route(){const state=states[current];return '#'+current+'/'+(state.section==='activities'?'actividad-'+(state.index+1):sectionRoutes[state.section]);}
function saveRoute(push=false){history[push?'pushState':'replaceState'](null,'',route());}
function titlePanel(id,kicker,title){const p=el(id);p.replaceChildren(make('p',kicker,'section-caption'),make('h2',title));return p;}
function definitionCard(title,rows){const card=make('article',undefined,'info-card');card.append(make('h3',title));const dl=make('dl');for(const [k,v] of rows)dl.append(make('dt',k),make('dd',v));card.append(dl);return card;}
function renderSupplementary(d){
 const docs=titlePanel('panel-documents','SOPORTE DE LA CARACTERIZACIÓN','Documentos y riesgos');
 docs.append(make('h3','Riesgos del proceso','production-section-heading'));
 if(d.risks.length){const list=make('ul',undefined,'risk-list');d.risks.forEach(r=>list.append(make('li',r)));docs.append(list);}else docs.append(make('p','No especificados en esta caracterización.','secondary-note'));
 const grid=make('div',undefined,'support-grid');d.docs.forEach(item=>{const card=make('article',undefined,'info-card');card.append(make('span',item.kind,'card-category'),make('h3',item.title));if(item.url){const a=make('a','Consultar documento','document-link');a.href=item.url;a.target='_blank';a.rel='noopener noreferrer';a.append(make('span',' (abre en otra pestaña)','sr-only'));card.append(a);}else if(!item.note)card.append(make('p','Referencia del Excel · Archivo no adjunto','secondary-note'));if(item.note)card.append(make('p',item.note));grid.append(card);});docs.append(grid,make('p','Los enlaces provienen del Excel y conservan los permisos de sus documentos originales.','secondary-note'));
 const indicators=titlePanel('panel-indicators','MEDICIÓN DEL PROCESO','Indicadores');indicators.append(make('p','Metas y fórmulas registradas en el Excel. No se incluyen resultados medidos.'));const ig=make('div',undefined,'support-grid');d.indicators.forEach(i=>ig.append(definitionCard(i.name,[['Fórmula / método',i.formula],['Periodicidad',i.frequency],['Meta',i.goal]])));indicators.append(ig);
 const resources=titlePanel('panel-resources','CAPACIDADES Y REQUISITOS','Recursos');if(d.resources.length){const rg=make('div',undefined,'resource-grid');d.resources.forEach(([name,text])=>{const card=make('article',undefined,'info-card');card.append(make('h3',name),make('p',text));rg.append(card);});resources.append(rg);}else resources.append(make('p','El archivo no incluye una sección de recursos.','secondary-note'));const req=make('article',undefined,'requirement');req.append(make('h3','Requisitos'),make('p',d.requirements));resources.append(req);
 const control=titlePanel('panel-control','TRAZABILIDAD','Control documental');const cg=make('div',undefined,'support-grid');cg.append(definitionCard('Identificación',[['Caracterización',d.name],['Código del encabezado',d.code],['Versión',d.version],['Fecha registrada',d.date],['Responsable',d.owner],['Elaborado por',d.prepared],['Revisado por',d.reviewer],['Fecha de revisión',d.reviewDate]]));d.changes.forEach(c=>cg.append(definitionCard('Versión '+c.version,[['Cambio',c.description],['Revisó',c.reviewer],['Aprobó',c.approver],['Fecha de aprobación',c.date]])));control.append(cg);d.notes.forEach(n=>control.append(make('p',n,'source-note')));
}
function renderCharacterization(){
 const d=productionData[current];document.title=d.name+' · Gestión de Producción · DyD';
 topTabs.forEach(t=>{const active=t.id==='production-'+current;t.setAttribute('aria-selected',String(active));t.tabIndex=active?0:-1;});el('production-content').setAttribute('aria-labelledby','production-'+current);
 for(const [id,text] of Object.entries({'production-name':d.name,'production-code':d.code,'production-version':'Versión '+d.version,'production-date':d.date,'production-owner':d.owner,'production-objective':d.objective,'production-scope':d.scope,'production-count':String(d.activities.length).padStart(2,'0')}))el(id).textContent=text;
 el('activity-list').replaceChildren();el('activity-select').replaceChildren();
 d.activities.forEach((a,i)=>{const b=make('button',undefined,'activity-choice');b.type='button';b.append(make('span',String(i+1).padStart(2,'0'),'activity-number'),make('span',a.title,'activity-label'));b.addEventListener('click',()=>selectActivity(i));el('activity-list').append(b);const op=make('option',String(i+1).padStart(2,'0')+' · '+a.title);op.value=i;el('activity-select').append(op);});
 renderSupplementary(d);selectActivity(states[current].index,false);selectSection(states[current].section,false);
}
function selectActivity(index,save=true){
 const d=productionData[current];const state=states[current];state.index=Math.max(0,Math.min(index,d.activities.length-1));const a=d.activities[state.index];
 el('activity-title').textContent=a.title;el('activity-counter').textContent=(a.decision?'DECISIÓN':'ACTIVIDAD')+' '+String(state.index+1).padStart(2,'0')+' / '+String(d.activities.length).padStart(2,'0');
 el('activity-select').value=state.index;Array.from(el('activity-list').children).forEach((b,i)=>b.setAttribute('aria-pressed',String(i===state.index)));
 const steps=d.schema==='support'?[['Entrada','Qué se recibe',a.entry],['Actividad','Qué se realiza',a.title],['Resultado','Qué se logra',a.result]]:[['Proveedor','Quién aporta',a.provider],['Entrada','Qué se recibe',a.entry],['Actividad','Qué se realiza',a.title],['Salida','Qué se entrega',a.output],['Resultado','Qué se logra',a.result]];
 const flow=el('activity-flow');flow.replaceChildren();steps.forEach(([label,question,content],i)=>{const card=make('article',undefined,'flow-step'+(label==='Actividad'?' current-step':'')+(label==='Resultado'?' result-step':''));const mark=make('span',String(i+1).padStart(2,'0'),'step-mark');mark.setAttribute('aria-hidden','true');const text=make('div');text.append(make('h3',label),make('span',question,'step-question'),make('p',content||'No especificado en el Excel.'));card.append(mark,text);flow.append(card);});
 el('activity-note').textContent=a.note||(a.decision?'Esta actividad es una decisión del diagrama original. El detalle muestra la información asociada a esa fila.':'');el('activity-note').hidden=!el('activity-note').textContent;
 el('position-label').textContent='Actividad '+(state.index+1)+' de '+d.activities.length;el('previous-activity').disabled=state.index===0;el('next-activity').disabled=state.index===d.activities.length-1;
 if(save)saveRoute();
}
function selectSection(section,save=true){states[current].section=section;detailTabs.forEach(t=>{const active=t.id==='tab-'+section;t.setAttribute('aria-selected',String(active));t.tabIndex=active?0:-1;el(t.getAttribute('aria-controls')).hidden=!active;});if(save)saveRoute();}
function selectCharacterization(key){if(key===current)return;current=key;renderCharacterization();saveRoute(true);}
function keyboardTabs(tabs,onSelect){tabs.forEach((t,i)=>t.addEventListener('keydown',e=>{let next;if(e.key==='ArrowRight')next=(i+1)%tabs.length;if(e.key==='ArrowLeft')next=(i+tabs.length-1)%tabs.length;if(e.key==='Home')next=0;if(e.key==='End')next=tabs.length-1;if(next!==undefined){e.preventDefault();onSelect(tabs[next]);tabs[next].focus();}}));}
topTabs.forEach(t=>t.addEventListener('click',()=>selectCharacterization(t.id.replace('production-',''))));keyboardTabs(topTabs,t=>selectCharacterization(t.id.replace('production-','')));
detailTabs.forEach(t=>t.addEventListener('click',()=>selectSection(t.id.replace('tab-',''))));keyboardTabs(detailTabs,t=>selectSection(t.id.replace('tab-','')));
el('activity-select').addEventListener('change',e=>selectActivity(Number(e.target.value)));el('previous-activity').addEventListener('click',()=>selectActivity(states[current].index-1));el('next-activity').addEventListener('click',()=>selectActivity(states[current].index+1));
function readRoute(){const [key,part]=(location.hash.slice(1)||'ensamble').split('/');current=keys.includes(key)?key:'ensamble';const m=(part||'').match(/^actividad-([1-9][0-9]*)$/);const state=states[current];if(m){state.index=Number(m[1])-1;state.section='activities';}else state.section=sections.find(s=>sectionRoutes[s]===part)||'activities';renderCharacterization();}
window.addEventListener('popstate',readRoute);window.addEventListener('hashchange',readRoute);readRoute();
