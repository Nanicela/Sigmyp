import {test} from 'node:test';
import assert from 'node:assert/strict';
import {normalizePayment,dateText} from '../web/payment-terms.js';
const base={document_date:'2028-02-28',payment_form:'CREDIT',payment_days:'2',payment_method:'TRANSFER'};
test('vencimientos por días de calendario, bisiestos y cambio de año',()=>{
 assert.equal(dateText(normalizePayment(base).dueDate),'2028-03-01');
 assert.equal(dateText(normalizePayment({...base,document_date:'2027-02-28'}).dueDate),'2027-03-02');
 assert.equal(dateText(normalizePayment({...base,document_date:'2026-12-31'}).dueDate),'2027-01-02');
 assert.equal(dateText(normalizePayment({...base,payment_form:'CASH',payment_days:'0'}).dueDate),base.document_date);
});
test('rechaza fechas inexistentes, plazos incoherentes y medios desconocidos',()=>{
 for(const patch of [{document_date:'2027-02-29'},{document_date:'2026-13-01'},{payment_days:'1.5'},{payment_days:'-1'},{payment_days:'3651'},{payment_days:'0'},{payment_form:'CASH'},{payment_method:'FAKE'},{document_date:'2099-12-31'}])assert.throws(()=>normalizePayment({...base,...patch}));
});
