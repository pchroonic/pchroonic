const {json,supabaseUrl,publicKey}=require('../lib/server');

module.exports=async function(req,res){
  if(req.method!=='GET')return json(res,405,{ok:false,error:'Method not allowed'});
  try{
    const key=publicKey();
    const r=await fetch(`${supabaseUrl()}/auth/v1/settings`,{headers:{apikey:key,Authorization:`Bearer ${key}`}});
    if(!r.ok)return json(res,200,{ok:true,providers:{google:null,apple:null,facebook:null},email:true,magicLink:true});
    const d=await r.json();
    const ext=d.external||{};
    const enabled=name=>{
      const v=ext[name];
      if(typeof v==='boolean')return v;
      if(v&&typeof v==='object')return v.enabled!==false;
      return false;
    };
    return json(res,200,{ok:true,providers:{google:enabled('google'),apple:enabled('apple'),facebook:enabled('facebook')},email:ext.email!==false&&d.disable_signup!==true,magicLink:ext.email!==false});
  }catch(e){
    console.warn('auth provider status',e.message);
    return json(res,200,{ok:true,providers:{google:null,apple:null,facebook:null},email:true,magicLink:true});
  }
};
