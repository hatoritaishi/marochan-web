(function(root){
  'use strict';
  // Maro's public birthday is March 3. This feature is introduced after the
  // 2026 birthday; its first celebration is in 2027, even if first opened late.
  const FIRST_YEAR=2027,MONTH=3,DAY=3,HOUR=19,MOVIE='birthday-maro-v1';
  function dueYear(time=Date.now()){
    const date=new Date(time),year=date.getFullYear();
    if(!Number.isFinite(date.getTime()))return 0;
    const due=time>=new Date(year,MONTH-1,DAY,HOUR).getTime()?year:year-1;
    return due>=FIRST_YEAR?due:0;
  }
  function eventYear(entry){
    const match=entry&&/^birthday-maro-(\d{4})$/.exec(entry.id);
    const year=match?Number(match[1]):0;
    return entry&&entry.scene==='home'&&entry.movie===MOVIE&&year>=FIRST_YEAR?year:0;
  }
  function isClaim(entry){return !!entry&&(entry.movie===MOVIE||String(entry.id||'').startsWith('birthday-maro-'));}
  function create(options){
    const now=options.now||Date.now;let enabled=true,nextRetry=0;
    function tick(){
      if(!enabled||!options.active()||now()<nextRetry)return false;
      const year=dueYear(now());if(!year)return false;
      const state=options.store.read();
      if(state.birthdayYear>=year||state.pending.some(eventYear))return false;
      const accepted=options.player.earn('home','birthday-maro-'+year,0,'birthdayMaro');
      nextRetry=accepted?0:now()+5000;return accepted;
    }
    return {tick,foreground(active,info){if(active){enabled=!info||info.enabled!==false;nextRetry=0;tick();}},isEnabled:()=>enabled};
  }
  const api=Object.freeze({FIRST_YEAR,MONTH,DAY,HOUR,MOVIE,dueYear,eventYear,isClaim,create});
  root.MaroBirthdayMovie=api;if(typeof module!=='undefined')module.exports=api;
})(typeof window==='undefined'?globalThis:window);
