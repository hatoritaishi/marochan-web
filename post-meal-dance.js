(function(root){
  'use strict';
  const KEY='maroPostMealDanceV1',PREFIX='meal-dance:';
  const MOVIES=Object.freeze(['post-meal-dance-v1','post-meal-dance-twirl-v1']);
  const movieFor=entry=>entry.movie||MOVIES[0];
  const eligible=rank=>['srare','ssrare','urare'].includes(rank);
  const valid=id=>typeof id==='string'&&/^(room-meal:\d+:\d+|steal-eaten:\d+|crystal-meal:[A-Za-z0-9-]{1,80})$/.test(id);
  function create(storage,snacks,random=Math.random){
    let seenMovies=()=>[];
    function read(){
      try{const raw=storage.getItem(KEY);if(raw===null)return {version:1,meals:[]};
        const state=JSON.parse(raw),seen=new Set();
        if(state.version!==1||!Array.isArray(state.meals)||!state.meals.every(e=>e&&valid(e.id)&&snacks[e.snack]&&eligible(snacks[e.snack].rank)&&
          ['eating','ready','played','cancelled'].includes(e.status)&&(e.movie===undefined||MOVIES.includes(e.movie))&&!seen.has(e.id)&&seen.add(e.id)))return null;
        return state;
      }catch(error){return null;}
    }
    function save(state){try{storage.setItem(KEY,JSON.stringify(state));return true;}catch(error){return false;}}
    function move(id,from,to){const s=read();if(!s)return false;const e=s.meals.find(e=>e.id===id);
      if(!e)return false;if(e.status===to)return true;if(e.status!==from)return false;
      // Pick once on successful meal completion; saved receipts never reroll.
      if(to==='ready'){
        const seen=seenMovies(),pool=MOVIES.filter(movie=>!seen.includes(movie));
        e.movie=pool.length===1?pool[0]:pool.length?pool[random()<.5?0:1]:MOVIES[0];
      }
      e.status=to;return save(s);}
    return {
      begin(id,snack){if(!valid(id)||!snacks[snack]||!eligible(snacks[snack].rank))return false;
        const s=read();if(!s)return false;const e=s.meals.find(e=>e.id===id);
        if(e)return e.snack===snack&&e.status==='eating';
        s.meals.push({id,snack,status:'eating'});return save(s);},
      finish:id=>move(id,'eating','ready'),cancel:id=>move(id,'eating','cancelled'),
      // Keep every receipt: trimming unrelated movie history must never re-award a meal.
      entries(){const s=read();return s?s.meals.filter(e=>e.status==='ready').map(e=>({id:PREFIX+e.id,scene:'meal',movie:movieFor(e)})):[];},
      wrap(base){const tracker=this;seenMovies=()=>base.read().seen||[];return Object.assign({},base,{read(){const s=base.read();return Object.assign({},s,{pending:tracker.entries().concat(s.pending)});},
        remember(id){if(!id.startsWith(PREFIX))return base.remember(id);const state=read(),entry=state&&state.meals.find(e=>PREFIX+e.id===id);return !!entry&&entry.status==='played'&&typeof base.rememberTransient==='function'&&base.rememberTransient(movieFor(entry));},
        complete:id=>id.startsWith(PREFIX)?move(id.slice(PREFIX.length),'ready','played'):base.complete(id)});}
    };
  }
  function soundtrack(video,clip,options){
    let closed=false,waiting=false,reportedFailure=false;
    const now=options.now||(()=>performance.now());
    function failed(){if(!closed&&!reportedFailure){reportedFailure=true;options.failed();}}
    const tracks=[['music',clip.music],['voice',clip.voice]].map(([kind,src])=>{
      const audio=options.audio?options.audio():new Audio();audio.preload='auto';audio.src=src;
      const track={kind,audio,pending:false,aligned:false,wanted:false,epoch:0,lastCorrection:-Infinity,driftSince:null,preparations:new Set()};
      // A disabled stem is not needed to play the film. If enabled later,
      // its real decoder/play error is checked then rather than hidden.
      track.onError=()=>{if(enabled(track))failed();};
      audio.addEventListener('error',track.onError);return track;
    });
    const preparing=new Set();
    function enabled(track){const level=options.settings()[track.kind];return level.on&&level.volume>0;}
    function active(){return options.active()&&!video.paused&&!video.ended&&!video.seeking&&!waiting;}
    function align(track){try{track.audio.currentTime=video.currentTime;track.aligned=true;track.lastCorrection=now();track.driftSince=null;}catch(error){}}
    // The opening voice cue can precede an independently loading AAC decoder.
    // Prepare both enabled stems before advancing the silent picture's clock.
    function prepare(){return Promise.all(tracks.map(track=>new Promise((resolve,reject)=>{
      if(!enabled(track)){resolve();return;}
      const audio=track.audio;
      if(audio.readyState===undefined||audio.readyState>=3){align(track);resolve();return;}
      let timeout;
      function cleanup(){clearTimeout(timeout);audio.removeEventListener('canplay',ready);audio.removeEventListener('error',error);preparing.delete(cancel);track.preparations.delete(releaseDisabled);}
      function ready(){if(closed){cancel();return;}cleanup();if(enabled(track))align(track);resolve();}
      function error(){cleanup();if(enabled(track))reject(Error('movie_soundtrack_unavailable'));else resolve();}
      function cancel(){cleanup();reject(Object.assign(Error('movie_soundtrack_closed'),{name:'AbortError'}));}
      function releaseDisabled(){if(closed)cancel();else if(!enabled(track)){cleanup();resolve();}}
      preparing.add(cancel);track.preparations.add(releaseDisabled);audio.addEventListener('canplay',ready);audio.addEventListener('error',error);
      timeout=setTimeout(error,10000);
      if(audio.error)error();
    })));}
    function sync(){if(closed)return;
      const settings=options.settings(),running=active();
      tracks.forEach(track=>{
        const audio=track.audio,level=settings[track.kind],on=level.on&&level.volume>0;
        audio.muted=!on;audio.volume=Math.max(0,Math.min(1,level.volume));
        const wanted=running&&on;
        if(!wanted){
          if(!on)for(const release of [...track.preparations])release();
          if(track.wanted||track.pending){track.epoch++;track.aligned=false;}
          track.wanted=false;track.driftSince=null;audio.pause();return;
        }
        track.wanted=true;
        if(!audio.seeking){
          if(!track.aligned)align(track);
          else if(Math.abs(audio.currentTime-video.currentTime)>.5&&(audio.readyState===undefined||audio.readyState>=3)){
            if(track.driftSince===null)track.driftSince=now();
            // Sustained drift needs correction; repeated latency-sized seeks
            // flush AAC playback and can turn a short film into broken audio.
            if(now()-track.driftSince>=750&&now()-track.lastCorrection>=2000)align(track);
          }else track.driftSince=null;
        }
        audio.playbackRate=video.playbackRate;
        if(audio.paused&&!track.pending){track.pending=true;const epoch=track.epoch;
          try{Promise.resolve(audio.play()).then(()=>{
            track.pending=false;if(closed||epoch!==track.epoch||!active()||!enabled(track))audio.pause();
          },()=>{
            track.pending=false;
            // pause/buffering/seeking/close can abort an outstanding play().
            // Its stale rejection must not fail or stop a subsequent playback.
            if(!closed&&epoch===track.epoch&&active()&&enabled(track))failed();
          });}catch(error){track.pending=false;if(active()&&enabled(track))failed();}
        }
      });
    }
    function onEvent(event){
      if(event.type==='waiting')waiting=true;
      if(event.type==='playing'||event.type==='seeked')waiting=false;
      if(event.type==='seeking')tracks.forEach(track=>{track.aligned=false;});
      sync();
    }
    const events=['playing','pause','waiting','seeking','seeked','ratechange','timeupdate','ended'];events.forEach(type=>video.addEventListener(type,onEvent));
    return {prepare,sync,close(){closed=true;for(const cancel of [...preparing])cancel();events.forEach(type=>video.removeEventListener(type,onEvent));tracks.forEach(({audio,onError})=>{audio.removeEventListener('error',onError);audio.pause();audio.removeAttribute('src');audio.load();});}};
  }
  const api=Object.freeze({KEY,PREFIX,MOVIES,eligible,create,soundtrack});root.MaroPostMealDance=api;if(typeof module!=='undefined')module.exports=api;
})(typeof window==='undefined'?globalThis:window);
