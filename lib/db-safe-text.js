function dbSafeText(value='',max=100000){
  const input=String(value??'');
  let out='';
  const isAlphaNum=ch=>/[A-Za-z0-9]/.test(ch||'');
  for(let i=0;i<input.length&&out.length<max;i++){
    const code=input.charCodeAt(i);
    if(code===0){
      const prev=input[i-1]||'',next=input[i+1]||'';
      out+=isAlphaNum(prev)&&isAlphaNum(next)?'-':' ';
      continue;
    }
    if(code>=0xD800&&code<=0xDBFF){
      const next=input.charCodeAt(i+1);
      if(next>=0xDC00&&next<=0xDFFF){out+=input[i]+input[i+1];i++}
      else out+='�';
      continue;
    }
    if(code>=0xDC00&&code<=0xDFFF){out+='�';continue}
    if(code<32&&code!==9&&code!==10&&code!==13){out+=' ';continue}
    out+=input[i];
  }
  return out;
}
function dbSafeValue(value){
  if(typeof value==='string')return dbSafeText(value,100000);
  if(Array.isArray(value))return value.map(dbSafeValue);
  if(value&&typeof value==='object'){
    return Object.fromEntries(Object.entries(value).map(([k,v])=>[k,dbSafeValue(v)]));
  }
  return value;
}
module.exports={dbSafeText,dbSafeValue};
