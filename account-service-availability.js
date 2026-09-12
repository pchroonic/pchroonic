(()=>{
  const fallback=[{serviceKey:'windows',name:'Window Cleaning',shortName:'Windows',status:'live',live:true}];
  function apply(services){
    const list=Array.isArray(services)&&services.length?services:fallback,live=list.filter(s=>s.status==='live');
    const select=document.getElementById('subscriptionService');
    if(select){
      const previous=select.value;
      select.innerHTML=live.map(s=>`<option value="${String(s.serviceKey).replace(/"/g,'&quot;')}">${String(s.name).replace(/[&<>]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;'}[c]))}</option>`).join('');
      if(live.some(s=>s.serviceKey===previous))select.value=previous;
      select.disabled=!live.length;
      const form=select.closest('form'),submit=form?.querySelector('button[type="submit"]');if(submit)submit.disabled=!live.length;
      const status=document.getElementById('subscriptionStatus');if(status&&!live.length)status.textContent='No recurring Namdar service is accepting new requests right now.';
    }
    const tour=list.find(s=>s.serviceKey==='tour3d'),tourLive=tour?.status==='live';
    const projectTab=document.querySelector('[data-portal-tab="projectsPanel"]');if(projectTab)projectTab.textContent=tourLive?'Projects & 3D':'Projects';
    const projectPanel=document.getElementById('projectsPanel');if(projectPanel){const h=projectPanel.querySelector('h2'),p=projectPanel.querySelector('p');if(h)h.textContent=tourLive?'My completed work & 3D tours':'My completed work';if(p)p.textContent=tourLive?'Your before/after results and 3D property links appear here. You can publish a share link for a project when you want.':'Your completed Namdar work and any private before/after results appear here.';}
    const ticket3d=document.querySelector('#ticketCategory option[value="3d"]');if(ticket3d)ticket3d.hidden=!tourLive;
    const meta=document.querySelector('meta[name="description"]');if(meta)meta.content='Manage your Namdar account, window-cleaning quotes, bookings, billing, support and rewards.';
  }
  const boot=()=>{apply(fallback);fetch('/api/public-data',{headers:{Accept:'application/json'}}).then(r=>r.ok?r.json():Promise.reject()).then(d=>apply(d.services||fallback)).catch(()=>apply(fallback));};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
