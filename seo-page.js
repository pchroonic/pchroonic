(()=>{const h=document.querySelector('.site-header'),b=document.querySelector('.mobile-menu');if(h&&b){const close=()=>{h.classList.remove('nav-open');b.setAttribute('aria-expanded','false');b.textContent='☰'};b.addEventListener('click',()=>{const o=!h.classList.contains('nav-open');h.classList.toggle('nav-open',o);b.setAttribute('aria-expanded',String(o));b.textContent=o?'×':'☰'});h.querySelectorAll('a').forEach(a=>a.addEventListener('click',close));document.addEventListener('keydown',e=>{if(e.key==='Escape')close()})}})();

function initConversionProof(){
  if(!document.body.classList.contains('seo-page'))return;
  const hero=document.querySelector('.seo-hero');
  if(hero&&!document.querySelector('.seo-conversion-proof'))hero.insertAdjacentHTML('afterend','<div class="seo-conversion-proof"><span>✓ Postcode checked</span><span>✓ Final quote reviewed</span><span>✓ Accept online</span><span>✓ Choose an available slot</span></div>');
  if(!document.querySelector('#mobileConversionBar'))document.body.insertAdjacentHTML('beforeend','<aside id="mobileConversionBar" class="mobile-conversion-bar"><div><strong>Ready to price the job?</strong><span>Start with a guide estimate.</span></div><a class="primary-btn small" href="/#quote">Get estimate</a></aside>');
}
initConversionProof();
