'use strict';

const crypto=require('crypto');
const {db,serviceKey,auditLog}=require('./server');

function clientIp(req){
  const candidates=[req?.headers?.['cf-connecting-ip'],req?.headers?.['x-real-ip'],String(req?.headers?.['x-forwarded-for']||'').split(',')[0],req?.socket?.remoteAddress];
  return String(candidates.find(Boolean)||'unknown').trim().slice(0,180)||'unknown';
}
function identityHash(scope,value){
  return crypto.createHmac('sha256',serviceKey()).update(`${String(scope||'').slice(0,120)}|${String(value||'unknown').slice(0,500)}`).digest('hex').slice(0,48);
}
function secondsUntil(resetAt,windowSeconds){
  const ms=new Date(resetAt||0).getTime()-Date.now();
  if(!Number.isFinite(ms)||ms<=0)return Math.max(1,Number(windowSeconds)||60);
  return Math.max(1,Math.ceil(ms/1000));
}
async function consumeRateLimit(req,res,{scope,limit,windowSeconds,identity=null,message='Too many requests. Please wait a moment and try again.'}={}){
  if(!scope||!Number.isInteger(limit)||limit<1||!Number.isInteger(windowSeconds)||windowSeconds<1)throw new Error('Invalid security rate-limit configuration.');
  const source=identity==null?clientIp(req):String(identity);
  const rows=await db('rpc/consume_security_rate_limit',{method:'POST',body:{p_scope:String(scope).slice(0,120),p_key_hash:identityHash(scope,source),p_limit:limit,p_window_seconds:windowSeconds}});
  const state=rows?.[0]||{};
  const remaining=Math.max(0,Number(state.remaining)||0),retryAfter=secondsUntil(state.reset_at,windowSeconds);
  res?.setHeader?.('RateLimit-Limit',String(limit));
  res?.setHeader?.('RateLimit-Remaining',String(remaining));
  if(state.allowed===false){
    res?.setHeader?.('Retry-After',String(retryAfter));
    await auditLog(req,null,{action:'security.rate_limited',entityType:'endpoint',entityId:String(scope),summary:`Rate limit blocked ${scope}`,metadata:{scope:String(scope),limit,windowSeconds,retryAfter}});
    const error=new Error(message);error.status=429;error.retryAfter=retryAfter;throw error;
  }
  return{allowed:true,currentCount:Number(state.current_count)||1,remaining,resetAt:state.reset_at||null};
}
async function securityEvent(req,{action,entityType='security',entityId=null,summary='',metadata={}}={}){
  return auditLog(req,null,{action:String(action||'security.event').slice(0,120),entityType:String(entityType||'security').slice(0,120),entityId,summary:summary||action||'Security event',metadata});
}
module.exports={clientIp,identityHash,consumeRateLimit,securityEvent};
