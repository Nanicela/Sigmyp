import test from 'node:test';
import assert from 'node:assert/strict';
import domain from '../functions/domain.cjs';
import {businessYear,businessYearBounds,isCurrentBusinessYear} from '../web/business-year.js';
const line = { description: 'Servicio', quantity: '1', unit_price: '100000.00', iva_rate: '19' };
test('IVA del 19 % y total conocido', () => {
  const result = domain.calculate([line]);
  assert.equal(result.subtotal, '100000.00'); assert.equal(result.tax, '19000.00'); assert.equal(result.total, '119000.00');
});
test('cantidades fraccionarias, mezcla de tarifas y redondeo por línea', () => {
  const result = domain.calculate([{ ...line, quantity: '0.5', unit_price: '0.10' }, { ...line, iva_rate: '5', quantity: '2', unit_price: '15.55' }]);
  assert.equal(result.subtotal, '31.15'); assert.equal(result.tax, '1.57'); assert.equal(result.total, '32.72');
});
test('montos superiores a precisión segura de Number no pierden centavos', () => {
  const result = domain.calculate([{ ...line, quantity: '1000000', unit_price: '99999999999.99' }]);
  assert.equal(result.subtotal, '99999999999990000.00'); assert.equal(result.tax, '18999999999998100.00');
});
test('rechaza números flotantes, negativos, exceso de precisión y valores no finitos', () => {
  for (const price of [0.1, '-1', 'Infinity', 'NaN', '1e9', '1.001', '0', '1,20'])
    assert.throws(() => domain.calculate([{ ...line, unit_price: price }]), domain.ValidationError);
});
test('rechaza tarifas o estructuras no soportadas', () => {
  for (const lines of [[], null, [null], [{ ...line, iva_rate: '0' }], Array(101).fill(line)])
    assert.throws(() => domain.calculate(lines), domain.ValidationError);
});
test('nota exige motivo y referencia válida; no confía en totales enviados', () => {
  const data = { kind: 'CREDIT_NOTE', buyer_name: 'Comprador', buyer_id: '123456', lines: [line] };
  assert.throws(() => domain.normalizeDraft(data), domain.ValidationError);
  const result = domain.normalizeDraft({ ...data, reason: 'Devolución', reference_id: 'abc', total: '1.00' });
  assert.equal(result.total, '119000.00'); assert.equal(result.reason, 'Devolución');
  assert.throws(() => domain.pathId('../otra-empresa'), domain.ValidationError);
});
test('descuento efectivo reduce la base antes de calcular IVA',()=>{
 const r=domain.calculate([{...line,discount_rate:'10.25'}]);
 assert.equal(r.gross,'100000.00');assert.equal(r.discount,'10250.00');assert.equal(r.subtotal,'89750.00');assert.equal(r.tax,'17052.50');assert.equal(r.total,'106802.50');
});
test('distingue exento, excluido y no gravado sin un cero ambiguo',()=>{
 for(const treatment of ['EXEMPT','EXCLUDED','NOT_SUBJECT']){
  const r=domain.calculate([{...line,iva_rate:treatment,discount_rate:'5'}]);assert.equal(r.lines[0].tax_treatment,treatment);assert.equal(r.tax,'0.00');assert.equal(r.total,'95000.00');
 }
 assert.throws(()=>domain.calculate([{...line,iva_rate:'19',tax_treatment:'EXEMPT'}]));
});
test('descuentos: límites, precisión y redondeo de centavos',()=>{
 for(const discount_rate of ['-1','100.01','1.001','','NaN','1e1',10])assert.throws(()=>domain.calculate([{...line,discount_rate}]));
 const r=domain.calculate([{...line,unit_price:'0.05',discount_rate:'10'}]);assert.equal(r.discount,'0.01');assert.equal(r.subtotal,'0.04');assert.equal(r.tax,'0.01');
 assert.equal(domain.calculate([{...line,discount_rate:'100'}]).total,'0.00');
});
test('periodo operativo usa el año vigente en Colombia sin dejarlo fijo',()=>{
 assert.equal(businessYear('2027-01-01T04:30:00Z'),2026);
 assert.equal(businessYear('2027-01-01T05:00:00Z'),2027);
 const bounds=businessYearBounds(2027);
 assert.equal(bounds.start.toISOString(),'2027-01-01T05:00:00.000Z');
 assert.equal(bounds.end.toISOString(),'2028-01-01T05:00:00.000Z');
 assert.equal(isCurrentBusinessYear('2026-06-01T12:00:00Z','2026-12-31T23:00:00Z'),true);
 assert.equal(isCurrentBusinessYear('2025-12-31T23:59:59Z','2026-01-01T12:00:00Z'),false);
});
