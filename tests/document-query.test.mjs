import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { initializeTestEnvironment, assertFails } from '@firebase/rules-unit-testing';
import { collection,doc,setDoc,Timestamp,query,getDocs } from 'firebase/firestore';
import {normalizeFilters,colombiaDay,documentConstraints} from '../web/document-query.js';
let env, db;
before(async()=>{ env=await initializeTestEnvironment({projectId:'demo-history-tests',firestore:{host:'127.0.0.1',port:8181,rules:await readFile('firestore.rules','utf8')}}); await env.clearFirestore();db=env.authenticatedContext('alice').firestore();});
after(async()=>env?.cleanup());
const path='workspaces/alice/companies/900000001/drafts';
test('fechas Colombia y validación',()=>{
 assert.equal(new Date(colombiaDay('2026-09-30')).toISOString(),'2026-09-30T05:00:00.000Z');
 assert.equal(normalizeFilters({to:'2026-09-30'}).upper,colombiaDay('2026-10-01'));
 assert.throws(()=>colombiaDay('2026-02-30'));
 assert.throws(()=>normalizeFilters({from:'2026-10-01',to:'2026-09-30'}));
 assert.throws(()=>normalizeFilters({buyer:'12-3456'}));
 assert.doesNotThrow(()=>normalizeFilters({from:'2024-02-29',to:'2024-02-29'}));
});
test('rango inclusivo por día, filtros combinados y paginación sin duplicados',async()=>{
 const start=colombiaDay('2026-09-30'),end=start+86400000;
 await env.withSecurityRulesDisabled(async context=>{
  const store=context.firestore();
  for(const [id,time,kind,buyer] of [['before',start-1,'INVOICE','123456'],['first',start,'INVOICE','123456'],['last',end-1,'INVOICE','123456'],['after',end,'INVOICE','123456'],['note',start,'CREDIT_NOTE','123456'],['other',start,'INVOICE','987654']]) await setDoc(doc(store,path,id),{createdAt:Timestamp.fromMillis(time),kind,buyer:{identification:buyer}});
  for(let i=0;i<28;i++) await setDoc(doc(store,path,'page'+String(i).padStart(2,'0')),{createdAt:Timestamp.fromMillis(start),kind:'DEBIT_NOTE',buyer:{identification:'123456'}});
 });
 const source=collection(db,path);
 const filter=normalizeFilters({from:'2026-09-30',to:'2026-09-30',kind:'INVOICE',buyer:'123456'});
 const matched=await getDocs(query(source,...documentConstraints(filter)));
 assert.deepEqual(matched.docs.map(d=>d.id),['last','first']);
 const f=normalizeFilters({kind:'DEBIT_NOTE'});
 const page1=await getDocs(query(source,...documentConstraints(f)));
 assert.equal(page1.size,26);
 const page2=await getDocs(query(source,...documentConstraints(f,page1.docs[24])));
 assert.equal(page2.size,3);
 assert.equal(new Set([...page1.docs.slice(0,25),...page2.docs].map(d=>d.id)).size,28);
 await assertFails(getDocs(query(collection(env.authenticatedContext('bob').firestore(),path),...documentConstraints(filter))));
});
