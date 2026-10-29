import {quotationToday} from './commercial-quotation.js';
export function duplicateQuotationForm(q, today=quotationToday()) {
 const lines=q.pricing?.lines||q.lines;
 return {
  customerId:q.customerId||'',contactId:q.contactId||'',officeId:q.officeId||'',
  date:today,status:'CREATED',approverContactId:'',purchaseOrder:'',
  letter:q.letter||'',warranty:q.warranty||'',paymentMethod:q.paymentMethod||'',comments:q.comments||'',
  deliveryDays:q.deliveryDays??(parseInt(q.deliveryTime)||0),deliveryUnit:q.deliveryUnit||'CALENDAR_DAYS',
  validityDays:q.validityDays??(q.validUntil?Math.max(0,Math.round((q.validUntil-new Date(q.date).getTime())/86400000)):30),validityUnit:q.validityUnit||'CALENDAR_DAYS',
  lines:lines?lines.map(l=>({productId:l.productId||'',code:l.code||'',description:l.description,quantity:String(l.quantityUnits/1000),price:String(l.unitPriceCents/100),discount:String(l.discountBps/100),rate:l.rate})):(q.productDetails||[]).map(l=>({productId:l.productId||'',code:l.code||'',description:l.name,quantity:String(l.quantity??1),price:'',discount:'0',rate:[0,5,19].includes(l.catalogTaxRate)?l.catalogTaxRate:0}))
 };
}
