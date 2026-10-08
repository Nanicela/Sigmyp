const byId = id => document.getElementById(id);
let selected = 0;
const activityLabel = i => typeof activityLabels !== "undefined" ? activityLabels[i] : activities[i][0];
activities.forEach((a,i) => {
 const b=document.createElement('button'); b.type='button'; b.className='activity-choice'; b.innerHTML='<span class="activity-number"></span><span class="activity-label"></span>';
 b.querySelector('.activity-number').textContent=String(i+1).padStart(2,'0'); b.querySelector('.activity-label').textContent=activityLabel(i); b.addEventListener('click',()=>chooseActivity(i)); byId('activity-list').append(b);
 const option=document.createElement('option');option.value=i;option.textContent=`${String(i+1).padStart(2,'0')} · ${activityLabel(i)}`;byId('activity-select').append(option);
});
resources.forEach(([title,description])=>{const card=document.createElement('article');card.className='info-card';const h=document.createElement('h3');h.textContent=title;const p=document.createElement('p');p.textContent=description;card.append(h,p);byId('resource-list').append(card);});
function chooseActivity(index, save=true){
 selected=Math.min(Math.max(index,0),activities.length-1);
 const a=activities[selected];
 byId('activity-title').textContent=activityLabel(selected);byId('activity-counter').textContent=`ACTIVIDAD ${String(selected+1).padStart(2,'0')} / ${String(activities.length).padStart(2,'0')}`;
 byId('activity-select').value=selected;
 document.querySelectorAll('.activity-choice').forEach((b,i)=>b.setAttribute('aria-pressed',String(i===selected)));
 const flow=byId('activity-flow');flow.replaceChildren();
 const blocks=[['Proveedor','Quién aporta',a[1]],['Entrada','Qué se recibe',a[2]],['Actividad','Qué se realiza',a[0]],['Salida','Qué se entrega',a[3]],[typeof flowResultLabel !== 'undefined' ? flowResultLabel : 'Resultado','Qué se logra',a[4]]];
 blocks.forEach(([label,question,content],i)=>{
 const card=document.createElement('article');card.className='flow-step'+(i===2?' current-step':'')+(i===4?' result-step':'');
 const mark=document.createElement('span');mark.className='step-mark';mark.textContent=String(i+1).padStart(2,'0');mark.setAttribute('aria-hidden','true');
 const text=document.createElement('div');const heading=document.createElement('h3');heading.textContent=label;const caption=document.createElement('span');caption.className='step-question';caption.textContent=question;const p=document.createElement('p');p.textContent=content;text.append(heading,caption,p);card.append(mark,text);flow.append(card);
 });
 let extra=byId('activity-extra');
 if(typeof activityDetails !== 'undefined'){
  if(!extra){extra=document.createElement('div');extra.id='activity-extra';extra.className='support-grid';flow.after(extra);}
  extra.replaceChildren();
  activityDetails[selected].forEach(([label,value])=>{const card=document.createElement('article');card.className='info-card';const h=document.createElement('h3');h.textContent=label;const p=document.createElement('p');p.textContent=value;card.append(h,p);extra.append(card);});
 }
 byId('position-label').textContent=`Actividad ${selected+1} de ${activities.length}`;byId('previous-activity').disabled=selected===0;byId('next-activity').disabled=selected===activities.length-1;
 if(save) history.replaceState(null,'','#actividad-'+(selected+1));
}
byId('activity-select').addEventListener('change',e=>chooseActivity(Number(e.target.value)));
byId('previous-activity').addEventListener('click',()=>chooseActivity(selected-1));byId('next-activity').addEventListener('click',()=>chooseActivity(selected+1));
const tabs=Array.from(document.querySelectorAll('.detail-tabs [role="tab"]'));
function selectTab(tab,focus=false){tabs.forEach(t=>{const active=t===tab;t.setAttribute('aria-selected',String(active));t.tabIndex=active?0:-1;byId(t.getAttribute('aria-controls')).hidden=!active;});if(focus)tab.focus();}
tabs.forEach((t,i)=>{t.addEventListener('click',()=>selectTab(t));t.addEventListener('keydown',e=>{let next;if(e.key==='ArrowRight')next=(i+1)%tabs.length;if(e.key==='ArrowLeft')next=(i+tabs.length-1)%tabs.length;if(e.key==='Home')next=0;if(e.key==='End')next=tabs.length-1;if(next!==undefined){e.preventDefault();selectTab(tabs[next],true);}});});
function readActivityHash(){const m=location.hash.match(/^#actividad-([1-9][0-9]*)$/);chooseActivity(m?Number(m[1])-1:0,false);}
window.addEventListener('hashchange',readActivityHash);readActivityHash();
