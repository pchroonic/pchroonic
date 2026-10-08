const HOST='namdar.co.uk';
const KEY='9b012fe757f449ddaf8832421f580676';
const KEY_LOCATION=`https://${HOST}/${KEY}.txt`;
const ENDPOINT='https://api.indexnow.org/indexnow';

function normaliseUrls(values){
  const out=[];
  for(const value of Array.isArray(values)?values:[values]){
    try{
      const u=new URL(String(value||'').trim());
      if(u.protocol!=='https:'||u.hostname!==HOST)continue;
      u.hash='';
      const href=u.href;
      if(!out.includes(href))out.push(href);
    }catch{}
  }
  return out.slice(0,10000);
}
async function submitIndexNow(values,{fetchImpl=global.fetch}={}){
  const urlList=normaliseUrls(values);
  if(!urlList.length)return {ok:true,skipped:true,status:null,urlList:[]};
  if(typeof fetchImpl!=='function')return {ok:false,status:null,error:'Fetch is unavailable.',urlList};
  try{
    const response=await fetchImpl(ENDPOINT,{
      method:'POST',
      headers:{'Content-Type':'application/json; charset=utf-8'},
      body:JSON.stringify({host:HOST,key:KEY,keyLocation:KEY_LOCATION,urlList})
    });
    const ok=response.status===200||response.status===202;
    return {ok,status:response.status,urlList,error:ok?null:`IndexNow returned HTTP ${response.status}`};
  }catch(error){
    return {ok:false,status:null,urlList,error:String(error?.message||error||'IndexNow request failed.').slice(0,240)};
  }
}
module.exports={HOST,KEY,KEY_LOCATION,ENDPOINT,normaliseUrls,submitIndexNow};
