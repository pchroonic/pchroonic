const {json,db,requireCustomer,sendEmail,requestOrigin,safeError}=require('../lib/server');
module.exports=async function(req,res){try{if(req.method!=='POST')return json(res,405,{ok:false,error:'Method not allowed'});const {user,profile}=await requireCustomer(req);
  await db(`account_deletion_requests?customer_id=eq.${encodeURIComponent(user.id)}&status=in.(pending_verification,verified)`,{method:'DELETE'}).catch(()=>null);
  const rows=await db('account_deletion_requests',{method:'POST',prefer:'return=representation',body:{customer_id:user.id}});const r=rows[0];const origin=requestOrigin(req);
  await sendEmail({to:user.email,subject:'Confirm deletion of your Namdar account',html:`<p>Hi ${profile.full_name||''},</p><p>You asked to delete your Namdar account. Click below to confirm.</p><p><a href="${origin}/account-delete?token=${r.verify_token}">Confirm account deletion</a></p><p>After confirmation, the account enters a 30-day recovery period before permanent deletion.</p><p>If you did not request this, ignore this email.</p>`});
  return json(res,200,{ok:true,message:'We sent a confirmation link to your email.'});
}catch(e){return safeError(res,e)}};
