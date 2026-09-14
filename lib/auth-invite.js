'use strict';

const {supabaseUrl,serviceKey,requestOrigin}=require('./server');

async function inviteUserByEmail(req,email,{data={}}={}){
  const cleanEmail=String(email||'').trim().toLowerCase();
  if(!cleanEmail||!cleanEmail.includes('@')){const error=new Error('A valid email address is required.');error.status=400;throw error}
  const origin=requestOrigin(req),redirectTo=`${origin}/account?tab=security&invited=1`;
  const url=new URL(`${supabaseUrl()}/auth/v1/invite`);url.searchParams.set('redirect_to',redirectTo);
  const key=serviceKey();
  const response=await fetch(url,{method:'POST',headers:{apikey:key,Authorization:`Bearer ${key}`,'Content-Type':'application/json'},body:JSON.stringify({email:cleanEmail,data})});
  const text=await response.text();let payload=null;
  if(text){try{payload=JSON.parse(text)}catch{payload={message:text}}}
  if(!response.ok){const error=new Error(payload?.msg||payload?.message||payload?.error_description||`Invitation could not be sent (${response.status}).`);error.status=response.status;error.details=payload;throw error}
  const user=payload?.user||payload;
  if(!user?.id){const error=new Error('The invitation provider did not return a user account.');error.status=502;throw error}
  return{user,redirectTo};
}

module.exports={inviteUserByEmail};
