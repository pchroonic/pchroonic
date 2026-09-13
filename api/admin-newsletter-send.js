const {json,requireStaff,safeError}=require('../lib/server');
module.exports=async function(req,res){try{
  if(req.method!=='POST')return json(res,405,{ok:false,error:'Method not allowed'});
  await requireStaff(req,'newsletter');
  return json(res,409,{ok:false,error:'Namdar now uses the resumable Newsletter Centre. Refresh Admin, save a draft and send it from the Newsletter tab.'});
}catch(e){return safeError(res,e)}};
