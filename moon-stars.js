/* Adopted five-stage, independently timed moon-meadow stars. */
(function(root){
 'use strict';
 const levels=[0,.10,.10,.24,.24,.42,.42,.67,.67,1,1,.67,.67,.42,.42,.24,.24,.10,.10,0];
 function fiveStagePulse(phase){
  const p=Math.max(0,Math.min(1,phase))*(levels.length-1),i=Math.min(levels.length-2,Math.floor(p)),t=p-i,e=t*t*(3-2*t);
  return levels[i]+(levels[i+1]-levels[i])*e;
 }
 function make(min,max,seed){
  const seeded=root.MaroMoonRenderer.seeded,roll=seeded(seed),densityRoll=seeded(seed^10182026),items=[];
  let mask=null,maskWidth=1086,maskHeight=1448,last=-1,nextChange=0,target=min;
  function setMask(canvas){maskWidth=canvas.width;maskHeight=canvas.height;mask=canvas.getContext('2d').getImageData(0,0,maskWidth,maskHeight).data;}
  function point(){
   let x,y;do{x=28+roll()*1030;y=28+roll()*420;}while((x-264)**2+(y-193)**2<132**2||mask&&mask[(Math.floor(y*maskHeight/1448)*maskWidth+Math.floor(x*maskWidth/1086))*4+3]<250);
   return {x,y};
  }
  function star(birth){return {...point(),r:7+roll()*8,birth,duration:24000+roll()*12000,gain:.55+roll()*.25,retiring:null,introAt:null,introDuration:3000+roll()*2500};}
  function enteringStar(time){const s=star(time);s.birth-=s.duration*(.08+roll()*.8);s.introAt=time+roll()*4000;return s;}
  function sample(time){
   if(time<last)throw Error('Comparison time must move forward');last=time;
   if(time>=nextChange){
    do{target=min+Math.floor(densityRoll()*(max-min+1));nextChange+=26000+densityRoll()*16000;}while(nextChange<=time);
    if(!items.length){for(let i=0;i<target;i++){const s=star(time);s.birth-=s.duration*(.1+roll()*.8);items.push(s);}}
    else if(items.length<target){for(let i=items.length;i<target;i++)items.push(enteringStar(time));}
    else for(let i=target;i<items.length;i++)items[i].retiring=time;
    for(let i=0;i<Math.min(target,items.length);i++)items[i].retiring=null;
   }
   for(let i=items.length-1;i>=0;i--){
    let s=items[i];if(s.retiring!==null&&time-s.retiring>=5000){items.splice(i,1);continue;}
    while(time-s.birth>=s.duration){const retiring=s.retiring,birth=s.birth+s.duration;s=star(birth);s.retiring=retiring;items[i]=s;}
   }
   return items.map(s=>{
    const phase=Math.min(1,Math.max(0,(time-s.birth)/s.duration));
    const fade=s.retiring===null?1:.5+.5*Math.cos(Math.PI*Math.min(1,(time-s.retiring)/5000));
    const into=s.introAt===null?1:Math.max(0,Math.min(1,(time-s.introAt)/s.introDuration));
    return {...s,pulse:fiveStagePulse(phase)*s.gain*fade*into*into*(3-2*into)};
   });
  }
  return {sample,setMask,state:()=>({min,max,target,count:items.length})};
 }
 root.MaroMoonStars={make,fiveStagePulse};
})(globalThis);
