import {jsPDF} from 'jspdf';
import {autoTable} from 'jspdf-autotable';
import {quotationText} from './quotation-presentation.js';
const clean=v=>quotationText(v??'').replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g,'');
const date=v=>/^\d{4}-\d{2}-\d{2}$/.test(v||'')?new Date(v+'T12:00:00Z').toLocaleDateString('es-CO',{day:'numeric',month:'short',year:'numeric',timeZone:'America/Bogota'}):clean(v);
export function buildProductionOrderPdf(order,logo=null){
 if(order.detailsPending||!Array.isArray(order.lines))throw Error('Carga el detalle completo de la orden antes de exportar.');
 const pdf=new jsPDF({unit:'mm',format:'letter',compress:true}),left=12.7,width=190.5,right=left+width;
 pdf.setProperties({title:'Orden de producción '+clean(order.number),creator:'SIGMYP'});
 const font=(bold=false,size=10)=>{pdf.setFont('helvetica',bold?'bold':'normal');pdf.setFontSize(size);pdf.setTextColor(0);};
 const shortDate=v=>{if(!/^\d{4}-\d{2}-\d{2}$/.test(v||''))return clean(v);const [year,month,day]=v.split('-');return Number(day)+' '+['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic'][Number(month)-1]+' '+year;};
 const metadata=[['',clean(order.number)],['Creado:',shortDate(order.date)],['Aprobado:',shortDate(order.approvalDate)],['Entrega:',shortDate(order.deliveryDate)],['Cotización:',clean(order.quotationNumber||order.quotationId)]];
 font(true,10);const labelWidths=metadata.map(([label])=>label?pdf.getTextWidth(label)+1:0);
 const metaRows=metadata.map(([label,value],i)=>{font(i===0,10);const separate=i===4;const lines=pdf.splitTextToSize(value,44-(separate?0:labelWidths[i]));return {label,lines,separate,height:Math.max(6.5,2.5+4*lines.length+(separate?4:0))};});
 font(false,12);const accountLines=pdf.splitTextToSize(clean(order.accountName),89);const headerHeight=Math.max(32,metaRows.reduce((n,r)=>n+r.height,0),17+accountLines.length*5);const tableTop=16+headerHeight+4;
 function header(){
  pdf.setDrawColor(0);pdf.setLineWidth(.25);pdf.rect(left,16,width,headerHeight);pdf.line(left+48,16,left+48,16+headerHeight);pdf.line(right-48,16,right-48,16+headerHeight);pdf.line(left+48,29,right-48,29);
  font(true,12);pdf.text('Orden de producción',left+width/2,23.5,{align:'center'});
  font(false,12);pdf.text(accountLines,left+width/2,29+(headerHeight-13)/2-(accountLines.length-1)*2.5+1.5,{align:'center',lineHeightFactor:1.15});
  let y=16;metaRows.forEach((row,i)=>{font(true,10);if(row.label)pdf.text(row.label,right-46,y+4.5);font(i===0,10);pdf.text(row.lines,right-46+(row.separate?0:labelWidths[i]),y+4.5+(row.separate?4:0),{lineHeightFactor:1.13});y+=row.height;if(i<4)pdf.line(right-48,y,right,y);});
  if(logo)pdf.addImage(logo,'PNG',left+10,16+(headerHeight-17)/2,28,17);
 }
 const styles={font:'helvetica',fontSize:10,textColor:0,cellPadding:2.5,lineColor:0,lineWidth:.2,overflow:'linebreak'};
 const table=options=>autoTable(pdf,{margin:{left,right:12.7,top:tableTop,bottom:17},theme:'grid',styles,rowPageBreak:'avoid',...options});
 table({startY:tableTop,head:[['Producto','Cantidad','Serial','Comentarios']],body:order.lines.length?order.lines.map(l=>[clean(l.name),clean(l.quantity),clean(l.serial),clean(l.comments)]):[[{content:'Sin productos registrados',colSpan:4}]],headStyles:{fillColor:[255,255,255],textColor:0,fontStyle:'bold',halign:'center'},columnStyles:{0:{cellWidth:86},1:{cellWidth:30,halign:'center'},2:{cellWidth:32},3:{cellWidth:42.5}}});
 let y=pdf.lastAutoTable.finalY;
 table({startY:y,body:[['Fecha de entrega de preinstalaciones',date(order.preinstallationDate)]],columnStyles:{0:{cellWidth:95.25,fillColor:[235,235,235]},1:{cellWidth:95.25}}});y=pdf.lastAutoTable.finalY+4;
 if(order.comments){table({startY:y,body:[['Comentarios de la orden',clean(order.comments)]],columnStyles:{0:{cellWidth:48,fillColor:[235,235,235]},1:{cellWidth:142.5}}});y=pdf.lastAutoTable.finalY+4;}
 // No placeholder signatures or copied names: only recorded values are printed.
 font();const verifier=pdf.splitTextToSize(clean(order.verifiedByName),86),verificationHeight=Math.max(45,41+verifier.length*4);
 if(y+verificationHeight>262){pdf.addPage();y=tableTop;}
 pdf.setDrawColor(0);pdf.setLineWidth(.25);pdf.rect(left,y,width,verificationHeight);font();pdf.text('Verificó',left+48,y+32,{align:'center'});pdf.line(left+96,y+35,right-4,y+35);pdf.text(verifier,left+143,y+40,{align:'center'});y+=verificationHeight+4;
 table({startY:y,body:[['Responsable de entrega de ítems',clean(order.itemsDeliveryResponsibleName)],['Fecha de entrega de ítems',date(order.itemsDeliveryDate)],['Ítems recibidos por',clean(order.itemsReceivedByName)]],columnStyles:{0:{cellWidth:95.25,fillColor:[235,235,235],halign:'center'},1:{cellWidth:95.25,halign:'center'}}});y=pdf.lastAutoTable.finalY+4;
 table({startY:y,body:[['Responsable de entrega',clean(order.deliveryResponsibleName)],['Fecha de entrega',date(order.actualDeliveryDate)],['Aprobó',clean(order.approvedByName)],['Aprobación',date(order.technicalApprovalDate)]],columnStyles:{0:{cellWidth:95.25,fillColor:[235,235,235],halign:'center'},1:{cellWidth:95.25,halign:'center'}}});
 for(let i=1;i<=pdf.getNumberOfPages();i++){pdf.setPage(i);header();font(false,8);pdf.text(clean(order.number),left,271);pdf.text('Página '+i+' de '+pdf.getNumberOfPages(),right,271,{align:'right'});}
 return pdf;
}
export async function downloadProductionOrderPdf(order){const response=await fetch('/procesos/logo-dyd-documento.png');if(!response.ok)throw Error('No se pudo cargar el logo. Intenta nuevamente.');const pdf=buildProductionOrderPdf(order,new Uint8Array(await response.arrayBuffer()));pdf.save('Orden-produccion-'+String(order.number||'SIGMYP').replace(/[^a-zA-Z0-9_-]/g,'_')+'.pdf');}
