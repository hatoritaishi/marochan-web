(function(root){
 'use strict';
 const KEY='maroRoomSyncV1';
 function create(options){
  const storage=options.storage,now=options.now||Date.now;
  let state={version:1,paused:false},generation=0,hydrated=false,lastNative=null,message='';
  try{const saved=JSON.parse(storage.getItem(KEY)||'null');if(saved&&saved.version===1&&typeof saved.paused==='boolean')state=saved;}catch(error){}
  const clone=v=>v?JSON.parse(JSON.stringify(v)):null;
  const validLife=v=>v&&typeof v==='object'&&['sleepUntil','nightEnd'].every(k=>Number.isFinite(v[k])&&v[k]>=0);
  function bridge(){try{return options.bridge&&options.bridge();}catch(error){return null;}}
  function hooks(){return options.hooks?options.hooks():{};}
  function save(value){try{const wire=JSON.stringify(value);storage.setItem(KEY,wire);if(storage.getItem(KEY)!==wire)return false;state=value;return true;}catch(error){return false;}}
  function snapshot(){const h=hooks();let value;try{value=h.snapshot&&h.snapshot();if(typeof value==='string')value=JSON.parse(value);}catch(error){}
   if(!validLife(value))try{value=JSON.parse(storage.getItem('maroRoomLifeV1')||'null');}catch(error){}
   return validLife(value)?clone(value):null;
  }
  function checkpoint(){const native=bridge();if(native&&typeof native.roomSyncCheckpoint==='function'){
    try{const c=JSON.parse(native.roomSyncCheckpoint());if(validLife(c.life)&&Number.isSafeInteger(c.revision))return c;}catch(error){}
   }
   return lastNative?{revision:lastNative.revision,life:clone(lastNative),pending:true}:null;
  }
  function changed(text){message=text;if(options.changed)options.changed();return false;}
  function restart(){generation++;const h=hooks();if(h.stop)h.stop();options.reload();return true;}
  return {
   enabled:()=>!state.paused,epoch:()=>generation,
   valid:(token,local)=>token===generation&&(local?state.paused:!state.paused),
   observeNative(value){if(validLife(value))lastNative=clone(value);},
   localLife(){if(!state.paused||hydrated)return null;return clone(state.life);},
   localRestored(){hydrated=true;},
   needsNativeRestore:()=>!state.paused&&!!state.alignNative,
   nativeRestored(){if(state.alignNative)save({...state,alignNative:false});},
   // Early room boot routines may publish the previous local pose before the
   // checkpoint has been restored. They must not replace the owning snapshot.
   rememberRoom(value){if(state.paused&&hydrated&&validLife(value))save({...state,life:clone(value)});},
   status:()=>({paused:state.paused,message,conflict:!!state.conflict}),
   pause(){
    if(state.paused)return true;const h=hooks(),reason=h.canChange&&h.canChange();if(reason)return changed(reason);
    const c=checkpoint(),local=snapshot(),life=c&&c.pending?c.life:local||c&&c.life;
    if(!validLife(life))return changed('今の状態を保存できませんでした。もういちど試してください。');
    const detached={...clone(life),roomVersion:1,savedAt:now()};
    if(!save({version:1,paused:true,revision:c?c.revision:null,life:detached,enteredAt:now(),conflict:false}))return changed('状態を保存できないため、切り替えていません。');
    return restart();
   },
   resume(){
    if(!state.paused)return true;const h=hooks(),reason=h.canChange&&h.canChange();if(reason)return changed(reason);
    const local=hydrated?snapshot()||state.life:clone(state.life),native=bridge();
    if(native){
     if(!Number.isSafeInteger(state.revision)||typeof native.roomSyncResume!=='function'){
      save({...state,conflict:true});return changed('みにまろちゃんの今の状態を確認してから再開してください。');
     }
     let reply;try{reply=JSON.parse(native.roomSyncResume(JSON.stringify({revision:state.revision,snapshot:local})));}catch(error){}
     if(!reply||reply.status!=='resumed'){
      save({...state,conflict:true});return changed('みにまろちゃんの状態が変わっています。勝手に上書きせず、おへやだけの状態を続けています。');
     }
    }
    if(!save({...state,paused:false,life:clone(local),conflict:false,alignNative:!!native}))return changed('再開の設定を保存できませんでした。おへやだけの状態を続けています。');
    return restart();
   },
   alignAndResume(){
    if(!state.paused||!state.conflict)return false;const h=hooks(),reason=h.canChange&&h.canChange();if(reason)return changed(reason);
    const c=checkpoint();if(bridge()&&!c)return changed('みにまろちゃんの状態を確認できませんでした。もういちど試してください。');
    if(!save({...state,paused:false,conflict:false,alignNative:!!bridge(),lastDetachedLife:hydrated?snapshot()||clone(state.life):clone(state.life)}))return changed('再開の設定を保存できませんでした。');
    return restart();
   }
  };
 }
 const api={create};if(typeof module!=='undefined')module.exports=api;
 if(!root.document)return;
 const sync=create({storage:root.localStorage,bridge:()=>root.MaroPet,hooks:()=>root.maroRoomSyncHooks||{},reload:()=>root.location.reload(),changed:()=>refresh()});
 root.MaroRoomSync=sync;
 let dialog,description,status,primary,align;
 function refresh(){if(!dialog)return;const s=sync.status();
  description.textContent=s.paused?'みにまろとの動きの同期を休んで、おへやだけで過ごしています。満腹度やおやつ・救出の記録は共通のままです。':'おへやが出ないときは、みにまろとの動きの同期を一時的に休んで開き直せます。今の寝姿・転倒や救出の記録は残ります。';
  primary.textContent=s.paused?'同期を再開する':'同期を休んでおへやを開く';status.textContent=s.message;
  align.hidden=!s.paused||!s.conflict;
  const item=document.getElementById('settingsOpenRoomRecovery');if(item)item.querySelector('small').textContent=s.paused?'おへやだけで過ごしています':'表示が戻らないとき';
 }
 function open(){
  if(root.maroSoundUI&&root.maroSoundUI.isOpen())root.maroSoundUI.close();
  refresh();if(!dialog.open)dialog.showModal();
 }
 function install(){
  dialog=document.createElement('dialog');dialog.id='maroRoomRecovery';dialog.setAttribute('aria-label','おへやの復旧');
  dialog.style.cssText='width:min(420px,calc(100vw - 40px));padding:24px;border:2px solid #dabda5;border-radius:22px;background:#fffaf2;color:#70514d;font:16px/1.8 sans-serif';
  const title=document.createElement('h2');title.textContent='おへやの復旧';title.style.fontSize='21px';dialog.appendChild(title);
  description=document.createElement('p');dialog.appendChild(description);status=document.createElement('p');status.id='maroRoomRecoveryStatus';status.setAttribute('role','status');dialog.appendChild(status);
  function button(text,action){const b=document.createElement('button');b.type='button';b.textContent=text;b.style.cssText='font:inherit;display:block;width:100%;margin-top:12px;padding:10px;border:1px solid #d8afb0;border-radius:14px;background:#fff;color:#765050';b.addEventListener('click',action);dialog.appendChild(b);return b;}
  primary=button('',()=>{const ok=sync.enabled()?sync.pause():sync.resume();if(!ok)refresh();});primary.id='maroRoomRecoveryToggle';
  align=button('今のみにまろに合わせて再開',()=>sync.alignAndResume());align.id='maroRoomRecoveryAlign';
  const note=document.createElement('p');note.textContent='状態が変わっていた場合、みにまろの今の寝姿に合わせて開き直します。おへやで過ごした睡眠の控えも残します。';note.style.fontSize='12px';align.insertAdjacentElement('afterend',note);
  button('とじる',()=>dialog.close());document.body.appendChild(dialog);
  const item=document.getElementById('settingsOpenRoomRecovery');if(item)item.addEventListener('click',open);
  root.maroOpenRoomRecovery=open;refresh();
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});else install();
})(typeof window==='undefined'?globalThis:window);
