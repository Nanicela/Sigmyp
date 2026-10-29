import {test} from 'node:test';import assert from 'node:assert/strict';
import {quotationLine,quotationTotals,normalizeQuotation,quotationToday} from '../web/commercial-quotation.js';
test('cotización calcula decimales, descuento y redondeo en centavos',()=>{
 const line=quotationLine({description:'Servicio',quantity:'1.5',price:'1000.01',discount:'10',rate:19});
 assert.equal(line.amountCents,150002);assert.equal(line.discountCents,15000);assert.equal(line.subtotalCents,135002);assert.equal(line.taxCents,25650);assert.equal(line.totalCents,160652);
 assert.equal(quotationTotals([line,line]).totalCents,321304);
 for(const extra of [{quantity:'-1'},{price:'1.001'},{discount:101},{rate:20},{description:''},{quantity:'1000000',price:'1000000'}])assert.throws(()=>quotationLine({description:'x',quantity:'1',price:'1',rate:0,...extra}));
});
test('cotización exige conceptos, fecha válida del año actual y vigencia',()=>{
 const date=quotationToday(),input={date,validUntil:date,lines:[{description:'x',quantity:'1',price:'2',rate:0}]};
 assert.equal(normalizeQuotation(input).totalCents,200);
 for(const extra of [{lines:Array.from({length:4},()=>input.lines[0])},{lines:[]},{date:'2025-01-01'},{date:date.slice(0,4)+'-02-30'},{validUntil:'2020-01-01'}])assert.throws(()=>normalizeQuotation({...input,...extra}));
});
