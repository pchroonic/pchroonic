(()=>{
  let installed=false;
  const fmt=value=>{try{return new Date(value).toLocaleTimeString('en-GB',{hour:'2-digit',minute:'2-digit'})}catch{return''}};
  function enhance(rows){
    for(const job of rows||[]){
      if(job.workStatus!=='on_my_way'||!job.estimatedArrivalAt)continue;
      const card=document.querySelector(`[data-booking-card="${CSS.escape(job.id)}"]`),banner=card?.querySelector('.customer-live-banner');if(!banner)continue;
      const time=fmt(job.estimatedArrivalAt),mins=Number(job.onMyWayEtaMinutes||0);
      banner.innerHTML=`🚐 Your Namdar team member is on the way.${time?` Expected around <strong>${time}</strong>${mins?` (about ${mins} min)`:''}.`:''}`;
      banner.setAttribute('aria-live','polite');
    }
  }
  function install(){
    if(installed||typeof renderBookings!=='function'){setTimeout(install,60);return}
    installed=true;const base=renderBookings;
    renderBookings=async function(rows){const result=await base(rows);enhance(rows);return result};
    if(typeof customerJobCache!=='undefined'&&customerJobCache?.length)enhance(customerJobCache);
  }
  install();
})();
