import {test} from 'node:test';import assert from 'node:assert/strict';
import {recordForm,normalizeRecord} from '../web/commercial-record.js';
for(const kind of ['contacts','offices'])test(kind+' valida nombre, teléfonos y correos sin cambiar vínculos',()=>{
 const input=recordForm(kind,{name:' Nombre ',phone1:'00123'});
 const result=normalizeRecord(kind,{...input,sourceId:1,customerId:'other'});
 assert.equal(result.name,'Nombre');assert.equal(result.phone1,'00123');assert.equal(result.sourceId,undefined);assert.equal(result.customerId,undefined);
 for(const extra of [{name:''},{phone1:'123abc'},{email:'invalido'},{comments:'a'.repeat(4001)}])assert.throws(()=>normalizeRecord(kind,{...input,...extra}));
 if(kind==='offices')for(const extra of [{technicianPhone:'x'},{technicianEmail:'x'}])assert.throws(()=>normalizeRecord(kind,{...input,...extra}));
});
