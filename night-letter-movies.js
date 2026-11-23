(function(root){
 'use strict';
 const KEY='maroNightLetterMoviesV1',LATE='daily-letter-night-v1',SLEEP='night-sleep-v1',AFTER='night-letter-sleep-v1',BEDTIME='bedtime-seat-v1';
 function night(at){const d=new Date(at+9*3600000),h=d.getUTCHours();if(h<8)d.setUTCDate(d.getUTCDate()-1);return {day:d.toISOString().slice(0,10),active:h>=21||h<8};}
 function normalWindow(at){const d=new Date(at+9*3600000);return d.getUTCHours()===21&&d.getUTCMinutes()===0;}
 function create(o){
  const now=o.now||Date.now;let state={version:1,letters:{}},failedSleepDay='',unsaved=false;
  try{const s=JSON.parse(o.storage.getItem(KEY)||'null');if(s&&s.version===1&&s.letters&&typeof s.letters==='object')state=s;}catch{}
  function save(){try{o.storage.setItem(KEY,JSON.stringify(state));unsaved=false;return true;}catch{unsaved=true;return false;}}
  function beginQuiet(day,reason){
   if(state.quietNight&&state.quietNight.day===day)return;
   state.quietNight={day,observedAt:now(),reason,wokeAt:0,wakeAt:0};save();
  }
  function wake(){const q=state.quietNight;if(q&&!q.wokeAt){q.wokeAt=now();return save();}return true;}
  function restricted(){return !!(state.quietNight&&!state.quietNight.wokeAt);}
  function syncQuiet(){
   const at=now(),n=night(at),minute=Math.floor((at+9*3600000)%86400000/60000),s=o.store.read();
   // Existing completion/quota plus no pending bedtime is the old cue's settled
   // state, not a new claim of when its frames were watched.
   const day=minute>=20*60+55?n.day:minute<8*60?n.day:o.nightSession&&o.nightSession()?(s.dailyDays.bedtime||''):'';
   if(day&&(!state.quietNight||state.quietNight.day!==day)&&((s.dailyDays.bedtime||'')>=day&&!pending('daily-bedtime-'+day)||s.completed.includes('daily-bedtime-'+day)))beginQuiet(day,'existing_bedtime_settlement');
   const q=state.quietNight;if(!q||q.wokeAt)return;
   const deadline=o.nightEnd?o.nightEnd():0;
   if(Number.isFinite(deadline)&&deadline>0&&deadline!==q.wakeAt){q.wakeAt=deadline;save();}
   // Reopening and a temporary wake are not complete waking. On cold restore,
   // require the restored fully-awake state as well as the original deadline.
   const earliest=q.wakeAt||Date.parse(q.day+'T08:00:00+09:00')+86400000;
   if(at>=earliest&&o.fullyAwake&&o.fullyAwake())wake();
  }
  function pending(id){return o.store.read().pending.some(e=>e.id===id);}
  function own(e){return e&&[LATE,SLEEP,AFTER].includes(e.movie);}
  function hold(n){return Object.values(state.letters).some(r=>r.night===n.day)||o.letters().some(l=>l.status==='ready'&&!l.readAt);}
  function expire(n){
   for(const e of o.store.read().pending){if(!own(e))continue;const date=e.id.slice(-10),day=e.movie===SLEEP?date:state.letters[date]?.night||date;
    if(n.active&&day===n.day)continue;
    const viewing=o.player.playing()?o.player.state().current:null;
    if(viewing?.id===e.id&&!viewing.manual)o.player.suspend();
    o.store.expire(e.id); // Expiration neither records a viewing nor spends today's quota.
   }
   for(const r of Object.values(state.letters))if(['prelude','await-letter','reading','closed'].includes(r.phase)&&(!n.active||r.night!==n.day)){r.phase='expired';save();}
   return !unsaved;
  }
  function eligible(entry){
   if(!entry)return true;
   // Quiet nights suppress unsolicited films. A discovered memory explicitly
   // chosen by the user does not wake Maro or settle any automatic cue.
   if(entry.replay)return true;
   if(restricted()&&![SLEEP,AFTER,LATE].includes(entry.movie))return false;
   if(!own(entry))return true;
   const n=night(now()),date=entry.id.slice(-10),r=state.letters[date];
   if(entry.movie===SLEEP)return n.active&&date===n.day&&!hold(n);
   if(entry.movie===LATE){const letter=o.letters().find(l=>l.date===date);return n.active&&!!r&&r.night===n.day&&r.phase==='prelude'&&!!letter&&letter.status==='ready'&&!letter.readAt;}
   return n.active&&!!r&&r.night===n.day&&r.phase==='closed'&&r.closedAt>0;
  }
  return {
   beforeReceive(letter){
    if(!letter||letter.readAt||!night(now()).active)return true;
    if(unsaved&&!save())return false;
    const date=letter.date,n=night(now()),id='daily-letter-night-'+date;if(!expire(n))return false;let r=state.letters[date];
    if(r&&r.phase!=='prelude')return true;
    const s=o.store.read();
    if((s.dailyDays['letter-night']||'')>=date&&!pending(id))return true;
    if(!r){r=state.letters[date]={night:n.day,phase:'prelude',receivedAt:0,closedAt:0};if(!save())return false;}
    if(pending(id))return false;
    if(!o.queueLetter(date,now())){r.phase='await-letter';return save();}
    return false;
   },
   received(date,at){
    const n=night(at);if(!n.active)return false;
    const r=state.letters[date]||(state.letters[date]={night:n.day});if(r.night!==n.day){r.night=n.day;r.closedAt=0;}r.phase='reading';r.receivedAt=at;r.closedAt=r.closedAt||0;save();return true;
   },
   closed(date){const r=state.letters[date];if(!r||r.phase!=='reading'||r.closedAt)return false;r.closedAt=now();r.phase='closed';return save();},
   handled(entry){
    if(!entry||entry.replay)return;const date=entry.id.slice(-10),r=state.letters[date];
    if(entry.movie===BEDTIME||entry.movie===SLEEP||entry.movie===AFTER)beginQuiet(night(now()).day,'bedtime_routine_handled');
    if(entry.movie===LATE&&r){r.phase='await-letter';save();}
    if(entry.movie===AFTER&&r){r.phase='done';save();}
   },
   unavailable(entry){
    const rejected={expired:false,stateSaved:false};
    if(!entry||entry.replay||!own(entry))return rejected;
    const date=entry.id.slice(-10),r=state.letters[date];
    if(entry.movie!==SLEEP&&(!r||r.night!==night(now()).day))return rejected;
    if(entry.movie===LATE&&r.phase!=='prelude'||entry.movie===AFTER&&r.phase!=='closed')return rejected;
    // Resolve an unavailable cue without recording a viewing/completion.
    // Native expiry retains its reservation, prior memories and other pending.
    if(!o.store.expire(entry.id))return rejected;
    if(entry.movie===SLEEP)beginQuiet(date,'sleep_media_unavailable');
    else {r.phase=entry.movie===LATE?'await-letter':'done';r.unavailableAt=now();save();}
    return {expired:true,stateSaved:!unsaved};
   },
   tick(){
    if(!o.active()||unsaved&&!save())return;syncQuiet();const n=night(now());if(!expire(n))return;
    for(const [date,r] of Object.entries(state.letters)){
     if(r.phase==='prelude'&&!pending('daily-letter-night-'+date)){
      if((o.store.read().dailyDays['letter-night']||'')>=date){r.phase='await-letter';if(!save())return;}
      else o.queueLetter(date,now());
     }
     if(r.phase==='await-letter'&&!o.player.busy()){
      const l=o.letters().find(l=>l.date===date);
      if(l&&l.readAt){r.phase='reading';r.receivedAt=l.readAt;if(!save())return;}else o.deliver(date);
     }
     if(r.phase==='closed'){
      if(!n.active||r.night!==n.day){r.phase='expired';if(!save())return;continue;}
      if(now()<r.closedAt+10000)continue;
      const s=o.store.read(),id='daily-sleep-letter-'+date;
      if((s.dailyDays['sleep-letter']||'')>=date&&!pending(id)){r.phase='done';if(!save())return;continue;}
      if(!pending(id))o.player.earn('daily',id,0,'afterLetterSleep');
     }
    }
    if(!n.active||o.scene()!=='home')return;
    const id='daily-sleep-'+n.day,s=o.store.read();
    if(hold(n)){
     if(pending(id)&&!(o.player.playing()&&o.player.state().current?.id===id))o.store.expire(id);
     return;
    }
    if(!normalWindow(now()))return;
    if((s.dailyDays.sleep||'')>=n.day||pending(id)||failedSleepDay===n.day)return;
    if(!o.player.earn('daily',id,0,'nightSleep'))failedSleepDay=n.day;
   },
   eligible,
   bedtimeUnavailable(entry){if(entry&&entry.movie===BEDTIME&&!entry.replay)beginQuiet(night(now()).day,'bedtime_unavailable');},
   bedtimeUnavailableFor(day){const q=state.quietNight;return !!q&&q.day===day&&!q.wokeAt&&q.reason==='bedtime_unavailable';},
   woke:wake,restricted,
   ready(entry){return eligible(entry)&&(!entry||entry.replay||entry.movie!==AFTER||now()>=state.letters[entry.id.slice(-10)].closedAt+10000);},
   state:()=>JSON.parse(JSON.stringify(state))
  };
 }
 const api=Object.freeze({create,night,normalWindow,LATE,SLEEP,AFTER});root.MaroNightLetterMovies=api;if(typeof module!=='undefined')module.exports=api;
})(typeof window==='undefined'?globalThis:window);
