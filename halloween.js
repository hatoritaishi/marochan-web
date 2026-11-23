(function(root){
  'use strict';
  const COOKIE='halloweenCookie',ROOM='media/halloween-room-v1.webp';
  function active(date=new Date()){return date.getMonth()===9&&date.getDate()>=27&&date.getDate()<=31;}
  function normalKeys(date=new Date()){return [active(date)?COOKIE:'cookie','marshmallow','cupcake','donut'];}
  // Only the normal tier changes: Halloween cookies have two normal weights.
  function normal(seen=[],random=Math.random,date=new Date()){
    const keys=normalKeys(date).filter(k=>!seen.includes(k));
    if(!keys.length)return null;
    const weighted=keys.flatMap(k=>k===COOKIE?[k,k]:[k]);
    return weighted[Math.min(weighted.length-1,Math.max(0,Math.floor(random()*weighted.length)))];
  }
  function lineup(keys,date=new Date()){
    const cookie=active(date)?COOKIE:'cookie',seen=[];
    return keys.map(k=>{
      let next=k==='cookie'||k===COOKIE?cookie:k;
      if(seen.includes(next))next=normal(seen,()=>0,date);
      seen.push(next);return next;
    });
  }
  const milestone=n=>Number.isSafeInteger(n)&&(n===5||n>=10&&n%10===0);
  const nextMilestone=n=>n<5?5:n<10?10:(Math.floor(n/10)+1)*10;
  function reconcile(player,store,total){
    if(!Number.isSafeInteger(total)||total<5)return;
    let last=store.read().halloweenEarned||0;
    // A full queue keeps the count; later ticks reserve the remaining milestones.
    for(let limit=0;limit<32;limit++){
      const next=nextMilestone(last);if(next>total)return;
      if(!player.earn('home','halloween-cookies-'+next,0,'halloween'))return;
      const saved=store.read().halloweenEarned||0;if(saved<next)return;last=saved;
    }
  }
  const api=Object.freeze({COOKIE,ROOM,active,normalKeys,normal,lineup,milestone,nextMilestone,reconcile});
  root.MaroHalloween=api;if(typeof module!=='undefined')module.exports=api;
})(typeof window==='undefined'?globalThis:window);
