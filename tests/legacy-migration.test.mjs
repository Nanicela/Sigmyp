import test from 'node:test';
import assert from 'node:assert/strict';
import {prepare} from '../scripts/migration/import-legacy.mjs';
function fixture(date='2026-01-01T00:00:00-05:00') {
 return {source:'sigmyp2',year:2026,timezone:'America/Bogota',
 schema:{accounts:{primaryKey:['id'],foreignKeys:[]},quotations:{primaryKey:['id'],foreignKeys:[{referred_table:'accounts',constrained_columns:['account_id']}]}},
 tables:{accounts:{kind:'master',rows:[{id:1,name:'Cuenta',created:'2010-01-01'}]},quotations:{kind:'operation',rows:[{id:1,account_id:1,date_created:date,total:'1234.50'}]}}};
}
test('preserva maestros históricos, importes decimales y claves repetibles',()=>{
 const s=fixture(),p=prepare(s);assert.equal(p.records.length,2);assert.equal(p.issues.length,0);
 assert.equal(p.records[1].data.data.total,'1234.50');
 assert.deepEqual(prepare(s),p);
});
test('filtra por límites de 2026 en Colombia',()=>{
 assert.throws(()=>prepare(fixture('2026-01-01T04:59:59Z')),/fuera de 2026/);
 assert.doesNotThrow(()=>prepare(fixture('2026-01-01T05:00:00Z')));
 assert.doesNotThrow(()=>prepare(fixture('2027-01-01T04:59:59Z')));
 assert.throws(()=>prepare(fixture('2027-01-01T05:00:00Z')),/fuera de 2026/);
 assert.throws(()=>prepare(fixture('sin fecha')),/fuera de 2026/);
});
test('rechaza credenciales y claves duplicadas, detecta relaciones rotas',()=>{
 const s=fixture();s.tables.accounts.rows[0].hash='no-importar';assert.throws(()=>prepare(s),/credenciales/);
 delete s.tables.accounts.rows[0].hash;s.tables.accounts.rows.push({...s.tables.accounts.rows[0]});assert.throws(()=>prepare(s),/duplicadas/);
 s.tables.accounts.rows=[];assert.equal(prepare(s).issues.length,1);
});
test('vista comercial conserva duplicados y resuelve oficinas mediante contacto',async()=>{
 const {commercialView}=await import('../web/legacy-commercial.js');
 const view=commercialView({
 accounts:[{id:1,name:'A',nit:'123'},{id:2,name:'B',nit:'123'}],
 contacts:[{id:5,account_id:1,name:'Contacto'},{id:6,account_id:null,name:'Sin cuenta'}],
 offices:[{id:9,contact_id:5,city:10},{id:11,contact_id:6,city:null}],
 cities:[{id:10,state_id:20,name:'Ciudad'}],states:[{id:20,name:'Departamento'}],
 quotations:[{id:15,contact_id:5,date_created:'2026-01-01T05:00:00Z',total:'123.45'}]
 });
 assert.equal(view.customers.length,2);
 assert.notEqual(view.customers[0].id,view.customers[1].id);
 assert.equal(view.sites[0].customerId,view.customers[0].id);
 assert.equal(view.sites[0].department,'Departamento');
 assert.equal(view.sites[1].customerId,'');
 assert.equal(view.quotations[0].total,'123.45');
});
