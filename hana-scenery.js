/* Independent spring scenery; it never changes character or event clocks. */
(function(root){
'use strict';
const W=1086,H=1448,backdrop='media/maro-hana-backdrop-v1.webp';
const MIN_BUBBLES=48,MAX_BUBBLES=64,SIDE_BUBBLES=24,RIM_BUBBLES=16;
const files=[backdrop,'media/maro-hana-sky-mask-v1.webp',...Array.from({length:4},(_,i)=>'media/maro-hana-cloud-'+i+'-v1.webp'),...Array.from({length:4},(_,i)=>'media/maro-hana-bubble-'+i+'-v1.webp')];
function seeded(seed){return ()=>{seed|=0;seed=seed+0x6D2B79F5|0;let n=Math.imul(seed^seed>>>15,1|seed);n=n+Math.imul(n^n>>>7,61|n)^n;return ((n^n>>>14)>>>0)/4294967296;};}
function particles(random=Math.random){
 let now=0,nextPopulation=0,nextChange=0,target=MIN_BUBBLES+Math.floor(random()*(MAX_BUBBLES-MIN_BUBBLES+1)),serial=0;
 const live=[],clouds=[],recent=[];
 function bubble(initial,lane=0,band=-1){
  const cross=Math.abs(lane)===2,fadeIn=600+random()*600;
  return {id:++serial,front:serial%3===0,lane,type:Math.floor(random()*4),
   x:cross?.12+random()*.76:lane?(lane<0?-.06:.82)+random()*.24:.04+random()*.92,
   y:initial?(band>=0?-.08+(band+random())/(cross?RIM_BUBBLES/2:SIDE_BUBBLES/2)*1.16:-.08+random()*1.16):1.04+random()*.06,
   r:.058+random()*.032,speed:.01425+random()*.0105,wind:.002+random()*.002,phase:random()*Math.PI*2,
   drift:.009+random()*.009,alpha:.94+random()*.06,period:6000+random()*2400,
   life:90000+random()*30000,fadeOut:1000+random()*2600,fadeIn,born:now-(initial?fadeIn:0)};
 }
 function cloud(initial,lane){const available=[0,1,2,3].filter(i=>!recent.slice(-2).includes(i)),type=available[Math.floor(random()*available.length)];recent.push(type);if(recent.length>3)recent.shift();return {type,x:initial?lane*310-160:-430-random()*200,width:230+random()*150,centerY:95+lane*110+(random()-.5)*25,speed:1.6+random()*.6,alpha:.58+random()*.14};}
 while(live.length<target){const i=live.length,edge=i-SIDE_BUBBLES;live.push(i<SIDE_BUBBLES?bubble(true,i%2?-1:1,Math.floor(i/2)):edge<RIM_BUBBLES?bubble(true,edge%2?-2:2,Math.floor(edge/2)):bubble(true));}for(let lane=0;lane<3;lane++)clouds.push(cloud(true,lane));
 function sample(time){
  if(time<now)throw Error('Scenery time must move forward');const dt=(time-now)/1000;now=time;
  if(time>=nextPopulation){target=MIN_BUBBLES+Math.floor(random()*(MAX_BUBBLES-MIN_BUBBLES+1));nextPopulation=time+45000+random()*45000;}
  if(time>=nextChange){if(live.length<target)live.push(bubble(true));else if(live.length>target){const free=live.filter(b=>!b.lane);live.splice(live.indexOf(free[Math.floor(random()*free.length)]),1);}nextChange=time+1800+random()*2500;}
  for(let i=0;i<live.length;i++){let b=live[i];if(time-b.born>=b.life)b=live[i]=bubble(false,b.lane);b.y-=dt*b.speed;b.x+=dt*b.wind;if(b.y<-b.r-.025||b.x>1+b.r+.025)live[i]=bubble(false,b.lane);}
  clouds.forEach((c,i)=>{c.x+=dt*c.speed;if(c.x>W+20)Object.assign(c,cloud(false,i));});
  // A shared upward breeze carries every bubble; only the small sideways sway varies.
  return {bubbles:live.map(b=>{const age=time-b.born,edge=Math.min((b.y+.04)/b.speed,(1.04-b.x)/b.wind)*1000,fade=Math.max(0,Math.min(1,age/b.fadeIn,(b.life-age)/b.fadeOut,edge/b.fadeOut));return {...b,alpha:b.alpha*fade,paintX:b.x+Math.sin(time*Math.PI*2/b.period+b.phase)*b.drift};}),clouds:clouds.map(c=>({...c})),target};
 }
 return {sample,pop(id){const i=live.findIndex(b=>b.id===id);if(i<0)return false;
   const old=live[i],rim=Math.abs(old.lane)===2;let replacement;for(let n=0;n<20;n++){replacement=bubble(true,rim?old.lane:-old.lane);if(Math.hypot(replacement.x-old.x,replacement.y-old.y)>.25)break;}
   if(Math.hypot(replacement.x-old.x,replacement.y-old.y)<=.25){if(rim)replacement.x=old.x<.5?.90:.10;else replacement.y=old.y<.5?.85:.10;}
   live[i]=replacement;return true;}};
}
function create(layer,active){
 const image=new Image();image.className='roomimg';image.alt='';image.src=backdrop;layer.appendChild(image);
 const canvas=document.createElement('canvas');canvas.className='hana-scenery-canvas';canvas.setAttribute('aria-hidden','true');canvas.style.opacity='0';layer.appendChild(canvas);
 const frontCanvas=document.createElement('canvas');frontCanvas.className='hana-scenery-canvas hana-scenery-front';frontCanvas.setAttribute('aria-hidden','true');frontCanvas.style.opacity='0';layer.parentNode.appendChild(frontCanvas);
 const preference=matchMedia('(prefers-reduced-motion: reduce)'),seed=Math.floor(Math.random()*4294967296);
 let bundle=null,bubbleSprites=null,pending=null,enabled=false,failed=false,running=false,raf=0,lastWall=null,lastPaint=-100,elapsed=0,drawCount=0,lastState=null,hitFilter=null,model=particles(seeded(seed));
 const cloudCanvas=document.createElement('canvas');cloudCanvas.width=543;cloudCanvas.height=724;const cg=cloudCanvas.getContext('2d');
 function stop(){cancelAnimationFrame(raf);raf=0;running=false;lastWall=null;}
 function prepare(){
  if(bundle)return Promise.resolve();if(pending)return pending;
  pending=Promise.all(files.map((src,i)=>{const im=i===0?image:new Image();if(i)im.src=src;return im.decode().then(()=>im);})).then(images=>{
   // Bake stronger translucent rims once; reuse them each frame with transparent centers.
   const sprites=images.slice(6).map(im=>{const sprite=document.createElement('canvas');sprite.width=im.naturalWidth;sprite.height=im.naturalHeight;
    const g=sprite.getContext('2d');g.filter='saturate(1.3) contrast(1.12)';g.drawImage(im,0,0);g.drawImage(im,0,0);return sprite;});
   bundle=images;bubbleSprites=sprites;pending=null;failed=false;sync();
  }).catch(error=>{pending=null;failed=true;canvas.style.opacity=frontCanvas.style.opacity='0';stop();throw error;});return pending;
 }
 function draw(time){
  if(!bundle)return false;
  if(time<elapsed)model=particles(seeded(seed));elapsed=Math.max(0,time);lastState=model.sample(elapsed);
  const dpr=Math.min(root.devicePixelRatio||1,1.5),width=Math.max(1,layer.clientWidth),height=Math.max(1,layer.clientHeight),pw=Math.round(width*dpr),ph=Math.round(height*dpr);
  if(canvas.width!==pw||canvas.height!==ph){canvas.width=frontCanvas.width=pw;canvas.height=frontCanvas.height=ph;}
  const g=canvas.getContext('2d'),fg=frontCanvas.getContext('2d'),scale=Math.max(pw/W,ph/H),ox=(pw-W*scale)*.5,oy=(ph-H*scale)*.42;
  cg.setTransform(.5,0,0,.5,0,0);cg.clearRect(0,0,W,H);
  for(const c of lastState.clouds){const im=bundle[2+c.type];cg.globalAlpha=c.alpha;cg.drawImage(im,c.x,c.centerY-c.width*im.naturalHeight/im.naturalWidth*.5,c.width,c.width*im.naturalHeight/im.naturalWidth);}
  cg.globalAlpha=1;cg.save();cg.setTransform(1,0,0,1,0,0);cg.globalCompositeOperation='destination-in';cg.drawImage(bundle[1],0,0,543,724);cg.restore();
  g.setTransform(1,0,0,1,0,0);g.clearRect(0,0,pw,ph);g.setTransform(scale,0,0,scale,ox,oy);g.drawImage(cloudCanvas,0,0,W,H);
  // Draw the same natural population on both sides of the portrait for depth.
  g.setTransform(1,0,0,1,0,0);fg.setTransform(1,0,0,1,0,0);fg.clearRect(0,0,pw,ph);
  for(const b of lastState.bubbles){const radius=b.r*Math.min(pw,ph),x=b.paintX*pw,y=b.y*ph,paint=b.front?fg:g;paint.globalAlpha=b.alpha;paint.drawImage(bubbleSprites[b.type],x-radius,y-radius,radius*2,radius*2);}
  g.globalAlpha=fg.globalAlpha=1;canvas.style.opacity='1';frontCanvas.style.opacity=wanted()?'1':'0';drawCount++;return true;
 }
 function wanted(){return enabled&&active()&&!document.hidden&&!failed&&!!bundle;}
 function geometry(b){const r=canvas.getBoundingClientRect(),radius=b.r*Math.min(r.width,r.height);
   return {id:b.id,front:b.front,x:r.left+b.paintX*r.width,y:r.top+b.y*r.height,radius};}
 function hit(x,y){if(!wanted()||!lastState)return null;
   const r=canvas.getBoundingClientRect();if(x<r.left||y<r.top||x>r.right||y>r.bottom)return null;
   // Reject empty space before portrait occlusion; the same point needs at most
   // one front/back decision regardless of how many bubbles overlap it.
   const candidates=lastState.bubbles.filter(b=>b.alpha>=.15).map(geometry).filter(b=>Math.hypot(x-b.x,y-b.y)<=Math.max(22,b.radius))
     .sort((a,b)=>Number(b.front)-Number(a.front)||Math.hypot(x-a.x,y-a.y)-Math.hypot(x-b.x,y-b.y));
   const accepted={};return candidates.find(b=>{if(!hitFilter)return true;const side=b.front?'front':'back';
     if(!(side in accepted))accepted[side]=!!hitFilter(x,y,b.front);return accepted[side];})||null;}
 function pop(id){const b=lastState&&lastState.bubbles.find(b=>b.id===id);if(!wanted()||!b||!model.pop(id))return false;
   const p=geometry(b),r=canvas.getBoundingClientRect(),burst=document.createElement('span');burst.className='hana-bubble-pop';burst.setAttribute('aria-hidden','true');
   burst.style.left=(p.x-r.left)+'px';burst.style.top=(p.y-r.top)+'px';burst.style.width=burst.style.height=(p.radius*2)+'px';if(p.front){burst.style.zIndex='5';layer.parentNode.appendChild(burst);}else layer.appendChild(burst);
   const motion=burst.animate([{opacity:1,transform:'translate(-50%,-50%) scale(1)'},{opacity:0,transform:'translate(-50%,-50%) scale('+(preference.matches?1:1.7)+')'}],{duration:preference.matches?120:420,easing:'ease-out'});
   motion.finished.catch(function(){}).then(()=>burst.remove());draw(elapsed);return true;}
 function frame(time){if(!running)return;if(lastWall!==null)elapsed+=Math.max(0,Math.min(250,time-lastWall));lastWall=time;if(time-lastPaint>=1000/30){draw(elapsed);lastPaint=time;}raf=requestAnimationFrame(frame);}
 function sync(){if(!wanted()){frontCanvas.style.opacity='0';stop();return;}frontCanvas.style.opacity='1';if(preference.matches){stop();draw(elapsed);return;}if(running)return;running=true;lastWall=null;lastPaint=-100;draw(elapsed);raf=requestAnimationFrame(frame);}
 new ResizeObserver(()=>{if(wanted())draw(elapsed);}).observe(layer);
 preference.addEventListener('change',sync);document.addEventListener('visibilitychange',sync);
 return {prepare,draw,hit,pop,canvas,image,setHitFilter(fn){hitFilter=fn;},setActive(value){enabled=!!value;sync();},state(){return {running,ready:!!bundle,pending:!!pending,fallback:failed,elapsedMs:elapsed,drawCount,reducedMotion:preference.matches,min:MIN_BUBBLES,max:MAX_BUBBLES,count:lastState?lastState.bubbles.length:0,target:lastState?lastState.target:0,bubbles:lastState?lastState.bubbles:[],clouds:lastState?lastState.clouds:[]};}};
}
root.MaroHanaScenery={create,particles,seeded,files,backdrop};
if(typeof module!=='undefined')module.exports=root.MaroHanaScenery;
})(typeof window==='undefined'?globalThis:window);
