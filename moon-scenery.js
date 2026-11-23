/* Moon scenery owns only background drawing; pausing never advances character/event time. */
(function(root){
'use strict';
const backdrop='media/maro-moon-calm-backdrop-v1.webp';
const cloudFiles=['a','b','c','d'].map(function(key){return 'media/maro-moon-cloud-'+key+'-v1.webp';});
let cloudBundle=null;
function clouds(){
 if(!cloudBundle)cloudBundle=Promise.all(cloudFiles.map(function(src){const im=new Image();im.src=src;return im.decode().then(function(){return im;});})).catch(function(error){cloudBundle=null;throw error;});
 return cloudBundle;
}
const sources={morning:'media/maro-moon-morning-v1.webp',day:'media/maro-moon-day-v1.webp',evening:'media/maro-moon-evening-v1.webp',night:backdrop};
function createMoon(layer){
 const images=[new Image(),new Image()],cache={};let visible=0,period='',request=0,pending=null,fadeTimer=null;
 images.forEach(function(image){image.className='roomimg';image.alt='';image.style.opacity='0';layer.appendChild(image);});
 images[0].src=backdrop;images[0].style.opacity='1';
 function asset(key){
  if(!cache[key]){const image=new Image();image.src=sources[key];cache[key]=image.decode().then(function(){return image.src;}).catch(function(error){delete cache[key];throw error;});}
  return cache[key];
 }
 function prepare(next='night',instant=true){
  if(!sources[next])return Promise.reject(Error('Unknown moon daypart'));
  if(next===period){if(pending&&pending.period!==next){++request;pending=null;}return Promise.resolve();}
  if(pending&&pending.period===next)return pending.promise;
  const token=++request;
  const promise=asset(next).catch(function(error){if(next!=='night')throw error;return 'media/maro-moon-meadow-v1.webp';}).then(function(src){
   if(token!==request)return;
   const index=1-visible,image=images[index];image.src=src;
   return image.decode().then(function(){
    if(token!==request)return;
    clearTimeout(fadeTimer);const old=images[visible];old.insertAdjacentElement('afterend',image);
    image.style.transition='none';image.style.opacity='0';void image.offsetWidth;
    const immediate=instant||!period||matchMedia('(prefers-reduced-motion: reduce)').matches;
    image.style.transition=immediate?'none':'opacity 1.6s ease';image.style.opacity='1';
    if(immediate)old.style.opacity='0';else fadeTimer=setTimeout(function(){if(token===request)old.style.opacity='0';},1600);
    visible=index;period=next;pending=null;
   });
  }).catch(function(error){if(token===request)pending=null;throw error;});
  pending={period:next,promise:promise};return promise;
 }
 return {get image(){return images[visible];},prepare:prepare,state:function(){return {period:period,pending:!!pending};},setActive:function(value){layer.dataset.running=String(!!value);}};
}
function create(layer,active,cover){
 const canvas=document.createElement('canvas');canvas.className='moon-cloud-canvas';canvas.setAttribute('aria-hidden','true');layer.appendChild(canvas);
 const preference=matchMedia('(prefers-reduced-motion: reduce)');
 const seed=Math.floor(Math.random()*4294967296);let image=null,sprites=null,kernel=null,stars=null,enabled=false,running=false,pending=false,lost=false,raf=0,lastWall=null,lastPaint=-100,elapsed=0,generation=0,drawCount=0,period='night';
 function stop(){cancelAnimationFrame(raf);raf=0;running=false;lastWall=null;}
 function fail(){lost=true;stop();canvas.style.opacity='0';canvas.dataset.fallback='static';}
 function reset(){
  stars=root.MaroMoonStars.make(40,120,seed);
  kernel=root.MaroMoonRenderer.create(canvas,image,sprites,root.MaroMoonRenderer.seeded(seed^181010),{starSampler:function(time){return period==='night'?stars.sample(time):[];}});
  stars.setMask(kernel.layers.skyMask);
 }
 function dimensions(){
  const dpr=Math.min(root.devicePixelRatio||1,1.5),w=Math.max(1,Math.round((layer.clientWidth||1)*dpr)),h=Math.max(1,Math.round((layer.clientHeight||1)*dpr));
  if(canvas.width!==w||canvas.height!==h){canvas.width=w;canvas.height=h;}
 }
 function draw(time){
  if(!kernel||lost)return false;
  try{dimensions();if(time<elapsed)reset();elapsed=Math.max(0,time);kernel.draw(elapsed);canvas.style.opacity='1';drawCount++;return true;}catch(error){fail();return false;}
 }
 function wanted(){return enabled&&active()&&!document.hidden&&!lost&&!!image;}
 function frame(time){
  if(!running)return;
  if(lastWall!==null)elapsed+=Math.max(0,Math.min(250,time-lastWall));lastWall=time;
  if(time-lastPaint>=100){if(!draw(elapsed))return;lastPaint=time;}
  raf=requestAnimationFrame(frame);
 }
 function sync(){
  if(!wanted()){stop();return;}
  if(!kernel){
   if(pending)return;pending=true;const token=++generation;
   clouds().then(function(images){
    if(token!==generation)return;pending=false;sprites=images;
    try{dimensions();reset();sync();}catch(error){fail();}
   }).catch(function(){if(token===generation){pending=false;fail();}});
   return;
  }
  if(preference.matches){stop();draw(elapsed);return;}
  if(running)return;running=true;lastWall=null;lastPaint=-100;draw(elapsed);if(running)raf=requestAnimationFrame(frame);
 }
 const observer=new ResizeObserver(function(){if(kernel&&wanted())draw(elapsed);});observer.observe(layer);
 preference.addEventListener('change',sync);document.addEventListener('visibilitychange',sync);
 return {canvas:canvas,draw:draw,setActive:function(value){enabled=!!value;sync();},setSource:function(next,nextPeriod='night',instant=true){
  if(image===next&&period===nextPeriod&&kernel){sync();return;}
  const valid=next&&next.src.endsWith(sources[nextPeriod]);
  if(valid&&kernel&&!lost){image=next;period=nextPeriod;kernel.setBackdrop(next,elapsed,instant);stars.setMask(kernel.layers.skyMask);draw(elapsed);sync();return;}
  stop();++generation;pending=false;image=next;period=nextPeriod;kernel=null;stars=null;elapsed=0;lost=!valid;canvas.style.opacity='0';
  if(lost)canvas.dataset.fallback='static';else delete canvas.dataset.fallback;sync();
 },state:function(){
  const population=stars?stars.state():{min:40,max:120,target:0,count:0};
  return {running:running,fallback:lost,pending:pending,source:image&&image.src,kind:'moon',period:period,renderer:'moon-canvas',elapsedMs:elapsed,drawCount:drawCount,reducedMotion:preference.matches,
   crop:cover(layer.clientWidth||1,layer.clientHeight||1),min:population.min,max:population.max,count:period==='night'?population.count:0,target:period==='night'?population.target:0,levels:5,
   clouds:kernel?kernel.liveAt(elapsed).map(function(c){return {type:c.type,x:c.x,width:c.width,centerY:c.centerY,speed:c.speed};}):[],
   stars:stars&&period==='night'?stars.sample(elapsed).map(function(s){return {x:s.x,y:s.y,birth:s.birth,duration:s.duration,pulse:s.pulse};}):[]};
 }};
}
root.MaroMoonScenery={create:create,createMoon:createMoon,backdrop:backdrop,sources:sources,cloudFiles:cloudFiles};
})(typeof window==='undefined'?globalThis:window);
