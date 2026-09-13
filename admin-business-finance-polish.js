(()=>{
  const setupBannerId='businessFinanceSetupBanner';
  const setupBlockId='businessFinanceSetupBlocked';

  function labelFor(id){return document.getElementById(id)?.closest('label')||null}
  function savedValue(input){return String(input?.defaultValue||'').trim()}

  function apply(){
    const panel=document.getElementById('businessFinancePanel');
    if(!panel)return;

    const businessType=document.getElementById('financeBusinessType');
    const startDate=document.getElementById('financeStartDate');
    const incorporationDate=document.getElementById('financeIncorporationDate');
    const vatRegistered=document.getElementById('financeVatRegistered');
    const vatDate=document.getElementById('financeVatDate');

    const incorporationLabel=labelFor('financeIncorporationDate');
    if(incorporationLabel)incorporationLabel.hidden=businessType?.value!=='limited_company';

    const vatDateLabel=labelFor('financeVatDate');
    if(vatDateLabel)vatDateLabel.hidden=!vatRegistered?.checked;

    const soleTraderNeedsStart=businessType?.value==='sole_trader'&&!savedValue(startDate);
    const notice=document.getElementById('businessFinanceNotice');
    let banner=document.getElementById(setupBannerId);

    if(soleTraderNeedsStart){
      if(!banner&&notice){
        banner=document.createElement('div');
        banner.id=setupBannerId;
        banner.className='crm-note warning';
        banner.style.marginTop='12px';
        banner.innerHTML='<strong>Finish finance setup:</strong> enter and save the actual date Namdar started trading as a sole trader. Until that date is saved, tax filing deadlines and reserve estimates are intentionally hidden so £0 placeholders are not mistaken for a completed tax position.';
        notice.insertAdjacentElement('afterend',banner);
      }
      const tax=document.getElementById('businessFinanceTax');
      if(tax&&!document.getElementById(setupBlockId)){
        tax.innerHTML=`<div id="${setupBlockId}" class="crm-note warning"><strong>Tax timeline not activated yet.</strong><br>Save the sole-trader start date in Finance settings to activate the relevant tax-year filing timeline and tax-reserve estimate. Cash, invoice and expense tracking can still be used now.</div>`;
      }
    }else if(banner){
      banner.remove();
    }

    for(const el of [businessType,vatRegistered]){
      if(el&&!el.dataset.financePolishBound){
        el.dataset.financePolishBound='1';
        el.addEventListener('change',()=>queueMicrotask(apply));
      }
    }
  }

  let queued=false;
  function queue(){
    if(queued)return;
    queued=true;
    requestAnimationFrame(()=>{queued=false;apply()});
  }

  new MutationObserver(queue).observe(document.documentElement,{childList:true,subtree:true});
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',queue,{once:true});
  else queue();
})();
