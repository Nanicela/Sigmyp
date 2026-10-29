import {jsPDF} from 'jspdf';
import {autoTable} from 'jspdf-autotable';
import {quotationText} from './quotation-presentation.js';
const clean=value=>quotationText(value).replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g,'');
const money=value=>value==null?'No disponible':new Intl.NumberFormat('es-CO',{style:'currency',currency:'COP',minimumFractionDigits:2}).format(value);
const date=value=>new Date(typeof value==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(value)?value+'T12:00:00Z':value).toLocaleDateString('es-CO',{timeZone:'America/Bogota'});
export function buildQuotationPdf(q,accounts=[],logo=null){
 const pdf=new jsPDF({unit:'mm',format:'a4'}),wine=[120,0,45],account=accounts.find(a=>a.id===q.customerId),amounts=q.pricing||q,priced=!!q.pricing||q.schemaVersion===1;
 pdf.setProperties({title:'Cotización '+q.number,subject:'Propuesta técnica y comercial',creator:'SIGMYP'});
 let y=42;
 function paragraph(text,bold=false){if(!text)return;pdf.setFont('helvetica',bold?'bold':'normal');pdf.setFontSize(10);for(const line of pdf.splitTextToSize(clean(text),178)){if(y>272){pdf.addPage();y=42;}pdf.text(line,16,y);y+=5;}y+=3;}
 paragraph('Cotización: '+q.number,true);paragraph('Fecha: '+date(q.date));
 paragraph(q.snapshot?.accountName||q.accountName||account?.name||'',true);
 paragraph(q.snapshot?.contactName||q.contactName||'');paragraph(q.snapshot?.officeName||'');
 paragraph(q.letter);
 if(!priced)paragraph('Los precios unitarios históricos no están disponibles. Se presentan los totales registrados, sin sustituirlos por precios de catálogo.');
 const rows=priced?(amounts.lines||[]).map(l=>[l.code||'',l.description,l.quantityUnits/1000,money(l.unitPriceCents/100),l.discountBps/100+'%',l.rate+'%',money(l.totalCents/100)]):(q.productDetails||[]).map(l=>[l.code||'',l.name,l.quantity??'', 'No disponible','—','—','—']);
 autoTable(pdf,{startY:y,margin:{top:42,bottom:20,left:16,right:16},head:[['Código','Producto / servicio','Cant.','Precio unitario','Dto.','IVA','Total']],body:rows.map(r=>r.map(clean)),styles:{font:'helvetica',fontSize:8,cellPadding:2.5,overflow:'linebreak'},headStyles:{fillColor:wine},columnStyles:{0:{cellWidth:20},1:{cellWidth:48},2:{cellWidth:12},3:{cellWidth:29},4:{cellWidth:14},5:{cellWidth:12},6:{cellWidth:43}},rowPageBreak:'avoid'});
 y=pdf.lastAutoTable.finalY+8;
 paragraph('PROPUESTA ECONÓMICA',true);
 if(priced)paragraph('Descuento: '+money(amounts.discountCents/100));
 paragraph('Subtotal: '+money(priced?amounts.subtotalCents/100:q.subtotal));paragraph('IVA: '+money(priced?amounts.taxCents/100:q.tax));paragraph('Total: '+money(priced?amounts.totalCents/100:q.total),true);
 const days=(n,u)=>n+' '+(u==='WORKING_DAYS'?'días hábiles':'días calendario');
 paragraph('CONDICIONES COMERCIALES',true);
 for(const [label,value] of [['Garantía',q.warranty],['Forma de pago',q.paymentMethod],['Entrega',q.deliveryDays!=null?days(q.deliveryDays,q.deliveryUnit):q.deliveryTime],['Vigencia',q.validityDays!=null?days(q.validityDays,q.validityUnit):q.validUntil?date(q.validUntil):q.applicability],['Orden de compra',q.purchaseOrder],['Comentarios',q.comments]])if(value)paragraph(label+': '+clean(value));
 const count=pdf.getNumberOfPages();for(let i=1;i<=count;i++){pdf.setPage(i);if(logo)pdf.addImage(logo,'PNG',16,10,48,17.4);pdf.setFont('helvetica','bold');pdf.setFontSize(11);pdf.setTextColor(...wine);pdf.text('PROPUESTA TÉCNICA Y COMERCIAL',194,19,{align:'right'});pdf.setFontSize(9);pdf.text('DyD · Dinámica y Desarrollo S.A.S.',194,26,{align:'right'});pdf.setDrawColor(210);pdf.line(16,33,194,33);pdf.setFont('helvetica','normal');pdf.setTextColor(90);pdf.setFontSize(8);pdf.text(clean(q.number),16,286);pdf.text(`Página ${i} de ${count}`,194,286,{align:'right'});pdf.setTextColor(0);}
 return pdf;
}
export async function downloadQuotationPdf(q,accounts){
 const response=await fetch('/logo-sigmyp.png');if(!response.ok)throw Error('No se pudo cargar el logo de la cotización.');
 const logo=new Uint8Array(await response.arrayBuffer());const pdf=buildQuotationPdf(q,accounts,logo);
 pdf.save('Cotizacion-'+String(q.number||'SIGMYP').replace(/[^a-zA-Z0-9_-]/g,'_')+'.pdf');
}
