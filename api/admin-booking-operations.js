const {json,parseBody,db,requireStaff,auditLog,safeError}=require('../lib/server');
const {sanitizeRules,operationsPreview}=require('../lib/booking-operations');

async function currentRow(){return (await db('site_settings?key=eq.booking_operations&select=*&limit=1').catch(()=>[]))?.[0]||null}

module.exports=async function handler(req,res){
  try{
    if(req.method==='GET'){
      await requireStaff(req,'bookings');
      const preview=await operationsPreview(db,new Date(),14);
      return json(res,200,{ok:true,...preview});
    }
    if(req.method!=='POST')return json(res,405,{ok:false,error:'Method not allowed'});
    const staff=await requireStaff(req,'settings'),body=parseBody(req),action=String(body.action||'save');
    if(action!=='save')return json(res,400,{ok:false,error:'Unknown booking operations action.'});
    const before=await currentRow(),rules=sanitizeRules(body.rules||{}),now=new Date().toISOString();
    await db('site_settings?on_conflict=key',{method:'POST',prefer:'resolution=merge-duplicates,return=representation',body:{key:'booking_operations',value:rules,updated_by:staff.user.id,updated_at:now}});
    const after=await currentRow();
    await auditLog(req,staff,{action:'booking_operations.update',entityType:'site_settings',entityId:'booking_operations',summary:`Booking operations updated: ${rules.operatingDays.length} operating days, ${rules.enabledWindows.length} windows, ${rules.maxJobsPerDay} jobs/day`,before,after});
    const preview=await operationsPreview(db,new Date(),14);
    return json(res,200,{ok:true,...preview});
  }catch(error){return safeError(res,error)}
};
