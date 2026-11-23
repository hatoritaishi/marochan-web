/* Half-resolution compositing; foreground artwork and event clocks are independent. */
(function(root){
 'use strict';
 const W=1086,H=1448,PW=543,PH=724,S=.5;
 function seeded(seed){return ()=>{seed|=0;seed=seed+0x6D2B79F5|0;let n=Math.imul(seed^seed>>>15,1|seed);n=n+Math.imul(n^n>>>7,61|n)^n;return ((n^n>>>14)>>>0)/4294967296;};}
 function create(canvas,back,sprites,random=Math.random,options={}){
  const g=canvas.getContext('2d'),history=[],live=[],recent=[];let now=0,previous=null,fadeStart=0;
  const surface=()=>{const c=document.createElement('canvas');c.width=PW;c.height=PH;return c;};
  const skyMask=surface(),cloudColor=surface(),cloudCover=surface(),starLayer=surface();
  const maskG=skyMask.getContext('2d',{willReadFrequently:true}),cloudG=cloudColor.getContext('2d'),coverG=cloudCover.getContext('2d',{willReadFrequently:true}),starG=starLayer.getContext('2d',{willReadFrequently:true});
  function mask(){
  maskG.clearRect(0,0,PW,PH);maskG.drawImage(back,0,0,PW,PH);const pixels=maskG.getImageData(0,0,PW,PH);
  for(let py=0;py<PH;py++)for(let px=0;px<PW;px++){
   const x=px/S,y=py/S;
   const at=(py*PW+px)*4,r=pixels.data[at],green=pixels.data[at+1],blue=pixels.data[at+2];
   const inCanopy=y>=285&&(x<440||x>875&&y>430);
   let foreground=y>500?1:inCanopy?Math.max(0,Math.min(1,(green-blue)/6)):0;
   if((x-264)**2+(y-193)**2<112**2)foreground=0;
   pixels.data[at]=pixels.data[at+1]=pixels.data[at+2]=255;pixels.data[at+3]=Math.round(255*(1-foreground));
  }
  maskG.putImageData(pixels,0,0);
  }
  mask();
  for(const ctx of [cloudG,coverG,starG])ctx.setTransform(S,0,0,S,0,0);
  function fresh(lane,birth){
   const available=[0,1,2,3].filter(i=>!recent.slice(-2).includes(i));
   const type=available[Math.floor(random()*available.length)];recent.push(type);if(recent.length>3)recent.shift();
   const width=260+random()*100,centerY=[58,132,330][lane]+(random()-.5)*10,speed=1.6+random()*.6;
   const cloud={type,width,centerY,speed,alpha:.52+random()*.12,x:-width-30,birth,lane};
   history.push({type,width,centerY,speed,alpha:cloud.alpha,birth,lane});if(history.length>64)history.shift();return cloud;
  }
  for(let lane=0;lane<3;lane++){const c=fresh(lane,0);c.x=lane*420-180;c.birth=-(c.x+c.width+30)/c.speed*1000;live.push(c);}
  function liveAt(time){
   if(time<now)throw Error('Live cloud time must move forward');
   for(const c of live){c.x+=(time-now)*c.speed/1000;
    if(c.x>W+20){const replacement=fresh(c.lane,time);replacement.x-=50+random()*260;Object.assign(c,replacement);}
   }
   now=time;return live;
  }
  function draw(time,{cloudOverride=null}={}){
   const scale=Math.max(canvas.width/W,canvas.height/H),ox=(canvas.width-W*scale)*.5,oy=(canvas.height-H*scale)*.42;
   g.setTransform(1,0,0,1,0,0);g.clearRect(0,0,canvas.width,canvas.height);g.setTransform(scale,0,0,scale,ox,oy);g.drawImage(previous||back,0,0,W,H);
   if(previous){const mix=Math.max(0,Math.min(1,(time-fadeStart)/1600));g.globalAlpha=mix*mix*(3-2*mix);g.drawImage(back,0,0,W,H);g.globalAlpha=1;if(mix===1)previous=null;}
   const renderedClouds=cloudOverride||liveAt(time);
   cloudG.clearRect(0,0,W,H);coverG.clearRect(0,0,W,H);starG.clearRect(0,0,W,H);
   for(const c of renderedClouds){
    const im=sprites[c.type],h=c.width*im.naturalHeight/im.naturalWidth;
    cloudG.globalAlpha=c.alpha;cloudG.drawImage(im,c.x,c.centerY-h*.5,c.width,h);
    // Opacity of cloud paint hides starlight independently of its gentle scene tint.
    coverG.drawImage(im,c.x,c.centerY-h*.5,c.width,h);
   }
   cloudG.globalAlpha=1;
   for(const ctx of [cloudG,coverG]){ctx.save();ctx.setTransform(1,0,0,1,0,0);ctx.globalCompositeOperation='destination-in';ctx.drawImage(skyMask,0,0);ctx.restore();}
   starG.save();starG.globalCompositeOperation='screen';
   for(const sparkle of options.starSampler(time)){
    const {x,y,r,pulse}=sparkle,a=.62*pulse,haloR=r*(1.8+.6*pulse);
    const halo=starG.createRadialGradient(x,y,0,x,y,haloR);halo.addColorStop(0,`rgba(255,250,213,${a*.92})`);halo.addColorStop(.23,`rgba(255,232,156,${a*.5})`);halo.addColorStop(.6,`rgba(255,219,128,${a*.14})`);halo.addColorStop(1,'rgba(255,219,128,0)');starG.fillStyle=halo;starG.fillRect(x-haloR,y-haloR,haloR*2,haloR*2);
    const rr=r*(.7+.35*pulse);starG.globalAlpha=.66*pulse;starG.fillStyle='#fffbe5';starG.beginPath();starG.moveTo(x,y-rr);starG.quadraticCurveTo(x+rr*.14,y-rr*.13,x+rr*.68,y);starG.quadraticCurveTo(x+rr*.14,y+rr*.13,x,y+rr);starG.quadraticCurveTo(x-rr*.14,y+rr*.13,x-rr*.68,y);starG.quadraticCurveTo(x-rr*.14,y-rr*.13,x,y-rr);starG.fill();starG.globalAlpha=1;
   }
   starG.restore();starG.save();starG.setTransform(1,0,0,1,0,0);starG.globalCompositeOperation='destination-in';starG.drawImage(skyMask,0,0);starG.globalCompositeOperation='destination-out';starG.drawImage(cloudCover,0,0);starG.restore();
   g.save();g.globalCompositeOperation='screen';g.drawImage(starLayer,0,0,W,H);g.restore();g.drawImage(cloudColor,0,0,W,H);
   g.globalAlpha=1;g.setTransform(1,0,0,1,0,0);
   return canvas;
  }
  return {draw,history,liveAt,canvas,setBackdrop:function(next,time,instant){previous=instant?null:back;fadeStart=time;back=next;mask();},layers:{skyMask,cloudColor,cloudCover,starLayer}};
 }
 root.MaroMoonRenderer={create,seeded};
})(globalThis);
