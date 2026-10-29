import {test} from 'node:test';import assert from 'node:assert/strict';import {orderConditions,orderLines} from '../web/purchase-orders.js';
test('orden valida entrega, condiciones y cantidades sin truncar líneas',()=>{
 const items=[{id:'i',name:'Ítem',code:'IT'}];const nodes=orderLines(Array.from({length:120},()=>({productId:'i',quantity:'2.5',price:'100.25',rate:19})),items);assert.equal(nodes.length,120);assert.equal(nodes[0].line.subtotalCents,25063);assert.equal(nodes.at(-1).sums.totalCents,nodes[0].line.totalCents*120);
 assert.throws(()=>orderLines([{productId:'missing'}],items));assert.throws(()=>orderLines([],items));assert.throws(()=>orderLines([{productId:'i',quantity:0,price:10,rate:19}],items));
 assert.equal(orderConditions({date:'2026-10-22',deliveryDate:'2026-11-01',paymentDays:30}).status,'DRAFT');
 for(const patch of [{deliveryDate:'2026-10-21'},{paymentDays:7},{date:'2026-02-31'}])assert.throws(()=>orderConditions({date:'2026-10-22',deliveryDate:'2026-11-01',paymentDays:30,...patch}));
});
