(function(root){
 'use strict';
 const ID='bedtime-seat-v1',HOUR=3600000;
 function clock(at){
  const shifted=new Date(at+9*HOUR),day=shifted.toISOString().slice(0,10);
  const start=Date.parse(day+'T20:55:00+09:00'),end=Date.parse(day+'T21:00:00+09:00');
  return {day,start,end,inWindow:at>=start&&at<end};
 }
 function create(options){
  const now=options.now||Date.now;let settledDay='',failedDay='';
  const own=e=>e&&e.movie===ID&&/^daily-bedtime-\d{4}-\d{2}-\d{2}$/.test(e.id);
  function pending(state,day){return state.pending.some(e=>own(e)&&e.id==='daily-bedtime-'+day);}
  return {
   tick(){
    if(!options.active())return false;
    const c=clock(now());let state=options.store.read();
    // Never carry yesterday's missed bedtime into a daytime visit or another night.
    for(const e of state.pending)if(own(e)&&(e.id.slice(-10)<c.day||e.id.slice(-10)===c.day&&now()>=c.end))options.store.expire(e.id);
    if(!c.inWindow||options.scene()!=='home'||settledDay===c.day||failedDay===c.day||options.unavailable&&options.unavailable(c.day))return false;
    state=options.store.read();
    if((state.dailyDays.bedtime||'')>=c.day||pending(state,c.day))return false;
    const accepted=options.player.earn('daily','daily-bedtime-'+c.day,0,'bedtime');
    if(!accepted)failedDay=c.day; // Keep sitting/sleep available if durable earning fails.
    return accepted;
   },
   settle(entry){if(own(entry)&&!entry.replay)settledDay=entry.id.slice(-10);},
   seatingReady(){
    const c=clock(now());if(!c.inWindow)return true;
    if(settledDay===c.day||failedDay===c.day)return true;
    if(options.unavailable&&options.unavailable(c.day))return true;
    const state=options.store.read();return (state.dailyDays.bedtime||'')>=c.day&&!pending(state,c.day);
   }
  };
 }
 const api=Object.freeze({ID,clock,create});root.MaroBedtimeMovie=api;if(typeof module!=='undefined')module.exports=api;
})(typeof window==='undefined'?globalThis:window);
