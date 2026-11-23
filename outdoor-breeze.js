(function(root,factory){var api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.MaroOutdoorBreeze=api;})(typeof window==='object'?window:globalThis,function(){
'use strict';
var LINES=Object.freeze([
 'そよそよ。おみみ、ふわってした。',
 'えへへ。かぜがくすぐったい。',
 'ふわっ。やさしいかぜだね。',
 'かぜといっしょに、ゆーらゆら。',
 'おみみに、かぜがあそびにきたよ。',
 'えへへ。かぜと、ないしょばなし。',
 'そよかぜさん、こんにちは。',
 'きみにも、そよそよ、とどいた？'
]);
var SCENES=Object.freeze(['flowers','moon','momiji','hana']),DURATION=12000;
function frameAt(manifest,age){return manifest.frames[Math.min(manifest.frames.length-1,Math.max(0,Math.floor(age*manifest.fps/1000)))];}
function chooseLine(random,previous){var pool=LINES.filter(function(line){return line!==previous;});return pool[Math.min(pool.length-1,Math.floor(random()*pool.length))];}
function mount(env){
 var ready=false,manifest=null,images={},plan=null,previous='',raf=null;
 var stage=env.charwrap.closest('#stage'),canvas=document.createElement('canvas');
 canvas.width=640;canvas.height=560;canvas.className='maro-breeze-portrait';canvas.hidden=true;
 canvas.setAttribute('role','img');canvas.setAttribute('aria-label','そよ風にゆれるまろちゃん');stage.appendChild(canvas);
 var ctx=canvas.getContext('2d');
 function scene(){var s=env.scene();return s&&s.phase==='idle'&&SCENES.indexOf(s.scene)!==-1?s.scene:null;}
 function canStart(){return ready&&!plan&&env.active()&&!!scene()&&env.eligible();}
 function fit(){
  var ref=env.charwrap.querySelector('.maro-event-canvas');if(!ref||!manifest)return;
  var display=ref.style.display;ref.style.display='block';var rect=ref.getBoundingClientRect();ref.style.display=display;
  if(rect.width<=0)return;
  var room=stage.getBoundingClientRect(),normal=rect.width/512,b=manifest.paintBounds;
  var banner=stage.querySelector('.bubble-overlay'),top=room.top+stage.clientTop;
  var floor=Math.min(stage.clientHeight-8,banner?banner.getBoundingClientRect().top-top-4:stage.clientHeight-8);
  var scale=Math.min(normal,(stage.clientWidth-16)/(b[2]-b[0]),(floor-8)/(b[3]-b[1]));
  if(scale<=0)return;
  var left=rect.left-room.left-stage.clientLeft-64*normal+306*(normal-scale),y=rect.top-top+523*(normal-scale);
  left=Math.max(8-b[0]*scale,Math.min(left,stage.clientWidth-8-b[2]*scale));
  y=Math.max(8-b[1]*scale,Math.min(y,floor-b[3]*scale));
  canvas.style.width=640*scale+'px';canvas.style.height=560*scale+'px';canvas.style.left=left+'px';canvas.style.top=y+'px';
 }
 function finish(reason){
  if(!plan)return;plan=null;if(raf!==null)cancelAnimationFrame(raf);raf=null;
  canvas.hidden=true;document.body.classList.remove('maro-breeze-active');env.finished(reason||'complete');
 }
 function tick(){
  if(!plan)return;
  // A hidden/backgrounded room ends cleanly; never replay a stale event on resume.
  if(!env.active()||scene()!==plan.scene){finish('inactive');return;}
  var age=performance.now()-plan.startedAt;if(age>=DURATION){finish('complete');return;}
  var cel=env.reduced()?manifest.reducedCel:frameAt(manifest,age);
  ctx.clearRect(0,0,640,560);
  // Draw a complete cel with one uniform scale; no body parts or deformation.
  ctx.drawImage(images[cel],26,-2,560,560);canvas.dataset.cel=cel;canvas.dataset.age=String(age);
  raf=requestAnimationFrame(tick);
 }
 function start(){
  if(!canStart())return false;
  var text=chooseLine(env.random||Math.random,previous);previous=text;
  plan={startedAt:performance.now(),scene:scene(),text:text};
  try{env.begin(text,DURATION);document.body.classList.add('maro-breeze-active');canvas.hidden=false;fit();tick();return true;}
  catch(error){finish('error');throw error;}
 }
 var loading=fetch('outdoor-breeze.json').then(function(r){if(!r.ok)throw Error('Breeze manifest unavailable');return r.json();}).then(function(m){
  if(m.fps!==30||m.frames.length!==360||m.duration!==DURATION||!m.assets[m.reducedCel]||m.frames.some(function(c){return !m.assets[c];}))throw Error('Invalid breeze manifest');
  manifest=m;
  return Promise.all(Object.keys(m.assets).map(function(c){return new Promise(function(resolve,reject){var im=new Image();im.onload=function(){images[c]=im;resolve();};im.onerror=reject;im.src=m.assets[c];});}));
 }).then(function(){ready=true;}).catch(function(){ready=false;});
 document.addEventListener('visibilitychange',function(){if(document.hidden)finish('hidden');});
 window.addEventListener('pagehide',function(){finish('hidden');});window.addEventListener('resize',fit);
 if(window.ResizeObserver){var observer=new ResizeObserver(fit);observer.observe(stage);var banner=stage.querySelector('.bubble-overlay');if(banner)observer.observe(banner);}
 return {canStart:canStart,start:start,blocked:function(){return !!plan;},finish:finish,ready:loading,state:function(){return plan?{scene:plan.scene,text:plan.text}:null;}};
}
return {LINES:LINES,SCENES:SCENES,DURATION:DURATION,frameAt:frameAt,chooseLine:chooseLine,mount:mount};
});
