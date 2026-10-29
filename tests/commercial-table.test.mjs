import test from 'node:test';
import assert from 'node:assert/strict';
import {filterCommercial,paginate,businessDate,sortCommercialByName} from '../vue/src/domain/commercial-table.js';
test('busca sin tildes, combina filtros y encuentra cuentas asociadas',()=>{
 const rows=[{name:'José',customerId:'a',email:'',status:'OK'},{name:'Jose',customerId:'b',email:'x@y.co',status:'OK'}];
 assert.equal(filterCommercial(rows,{search:'jose bogota',account:'a',status:'OK'},{a:'Bogotá'}).length,1);
 assert.equal(filterCommercial(rows,{search:'jose',quality:'missing-email'}).length,1);
 assert.equal(filterCommercial(rows,{account:'__missing__'},{a:'Bogotá'}).length,1);
});
test('fechas inclusivas con zona Colombia, excluye fecha ausente',()=>{
 assert.equal(businessDate('2026-01-02T04:59:59Z'),'2026-01-01');
 assert.equal(filterCommercial([{date:'2026-01-02T04:59:59Z'},{date:'2026-01-02T05:00:00Z'},{date:null}],{from:'2026-01-01',to:'2026-01-01'}).length,1);
});
test('paginación ajusta páginas fuera de rango y cubre todos los registros sin repetir',()=>{
 const rows=Array.from({length:51},(_,id)=>({id}));
 assert.equal(paginate(rows,99,25).page,3);
 assert.equal(paginate(rows,3,25).rows.length,1);
 assert.deepEqual([1,2,3].flatMap(p=>paginate(rows,p,25).rows),rows);
 assert.deepEqual(paginate([],5,25),{rows:[],page:1,pages:1,total:0,start:0,end:0});
});

test('ordena nombres en español antes de paginar sin modificar el origen',()=>{
 const rows=[{name:'Zulu'},{name:'álvaro'},{name:'Nube'},{name:'Ñandú'},{name:''},{name:'Oficina 10'},{name:'Oficina 2'}];
 const original=rows.slice();
 assert.deepEqual(sortCommercialByName(rows,'asc').map(r=>r.name),['álvaro','Nube','Ñandú','Oficina 2','Oficina 10','Zulu','']);
 assert.deepEqual(sortCommercialByName(rows,'desc').map(r=>r.name),['Zulu','Oficina 10','Oficina 2','Ñandú','Nube','álvaro','']);
 assert.deepEqual(rows,original);
 const many=Array.from({length:30},(_,i)=>({name:'Nombre '+(30-i)}));
 assert.equal(paginate(sortCommercialByName(many,'asc'),2,10).rows[0].name,'Nombre 11');
 assert.deepEqual(sortCommercialByName(rows,''),rows);
});
