import test from 'node:test';
import assert from 'node:assert/strict';
import {summarizeDraftLines} from '../web/draft-totals.js';
const line={description:'Servicio',quantity:'1',unit_price:'100.00',iva_rate:'19'};
test('desglosa ambas tarifas y agrega cada impuesto sin pérdida de centavos',()=>{
 const r=summarizeDraftLines([line,{...line,unit_price:'10.00',iva_rate:'5'},{...line,quantity:'2'}]);
 assert.equal(r.subtotal,'310.00');assert.equal(r.total,'367.50');assert.deepEqual(r.taxes,[{rate:'5',amount:'0.50'},{rate:'19',amount:'57.00'}]);
});
test('usa el mismo redondeo por línea que los documentos guardados',()=>{
 const r=summarizeDraftLines([{...line,quantity:'0.5',unit_price:'0.10'},{...line,quantity:'2',unit_price:'15.55',iva_rate:'5'}]);
 assert.equal(r.tax,'1.57');assert.equal(r.total,'32.72');
});
test('un concepto incompleto no produce un total parcial engañoso',()=>{
 assert.throws(()=>summarizeDraftLines([line,{...line,unit_price:''}]));
 assert.throws(()=>summarizeDraftLines([{...line,quantity:'0'}]));
});
