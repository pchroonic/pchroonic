(()=>{
  const receiptNumber=id=>{const compact=String(id||'').replace(/[^a-f0-9]/gi,'').toUpperCase();if(!compact)return'';return compact.length<16?`RCP-${compact}`:`RCP-${compact.slice(0,8)}-${compact.slice(8,16)}`};
  function decorateReceipts(){
    document.querySelectorAll('[data-admin-receipt]').forEach(btn=>{
      const no=receiptNumber(btn.dataset.adminReceipt);if(!no)return;
      btn.textContent=no;btn.title=`Download receipt ${no}`;btn.setAttribute('aria-label',`Download receipt ${no}`);btn.dataset.receiptNumber=no;
    });
  }
  function receiptTerm(){return String(document.getElementById('paymentSearch')?.value||'').trim().toUpperCase().replace(/\s+/g,'')}
  function filterReceiptRows(term){
    const table=document.querySelector('#paymentTable table');if(!table)return;
    const rows=[...table.querySelectorAll('tbody tr')],needle=term.replace(/[^A-Z0-9-]/g,'');let shown=0;
    for(const row of rows){const match=[...row.querySelectorAll('[data-admin-receipt]')].some(btn=>receiptNumber(btn.dataset.adminReceipt).includes(needle));row.hidden=!match;if(match)shown++}
    const summary=document.getElementById('adminPaymentSummary');if(summary)summary.textContent=`${shown} receipt match${shown===1?'':'es'} · search by Namdar receipt number`;
    if(!shown){const box=document.getElementById('paymentTable');if(box)box.innerHTML=`<div class="crm-empty">No payment found for receipt ${needle.replace(/[&<>"']/g,'')}.</div>`}
  }
  function wrap(){
    const original=window.renderPaymentTable;if(typeof original!=='function'||original.__namdarReceiptWrapped)return false;
    function enhanced(...args){
      const input=document.getElementById('paymentSearch'),term=receiptTerm();
      if(term.startsWith('RCP-')&&input){const value=input.value;input.value='';const result=original.apply(this,args);input.value=value;decorateReceipts();filterReceiptRows(term);return result}
      const result=original.apply(this,args);decorateReceipts();return result;
    }
    enhanced.__namdarReceiptWrapped=true;window.renderPaymentTable=enhanced;decorateReceipts();return true;
  }
  function boot(){if(wrap())return;setTimeout(boot,150)}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
