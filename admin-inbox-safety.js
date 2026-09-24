(()=>{
  if(window.__NAMDAR_INBOX_SAFETY__)return;
  window.__NAMDAR_INBOX_SAFETY__=true;

  let inboxBlockRules=[];
  let inboxBulkMode=false;
  const inboxBulkSelected=new Set();
  const baseStatusLabel=supportInboxStatusLabel;
  const baseTools=supportInboxTools;
  const baseOpen=openSupportInboxThread;
  const basePatch=patchSupportInboxThread;
  const baseRenderList=renderSupportInboxList;
  const baseAttachmentLabel=attachmentLabel;
  const SHARED_PROVIDER_DOMAINS=new Set(['gmail.com','googlemail.com','outlook.com','hotmail.com','live.com','yahoo.com','icloud.com','me.com','proton.me','protonmail.com','aol.com','namdar.co.uk']);

  const senderDomain=email=>{
    const value=String(email||'').trim().toLowerCase();
    const at=value.lastIndexOf('@');
    return at>0?value.slice(at+1):'';
  };

  attachmentLabel=function(a={}){
    const label=baseAttachmentLabel(a);
    if(a.risk==='blocked')return`⚠ Unsafe attachment · ${label}`;
    if(a.risk==='caution')return`⚠ Check attachment · ${label}`;
    return label;
  };

  function ensureInboxSafetyUi(){
    const select=$('#supportInboxStatus');
    if(select&&!select.querySelector('option[value="spam"]')){
      const option=document.createElement('option');
      option.value='spam';option.textContent='Spam / quarantined';
      select.insertBefore(option,select.querySelector('option[value="all"]'));
    }

    const kpis=document.querySelector('#inbox .support-inbox-kpis');
    if(kpis&&!$('#supportInboxSpamCount')){
      const allBtn=kpis.querySelector('[data-inbox-quick="all"]');
      const btn=document.createElement('button');
      btn.type='button';btn.className='support-inbox-kpi inbox-spam-kpi';btn.dataset.inboxQuick='spam';
      btn.innerHTML='<small>Spam</small><strong id="supportInboxSpamCount">0</strong><span>Quarantined mail</span>';
      kpis.insertBefore(btn,allBtn||null);
      btn.onclick=()=>{if(select){select.value='spam';saveSupportInboxView();renderSupportInboxList();}};
    }

    const refreshLine=document.querySelector('#inbox .support-inbox-refresh-line');
    if(refreshLine&&!$('#inboxSafetyPanel')){
      const panel=document.createElement('details');
      panel.id='inboxSafetyPanel';
      panel.className='inbox-safety-panel';
      panel.innerHTML=`<summary><span><strong>Spam & security protection</strong><small>Quarantine junk, phishing and dangerous mail before it reaches the working inbox.</small></span><span id="inboxBlockCount" class="crm-chip">0 blocked</span></summary>
        <div class="inbox-safety-body">
          <div class="inbox-safety-note"><strong>Security checks are active.</strong><span>Signed webhook verification, unknown-address rejection, duplicate/campaign detection, sender-authentication checks and dangerous-attachment quarantine run before staff are notified.</span></div>
          <div class="inbox-safety-note"><strong>False-positive protection remains conservative.</strong><span>Known customers and genuine Namdar reply threads bypass marketing heuristics. Shared providers such as Gmail and Outlook can only be blocked by exact sender, not by whole domain.</span></div>
          <div id="inboxBlockedRules"><div class="crm-empty"><span>Blocked sender and domain rules load for administrators.</span></div></div>
        </div>`;
      refreshLine.insertAdjacentElement('afterend',panel);
      panel.addEventListener('toggle',()=>{if(panel.open)loadInboxBlockRules().catch(()=>null)});
    }
  }

  restoreSupportInboxView=function(){
    try{
      const v=JSON.parse(sessionStorage.getItem(SUPPORT_INBOX_VIEW_KEY)||'null');
      if(v&&['open','awaiting_staff','awaiting_customer','closed','spam','all'].includes(v.status)&&$('#supportInboxStatus'))$('#supportInboxStatus').value=v.status;
      if(v&&['all','support','bookings','accounts','hello'].includes(v.mailbox)&&$('#supportInboxMailbox'))$('#supportInboxMailbox').value=v.mailbox;
    }catch{}
  };

  supportInboxStatusLabel=function(v=''){
    if(v==='spam')return'Spam';
    return baseStatusLabel(v);
  };

  supportInboxVisibleThreads=function(){
    const {term,status,mailbox}=supportInboxFilterState();
    const rows=(supportInboxCache||[]).filter(t=>{
      const hay=`${t.customer_name||''} ${t.customer_email||''} ${t.subject||''} ${t.last_message_preview||''}`.toLowerCase();
      const statusOk=status==='all'||(status==='open'&&!['closed','spam'].includes(t.status))||t.status===status;
      const mailOk=mailbox==='all'||t.mailbox===mailbox||(['accounts','billing'].includes(mailbox)&&['accounts','billing'].includes(t.mailbox));
      return(!term||hay.includes(term))&&statusOk&&mailOk;
    });
    if(['closed','spam'].includes(status))rows.sort((a,b)=>new Date(b.updated_at||b.last_message_at)-new Date(a.updated_at||a.last_message_at));
    return rows;
  };

  updateSupportInboxSummary=function(){
    ensureInboxSafetyUi();
    const rows=supportInboxVisibleThreads(),all=supportInboxCache||[];
    const active=all.filter(x=>x.status!=='spam');
    const needs=active.filter(x=>x.status==='awaiting_staff').length;
    const waiting=active.filter(x=>x.status==='awaiting_customer').length;
    const open=active.filter(x=>x.status!=='closed').length;
    const closed=active.filter(x=>x.status==='closed').length;
    const spam=all.filter(x=>x.status==='spam').length;
    const unread=active.reduce((a,t)=>a+Number(t.unread_count||0),0);
    const status=$('#supportInboxStatus')?.value||'open';
    if($('#supportInboxSummary'))$('#supportInboxSummary').textContent=`${rows.length} shown · ${unread} unread${spam?` · ${spam} spam`:''}`;
    if($('#supportInboxNeedsReply'))$('#supportInboxNeedsReply').textContent=needs;
    if($('#supportInboxWaiting'))$('#supportInboxWaiting').textContent=waiting;
    if($('#supportInboxOpenCount'))$('#supportInboxOpenCount').textContent=open;
    if($('#supportInboxClosedCount'))$('#supportInboxClosedCount').textContent=closed;
    if($('#supportInboxSpamCount'))$('#supportInboxSpamCount').textContent=spam;
    if($('#supportInboxAllCount'))$('#supportInboxAllCount').textContent=all.length;
    if($('#supportInboxUnread'))$('#supportInboxUnread').textContent=unread;
    $$('[data-inbox-quick]').forEach(b=>b.classList.toggle('active',b.dataset.inboxQuick===status));
    const f=supportInboxFilterState(),custom=!!f.term||f.status!=='open'||f.mailbox!=='all';
    $('#supportInboxClearFilters')?.classList.toggle('hidden',!custom);
  };

  function updateInboxBulkUi(){
    const panel=$('#inboxBulkPanel'),count=$('#inboxBulkCount'),toggle=$('#inboxBulkToggle');
    if(panel)panel.classList.toggle('hidden',!inboxBulkMode);
    if(count)count.textContent=String(inboxBulkSelected.size);
    if(toggle){toggle.textContent=inboxBulkMode?'Exit selection':'Select emails';toggle.classList.toggle('active',inboxBulkMode)}
    $('[data-inbox-thread]').forEach(row=>{
      const selected=inboxBulkSelected.has(row.dataset.inboxThread);
      row.classList.toggle('bulk-selected',selected);
      row.classList.toggle('bulk-select-mode',inboxBulkMode);
      row.setAttribute('aria-pressed',inboxBulkMode?String(selected):'false');
    });
  }

  function ensureInboxBulkUi(){
    const actions=document.querySelector('#inbox .support-inbox-toolbar-actions');
    if(actions&&!$('#inboxBulkToggle')){
      const btn=document.createElement('button');
      btn.id='inboxBulkToggle';btn.type='button';btn.className='ghost-btn small';btn.textContent='Select emails';
      btn.onclick=()=>{inboxBulkMode=!inboxBulkMode;if(!inboxBulkMode)inboxBulkSelected.clear();renderSupportInboxList()};
      actions.insertBefore(btn,$('#supportInboxRefresh')||null);
    }
    const refreshLine=document.querySelector('#inbox .support-inbox-refresh-line');
    if(refreshLine&&!$('#inboxBulkPanel')){
      const panel=document.createElement('div');
      panel.id='inboxBulkPanel';panel.className='inbox-bulk-panel hidden';
      panel.innerHTML='<div><strong><span id="inboxBulkCount">0</span> selected</strong><span>Choose conversations in the current filtered list.</span></div><div class="inbox-bulk-actions"><button type="button" class="ghost-btn small" data-inbox-bulk-select-visible>Select visible</button><button type="button" class="ghost-btn small" data-inbox-bulk-read>Mark read</button><button type="button" class="ghost-btn small" data-inbox-bulk-unread>Mark unread</button><button type="button" class="ghost-btn small" data-inbox-bulk-assign>Assign to me</button><button type="button" class="danger-btn small" data-inbox-bulk-close>Close selected</button></div>';
      refreshLine.insertAdjacentElement('afterend',panel);
      panel.querySelector('[data-inbox-bulk-select-visible]').onclick=()=>{supportInboxVisibleThreads().forEach(t=>inboxBulkSelected.add(t.id));renderSupportInboxList()};
      panel.querySelector('[data-inbox-bulk-read]').onclick=()=>runInboxBulkAction('read');
      panel.querySelector('[data-inbox-bulk-unread]').onclick=()=>runInboxBulkAction('unread');
      panel.querySelector('[data-inbox-bulk-assign]').onclick=()=>runInboxBulkAction('assign');
      panel.querySelector('[data-inbox-bulk-close]').onclick=()=>runInboxBulkAction('close');
    }
    updateInboxBulkUi();
  }

  function enhanceInboxRowsForBulk(){
    if(!inboxBulkMode)return updateInboxBulkUi();
    $('[data-inbox-thread]').forEach(row=>{
      const id=row.dataset.inboxThread;
      row.onclick=e=>{e.preventDefault();e.stopPropagation();if(inboxBulkSelected.has(id))inboxBulkSelected.delete(id);else inboxBulkSelected.add(id);updateInboxBulkUi()};
    });
    updateInboxBulkUi();
  }

  async function runInboxBulkAction(action){
    const ids=[...inboxBulkSelected];if(!ids.length)return;
    if(action==='close'&&!confirm(`Close ${ids.length} selected conversation${ids.length===1?'':'s'}? They will remain available in Closed.`))return;
    const button=action==='close'?document.querySelector('[data-inbox-bulk-close]'):action==='assign'?document.querySelector('[data-inbox-bulk-assign]'):document.querySelector(`[data-inbox-bulk-${action}]`);
    if(button)setBusy(button,true,'Working…');
    try{
      const requests=ids.map(threadId=>{
        const body=action==='close'?{threadId,action:'status',status:'closed'}:action==='assign'?{threadId,action:'assign',userId:currentSession.user.id}:{threadId,action};
        return api('/api/support-inbox',{method:'PATCH',body:JSON.stringify(body)});
      });
      const results=await Promise.allSettled(requests),failed=results.filter(x=>x.status==='rejected');
      inboxBulkSelected.clear();
      await supportInboxTools({silent:true});
      renderSupportInboxList();
      if(failed.length)updateSupportInboxUpdated(`${ids.length-failed.length} updated · ${failed.length} failed`);
      else updateSupportInboxUpdated(`${ids.length} conversation${ids.length===1?'':'s'} updated`);
    }catch(e){alert(e.message)}finally{if(button)setBusy(button,false)}
  }

  async function loadInboxBlockRules(){
    ensureInboxSafetyUi();
    const root=$('#inboxBlockedRules');
    if(!root)return;
    if(currentProfile?.role!=='admin'){
      root.innerHTML='<div class="crm-empty"><span>Only administrators can manage blocked senders and domains.</span></div>';
      return;
    }
    root.innerHTML='<div class="crm-empty"><span>Loading blocked senders and domains…</span></div>';
    try{
      const d=await api('/api/support-inbox?blocklist=1');
      inboxBlockRules=d.rules||[];
      const count=$('#inboxBlockCount');if(count)count.textContent=`${inboxBlockRules.length} blocked`;
      if(!inboxBlockRules.length){root.innerHTML='<div class="crm-empty"><strong>No blocked senders</strong><span>Use Block sender or Block domain on a conversation when needed.</span></div>';return}
      root.innerHTML=`<div class="inbox-block-list">${inboxBlockRules.map(r=>`<div class="inbox-block-row"><div><span class="inbox-block-scope">${esc(r.scope==='domain'?'Domain':'Sender')}</span><strong>${esc(r.value)}</strong>${r.reason?`<small>${esc(r.reason)}</small>`:''}</div><button type="button" class="ghost-btn small" data-unblock-rule="${esc(r.id)}">Unblock</button></div>`).join('')}</div>`;
      root.querySelectorAll('[data-unblock-rule]').forEach(b=>b.onclick=()=>unblockInboxRule(b.dataset.unblockRule,b));
    }catch(e){root.innerHTML=`<div class="crm-empty"><strong>Could not load blocklist</strong><span>${esc(e.message)}</span></div>`}
  }

  async function unblockInboxRule(ruleId,btn){
    if(!confirm('Unblock this sender/domain? Future emails will be allowed through the normal inbox again.'))return;
    setBusy(btn,true,'Unblocking…');
    try{
      await api('/api/support-inbox',{method:'PATCH',body:JSON.stringify({action:'unblock_rule',ruleId})});
      await loadInboxBlockRules();
      updateSupportInboxUpdated('Block rule removed');
    }catch(e){alert(e.message)}finally{setBusy(btn,false)}
  }

  function enhanceOpenThread(id){
    ensureInboxSafetyUi();
    const root=$('#supportInboxDetail'),t=(supportInboxCache||[]).find(x=>x.id===id);
    if(!root||!t)return;

    const statusSelect=$('#inboxThreadStatus');
    if(statusSelect&&!statusSelect.querySelector('option[value="spam"]')){
      const option=document.createElement('option');option.value='spam';option.textContent='Spam';
      statusSelect.appendChild(option);
    }
    if(statusSelect&&t.status==='spam')statusSelect.value='spam';

    const head=root.querySelector('.support-inbox-detail-head');
    if(head&&!root.querySelector('.inbox-customer-context')){
      const profile=t.customer_id?(customerCache||[]).find(x=>x.id===t.customer_id):null;
      const quotes=t.customer_id?(customerActivityCache?.quotes||[]).filter(x=>x.customer_id===t.customer_id).length:0;
      const bookings=t.customer_id?(customerActivityCache?.bookings||[]).filter(x=>x.customer_id===t.customer_id).length:0;
      const projects=t.customer_id?(customerActivityCache?.projects||[]).filter(x=>x.customer_id===t.customer_id).length:0;
      const card=document.createElement('div');card.className='inbox-customer-context';
      if(t.customer_id){
        const since=profile?.created_at?new Date(profile.created_at).toLocaleDateString('en-GB',{year:'numeric',month:'short'}):'';
        card.innerHTML=`<div><span class="crm-chip success">Registered customer</span><strong>${esc(profile?.full_name||t.customer_name||t.customer_email)}</strong><small>${since?`Customer since ${esc(since)} · `:''}${quotes} quote${quotes===1?'':'s'} · ${bookings} booking${bookings===1?'':'s'} · ${projects} project${projects===1?'':'s'}</small></div><div class="inbox-customer-context-actions"><button type="button" class="ghost-btn small" data-inbox-open-customer>Open customer</button>${profile?.phone?`<a class="ghost-btn small" href="tel:${esc(profile.phone)}">Call</a>`:''}</div>`;
        card.querySelector('[data-inbox-open-customer]')?.addEventListener('click',async()=>{if(!(customerCache||[]).some(x=>x.id===t.customer_id))await customerTools();openCustomerDetail(t.customer_id)});
      }else{
        card.innerHTML=`<div><span class="crm-chip">External sender</span><strong>${esc(t.customer_name||t.customer_email)}</strong><small>No Namdar customer account is linked to this email conversation.</small></div>`;
      }
      head.insertAdjacentElement('afterend',card);
    }

    const headAfterContext=root.querySelector('.support-inbox-detail-head');
    if(headAfterContext&&!root.querySelector('.inbox-safety-actions')){
      const domain=senderDomain(t.customer_email),canBlockDomain=domain&&!SHARED_PROVIDER_DOMAINS.has(domain);
      const box=document.createElement('div');
      box.className='inbox-safety-actions';
      const label=t.spam_source==='security'?'Security quarantine':t.spam_source==='campaign'?'Campaign quarantine':'Quarantined';
      const spamInfo=t.status==='spam'&&t.spam_reason?`<span class="inbox-spam-reason"><strong>${esc(label)}:</strong> ${esc(t.spam_reason)}${Number(t.spam_score||0)?` · score ${Number(t.spam_score)}`:''}</span>`:'';
      box.innerHTML=`${spamInfo}<div class="inbox-safety-action-buttons">${t.status==='spam'
        ?'<button type="button" class="primary-btn small" data-inbox-not-spam>Not spam / restore</button>'
        :'<button type="button" class="ghost-btn small" data-inbox-mark-spam>Mark as spam</button><button type="button" class="danger-btn small" data-inbox-phishing>Report phishing</button>'}
        ${currentProfile?.role==='admin'?`<button type="button" class="danger-btn small" data-inbox-block-sender>Block sender</button>${canBlockDomain?'<button type="button" class="danger-btn small" data-inbox-block-domain>Block domain</button>':''}`:''}</div>`;
      const customerContext=root.querySelector('.inbox-customer-context');
      (customerContext||headAfterContext).insertAdjacentElement('afterend',box);
      box.querySelector('[data-inbox-mark-spam]')?.addEventListener('click',()=>runInboxSafetyAction(id,'spam'));
      box.querySelector('[data-inbox-phishing]')?.addEventListener('click',()=>runInboxSafetyAction(id,'phishing'));
      box.querySelector('[data-inbox-not-spam]')?.addEventListener('click',()=>runInboxSafetyAction(id,'not_spam'));
      box.querySelector('[data-inbox-block-sender]')?.addEventListener('click',()=>runInboxSafetyAction(id,'block_sender'));
      box.querySelector('[data-inbox-block-domain]')?.addEventListener('click',()=>runInboxSafetyAction(id,'block_domain'));
    }

    if(t.status==='spam'){
      $('#inboxMarkUnread')?.setAttribute('disabled','disabled');
      const composer=$('#supportInboxReplyForm');
      if(composer){
        composer.outerHTML='<div class="crm-note inbox-spam-compose-note"><strong>Reply disabled while quarantined.</strong><span>Restore this conversation with “Not spam” before replying.</span></div>';
      }
    }
  }

  async function runInboxSafetyAction(id,action){
    const t=(supportInboxCache||[]).find(x=>x.id===id);
    if(!t)return;
    const domain=senderDomain(t.customer_email);
    const prompts={
      spam:'Move this conversation to Spam? It will leave the working inbox and stop counting as unread.',
      phishing:'Report this as phishing or dangerous mail? It will be quarantined with urgent security priority.',
      not_spam:'Restore this conversation to the working inbox?',
      block_sender:`Block ${t.customer_email}? Future messages from this exact address will be quarantined automatically.`,
      block_domain:`Block all future inbound mail from @${domain}? Existing conversations from this domain will also be quarantined.`
    };
    if(!confirm(prompts[action]||'Continue?'))return;
    try{
      await api('/api/support-inbox',{method:'PATCH',body:JSON.stringify({threadId:id,action})});
      const status=$('#supportInboxStatus');
      if(status)status.value=action==='not_spam'?'open':'spam';
      saveSupportInboxView();
      await supportInboxTools({silent:true});
      await openSupportInboxThread(id,{preserveDraft:true});
      if(currentProfile?.role==='admin')await loadInboxBlockRules().catch(()=>null);
      const message=action==='not_spam'?'Conversation restored to inbox':action==='spam'?'Conversation moved to Spam':action==='phishing'?'Security report saved · conversation quarantined':'Sender rule saved · conversation quarantined';
      updateSupportInboxUpdated(message);
    }catch(e){alert(e.message)}
  }

  supportInboxTools=async function(options={}){
    ensureInboxSafetyUi();
    ensureInboxBulkUi();
    const result=await baseTools(options);
    ensureInboxSafetyUi();
    ensureInboxBulkUi();
    enhanceInboxRowsForBulk();
    if($('#inboxSafetyPanel')?.open&&currentProfile?.role==='admin')loadInboxBlockRules().catch(()=>null);
    return result;
  };

  renderSupportInboxList=function(){
    baseRenderList();
    ensureInboxBulkUi();
    enhanceInboxRowsForBulk();
  };

  openSupportInboxThread=async function(id,options={}){
    const result=await baseOpen(id,options);
    enhanceOpenThread(id);
    return result;
  };

  patchSupportInboxThread=async function(id,action,extra={}){
    if(action==='status'&&extra.status==='spam'){
      await runInboxSafetyAction(id,'spam');
      return;
    }
    const movingFolder=action==='status'&&(extra.status==='closed'||extra.reopen===true);
    if(!movingFolder)return basePatch(id,action,extra);

    const statusSelect=$('#supportInboxStatus'),mailboxSelect=$('#supportInboxMailbox');
    const previousStatus=statusSelect?.value||'open',previousMailbox=mailboxSelect?.value||'all';
    const before=supportInboxVisibleThreads(),index=before.findIndex(t=>t.id===id),nextCandidate=before[index+1]?.id||before[index-1]?.id||null;
    await basePatch(id,action,extra);
    if(statusSelect)statusSelect.value=previousStatus;
    if(mailboxSelect)mailboxSelect.value=previousMailbox;
    saveSupportInboxView();
    renderSupportInboxList();
    const nextVisible=nextCandidate&&supportInboxVisibleThreads().some(t=>t.id===nextCandidate)?nextCandidate:null;
    if(nextVisible)await openSupportInboxThread(nextVisible);
    else closeSupportInboxThread();
    updateSupportInboxUpdated(extra.status==='closed'?(nextVisible?'Conversation closed · opened next email':'Conversation closed · staying in current folder'):(nextVisible?'Conversation reopened · opened next closed email':'Conversation reopened · staying in current folder'));
  };

  const observer=new MutationObserver(()=>{
    ensureInboxSafetyUi();
    if(supportInboxOpenId)enhanceOpenThread(supportInboxOpenId);
  });
  const inbox=$('#inbox');
  if(inbox)observer.observe(inbox,{childList:true,subtree:true});

  ensureInboxSafetyUi();
  ensureInboxBulkUi();
  restoreSupportInboxView();
  renderSupportInboxList();
})();
