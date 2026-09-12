(()=>{
  const originalFetch=window.fetch.bind(window);
  const visitorId=(crypto?.randomUUID?.()||`v_${Date.now()}_${Math.random().toString(36).slice(2)}`).replace(/[^A-Za-z0-9_-]/g,'_').slice(0,96);
  function urlOf(input){try{return new URL(typeof input==='string'?input:input?.url||'',location.origin)}catch{return null}}
  function postcodeArea(postcode=''){const outward=String(postcode||'').trim().toUpperCase().split(/\s+/)[0]||'';return (outward.match(/^[A-Z]{1,2}/)||[])[0]||''}
  async function recordPostcode(response,url){
    try{
      if(!response?.ok||url?.pathname!=='/api/postcode'||url.searchParams.get('service')!=='windows')return;
      const d=await response.clone().json(),area=postcodeArea(d.postcode);if(!d?.ok||!area)return;
      originalFetch('/api/conversion-event',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({eventType:'postcode_checked',visitorId,serviceKey:'windows',postcodeArea:area,covered:typeof d.coverage?.covered==='boolean'?d.coverage.covered:null}),keepalive:true}).catch(()=>null);
    }catch{}
  }
  window.fetch=async function(input,options={}){
    const url=urlOf(input);let next=options;
    if(url?.pathname==='/api/quote'&&String(options?.method||'GET').toUpperCase()==='POST'&&typeof options.body==='string'){
      try{const body=JSON.parse(options.body);if(body?.serviceKey==='windows'){body.visitorId=visitorId;next={...options,body:JSON.stringify(body)}}}catch{}
    }
    const response=await originalFetch(input,next);recordPostcode(response,url);return response;
  };
  window.NamdarFunnel={visitorId,postcodeArea};
})();
