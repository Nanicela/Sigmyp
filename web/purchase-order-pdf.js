import {jsPDF} from 'jspdf';
import {autoTable} from 'jspdf-autotable';
import {quotationText} from './quotation-presentation.js';
const clean=v=>quotationText(v).replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g,'');
const money=c=>c==null?'No disponible':new Intl.NumberFormat('es-CO',{style:'currency',currency:'COP',minimumFractionDigits:0,maximumFractionDigits:2}).format(c/100);
const date=v=>/^\d{4}-\d{2}-\d{2}$/.test(v||'')?new Date(v+'T12:00:00Z').toLocaleDateString('es-CO',{day:'numeric',month:'short',year:'numeric',timeZone:'America/Bogota'}):v||'';
export function buildPurchaseOrderPdf(order,logo=null,supplier={},certification=null){
 const pdf=new jsPDF({unit:'mm',format:'letter'}),left=12.7,right=203.2,width=190.5;
 pdf.setProperties({title:'Orden de compra '+(order.number||''),creator:'SIGMYP'});
 function font(bold=false,size=10){pdf.setFont('helvetica',bold?'bold':'normal');pdf.setFontSize(size);pdf.setTextColor(0);}
 function border(x,y,w,h){pdf.setDrawColor(0);pdf.setLineWidth(.35);pdf.roundedRect(x,y,w,h,2,2);}
 // Measure rich labels before drawing so long addresses expand both boxes equally.
 function fields(rows,w){return rows.map(([label,value])=>{font(true);const labelWidth=pdf.getTextWidth(label+': ');font();const words=clean(value||'').split(/\s+/);let first='';while(words.length&&pdf.getTextWidth((first?first+' ':'')+words[0])<=w-4-labelWidth)first+=(first?' ':'')+words.shift();const rest=words.length?pdf.splitTextToSize(words.join(' '),w-4):[];return {label,labelWidth,lines:[first,...rest]};});}
 function height(rows){return rows.reduce((h,r)=>h+r.lines.length*4.2,4);}
 function drawFields(rows,x,y){let cursor=y+4.5;for(const r of rows){font(true);pdf.text(r.label+': ',x+2,cursor);font();pdf.text(r.lines[0],x+2+r.labelWidth,cursor);if(r.lines.length>1)pdf.text(r.lines.slice(1),x+2,cursor+4.2,{lineHeightFactor:4.2/(10*25.4/72)});cursor+=r.lines.length*4.2;}}
 const payment=order.paymentDays??order.paymentMethod;
 const paymentText=String(payment)==='0'?'Contado':/^\d+$/.test(String(payment))?payment+' días':payment||'';
 const a=fields([['Nombre',order.supplierName||supplier.name],['NIT',supplier.identification],['Dirección',supplier.address],['Teléfono 1',supplier.phone1],['Teléfono 2',supplier.phone2],['Email',supplier.email],['Ciudad',supplier.city]],85);
 const b=fields([['Orden de compra',order.number],['Creación',date(order.date)],['Dirección de envío',order.deliveryAddress],['Forma de pago',paymentText],['Fecha esperada',date(order.deliveryDate)]],85);
 const top=46,h=Math.max(height(a),height(b));border(left,top,85,h);border(right-85,top,85,h);drawFields(a,left,top);drawFields(b,right-85,top);
 const tableStart=top+h+4;
 autoTable(pdf,{startY:tableStart,margin:{top:46,bottom:17,left,right:12.7},theme:'grid',head:[['Nombre','Descripción','Cantidad','Costo','Total']],body:(order.lines||[]).map(l=>[l.description,l.detailDescription||'',l.quantityUnits/1000,money(l.unitPriceCents),money(l.subtotalCents??Math.round(l.unitPriceCents*l.quantityUnits/1000))].map(clean)),styles:{font:'helvetica',fontSize:10,textColor:0,cellPadding:2.2,lineColor:[215,215,215],lineWidth:.1,overflow:'linebreak'},headStyles:{fillColor:[255,255,255],textColor:0,halign:'center',fontStyle:'bold'},columnStyles:{0:{cellWidth:54.5},1:{cellWidth:54.5},2:{cellWidth:27,halign:'center'},3:{cellWidth:27.25,halign:'right'},4:{cellWidth:27.25,halign:'right'}},rowPageBreak:'avoid',didDrawPage:data=>{const start=data.pageNumber===1?tableStart:46;border(left,start,width,data.cursor.y-start);}});
 let y=pdf.lastAutoTable.finalY+4;
 const rates=[...new Set((order.lines||[]).map(l=>l.rate).filter(r=>r!=null))];
 const sums=[['Subtotal',money(order.totals?.subtotalCents)],['Impuesto',rates.length?rates.join(' % / ')+' %':''],['Valor del impuesto',money(order.totals?.taxCents)],['Total',money(order.totals?.totalCents??(order.total==null?null:Math.round(order.total*100)))]];
 font();let comments=pdf.splitTextToSize(clean(order.comments||''),105);if(!comments.length)comments=[''];
 // Split long comments without cutting off text or displacing the footer.
 let first=true;
 do{if(y+22>258){pdf.addPage();y=46;}const capacity=Math.max(1,Math.floor((258-y-8)/4.2));const chunk=comments.splice(0,capacity),boxHeight=Math.max(20,8+chunk.length*4.2);border(left,y,109,boxHeight);font(true);pdf.text(first?'Comentarios':'Comentarios (continuación)',left+2,y+4.5);font();pdf.text(chunk,left+2,y+9);
 if(first){border(right-68,y,68,20);sums.forEach(([label,value],i)=>{font(true);pdf.text(label+':',right-66,y+4.5+i*4.2);font();pdf.text(value,right-2,y+4.5+i*4.2,{align:'right'});});}y+=boxHeight+5;first=false;}while(comments.length);
 if(y+42>258){pdf.addPage();y=46;}
 font();pdf.text('Usuario que solicita',left+2,y+2);pdf.text('Usuario que aprueba',right-2,y+2,{align:'right'});
 font(true);pdf.text(clean(order.requesterName||''),left+2,y+31);pdf.text(clean(order.approval?.approvedEmail||''),right-2,y+31,{align:'right'});
 font();pdf.text(clean(order.requesterPosition||''),left+2,y+37);
 const pages=pdf.getNumberOfPages();for(let page=1;page<=pages;page++){pdf.setPage(page);font(true);pdf.text(['DyD Dinámica y Desarrollo SAS.','NIT: 900.153.645-1','IVA Régimen Común','PBX: (574) 448 83 93','Km 34. Autopista Medellín Bogotá. 200m antes del','Batallón Juan del Corral. Rionegro, Antioquia.'],108,16,{align:'center',lineHeightFactor:1.15});if(logo)pdf.addImage(logo,'PNG',160,14,40,24);if(certification)pdf.addImage(certification,'PNG',15,14,16,29);if(pages>1){font(false,8);pdf.text(clean(order.number||'SIGMYP'),left,271);pdf.text(`Página ${page} de ${pages}`,right,271,{align:'right'});}}
 return pdf;
}
export async function downloadPurchaseOrderPdf(order,suppliers=[]){
 const images=await Promise.all(['/procesos/logo-dyd-documento.png','/procesos/logo-icontec-documento.png'].map(async url=>{const r=await fetch(url);if(!r.ok)throw Error('No se pudo cargar el encabezado. Intenta nuevamente.');return new Uint8Array(await r.arrayBuffer());}));
 const pdf=buildPurchaseOrderPdf(order,images[0],suppliers.find(s=>s.id===order.supplierId)||{},images[1]);
 pdf.save('Orden-compra-'+String(order.number||'SIGMYP').replace(/[^a-zA-Z0-9_-]/g,'_')+'.pdf');
}
