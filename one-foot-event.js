(function(root,factory){var api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.MaroOneFoot=api;})(typeof window==='object'?window:globalThis,function(){
'use strict';
var LINES={
 balance:['みてみて、かたあしで たてるよ♪','ふわふわ、ゆらゆら〜♪','まろちゃんの バランス、みててね♪','えへへ、そーっと たってるよ♪','ぴたっ、ってできるかな♪','おててを ひろげて、ゆらゆら♪','きゅー♪ まだまだ たてるよ','まろちゃん、かたあしに ちょうせん♪'],
 returned:['えっへん♪ ちゃんと たてたよ！','まろちゃん、バランス じょうずでしょ♪','きゅっ♪ おっとっとにも まけなかったよ！','えへへ、ころばずに もどれたね♪','えっへん♪ まろちゃん、やればできるの！','みててくれたから、がんばれたよ♪'],
 fallen:['きゅっ！？','きゅっ！？ あっ…！','きゅっ！？ おっとっと…！','きゅっ！？ ころんじゃう…！'],
 aftermath:['きゅぅ～…ころんじゃったぁ…','きゅぅ～…びっくりしたよぉ…','きゅぅ～…おてて、かしてぇ…','きゅぅ～…おこしてほしいの…','きゅぅ～…うまくたてないよぉ…','きゅぅ～…たすけてくれる…？','きゅぅ～…そばにいてほしいな…','きゅぅ～…きみのおてて、まってるよぉ…','きゅぅ～…おきるの、てつだってぇ…','きゅぅ～…もういちど、たちたいよぉ…','きゅぅ～…おてて、つないでほしいの…','きゅぅ～…きてくれたら、うれしいな…'],
 crying:['ぷぅ…おてて、かしてほしいの…','ぷぅ…ひとりで おきられないよぉ…','ぷぅ…たすけて ほしいな…','ぷぅ…おこして くれる…？','ぷぅ…きみの おてて、まってるの…','ぷぅ…ころんじゃったよぉ…','ぷぅ…そばに きてほしいの…','ぷぅ…おてて、つないで…？'],
 reminder:['ぷぅ…おてて、かしてほしいな…','ぷぅ…まだ おきられないの…','ぷぅ…きみの おてて、まってるよ…','ぷぅ…たすけるって してほしいな…'],
 thanks:['おこしてくれて、ありがとう♪','きゅー♪ たすけてくれて、うれしい！','きみのおてて、あったかかった♪','ありがとう…もう だいじょうぶだよ♪','えへへ、たすけてもらっちゃった♪','ありがとう♪ きみがきてくれて、ほっとしたよ','おてて、かしてくれて ありがとう♪','きゅっ♪ また ちゃんとたてたよ、ありがとう！']
};
function pick(pool,random){return pool[Math.min(pool.length-1,Math.floor(random()*pool.length))];}
function chooseCryingLine(random,previous){
 random=random||Math.random;
 var pool=random()<.5?LINES.crying:LINES.aftermath;
 var candidates=pool.filter(function(text){return text!==previous;});
 var text=pick(candidates,random);
 return {text:text,voice:text.indexOf('きゅぅ')===0?'amae':'sad'};
}
function sum(route){return route.reduce(function(n,s){return n+s[1];},0);}
function makePlan(now,random,clips){
 random=random||Math.random;
 // Independent draws, identical duration range for either outcome.
 var outcome=random()<.5?'fall':'return';
 var branchMs=10000+Math.min(500,Math.floor(random()*501))*10;
 var route=clips.entrance.map(function(s){return s.slice();});
 var left=branchMs-sum(clips.forward)-sum(route),i=0;
 var hasOttotto=false;
 while(left>0){
  if(i>0&&i%clips.wobble.length===0&&left>=sum(clips.forward)&&(!hasOttotto||random()<(clips.random_wobble_probability||.55))){route=route.concat(clips.forward);left-=sum(clips.forward);hasOttotto=true;i=0;continue;}
  var step=clips.wobble[i++%clips.wobble.length],d=Math.min(step[1],left);route.push([step[0],d]);left-=d;
 }
 route=route.concat(clips.forward);
 var recovery=[['b09',110],['b10',110],['b11',120],['b12',300]].concat(clips.return);
 var proudVariant=random()<.5?'open':'closed';
 var proudRoute=(clips.proud&&clips.proud[proudVariant]||[]).map(function(s){return ['proud'+s[0],s[1]];});
 var tail=outcome==='fall'?clips.fall:recovery.concat(proudRoute);
 return {schema:1,id:String(now)+'-'+Math.floor(random()*1e9),startedAt:now,outcome:outcome,branchMs:branchMs,
 proudVariant:proudVariant,proudAt:outcome==='return'?now+branchMs+sum(recovery):0,proudSpeechAt:outcome==='return'?now+branchMs+sum(recovery)+1480:0,
 route:route.concat(tail),cryAt:outcome==='fall'?now+branchMs+sum(tail):0,
 returnEndAt:outcome==='return'?now+branchMs+sum(tail):0,helpAt:0,helpEndAt:0,
 lines:{balance:pick(LINES.balance,random),returned:pick(LINES.returned,random),fallen:pick(LINES.fallen,random),thanks:pick(LINES.thanks,random),aftermath:pick(LINES.aftermath,random)}};
}
function phase(plan,now){
 if(!plan)return 'idle';
 if(plan.helpAt)return now<plan.helpEndAt?'rescuing':'idle';
 if(plan.outcome==='return')return now>=plan.returnEndAt?'idle':now>=plan.proudAt?'proud':now>=plan.startedAt+plan.branchMs?'recovering':'balancing';
 if(now>=plan.cryAt)return 'crying';
 return now>=plan.startedAt+plan.branchMs?'falling':'balancing';
}
function frameAt(route,age,loop){
 var length=sum(route);if(loop)age=((age%length)+length)%length;
 var elapsed=0;
 for(var i=0;i<route.length;i++){elapsed+=route[i][1];if(age<elapsed)return route[i][0];}
 return route[route.length-1][0];
}
var RESCUE_OUTCOMES=['jump','banzai','banzai-jump','jump-banzai','banzai-banzai','jump-jump'];
var RESCUE_FADE_MS=660;
var RESCUE_QUIET_MS=30*60*1000;
function validRoute(route,clips){
 return Array.isArray(route)&&route.length>0&&route.length<=180&&route.every(function(s){return Array.isArray(s)&&s.length===2&&typeof s[0]==='string'&&Object.prototype.hasOwnProperty.call(clips.assets,s[0])&&Number.isInteger(s[1])&&s[1]>0&&s[1]<=2000;});
}
function rescueConfig(clips){
 var config=clips.rescue;
 if(!config||config.version!==1||typeof config.sourceVersion!=='string'||!config.sourceVersion||config.sourceVersion.length>80||config.wipeRoundTrips!==3||!Array.isArray(config.bowCounts)||config.bowCounts.length!==2||config.bowCounts[0]!==1||config.bowCounts[1]!==2||!Array.isArray(config.outcomes)||config.outcomes.length!==RESCUE_OUTCOMES.length||!config.outcomes.every(function(value,index){return value===RESCUE_OUTCOMES[index];})||!validRoute(config.prefix,clips)||!validRoute(config.bow,clips)||!config.postBow||!RESCUE_OUTCOMES.every(function(outcome){return validRoute(config.postBow[outcome],clips);}))throw Error('Invalid rescue animation manifest');
 return config;
}
function rescueRoute(config,bowCount,outcome){
 var route=config.prefix.slice();
 for(var i=0;i<bowCount;i++)route=route.concat(config.bow);
 return route.concat(config.postBow[outcome]).map(function(s){return s.slice();});
}
function makeRescuePlan(random,clips){
 random=random||Math.random;
 var config=rescueConfig(clips),bowCount=random()<.5?1:2,outcome=pick(RESCUE_OUTCOMES,random);
 var selected={version:1,sourceVersion:config.sourceVersion,bowCount:bowCount,outcome:outcome,route:rescueRoute(config,bowCount,outcome)};
 if(!validRoute(selected.route,clips))throw Error('Invalid rescue animation route');
 return selected;
}
function validRescuePlan(selected,clips){
 if(!selected||selected.version!==1||!Number.isInteger(selected.bowCount)||selected.bowCount<1||selected.bowCount>2||!RESCUE_OUTCOMES.includes(selected.outcome)||!validRoute(selected.route,clips))return false;
 try{
  var config=rescueConfig(clips),expected=rescueRoute(config,selected.bowCount,selected.outcome);
  return selected.sourceVersion===config.sourceVersion&&selected.route.length===expected.length&&selected.route.every(function(s,i){return s[0]===expected[i][0]&&s[1]===expected[i][1];});
 }catch(error){return false;}
}
function valid(p,clips){
 if(!p||p.schema!==1||typeof p.id!=='string'||p.id.length>100||!Number.isFinite(p.startedAt)||p.startedAt<=0||!['fall','return'].includes(p.outcome)||!Number.isFinite(p.branchMs)||!Array.isArray(p.route)||p.route.length>180)return false;
 if(p.origin==='run'){
  if(p.outcome!=='fall'||p.branchMs!==0||JSON.stringify(p.route)!==JSON.stringify(clips.fall))return false;
 }else if(p.branchMs<10000||p.branchMs>15000)return false;
 if(!validRoute(p.route,clips))return false;
 var total=sum(p.route);
 if(p.outcome==='fall'&&p.cryAt!==p.startedAt+total||p.outcome==='return'&&p.returnEndAt!==p.startedAt+total)return false;
 if(!Number.isFinite(p.helpAt)||!Number.isFinite(p.helpEndAt)||p.helpAt<0||p.helpEndAt<0||p.helpAt&&p.helpEndAt<=p.helpAt)return false;
 if(p.helpAt){
  if(p.outcome!=='fall'||p.helpAt<p.cryAt+400)return false;
  if(Object.prototype.hasOwnProperty.call(p,'rescue')){if(!validRescuePlan(p.rescue,clips)||p.helpEndAt!==p.helpAt+RESCUE_FADE_MS+sum(p.rescue.route))return false;}
  // Only an already-started legacy rescue may finish with the former petting clip.
  else if(p.helpEndAt!==p.helpAt+RESCUE_FADE_MS+sum(rescue))return false;
 }else if(p.helpEndAt!==0||Object.prototype.hasOwnProperty.call(p,'rescue'))return false;
 if(p.outcome==='return'&&(!Number.isFinite(p.proudAt)||!Number.isFinite(p.proudSpeechAt)||p.proudAt<=p.startedAt+p.branchMs||p.proudSpeechAt<p.proudAt||p.proudSpeechAt>=p.returnEndAt))return false;
 if(!p.lines||!Object.keys(p.lines).every(function(k){return typeof p.lines[k]==='string'&&p.lines[k].length<150;}))return false;
 return ['balance','returned','fallen','thanks'].every(function(k){return typeof p.lines[k]==='string';});
}
var rescue=[['pet0',500],['pet1',100],['pet2',110],['pet3',100],['pet4',120],['pet5',120],['pet6',130],['pet7',180],['pet8',100],['pet7',1800],['pet6',120],['pet5',120],['pet4',120],['pet3',100],['pet2',110],['pet1',100],['pet0',500]];
function mount(env){
 var plan=null,rescuedPlan=null,clips=null,images={},bounds={},ready=false,restoring=true,persistFailed=false,lastPhase='',lastKey='',proudSpoken=false,rescueSpoken=false,guidePending=false,crySpeech=null,nativeSavedValue=null;
 var portrait=document.createElement('canvas');portrait.width=768;portrait.height=560;portrait.className='one-foot-portrait';portrait.setAttribute('role','img');portrait.setAttribute('aria-label','まろちゃん');
 portrait.style.cssText='position:absolute;left:0;top:0;pointer-events:none;display:none;z-index:4';
 var ctx=portrait.getContext('2d');var stage=env.charwrap.closest('#stage');stage.appendChild(portrait);
 // Rescue uses the regular petting canvas registration, including narrow-room fitting.
 var petPortrait=document.createElement('canvas');petPortrait.width=512;petPortrait.height=560;petPortrait.className='one-foot-portrait';
 petPortrait.setAttribute('role','img');petPortrait.setAttribute('aria-label','まろちゃん');env.charwrap.appendChild(petPortrait);
 var petCtx=petPortrait.getContext('2d');petPortrait.style.display='none';
 function paintRegular(asset,index){
  var reference=env.charwrap.querySelector('.maro-event-canvas');
  petPortrait.style.cssText=reference.style.cssText;petPortrait.style.display='block';petPortrait.style.visibility='visible';petPortrait.style.opacity='1';petPortrait.style.zIndex='4';
  petCtx.clearRect(0,0,512,560);env.paintPose(petPortrait,petCtx,images[asset==='petted'?'petted':'proud'],asset,index);
 }
 function fitPortrait(key){
  var reference=env.charwrap.querySelector('.maro-event-canvas');if(!reference)return;
  // The regular canvas is display:none during the native idle portrait.
  // It remains visibility:hidden under the event lock while being measured.
  var display=reference.style.display;reference.style.display='block';
  var rect=reference.getBoundingClientRect();reference.style.display=display;
  var room=stage.getBoundingClientRect();
  var banner=stage.querySelector('.bubble-overlay'),top=room.top+stage.clientTop;
  // Normal registration includes the final two outline pixels below the sole.
  var floor=Math.min(stage.clientHeight-8,banner?banner.getBoundingClientRect().top-top-4:stage.clientHeight-8);
  // The 768px artwork is the normal 512px registration plus 128px padding.
  // Preserve that size; translate complete cels before considering a smaller fit.
  var box=bounds[typeof key==='string'?key:lastKey]||bounds.b00;if(!box||rect.width<=0)return;
  var normal=rect.width/512,scale=Math.min(normal,(stage.clientWidth-16)/(box[2]-box[0]),(floor-8)/(box[3]-box[1]));
  if(scale<=0)return;
  var left=rect.left-room.left-stage.clientLeft-128*normal+370*(normal-scale);
  var y=rect.top-top+522*(normal-scale);
  left=Math.max(8-box[0]*scale,Math.min(left,stage.clientWidth-8-box[2]*scale));
  y=Math.max(8-box[1]*scale,Math.min(y,floor-box[3]*scale));
  portrait.style.width=768*scale+'px';portrait.style.height=560*scale+'px';
  portrait.style.left=left+'px';portrait.style.top=y+'px';
  portrait.dataset.scale=String(scale);portrait.dataset.normalScale=String(normal);
 }
 if(window.ResizeObserver){var observer=new ResizeObserver(fitPortrait);observer.observe(stage);var banner=stage.querySelector('.bubble-overlay');if(banner)observer.observe(banner);}
 window.addEventListener('resize',fitPortrait);fitPortrait();
 var button=document.createElement('button');button.id='cHelpMaro';button.type='button';button.className='cute-action-button';button.setAttribute('aria-label','たすける');button.hidden=true;
 var icon=document.createElement('img');icon.src='media/maro-help-button-v1.webp';icon.alt='たすける';button.appendChild(icon);env.actionRow.appendChild(button);
 function native(){return typeof window.MaroPet==='object'?window.MaroPet:null;}
 function restorePlan(restored){
  if(!valid(restored,clips))return;
  if(restored.helpAt&&phase(restored,Date.now())==='idle'){
   // The companion may finish this same event while the room is backgrounded.
   // Retire an older crying plan and retain the original rescue cooldown.
   if(plan){plan=restored;finish();}else rescuedPlan=restored;
   return;
  }
  plan=restored;if(env.enter)env.enter();lastPhase='';lastKey='';
 }
 function save(){
  var value=JSON.stringify(plan||rescuedPlan),bridge=native();
  try{if(bridge&&typeof bridge.balanceSave==='function'){
   var saved=typeof bridge.balanceSaveIfUnchanged==='function'?bridge.balanceSaveIfUnchanged(value,nativeSavedValue):bridge.balanceSave(value);
   if(!saved)throw Error('save rejected');nativeSavedValue=value;
  }else localStorage.setItem('maro_one_foot_v1',value);persistFailed=false;}
  catch(error){persistFailed=true;console.error('One-foot event save failed',error);}
 }
 function speak(text,voice,options){env.speak(text,voice||'sad',options);}
 function randomDelay(minimum,maximum){return minimum+Math.floor(Math.random()*(maximum-minimum+1));}
 function showCryingLine(selected,now){
  crySpeech={text:selected.text,voice:selected.voice,nextLineAt:now+randomDelay(12000,20000),nextVoiceAt:now+randomDelay(4000,7000)};
  speak(crySpeech.text,crySpeech.voice,{persistent:true});
 }
 function beginCrying(now){
  showCryingLine({text:plan.lines.aftermath||pick(LINES.aftermath,Math.random),voice:'amae'},now);
 }
 // Only the automatic deadline advances the dialogue. Public calls and taps
 // cannot skip a line; voice repeats keep its text and matching voice category.
 function cryingSpeech(){
  var now=Date.now();
  if(!plan||phase(plan,now)!=='crying'||crySpeech&&now<crySpeech.nextLineAt)return false;
  // Keep the current words and voice together until the clip finishes.
  if(env.voiceBusy&&env.voiceBusy())return false;
  showCryingLine(chooseCryingLine(Math.random,crySpeech&&crySpeech.text),now);return true;
 }
 function repeatCryingVoice(now){
  if(env.voiceBusy&&env.voiceBusy())return;
  if(env.voice)env.voice(crySpeech.voice);
  else speak(crySpeech.text,crySpeech.voice,{persistent:true});
  crySpeech.nextVoiceAt=now+randomDelay(4000,7000);
 }
 // Keep the completed rescue as the durable cooldown record, without locking
 // normal room activities. Its original end time also survives a late reopen.
 function finish(keepNative){rescuedPlan=plan&&plan.helpAt?plan:null;plan=null;crySpeech=null;if(!keepNative)save();lastPhase='';lastKey='';guidePending=false;button.hidden=true;portrait.style.display='none';petPortrait.style.display='none';document.body.classList.remove('one-foot-active');env.finished();if(!keepNative&&persistFailed)restoreNative(true);}
 function refresh(now){
  if(!plan||!ready||document.hidden||env.active&&!env.active())return;
  var state=phase(plan,now);
  if(state==='idle'){finish();return;}
  document.body.classList.add('one-foot-active');portrait.style.display='block';portrait.dataset.phase=state;
  // A rejected help write rolls back to crying; allow another durable save attempt.
  button.hidden=state!=='crying'||now<plan.cryAt+400;button.disabled=false;
  if(guidePending&&!button.hidden){button.focus({preventScroll:true});guidePending=false;}
  var key,opacity=1;
  if(state==='rescuing'){
   var age=now-plan.helpAt;
   if(age<RESCUE_FADE_MS){key=frameAt(clips.crying,plan.helpAt-plan.cryAt,true);opacity=1-age/RESCUE_FADE_MS;}
   else key=frameAt(plan.rescue?plan.rescue.route:rescue,age-RESCUE_FADE_MS,false);
  }else if(state==='crying')key=frameAt(clips.crying,now-plan.cryAt,true);
  else key=frameAt(plan.route,now-plan.startedAt,false);
  portrait.style.opacity=String(opacity);
  var petFrame=key.slice(0,3)==='pet',proudFrame=key.slice(0,5)==='proud',regularFrame=petFrame||proudFrame;
  petPortrait.style.display=regularFrame?'block':'none';
  if(regularFrame){portrait.style.display='none';paintRegular(petFrame?'petted':'game-proud',Number(key.slice(petFrame?3:5)));}
  else fitPortrait(key);
  if(key!==lastKey){ctx.clearRect(0,0,768,560);ctx.imageSmoothingEnabled=true;ctx.imageSmoothingQuality='high';
   if(!regularFrame)ctx.drawImage(images[key],0,0,768,560);
   lastKey=key;portrait.dataset.cel=key;
  }
  if(state!==lastPhase){lastPhase=state;
   if(state==='balancing')speak(plan.lines.balance,'happy02');
   else if(state==='falling')speak(plan.lines.fallen,'surprise');
   else if(state==='proud')proudSpoken=false;
   else if(state==='crying'){beginCrying(now);window.MaroWebNotifications?.event('rescue',plan.id);}
   else if(state==='rescuing'){rescueSpoken=false;crySpeech=null;}
  }
  if(state==='rescuing'&&!rescueSpoken&&now>=plan.helpAt+RESCUE_FADE_MS){rescueSpoken=true;speak(plan.lines.thanks,'happy02');}
  if(state==='proud'&&!proudSpoken&&now>=plan.proudSpeechAt){proudSpoken=true;speak(plan.lines.returned,'happy01');}
  if(state==='crying'&&crySpeech){
   if(now>=crySpeech.nextLineAt)cryingSpeech();
   else if(now>=crySpeech.nextVoiceAt)repeatCryingVoice(now);
  }
 }
 function start(origin){var now=Date.now();if(!ready||plan||rescuedPlan&&now<rescuedPlan.helpEndAt+RESCUE_QUIET_MS||!env.eligible())return false;plan=origin==='run'?{schema:1,id:'run-'+now,origin:'run',startedAt:now,outcome:'fall',branchMs:0,route:clips.fall,cryAt:now+sum(clips.fall),returnEndAt:0,helpAt:0,helpEndAt:0,lines:{balance:'',returned:'',fallen:'きゅっ！？ ころんじゃった…！',thanks:'おこしてくれて、ありがとう♪'}}:makePlan(now,Math.random,clips);save();if(persistFailed){plan=null;restoreNative(true);return false;}rescuedPlan=null;if(env.enter)env.enter();lastPhase='';refresh(now);return true;}
 function help(){var now=Date.now();if(!plan||phase(plan,now)!=='crying'||now<plan.cryAt+400)return false;
  var selected;
  try{selected=makeRescuePlan(Math.random,clips);}catch(error){console.error('One-foot rescue unavailable',error);return false;}
  plan.helpAt=now;plan.helpEndAt=now+RESCUE_FADE_MS+sum(selected.route);plan.rescue=selected;
  save();if(persistFailed){plan.helpAt=plan.helpEndAt=0;delete plan.rescue;restoreNative(true);return false;}
  refresh(now);return true;
 }
 button.addEventListener('click',help);
 var blocked='#cPet,#cNap,#cSnack,#cSnackBig,#cBreath,#cLateNight,#cSnackBox,#maroChatSend,#maroChatForm,#breathControls';
 function intercept(e){if(!plan)return;var target=e.target.closest&&e.target.closest('#stage,'+blocked);if(!target)return;
  if(e.target.closest('#cHelpMaro'))return;
  e.preventDefault();e.stopImmediatePropagation();
 }
 ['pointerdown','pointermove','pointerup','touchstart','touchmove','touchend','mousedown','mouseup','click','submit'].forEach(function(type){document.addEventListener(type,intercept,{capture:true,passive:false});});
 var loading=false,retryAt=0,retryDelay=1000,assetSources={},resolveLoaded;
 // Readiness belongs to the successful restoration, including recovered loads.
 // Never release a saved fall's boot lock with no matching portrait to paint.
 var loaded=new Promise(function(resolve){resolveLoaded=resolve;});
 function loadAssets(){
  if(ready||loading)return;
  loading=true;restoring=true;
  fetch('one-foot-assets.json').then(function(r){if(!r.ok)throw Error('one-foot manifest unavailable');return r.json();}).then(function(m){clips=m;
  var entries=Object.keys(m.assets).filter(function(key){return key.slice(0,5)!=='proud';}).map(function(key){return [key,m.assets[key].src];});entries.push(['petted','media/maro-pet-banzai-v1.webp'],['proud','media/maro-game-proud-v2.webp']);
  return Promise.allSettled(entries.map(function(pair){
   if(images[pair[0]]&&assetSources[pair[0]]===pair[1])return Promise.resolve();
   return new Promise(function(resolve,reject){var image=new Image();image.onload=function(){images[pair[0]]=image;assetSources[pair[0]]=pair[1];resolve();};image.onerror=function(){reject(Error('one-foot cel missing: '+pair[0]));};image.src=pair[1];});
  })).then(function(results){var failed=results.find(function(r){return r.status==='rejected';});if(failed)throw failed.reason;});
 }).then(function(){
  // Measure the original alpha, including ears, outlines and falling tears.
  // Cache once so animation ticks only change CSS, without resampling the art.
  Object.keys(clips.assets).forEach(function(key){if(key.slice(0,5)==='proud')return;
   ctx.clearRect(0,0,768,560);ctx.drawImage(images[key],0,0);
   var pixels=ctx.getImageData(0,0,768,560).data,left=768,right=0,top=560,bottom=0;
   for(var y=0;y<560;y++)for(var x=0;x<768;x++)if(pixels[(y*768+x)*4+3]){left=Math.min(left,x);right=Math.max(right,x+1);top=Math.min(top,y);bottom=Math.max(bottom,y+1);}
   bounds[key]=[left,top,right,bottom];
  });ctx.clearRect(0,0,768,560);
  ready=true;var bridge=native(),raw=null;
  try{raw=bridge&&typeof bridge.balanceRead==='function'?bridge.balanceRead():localStorage.getItem('maro_one_foot_v1');nativeSavedValue=raw||'null';restorePlan(raw?JSON.parse(raw):null);}catch(error){console.error('One-foot restoration failed',error);}
  restoring=false;loading=false;retryAt=0;window.__maroOneFootBootLocked=false;document.documentElement.classList.remove('maro-rescue-boot');refresh(Date.now());
  if(window.maroReportLoadFailure)window.maroReportLoadFailure('one-foot-assets',false);resolveLoaded();
 }).catch(function(error){
  console.error(error);ready=false;loading=false;restoring=true;
  if(window.maroReportLoadFailure)window.maroReportLoadFailure('one-foot-assets',true);
  retryAt=Date.now()+retryDelay;retryDelay=Math.min(30000,retryDelay*2);
 });
 }
 loadAssets();
 setInterval(function(){
  if(!ready&&!loading&&Date.now()>=retryAt&&!document.hidden&&(!env.active||env.active()))loadAssets();
  refresh(Date.now());
 },40);
 function restoreNative(force){
  if(!force&&typeof window.maroRoomSyncEnabled==='function'&&!window.maroRoomSyncEnabled())return;
  if(!ready){if(!document.hidden)loadAssets();return;}
  var bridge=native();if(!bridge||typeof bridge.balanceRead!=='function')return;
  try{var raw=bridge.balanceRead(),restored=JSON.parse(raw);nativeSavedValue=raw;
   if(force&&restored===null){plan=null;finish(true);return;}
   var sameRescue=plan&&restored&&plan.id===restored.id&&!plan.helpAt&&restored.helpAt;
   if(restored&&(sameRescue||(!plan||plan.id!==restored.id)&&(!rescuedPlan||rescuedPlan.id!==restored.id)))restorePlan(restored);
  }
  catch(error){console.error('Rescue restoration failed',error);}
 }
 document.addEventListener('visibilitychange',function(){if(!document.hidden){restoreNative();refresh(Date.now());}});
 return {start:start,help:help,guide:function(){loaded.then(function(){restoreNative();guidePending=!!plan;refresh(Date.now());});},sync:restoreNative,blocked:function(){return restoring||!!plan;},cryingSpeech:cryingSpeech,ready:loaded,canvas:portrait,petCanvas:petPortrait,button:button,state:function(){return plan?{id:plan.id,phase:phase(plan,Date.now()),branchMs:plan.branchMs,helpAt:plan.helpAt,helpEndAt:plan.helpEndAt,rescue:plan.rescue?{bowCount:plan.rescue.bowCount,outcome:plan.rescue.outcome,duration:sum(plan.rescue.route)}:null}:null;}};
}
return {makePlan:makePlan,chooseCryingLine:chooseCryingLine,makeRescuePlan:makeRescuePlan,validRescuePlan:validRescuePlan,phase:phase,frameAt:frameAt,sum:sum,valid:valid,lines:LINES,rescue:rescue,mount:mount};
});
