const {receiptNumber}=require('./payment-receipts');

function ascii(v=''){return String(v??'').normalize('NFKD').replace(/[^\x20-\x7E]/g,'?')}
function pdfEsc(v=''){return ascii(v).replace(/\\/g,'\\\\').replace(/\(/g,'\\(').replace(/\)/g,'\\)')}
function money(v){return `GBP ${Number(v||0).toFixed(2)}`}
function date(v){if(!v)return'-';const d=new Date(v);return Number.isFinite(d.getTime())?d.toLocaleDateString('en-GB'):'-'}
function datetime(v){if(!v)return'-';const d=new Date(v);return Number.isFinite(d.getTime())?d.toLocaleString('en-GB',{dateStyle:'medium',timeStyle:'short'}):'-'}
function makePdf(lines){
  const ops=['BT'];
  for(const l of lines){const font=l.bold?'F2':'F1',size=l.size||10,x=l.x??50,y=l.y??760;ops.push(`/${font} ${size} Tf 1 0 0 1 ${x} ${y} Tm (${pdfEsc(l.text)}) Tj`)}
  ops.push('ET');const stream=ops.join('\n');
  const objs=[];
  objs[1]='<< /Type /Catalog /Pages 2 0 R >>';
  objs[2]='<< /Type /Pages /Kids [3 0 R] /Count 1 >>';
  objs[3]='<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 5 0 R /F2 6 0 R >> >> /Contents 4 0 R >>';
  objs[4]=`<< /Length ${Buffer.byteLength(stream,'latin1')} >>\nstream\n${stream}\nendstream`;
  objs[5]='<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>';
  objs[6]='<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>';
  let out='%PDF-1.4\n',offsets=[0];
  for(let i=1;i<=6;i++){offsets[i]=Buffer.byteLength(out,'latin1');out+=`${i} 0 obj\n${objs[i]}\nendobj\n`}
  const xref=Buffer.byteLength(out,'latin1');out+='xref\n0 7\n0000000000 65535 f \n';for(let i=1;i<=6;i++)out+=`${String(offsets[i]).padStart(10,'0')} 00000 n \n`;out+=`trailer\n<< /Size 7 /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;
  return Buffer.from(out,'latin1');
}
function buildInvoicePdf({invoice,booking=null,quote=null,payments=[]}={}){
  if(!invoice?.invoice_number)throw new Error('Invoice details are required.');
  const service=({windows:'Window cleaning',gutters:'Gutter cleaning',roof:'Roof cleaning',jetwash:'Jet washing',handyman:'Handyman',tour3d:'3D property tour'})[quote?.service_key]||quote?.service_key||'Namdar service';
  const total=Number(invoice.total||0),paid=Number(invoice.amount_paid||0),outstanding=Math.max(0,total-paid),lines=[];
  lines.push({text:'NAMDAR',x:50,y:792,size:22,bold:true},{text:'Property care services',x:50,y:772,size:10},{text:'namdar.co.uk  |  hello@namdar.co.uk',x:50,y:756,size:9});
  lines.push({text:'INVOICE',x:420,y:792,size:20,bold:true},{text:invoice.invoice_number,x:420,y:770,size:9},{text:`Status: ${String(invoice.status||'').replaceAll('_',' ')}`,x:420,y:756,size:9});
  lines.push({text:'Bill to',x:50,y:710,size:10,bold:true},{text:quote?.customer_name||'Namdar customer',x:50,y:694,size:10},{text:quote?.email||'',x:50,y:678,size:9},{text:String(booking?.address||quote?.postcode||'').slice(0,78),x:50,y:662,size:9});
  lines.push({text:`Issued: ${date(invoice.issued_at||invoice.created_at)}`,x:375,y:710,size:9},{text:`Due: ${date(invoice.due_at)}`,x:375,y:694,size:9},{text:`Booking: ${datetime(booking?.starts_at)}`,x:375,y:678,size:9});
  lines.push({text:'Description',x:50,y:615,size:10,bold:true},{text:'Amount',x:475,y:615,size:10,bold:true},{text:service,x:50,y:590,size:10},{text:money(total),x:475,y:590,size:10});
  lines.push({text:`Total: ${money(total)}`,x:365,y:535,size:12,bold:true},{text:`Paid: ${money(paid)}`,x:365,y:513,size:10},{text:`Outstanding: ${money(outstanding)}`,x:365,y:491,size:12,bold:true});
  const activePayments=(payments||[]).filter(p=>!p.voided_at);
  let y=440;lines.push({text:'Payment history',x:50,y,size:10,bold:true});y-=20;
  if(!activePayments.length)lines.push({text:'No payments recorded yet.',x:50,y,size:9});
  else for(const p of activePayments.slice(0,8)){lines.push({text:`${date(p.paid_at)}  ${receiptNumber(p)}  ${p.direction==='refund'?'Refund':'Payment'}  ${String(p.method||'').replaceAll('_',' ')}  ${money(p.amount)}`,x:50,y,size:9});y-=16}
  if(invoice.notes)lines.push({text:`Note: ${String(invoice.notes).slice(0,120)}`,x:50,y:245,size:9});
  lines.push({text:'Payment terms: amounts shown are in GBP. Please quote the invoice number with bank transfers.',x:50,y:210,size:8});
  lines.push({text:'Namdar  |  London and surrounding areas  |  support@namdar.co.uk',x:50,y:70,size:8});
  return{pdf:makePdf(lines),filename:`Namdar-invoice-${invoice.invoice_number}.pdf`};
}
module.exports={buildInvoicePdf};
