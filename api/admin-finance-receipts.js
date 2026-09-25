const crypto=require('crypto');
const {json,parseBody,db,requireStaff,auditLog,queryParam,safeError}=require('../lib/server');
const {extractReceipt,merchantKey}=require('../lib/receipt-intelligence');
const {dbSafeText,dbSafeValue}=require('../lib/db-safe-text');

const TYPES=new Map([
  ['image/jpeg','jpg'],['image/png','png'],['image/webp','webp'],['application/pdf','pdf']
]);
const clean=(v,max=500)=>String(v||'').trim().slice(0,max);
const bad=message=>Object.assign(new Error(message),{status:400});
const hex64=v=>/^[a-f0-9]{64}$/i.test(String(v||''));
const canEdit=staff=>staff?.profile?.role==='admin'||staff?.permissions?.all===true||staff?.permissions?.settings===true;
async function receipt(id){return (await db(`business_expense_receipts?id=eq.${encodeURIComponent(id)}&select=*&limit=1`).catch(()=>[]))?.[0]||null}
async function learnedRule(key){if(!key)return null;return (await db(`business_expense_merchant_rules?merchant_key=eq.${encodeURIComponent(key)}&select=*&limit=1`).catch(()=>[]))?.[0]||null}
async function duplicateExpenses(suggestion){
  if(!suggestion?.expenseDate||!Number.isFinite(Number(suggestion.amount)))return[];
  const rows=await db(`business_expenses?expense_date=eq.${encodeURIComponent(suggestion.expenseDate)}&amount=eq.${encodeURIComponent(Number(suggestion.amount).toFixed(2))}&select=id,expense_date,supplier,description,amount,receipt_reference,source&limit=20`).catch(()=>[]);
  const key=merchantKey(suggestion.supplier||'');
  return (rows||[]).filter(x=>!key||!x.supplier||merchantKey(x.supplier)===key).map(x=>({id:x.id,expenseDate:x.expense_date,supplier:x.supplier||'',description:x.description||'',amount:Number(x.amount||0),hasReceipt:Boolean(x.receipt_reference),source:x.source||'manual'}));
}
module.exports=async function handler(req,res){
  try{
    if(req.method==='GET'){
      const staff=await requireStaff(req,'analytics'),limit=Math.min(100,Math.max(1,Number(queryParam(req,'limit','30'))||30));
      const rows=await db(`business_expense_receipts?select=id,expense_id,storage_path,original_name,mime_type,file_size,sha256,extracted_data,extraction_confidence,extraction_method,status,created_at,updated_at&order=created_at.desc&limit=${limit}`).catch(()=>[]);
      return json(res,200,{ok:true,canEdit:canEdit(staff),receipts:rows||[]});
    }
    if(req.method!=='POST')return json(res,405,{ok:false,error:'Method not allowed'});
    const staff=await requireStaff(req,'settings'),body=parseBody(req),action=clean(body.action,40);
    if(action==='prepare'){
      const originalName=clean(body.fileName,240),mimeType=clean(body.mimeType,100),fileSize=Math.max(0,Number(body.fileSize)||0),sha256=clean(body.sha256,64).toLowerCase();
      if(!originalName)throw bad('Receipt file name is required.');
      if(!TYPES.has(mimeType))throw bad('Use a JPG, PNG, WebP or PDF receipt.');
      if(fileSize<=0||fileSize>10*1024*1024)throw bad('Receipt files must be between 1 byte and 10 MB.');
      if(!hex64(sha256))throw bad('Receipt fingerprint is invalid.');
      const existing=(await db(`business_expense_receipts?sha256=eq.${encodeURIComponent(sha256)}&status=neq.rejected&select=id,expense_id,storage_path,original_name,mime_type,status,created_at&order=created_at.desc&limit=1`).catch(()=>[]))?.[0]||null;
      if(existing&&!existing.expense_id&&['error','review'].includes(existing.status)){
        await db(`business_expense_receipts?id=eq.${encodeURIComponent(existing.id)}`,{method:'PATCH',prefer:'return=minimal',body:{status:'uploading',updated_by:staff.user.id,updated_at:new Date().toISOString()}});
        return json(res,200,{ok:true,duplicate:false,retry:true,receipt:{id:existing.id,storagePath:existing.storage_path,originalName:existing.original_name,mimeType:existing.mime_type}});
      }
      if(existing)return json(res,200,{ok:true,duplicate:true,receipt:existing,message:existing.expense_id?'This exact receipt file is already attached to an expense.':'This exact receipt file was already uploaded and can be reviewed instead of duplicated.'});
      const id=crypto.randomUUID(),month=new Date().toISOString().slice(0,7),ext=TYPES.get(mimeType),storagePath=`${staff.user.id}/${month}/${id}.${ext}`;
      const row={id,storage_path:storagePath,original_name:originalName,mime_type:mimeType,file_size:fileSize,sha256,status:'uploading',created_by:staff.user.id,updated_by:staff.user.id,created_at:new Date().toISOString(),updated_at:new Date().toISOString()};
      const created=(await db('business_expense_receipts',{method:'POST',prefer:'return=representation',body:row}))?.[0]||row;
      await auditLog(req,staff,{action:'finance.receipt_prepare',entityType:'business_expense_receipt',entityId:id,summary:'Prepared private finance receipt upload',metadata:{mimeType,fileSize}});
      return json(res,201,{ok:true,duplicate:false,receipt:{id:created.id,storagePath:created.storage_path,originalName:created.original_name,mimeType:created.mime_type}});
    }
    if(action==='analyze'){
      const id=clean(body.receiptId,80),ocrText=dbSafeText(body.ocrText,100000);
      if(!id)throw bad('Receipt ID is required.');
      const row=await receipt(id);if(!row)throw Object.assign(new Error('Receipt not found.'),{status:404});
      if(row.expense_id)return json(res,409,{ok:false,error:'This receipt is already attached to an expense.'});
      if(ocrText.trim().length<8)throw bad('Not enough receipt text could be read. Try a clearer image or enter the expense manually.');
      let suggestion=dbSafeValue(extractReceipt(ocrText,null)),rule=await learnedRule(suggestion.merchantKey);
      if(rule)suggestion=dbSafeValue(extractReceipt(ocrText,rule));
      const duplicates=await duplicateExpenses(suggestion),confidence=Number(suggestion.overallConfidence||0);
      const patch={ocr_text:ocrText,extracted_data:suggestion,extraction_confidence:confidence,extraction_method:clean(body.extractionMethod,80)||'browser_ocr_v1',status:'review',updated_by:staff.user.id,updated_at:new Date().toISOString()};
      await db(`business_expense_receipts?id=eq.${encodeURIComponent(id)}`,{method:'PATCH',prefer:'return=minimal',body:patch});
      await auditLog(req,staff,{action:'finance.receipt_analyze',entityType:'business_expense_receipt',entityId:id,summary:'Analyzed receipt into an expense draft',after:{supplier:suggestion.supplier||null,expense_date:suggestion.expenseDate||null,amount:suggestion.amount,category:suggestion.category,confidence},metadata:{duplicateCandidates:duplicates.length,learnedRuleApplied:suggestion.learnedRuleApplied===true}});
      return json(res,200,{ok:true,receiptId:id,suggestion,duplicateExpenses:duplicates});
    }
    if(action==='error'){
      const id=clean(body.receiptId,80),row=await receipt(id);if(!row)throw Object.assign(new Error('Receipt not found.'),{status:404});
      await db(`business_expense_receipts?id=eq.${encodeURIComponent(id)}`,{method:'PATCH',prefer:'return=minimal',body:{status:'error',updated_by:staff.user.id,updated_at:new Date().toISOString()}});
      return json(res,200,{ok:true});
    }
    if(action==='discard'){
      const id=clean(body.receiptId,80),row=await receipt(id);if(!row)return json(res,200,{ok:true});
      if(row.expense_id)return json(res,409,{ok:false,error:'Attached receipts cannot be discarded without first deleting or changing the expense.'});
      await db(`business_expense_receipts?id=eq.${encodeURIComponent(id)}`,{method:'DELETE',prefer:'return=minimal'});
      await auditLog(req,staff,{action:'finance.receipt_discard',entityType:'business_expense_receipt',entityId:id,summary:'Discarded unattached receipt draft'});
      return json(res,200,{ok:true,storagePath:row.storage_path});
    }
    return json(res,400,{ok:false,error:'Unknown receipt action.'});
  }catch(error){return safeError(res,error)}
};
