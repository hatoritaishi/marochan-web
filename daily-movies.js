(function(root){
  'use strict';
  const HOUR=3600000,SEEN='maroDailyMoviePresenceV1',TOKEN='maroDailyMovieVisitTokenV1';
  const pools=Object.freeze({'letter-night':['dailyLetterNight'],tap:['dailyTapA','dailyTapB'],letter:['dailyLetter','dailyLetterThanks'],night:['dailyNightA','dailyNightB'],heart:['dailyHeart'],day:['dailyDay','dailyDayRainbow'],'heart-day':['dailyHeartDay'],'moon-day':['dailyMoonDay']});
  function create(options){
    const now=options.now||Date.now,random=options.random||(()=>Math.random()),storage=options.storage;
    let lastActive=false,nextSeen=0,enabled=true,lastScene=null,visitToken=null;
    function trigger(kind,context){
      if(!enabled||!pools[kind]||!options.active())return false;
      if((kind==='night'||kind==='heart')&&!options.isNight())return false;
      if((kind==='day'||kind==='moon-day')&&(!options.period||!['morning','day'].includes(options.period())))return false;
      if(kind==='heart-day'&&(!options.period||options.period()!=='day'))return false;
      if((kind==='heart'||kind==='heart-day')&&(!options.scene||options.scene()!=='home'))return false;
      if(kind==='moon-day'&&(!options.scene||options.scene()!=='moon'))return false;
      if((kind==='tap'||kind==='night'||kind==='day')&&!options.healthy())return false;
      let status=options.movies.dailyStatus(options.store.read(),kind,now());
      if((kind==='letter'||kind==='letter-night')&&context&&/^\d{4}-\d{2}-\d{2}$/.test(context.date)){const s=options.store.read();status={day:context.date,used:(s.dailyDays[kind]||'')>=context.date||s.pending.some(e=>e.scene==='daily'&&options.movies.dailyInfo(e.id,e.movie)?.kind===kind)};}
      if(status.used)return !!(options.player.resumeFromInteraction&&options.player.resumeFromInteraction(kind));
      const selected=pools[kind];
      const seen=options.store.read().seen;
      const pool=selected.filter(key=>options.movies.availableFor(options.movies.catalog[key],options)&&options.movies.automaticAllowed(options.movies.catalog[key],seen));
      if(!pool.length)return false;
      const key=pool[Math.min(pool.length-1,Math.max(0,Math.floor(random()*pool.length)))];
      return options.player.earn('daily','daily-'+kind+'-'+status.day,0,key);
    }
    function seen(){try{storage.setItem(SEEN,JSON.stringify({lastSeenAt:now()}));}catch(error){}nextSeen=now()+30000;}
    function foreground(active,provided){
      if(!active){if(options.player.releaseInteractions)options.player.releaseInteractions();if(lastActive)seen();lastActive=false;lastScene=null;return;}
      if(lastActive&&!provided)return;lastActive=true;lastScene=options.scene?options.scene():'home';
      let info=provided;
      if(!info){let previous=0;try{previous=JSON.parse(storage.getItem(SEEN)||'{}').lastSeenAt||0;}catch(error){}
        info={enabled:true,token:now().toString(36)+'-'+random().toString(36).slice(2),openedAt:now(),previousAt:previous};}
      enabled=info.enabled!==false;
      if(!enabled||!info.token){if(options.player.releaseInteractions)options.player.releaseInteractions();visitToken=null;seen();return;}
      // Native onResume has a new token even when a paused WebView missed the
      // preceding onPause callback. Never carry a human input across that visit.
      if(visitToken!==info.token){if(options.player.releaseInteractions)options.player.releaseInteractions();visitToken=info.token;}
      seen();
      try{if(storage.getItem(TOKEN)===info.token)return;storage.setItem(TOKEN,info.token);}catch(error){return;}
      if(!Number.isFinite(info.openedAt)||now()-info.openedAt<0||now()-info.openedAt>30000)return;
      if(info.previousAt>0&&info.openedAt-info.previousAt>=HOUR)trigger('night');
      trigger('day');trigger('moon-day');
    }
    return {trigger,foreground,tick(){
      if(!lastActive||!options.active())return;
      if(now()>=nextSeen)seen();
      const scene=options.scene?options.scene():'home';
      if(scene!==lastScene){lastScene=scene;if(scene==='moon')trigger('moon-day');}
    }};
  }
  const api=Object.freeze({create,pools,HOUR});root.MaroDailyMovies=api;if(typeof module!=='undefined')module.exports=api;
})(typeof window==='undefined'?globalThis:window);
