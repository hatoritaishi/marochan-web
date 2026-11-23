(function(root,factory){var api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.MaroCheekRub=api;})(typeof window==='object'?window:globalThis,function(){
'use strict';
var LINES=Object.freeze([
 'ぷにっ、ぷにっ。ふわふわほっぺ。',
 'えへへ。ほっぺまで、うれしい。',
 'みてみて。にこにこ、できたよ。',
 'ほっぺをほぐして、にっこりじゅんび。',
 'きみに、にこにこのおすそわけ。',
 'ぷにぷに。ほっぺ、やわらかいよ。',
 'ほっぺ、くるくる。にこにこになあれ。'
]);
var MIN_CYCLES=3,MAX_CYCLES=6,MANUAL_CHANCE=.25;
function unit(random){return Math.max(0,Math.min(1-Number.EPSILON,Number(random())||0));}
function chooseCycles(random){return MIN_CYCLES+Math.floor(unit(random)*(MAX_CYCLES-MIN_CYCLES+1));}
function chooseLine(random,previous){var pool=LINES.filter(function(s){return s!==previous;});return pool[Math.floor(unit(random)*pool.length)];}
function makePlan(manifest,cycles){
 if(!Number.isInteger(cycles)||cycles<MIN_CYCLES||cycles>MAX_CYCLES)throw Error('Invalid cheek rub cycles');
 var frames=manifest.intro.slice();for(var i=0;i<cycles;i++)frames=frames.concat(manifest.cycle);frames=frames.concat(manifest.outro);
 return {cycles:cycles,frames:frames,duration:frames.length*1000/manifest.fps};
}
function frameAt(plan,age,reduced){return reduced&&age<plan.duration-600?'happy_full':plan.frames[Math.min(plan.frames.length-1,Math.max(0,Math.floor(age*30/1000)))];}
function validManifest(m){
 return !!m&&m.fps===30&&Array.isArray(m.intro)&&m.intro.length===52&&Array.isArray(m.cycle)&&m.cycle.length===32&&Array.isArray(m.outro)&&m.outro.length===92&&
  m.intro[0]==='standing'&&m.outro[m.outro.length-1]==='standing'&&m.cycle[0]==='circle_upper_in'&&m.assets&&m.assets.happy_full&&
  [m.intro,m.cycle,m.outro].every(function(a){return a.every(function(c){return typeof m.assets[c]==='string'&&/^media\/cheek-rub-v1\/[a-z0-9_]+\.webp$/.test(m.assets[c]);});})&&
  Array.isArray(m.paintBounds)&&m.paintBounds.length===4&&m.paintBounds.every(Number.isFinite);
}
function mount(env){
 var ready=false,manifest=null,images={},plan=null,previous='',raf=null;
 var stage=env.charwrap.closest('#stage'),canvas=document.createElement('canvas');
 canvas.width=640;canvas.height=560;canvas.className='maro-cheek-rub-portrait';canvas.hidden=true;
 canvas.setAttribute('role','img');canvas.setAttribute('aria-label','ほっぺをぷにぷにするまろちゃん');stage.appendChild(canvas);
 var ctx=canvas.getContext('2d');
 function canStart(source){source=source||'auto';return ready&&!plan&&env.active()&&env.eligible(source);}
 function fit(){
  var ref=env.charwrap.querySelector('.maro-event-canvas');if(!ref||!manifest)return;
  var display=ref.style.display;ref.style.display='block';var rect=ref.getBoundingClientRect();ref.style.display=display;if(rect.width<=0)return;
  var room=stage.getBoundingClientRect(),normal=rect.width/512,b=manifest.paintBounds;
  var banner=stage.querySelector('.bubble-overlay'),top=room.top+stage.clientTop;
  var floor=Math.min(stage.clientHeight-8,banner?banner.getBoundingClientRect().top-top-4:stage.clientHeight-8);
  var scale=Math.min(normal,(stage.clientWidth-16)/(b[2]-b[0]),(floor-8)/(b[3]-b[1]));if(scale<=0)return;
  var left=rect.left-room.left-stage.clientLeft-64*normal+306*(normal-scale),y=rect.top-top+manifest.paintAnchorY*(normal-scale);
  left=Math.max(8-b[0]*scale,Math.min(left,stage.clientWidth-8-b[2]*scale));y=Math.max(8-b[1]*scale,Math.min(y,floor-b[3]*scale));
  canvas.style.width=640*scale+'px';canvas.style.height=560*scale+'px';canvas.style.left=left+'px';canvas.style.top=y+'px';
 }
 function finish(reason){
  if(!plan)return;plan=null;if(raf!==null)cancelAnimationFrame(raf);raf=null;
  canvas.hidden=true;document.body.classList.remove('maro-cheek-rub-active');env.finished(reason||'complete');
 }
 function tick(){
  if(!plan)return;if(!env.active()){finish('inactive');return;}
  var age=performance.now()-plan.startedAt;if(age>=plan.duration){finish('complete');return;}
  var cel=frameAt(plan,age,env.reduced());ctx.clearRect(0,0,640,560);
  // Approved complete cels only: one uniform whole-canvas placement, no part warping.
  ctx.drawImage(images[cel],26,-2,560,560);canvas.dataset.cel=cel;canvas.dataset.age=String(age);
  raf=requestAnimationFrame(tick);
 }
 function start(source){
  source=source||'auto';if(!canStart(source))return false;
  var random=env.random||Math.random,text=chooseLine(random,previous),motion=makePlan(manifest,chooseCycles(random));
  if(env.admit&&!env.admit(motion.duration,source))return false;previous=text;
  plan=Object.assign(motion,{startedAt:performance.now(),source:source,text:text});
  try{env.begin(text,plan.duration,source);document.body.classList.add('maro-cheek-rub-active');canvas.hidden=false;fit();tick();return true;}
  catch(error){finish('error');throw error;}
 }
 var loading=fetch('cheek-rub.json').then(function(r){if(!r.ok)throw Error('Cheek rub manifest unavailable');return r.json();}).then(function(m){
  if(!validManifest(m))throw Error('Invalid cheek rub manifest');manifest=m;
  return Promise.all(Object.keys(m.assets).map(function(c){return new Promise(function(resolve,reject){var im=new Image();im.onload=function(){images[c]=im;resolve();};im.onerror=reject;im.src=m.assets[c];});}));
 }).then(function(){ready=true;}).catch(function(){ready=false;});
 document.addEventListener('visibilitychange',function(){if(document.hidden)finish('hidden');});window.addEventListener('pagehide',function(){finish('hidden');});window.addEventListener('resize',fit);
 if(window.ResizeObserver){var observer=new ResizeObserver(fit);observer.observe(stage);var banner=stage.querySelector('.bubble-overlay');if(banner)observer.observe(banner);}
 return {canStart:canStart,start:start,blocked:function(){return !!plan;},finish:finish,ready:loading,state:function(){return plan?{text:plan.text,source:plan.source,cycles:plan.cycles,duration:plan.duration}:null;}};
}
return {LINES:LINES,MIN_CYCLES:MIN_CYCLES,MAX_CYCLES:MAX_CYCLES,MANUAL_CHANCE:MANUAL_CHANCE,chooseCycles:chooseCycles,chooseLine:chooseLine,makePlan:makePlan,frameAt:frameAt,validManifest:validManifest,mount:mount};
});
