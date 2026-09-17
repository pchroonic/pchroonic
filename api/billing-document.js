const { db, authUser, userProfile, queryParam, safeError } = require('../lib/server');
const { receiptNumber } = require('../lib/payment-receipts');
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
async function canView(user,profile,invoice){if(invoice.customer_id&&invoice.customer_id===user.id)return true;if(profile?.role==='admin')return true;if(profile?.role==='staff'){const a=(await db(`staff_access?user_id=eq.${encodeURIComponent(user.id)}&select=active,permissions&limit=1`))?.[0];return a?.active&&a?.permissions?.payments===true}return false}
module.exports=async function handler(req,res){
  try{
    if(req.method!=='GET'){res.statusCode=405;return res.end('Method not allowed')}
    const user=await authUser(req);if(!user?.id){res.statusCode=401;return res.end('Please sign in.')};const profile=await userProfile(user.id);
    const paymentId=String(queryParam(req,'payment_id')||'').trim(),invoiceIdInput=String(queryParam(req,'invoice_id')||'').trim();
    let payment=null,invoiceId=invoiceIdInput;if(paymentId){payment=(await db(`payment_records?id=eq.${encodeURIComponent(paymentId)}&select=*&limit=1`))?.[0];if(!payment){res.statusCode=404;return res.end('Payment not found.')}invoiceId=payment.invoice_id}
    if(!invoiceId){res.statusCode=400;return res.end('Invoice is required.')}
    const invoice=(await db(`invoices?id=eq.${encodeURIComponent(invoiceId)}&select=*&limit=1`))?.[0];if(!invoice){res.statusCode=404;return res.end('Invoice not found.')}
    if(!(await canView(user,profile,invoice))){res.statusCode=403;return res.end('You do not have access to this document.')}
    const booking=invoice.booking_id?(await db(`bookings?id=eq.${encodeURIComponent(invoice.booking_id)}&select=id,starts_at,ends_at,address,status,payment_status&limit=1`))?.[0]:null;
    const quote=invoice.quote_id?(await db(`quotes?id=eq.${encodeURIComponent(invoice.quote_id)}&select=id,customer_name,email,phone,postcode,service_key,final_price,automatic_estimate&limit=1`))?.[0]:null;
    const payments=await db(`payment_records?invoice_id=eq.${encodeURIComponent(invoice.id)}&select=*&order=paid_at.asc`);
    const service=({windows:'Window cleaning',gutters:'Gutter cleaning',roof:'Roof cleaning',jetwash:'Jet washing',handyman:'Handyman',tour3d:'3D property tour'})[quote?.service_key]||quote?.service_key||'Namdar service';
    const total=Number(invoice.total||0),paid=Number(invoice.amount_paid||0),outstanding=Math.max(0,total-paid);let lines=[];
    lines.push({text:'NAMDAR',x:50,y:792,size:22,bold:true},{text:'Property care services',x:50,y:772,size:10},{text:'namdar.co.uk  |  hello@namdar.co.uk',x:50,y:756,size:9});
    if(payment){
      const receiptNo=receiptNumber(payment);
      lines.push({text:'PAYMENT RECEIPT',x:365,y:792,size:18,bold:true},{text:`Receipt: ${receiptNo}`,x:365,y:770,size:9},{text:`Invoice: ${invoice.invoice_number}`,x:365,y:756,size:9});
      lines.push({text:'Received from',x:50,y:710,size:10,bold:true},{text:quote?.customer_name||'Namdar customer',x:50,y:694,size:10},{text:quote?.email||'',x:50,y:678,size:9});
      lines.push({text:'Payment details',x:50,y:635,size:12,bold:true},{text:`Date: ${datetime(payment.paid_at)}`,x:50,y:613,size:10},{text:`Type: ${payment.direction==='refund'?'Refund':payment.payment_kind}`,x:50,y:596,size:10},{text:`Method: ${String(payment.method||'other').replaceAll('_',' ')}`,x:50,y:579,size:10},{text:`Amount: ${money(payment.amount)}`,x:50,y:552,size:15,bold:true});
      if(payment.reference)lines.push({text:`Payment reference: ${payment.reference}`,x:50,y:529,size:9});
      lines.push({text:`Invoice total: ${money(total)}`,x:335,y:613,size:10},{text:`Net paid: ${money(paid)}`,x:335,y:596,size:10},{text:`Outstanding: ${money(outstanding)}`,x:335,y:579,size:10,bold:true});
      lines.push({text:`Quote ${receiptNo} if you contact Namdar about this transaction.`,x:50,y:480,size:9,bold:true},{text:'Thank you. This receipt records the transaction shown above.',x:50,y:460,size:9});
    }else{
      lines.push({text:'INVOICE',x:420,y:792,size:20,bold:true},{text:invoice.invoice_number,x:420,y:770,size:9},{text:`Status: ${String(invoice.status||'').replaceAll('_',' ')}`,x:420,y:756,size:9});
      lines.push({text:'Bill to',x:50,y:710,size:10,bold:true},{text:quote?.customer_name||'Namdar customer',x:50,y:694,size:10},{text:quote?.email||'',x:50,y:678,size:9},{text:String(booking?.address||quote?.postcode||'').slice(0,78),x:50,y:662,size:9});
      lines.push({text:`Issued: ${date(invoice.issued_at||invoice.created_at)}`,x:375,y:710,size:9},{text:`Due: ${date(invoice.due_at)}`,x:375,y:694,size:9},{text:`Booking: ${datetime(booking?.starts_at)}`,x:375,y:678,size:9});
      lines.push({text:'Description',x:50,y:615,size:10,bold:true},{text:'Amount',x:475,y:615,size:10,bold:true},{text:service,x:50,y:590,size:10},{text:money(total),x:475,y:590,size:10});
      lines.push({text:`Total: ${money(total)}`,x:365,y:535,size:12,bold:true},{text:`Paid: ${money(paid)}`,x:365,y:513,size:10},{text:`Outstanding: ${money(outstanding)}`,x:365,y:491,size:12,bold:true});
      let y=440;lines.push({text:'Payment history',x:50,y,size:10,bold:true});y-=20;if(!(payments||[]).length){lines.push({text:'No payments recorded yet.',x:50,y,size:9})}else for(const p of (payments||[]).slice(0,8)){lines.push({text:`${date(p.paid_at)}  ${receiptNumber(p)}  ${p.direction==='refund'?'Refund':'Payment'}  ${String(p.method||'').replaceAll('_',' ')}  ${money(p.amount)}`,x:50,y,size:9});y-=16}
      if(invoice.notes)lines.push({text:`Note: ${String(invoice.notes).slice(0,120)}`,x:50,y:245,size:9});
      lines.push({text:'Payment terms: amounts shown are in GBP. Please quote the invoice number with bank transfers.',x:50,y:210,size:8});
    }
    lines.push({text:'Namdar  |  London and surrounding areas  |  support@namdar.co.uk',x:50,y:70,size:8});
    const pdf=makePdf(lines),filename=payment?`Namdar-receipt-${receiptNumber(payment)}.pdf`:`Namdar-invoice-${invoice.invoice_number}.pdf`;
    res.statusCode=200;res.setHeader('Content-Type','application/pdf');res.setHeader('Content-Disposition',`attachment; filename="${filename}"`);res.setHeader('Cache-Control','no-store');res.setHeader('Content-Length',String(pdf.length));res.end(pdf);
  }catch(e){console.error(e);if(!res.headersSent){res.statusCode=e.status||500;res.end(e.status?e.message:'Could not create billing document.')}}
};
