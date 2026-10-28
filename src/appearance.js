const skins=[['sage','淡绿'],['ivory','象牙白'],['rose','柔粉'],['retro','复古深色'],['silver','银白铝'],['porcelain','瓷白塑料']];
function savedSkin(){try{return localStorage.getItem('cue-skin')||'ivory';}catch{return 'ivory';}}
export function initAppearance(){
 let current=savedSkin();if(!skins.some(([id])=>id===current))current='ivory';
 document.documentElement.dataset.skin=current;
 document.dispatchEvent(new Event('cue:appearance'));
 const toolbar=document.createElement('div');toolbar.className='appearance-toolbar';toolbar.setAttribute('role','group');toolbar.setAttribute('aria-label','系统染色');
 toolbar.innerHTML=`<span>系统染色</span><div class="skin-choices">${skins.map(([id,label])=>`<button data-skin-choice="${id}" aria-pressed="${id===current}" title="${label}"><i></i><span>${label}</span></button>`).join('')}</div>`;
 document.querySelector('header').after(toolbar);
 toolbar.querySelectorAll('button').forEach(button=>button.onclick=()=>{
  current=button.dataset.skinChoice;document.documentElement.dataset.skin=current;
  document.dispatchEvent(new Event('cue:appearance'));
  toolbar.querySelectorAll('button').forEach(b=>b.setAttribute('aria-pressed',String(b===button)));
  try{localStorage.setItem('cue-skin',current);}catch{}
 });
}
