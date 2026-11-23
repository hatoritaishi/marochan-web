(function(root){
  'use strict';
  const Birthday=root.MaroBirthdayMovie||(typeof require==='function'?require('./birthday-movie.js'):null);
  const Bedtime=root.MaroBedtimeMovie||(typeof require==='function'?require('./bedtime-movie.js'):null);
  const Night=root.MaroNightLetterMovies||(typeof require==='function'?require('./night-letter-movies.js'):null);
  const Halloween=root.MaroHalloween||(typeof require==='function'?require('./halloween.js'):null);
  const KEY='maroOutingMoviesV1',valid=s=>typeof s==='string'&&/^[A-Za-z0-9-]{1,100}$/.test(s);
  const catalog=Object.freeze({chatComfort:Object.freeze({id:'chat-comfort-v1',scene:'chat',src:'media/maro-chat-comfort-v1.mp4',title:'まろちゃんがそばにいるよ',comfort:true,audio:'voice',leadMs:0,priority:2}),moon:Object.freeze({id:'moon-perfect-v1',scene:'moon',src:'media/4fd7b98acf262b23f5377264.mp4',title:'月の原っぱ',nightOnly:true,sceneOnly:'moon'}),
    bedtime:Object.freeze({id:'bedtime-seat-v1',scene:'daily',src:'media/maro-bedtime-seat-v1.mp4',title:'ねんね前のまろちゃん',daily:'bedtime',bedtime:true,routine:true,homeOnly:true,audio:'movie',leadMs:0,priority:4}),
    dailyLetterNight:Object.freeze({id:'daily-letter-night-v1',scene:'daily',src:'media/maro-letter-night-v1.mp4',title:'ねんねのあとのおてがみ',daily:'letter-night',lateLetter:true,routine:true,nightRoutine:true,audio:'movie',leadMs:0,priority:5}),
    nightSleep:Object.freeze({id:'night-sleep-v1',scene:'daily',src:'media/maro-night-sleep-v1.mp4',title:'ねんねのまろちゃん',daily:'sleep',sleep:true,routine:true,nightRoutine:true,memoryId:'night-sleep',audio:'movie',leadMs:0,priority:4}),
    afterLetterSleep:Object.freeze({id:'night-letter-sleep-v1',scene:'daily',src:'media/maro-night-sleep-v1.mp4',title:'ねんねのまろちゃん',daily:'sleep-letter',sleep:true,routine:true,nightRoutine:true,exactAfterLetter:true,memoryId:'night-sleep',audio:'movie',leadMs:0,priority:4}),
    birthdayMaro:Object.freeze({id:'birthday-maro-v1',scene:'home',src:'media/maro-birthday-v1.mp4',title:'まろちゃんのおたんじょうび',birthday:true,leadMs:0,priority:3}),
    momijiDay:Object.freeze({id:'momiji-day-v1',scene:'momiji',src:'media/maro-momiji-day-movie-v1.mp4',title:'ふわもみじ街道',dayOnly:true,sceneOnly:'momiji'}),
    momijiEvening:Object.freeze({id:'momiji-evening-v1',scene:'momiji',src:'media/maro-momiji-evening-movie-v1.mp4',title:'夕焼けのふわもみじ街道',dayOnly:true,sceneOnly:'momiji'}),
    sunflower:Object.freeze({id:'sunflower-field-v1',scene:'sunflower',src:'media/maro-sunflower-field-v1.mp4',title:'ひまわり畑（仮）',destination:true,dayOnly:true,homeOnly:true,audio:'movie',leadMs:0}),
    hana:Object.freeze({id:'hana-bubbles-v1',scene:'hana',src:'media/4ccd0d957a455940bd871b0.mp4',title:'ふわり花あかりのシャボン玉',sceneOnly:'hana'}),
    dailyTapA:Object.freeze({id:'daily-tap-a-v1',scene:'daily',src:'media/64bb6eb3a5b2a720c093c340.mp4',title:'元気なまろちゃん',daily:'tap',leadMs:0}),
    dailyTapB:Object.freeze({id:'daily-tap-b-v1',scene:'daily',src:'media/f11c4d05be84a019e37e876d.mp4',title:'元気なまろちゃん',daily:'tap',leadMs:0}),
    dailyLetter:Object.freeze({id:'daily-letter-v1',scene:'daily',src:'media/0a22ff8e799b6ad5e080f852.mp4',title:'まろちゃんのおてがみ',daily:'letter',leadMs:0}),
    dailyLetterThanks:Object.freeze({id:'daily-letter-thanks-v1',scene:'daily',src:'media/96dc55d51cddbf8e3a19b5b7.mp4',title:'まろちゃんのおてがみ',daily:'letter',leadMs:0}),
    dailyNightA:Object.freeze({id:'daily-night-a-v1',scene:'daily',src:'media/3bb54adec4f9ff5b34ef80de.mp4',title:'夜のまろちゃん',daily:'night',nightOnly:true,leadMs:0,priority:1}),
    dailyNightB:Object.freeze({id:'daily-night-b-v1',scene:'daily',src:'media/37225ad96789b1992222277a.mp4',title:'夜のまろちゃん',daily:'night',nightOnly:true,leadMs:0,priority:1}),
    dailyHeart:Object.freeze({id:'daily-heart-v1',scene:'daily',src:'media/fa3c5c4f9b26faeee8c8db45.mp4',title:'まろちゃんのハート',daily:'heart',nightOnly:true,homeOnly:true,leadMs:0}),
    dailyDay:Object.freeze({id:'daily-day-v1',scene:'daily',src:'media/1ff912d6551f479a5624be17.mp4',title:'お昼のまろちゃん',daily:'day',daytimeOnly:true,homeOnly:true,leadMs:0,priority:1}),
    dailyDayRainbow:Object.freeze({id:'daily-day-rainbow-v1',scene:'daily',src:'media/maro-rainbow-v5.mp4',music:'media/maro-rainbow-music-v5.m4a',voice:'media/maro-rainbow-voice-v5.m4a',title:'虹とまろちゃん',daily:'day',daytimeOnly:true,leadMs:0,priority:1}),
    dailyMoonDay:Object.freeze({id:'daily-moon-day-v1',scene:'daily',src:'media/fbca55036ea7f33cbcc85260.mp4',title:'朝昼の月見はらっぱ',daily:'moon-day',daytimeOnly:true,sceneOnly:'moon',leadMs:7000}),
    dailyHeartDay:Object.freeze({id:'daily-heart-day-v1',scene:'daily',src:'media/17eb36898e6339400760e0ec.mp4',title:'お昼のハートだっこ',daily:'heart-day',periodOnly:'day',homeOnly:true,leadMs:0}),
    halloween:Object.freeze({id:'halloween-cookies-v1',scene:'home',src:'media/halloween-cookies-v1.mp4',title:'ハロウィンのおやつ',halloween:true,leadMs:0,priority:2}),mealDance:Object.freeze({id:'post-meal-dance-v1',scene:'meal',src:'media/maro-post-meal-dance-v1.mp4',title:'まろちゃんのダンス',audio:'movie',leadMs:0,priority:2,once:true}),
    mealDanceTwirl:Object.freeze({id:'post-meal-dance-twirl-v1',scene:'meal',src:'media/maro-post-meal-dance-twirl-v1.mp4',title:'まろちゃんのくるくるダンス',audio:'movie',leadMs:0,priority:2,once:true})});

  // These are recurring routines/occasions. Every other automatic film is a
  // one-time discovery; the gallery and explicitly selected trips stay manual.
  const recurringAutomatic=new Set(['daily-letter-v1','daily-letter-thanks-v1','bedtime-seat-v1','night-sleep-v1','night-letter-sleep-v1','daily-letter-night-v1','chat-comfort-v1','halloween-cookies-v1','birthday-maro-v1']);
  function automaticAllowed(clip,seen=[]){return !!clip&&(recurringAutomatic.has(clip.id)||!seen.includes(clip.id));}
  function halloweenMilestone(id,movie,scene){
    const match=/^halloween-cookies-([1-9]\d*)$/.exec(id),n=match&&Number(match[1]);
    return scene==='home'&&movie==='halloween-cookies-v1'&&Number.isSafeInteger(n)&&(n===5||n>=10&&n%10===0)?n:0;
  }
  const scenes=['home','moon','flowers','momiji','hana','daily'],dayPattern=/^\d{4}-\d{2}-\d{2}$/;
  const dailyKinds=['tap','letter','night','heart','day','heart-day','moon-day','bedtime','sleep','sleep-letter','letter-night'];
  function dailyInfo(id,movie){const match=/^daily-(tap|letter|night|heart|day|heart-day|moon-day|bedtime|sleep|sleep-letter|letter-night)-(\d{4}-\d{2}-\d{2})$/.exec(id);
    return match&&Object.values(catalog).some(c=>c.id===movie&&c.daily===match[1])?{kind:match[1],day:match[2]}:null;}
  const localDay=(time=Date.now())=>{const d=new Date(time);return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');};
  const momijiDay=id=>/^momiji-breath-\d{4}-\d{2}-\d{2}$/.test(id)?id.slice(14):'';
  function legacyMovie(id){
    if(/^paw-wave-\d+-\d+$/.test(id))return 'moon-perfect-v1';
    if(/^hana-bubbles-\d{4}-\d{2}-\d{2}$/.test(id))return 'hana-bubbles-v1';
    if(/^birthday-maro-\d{4}$/.test(id))return 'birthday-maro-v1';
    if(/^halloween-cookies-[1-9][0-9]{0,14}$/.test(id))return 'halloween-cookies-v1';
    // Letter completions no longer identify the selected random variant.
    const kind=/^daily-(heart|heart-day|moon-day)-\d{4}-\d{2}-\d{2}$/.exec(id);
    return kind?'daily-'+kind[1]+'-v1':null;
  }
  const empty=()=>({version:1,pending:[],completed:[],seen:[],halloweenEarned:0,momijiDay:'',hanaDay:'',hanaBubbles:{day:'',hits:[]},dailyDays:{},birthdayYear:0});
  function state(raw){
    try{const s=typeof raw==='string'?JSON.parse(raw):raw;
      if(!s||s.version!==1||!Array.isArray(s.pending)||!Array.isArray(s.completed))return empty();
      const seen=new Set(),completed=s.completed.filter(valid).slice(-128);
      const b=s.hanaBubbles||{},hitIds=new Set();
      const memories=[...new Set((Array.isArray(s.seen)?s.seen:s.completed.map(legacyMovie)).filter(valid))];
      return {version:1,completed,seen:memories,halloweenEarned:Number.isSafeInteger(s.halloweenEarned)&&s.halloweenEarned>=0?s.halloweenEarned:0,momijiDay:dayPattern.test(s.momijiDay)?s.momijiDay:'',hanaDay:dayPattern.test(s.hanaDay)?s.hanaDay:'',birthdayYear:Number.isInteger(s.birthdayYear)&&s.birthdayYear>=Birthday.FIRST_YEAR&&s.birthdayYear<=9999?s.birthdayYear:0,
        dailyDays:Object.fromEntries(dailyKinds.filter(k=>s.dailyDays&&dayPattern.test(s.dailyDays[k])).map(k=>[k,s.dailyDays[k]])),
        hanaBubbles:{day:dayPattern.test(b.day)?b.day:'',hits:(Array.isArray(b.hits)?b.hits:[]).filter(h=>h&&valid(h.id)&&Number.isFinite(h.at)&&!hitIds.has(h.id)&&hitIds.add(h.id)).slice(-10)},
        pending:s.pending.filter(e=>e&&valid(e.id)&&valid(e.movie)&&scenes.includes(e.scene)&&(e.scene!=='daily'||dailyInfo(e.id,e.movie))&&(!Birthday.isClaim(e)||Birthday.eventYear(e))&&!completed.includes(e.id)&&!seen.has(e.id)&&seen.add(e.id)).slice(0,32)};
    }catch(error){return empty();}
  }
  function local(storage,now){
    function read(){try{return state(storage.getItem(KEY));}catch(error){return empty();}}
    function save(s){try{storage.setItem(KEY,JSON.stringify(s));return true;}catch(error){return false;}}
    return {read,earn(e){const s=read(),daily=e.scene==='daily'&&dailyInfo(e.id,e.movie);
      const birthday=Birthday.eventYear(e);if(Birthday.isClaim(e)&&!birthday)return false;
      if(e.scene==='daily'&&!daily)return false;
      const halloween=halloweenMilestone(e.id,e.movie,e.scene);
      if((e.id.startsWith('halloween-cookies-')||e.movie==='halloween-cookies-v1')&&!halloween)return false;
      if(s.completed.includes(e.id)||s.pending.some(p=>p.id===e.id))return true;
      if(birthday&&(birthday>Birthday.dueYear(now())||s.birthdayYear>=birthday||s.pending.some(Birthday.eventYear)))return false;
      if(halloween&&halloween<=s.halloweenEarned)return true;
      if(halloween&&halloween!==(s.halloweenEarned<5?5:s.halloweenEarned<10?10:s.halloweenEarned+10))return false;
      if(daily&&(daily.day>localDay(now())||(s.dailyDays[daily.kind]||'')>=daily.day||s.pending.some(p=>p.scene==='daily'&&dailyInfo(p.id,p.movie)?.kind===daily.kind)))return false;
      const day=e.scene==='momiji'&&momijiDay(e.id);
      if(day&&(s.momijiDay>=day||s.pending.some(p=>p.scene==='momiji')))return false;
      const hana=e.scene==='hana'&&/^hana-bubbles-\d{4}-\d{2}-\d{2}$/.test(e.id)&&e.id.slice(13);
      if(e.scene==='hana'&&(!hana||e.movie!=='hana-bubbles-v1'||s.hanaDay>=hana||s.pending.some(p=>p.scene==='hana')))return false;
      if(s.pending.length>=32)return false;s.pending.push(e);if(day)s.momijiDay=day;if(hana)s.hanaDay=hana;if(daily)s.dailyDays[daily.kind]=daily.day;if(birthday)s.birthdayYear=birthday;if(halloween)s.halloweenEarned=halloween;return save(s);},
      popHanaBubble(id,at,time){const s=read();
        if(!valid(id)||!Number.isFinite(at)||at>time+1000||time-at>60000||localDay(at)!==localDay(time))return {saved:true,state:s};
        const status=hanaProgress(s,time),hits=status.hits;
        if(!status.used&&!hits.some(h=>h.id===id)&&hits.length<10)hits.push({id,at});
        if(!status.used&&hits.length>=10&&s.pending.length<32){s.pending.push({id:'hana-bubbles-'+status.day,scene:'hana',movie:'hana-bubbles-v1'});s.hanaDay=status.day;}
        s.hanaBubbles={day:status.day,hits};return {saved:save(s),state:s};},
      remember(id){const s=read(),entry=s.pending.find(e=>e.id===id);if(!entry)return false;
        if(!s.seen.includes(entry.movie))s.seen.push(entry.movie);return save(s);},
      rememberTransient(movie){if(!['chat-comfort-v1','post-meal-dance-v1','post-meal-dance-twirl-v1','sunflower-field-v1'].includes(movie))return false;const s=read();if(!s.seen.includes(movie))s.seen.push(movie);return save(s);},
      expire(id){const s=read(),entry=s.pending.find(e=>e.id===id);if(!/^daily-(bedtime|letter-night|sleep|sleep-letter)-\d{4}-\d{2}-\d{2}$/.test(id)||entry&&!['bedtime','letter-night','sleep','sleep-letter'].includes(dailyInfo(entry.id,entry.movie)?.kind))return false;
        s.pending=s.pending.filter(e=>e.id!==id);return save(s);},
      complete(id){const s=read();if(!s.pending.some(e=>e.id===id))return s.completed.includes(id);
        const birthday=s.pending.find(e=>e.id===id&&Birthday.eventYear(e));
        if(birthday)s.birthdayYear=Math.max(s.birthdayYear,Birthday.eventYear(birthday),Birthday.dueYear(now()));
        const entry=s.pending.find(e=>e.id===id);if(!s.seen.includes(entry.movie))s.seen.push(entry.movie);
        const daily=s.pending.find(e=>e.id===id&&e.scene==='daily'),info=daily&&dailyInfo(daily.id,daily.movie);
        if(info){const day=['letter-night','sleep','sleep-letter'].includes(info.kind)?info.day:localDay(now());s.dailyDays[info.kind]=[s.dailyDays[info.kind]||'',day].sort().at(-1);}
        if(s.pending.some(e=>e.id===id&&e.scene==='momiji'))s.momijiDay=[s.momijiDay,localDay(now())].sort().at(-1);
        if(s.pending.some(e=>e.id===id&&e.scene==='hana'))s.hanaDay=[s.hanaDay,localDay(now())].sort().at(-1);
        s.pending=s.pending.filter(e=>e.id!==id);s.completed.push(id);s.completed=s.completed.slice(-128);return save(s);}};
  }
  function queue(storage,native,now=Date.now){
    const backup=local(storage,now),hasNative=native&&['outingMovies','earnOutingMovie','completeOutingMovie'].every(k=>typeof native[k]==='function');
    const transientIds=['chat-comfort-v1','post-meal-dance-v1','post-meal-dance-twirl-v1','sunflower-field-v1'];
    const transientUnconfirmed=new Set(),transientNativeRetries=new Set();let nextTransientRetry=0;
    const writeKey='maroOutingMovieWritesV1',writes=new Map();let writeDirty=false,nextWriteRetry=0;
    try{const saved=JSON.parse(storage.getItem(writeKey)||'null');if(saved?.version===1&&Array.isArray(saved.operations))for(const w of saved.operations){
      if(w&&['complete','expire'].includes(w.kind)&&state({version:1,pending:[w.entry],completed:[]}).pending.length&&w.before&&typeof w.before==='object')writes.set(w.entry.id,w);
    }}catch{}
    function saveWrites(){try{storage.setItem(writeKey,JSON.stringify({version:1,operations:[...writes.values()]}));writeDirty=false;return true;}catch{writeDirty=true;return false;}}
    function flushWrites(force=false){
      if(!writes.size&&!writeDirty||!force&&now()<nextWriteRetry)return;
      nextWriteRetry=now()+5000;if(writeDirty&&!saveWrites())return;
      for(const [id,w] of writes){
        if(!w.nativeSaved){try{const method=w.kind==='complete'?'completeOutingMovie':'expireOutingMovie';if(typeof native[method]!=='function'||!native[method](id))continue;}catch{continue;}
          w.nativeSaved=true;writeDirty=true;saveWrites();
        }
        // Native has confirmed the durable write. A failed mirror cleanup can
        // retry independently and must never re-earn this reservation.
        if(backup.read().pending.some(e=>e.id===id)&&!backup[w.kind](id))continue;
        retries.delete(id);writes.delete(id);writeDirty=true;saveWrites();
      }
    }
    function overlayWrites(s,fallback=false){
      for(const [id,w] of writes){
        if(w.nativeSaved){if(fallback){s.pending=s.pending.filter(e=>e.id!==id);if(w.kind==='complete'&&!s.completed.includes(id))s.completed.push(id);}continue;}
        // SharedPreferences may change memory even when commit() returns false.
        // Neither that volatile completion nor its quota is an acknowledgement.
        s.pending=s.pending.filter(e=>e.id!==id);s.pending.push(w.entry);s.completed=s.completed.filter(value=>value!==id);
        const info=w.entry.scene==='daily'&&dailyInfo(id,w.entry.movie);
        if(info){const day=w.before.dailyDays?.[info.kind];if(day)s.dailyDays[info.kind]=day;else delete s.dailyDays[info.kind];}
        if(Birthday.isClaim(w.entry))s.birthdayYear=w.before.birthdayYear;
        if(w.entry.scene==='momiji')s.momijiDay=w.before.momijiDay;
        if(w.entry.scene==='hana')s.hanaDay=w.before.hanaDay;
      }
      return s;
    }
    let retries=new Set(backup.read().pending.map(e=>e.id)),nextRetry=0;
    function readState(){if(!hasNative)return backup.read();
        try{
          flushWrites();
          if(retries.size&&now()>=nextRetry){nextRetry=now()+5000;for(const e of backup.read().pending)if(!writes.has(e.id)&&retries.has(e.id)&&native.earnOutingMovie(e.id,e.scene,e.movie))retries.delete(e.id);}
          const s=overlayWrites(state(native.outingMovies()));let mirror=backup.read();
          const acknowledged=mirror.pending.filter(e=>s.completed.includes(e.id));
          for(const entry of acknowledged)backup.complete(entry.id);
          if(acknowledged.length)mirror=backup.read();
          if(typeof native.rememberOutingMovie==='function')for(const entry of s.pending){
            if(mirror.seen.includes(entry.movie)&&!s.seen.includes(entry.movie)&&native.rememberOutingMovie(entry.id))s.seen.push(entry.movie);
          }
          // A failed commit can still change Native memory. Only a durable
          // local copy or a positive Native acknowledgement exposes a new ID.
          s.seen=s.seen.filter(movie=>!transientUnconfirmed.has(movie)||mirror.seen.includes(movie));
          if(now()>=nextTransientRetry&&typeof native.rememberTransientOutingMovie==='function'){
            nextTransientRetry=now()+5000;
            for(const movie of mirror.seen)if(transientIds.includes(movie)&&(!s.seen.includes(movie)||transientNativeRetries.has(movie))){
              try{if(native.rememberTransientOutingMovie(movie)){
                transientUnconfirmed.delete(movie);transientNativeRetries.delete(movie);if(!s.seen.includes(movie))s.seen.push(movie);
              }else transientNativeRetries.add(movie);}catch{transientNativeRetries.add(movie);}
            }
          }
          s.seen=[...new Set([...s.seen,...mirror.seen])];return s;
        }catch(error){return overlayWrites(backup.read(),true);}
    }
    function write(kind,id){
      if(!hasNative)return backup[kind](id);
      let w=writes.get(id);if(w&&w.kind!==kind)return false;
      if(!w){const before=readState(),entry=before.pending.find(e=>e.id===id);
        if(!entry){try{const method=kind==='complete'?'completeOutingMovie':'expireOutingMovie';if(typeof native[method]!=='function'||!native[method](id))return false;backup[kind](id);return true;}catch{return false;}}
        w={kind,entry,before:{dailyDays:{...before.dailyDays},birthdayYear:before.birthdayYear,momijiDay:before.momijiDay,hanaDay:before.hanaDay},nativeSaved:false};
        writes.set(id,w);writeDirty=true;
      }
      // Write the intent first. If this fails, Native must remain untouched.
      flushWrites(true);return w.nativeSaved===true;
    }
    return {
      read:readState,
      earn(e){if(!valid(e.id)||!valid(e.movie)||!scenes.includes(e.scene))return false;
        if(e.scene==='momiji'&&!momijiDay(e.id))return false;
        const saved=backup.earn(e);if(!hasNative)return saved;
        try{if(native.earnOutingMovie(e.id,e.scene,e.movie)){retries.delete(e.id);return true;}}catch(error){}
        retries.add(e.id);nextRetry=0;return saved;
      },
      popHanaBubble(id,at=now()){
        const current=readState();
        if(!automaticAllowed(catalog.hana,current.seen))return {saved:true,state:current};
        if(hasNative&&typeof native.popHanaBubble==='function'){
          try{const r=JSON.parse(native.popHanaBubble(id,at));return {saved:r.saved===true,state:state(r.state)};}catch(error){return {saved:false};}
        }
        return backup.popHanaBubble(id,at,now());
      },
      remember(id){const saved=backup.remember(id);if(hasNative&&typeof native.rememberOutingMovie==='function'){
        try{return native.rememberOutingMovie(id)||saved;}catch(error){return saved;}}
        return saved;},
      rememberTransient(movie){if(!transientIds.includes(movie))return false;
        const known=readState().seen.includes(movie),saved=backup.rememberTransient(movie);
        if(saved)transientUnconfirmed.delete(movie);else if(!known)transientUnconfirmed.add(movie);
        if(hasNative&&typeof native.rememberTransientOutingMovie==='function'){
          nextTransientRetry=now()+5000;
          try{if(native.rememberTransientOutingMovie(movie)){transientUnconfirmed.delete(movie);transientNativeRetries.delete(movie);return true;}}
          catch(error){}
          transientNativeRetries.add(movie);
        }return saved;},
      expire(id){const saved=write('expire',id);if(saved)retries.delete(id);return saved;},
      complete:id=>write('complete',id)
    };
  }
  function hanaProgress(raw,time=Date.now()){
    const s=state(raw),day=localDay(time),used=s.hanaDay>=day||s.pending.some(e=>e.scene==='hana');
    const hits=s.hanaBubbles.day===day?s.hanaBubbles.hits.filter(h=>h.at<=time+1000&&time-h.at<=60000&&localDay(h.at)===day):[];
    return {day,used,hits,count:used?10:hits.length,left:hits.length?Math.max(0,Math.ceil((60000-(time-Math.min(...hits.map(h=>h.at))))/1000)):60};
  }
  function availableFor(clip,options){
    // The browser loads the seasonal calendar after this catalog. Resolve it at admission.
    const halloween=root.MaroHalloween||Halloween;
    return !!clip&&(!clip.halloween||!!halloween&&halloween.active(new Date(options.wallNow?options.wallNow():Date.now())))&&(!clip.nightRoutine||Night.night(options.wallNow?options.wallNow():Date.now()).active)&&(!clip.bedtime||Bedtime.clock(options.wallNow?options.wallNow():Date.now()).inWindow)&&(!clip.nightOnly||!!(options.isNight&&options.isNight()))&&(!clip.dayOnly||!(options.isNight&&options.isNight()))&&
      (!clip.homeOnly||!!(options.scene&&options.scene()==='home'))&&(!clip.sceneOnly||!!(options.scene&&options.scene()===clip.sceneOnly))&&
      (!clip.periodOnly||!!(options.period&&options.period()===clip.periodOnly))&&
      (!clip.daytimeOnly||!!(options.period&&['morning','day'].includes(options.period())));
  }
  function create(options){
    const now=options.now||Date.now,store=options.store,clips=options.catalog||catalog;
    let phase='waiting',current=null,waitUntil=0,deadline=0,deferred=false,wasActive=false,priorityEntry=null,nextRetire=0;
    const unavailable=new Set(); // Failed automatic media stays pending; never invent a viewing.
    const postponed=new Set(); // A skipped entry stays skipped for this foreground visit.
    const interactionClaims=new Set();
    const recoveryGap=Math.max(0,options.recoveryGapMs||0);
    const clipFor=e=>Object.values(clips).find(c=>c.id===e.movie&&c.scene===e.scene);
    const needsInteraction=clip=>!!clip&&['tap','heart','heart-day'].includes(clip.daily);
    const interactionReady=e=>!needsInteraction(clipFor(e))||interactionClaims.has(e.id);
    const available=(clip,entry)=>availableFor(clip,options)&&(!entry||!unavailable.has(entry.id)&&!postponed.has(entry.id)&&(!options.eligible||options.eligible(entry)))&&(!clip.birthday||
      (!options.birthdayEnabled||options.birthdayEnabled())&&Birthday.eventYear(entry)<=Birthday.dueYear(options.wallNow?options.wallNow():Date.now()));
    // Later pauses unsolicited rewards, not a separately scheduled bedtime or
    // letter routine, nor a new response to a human's submitted message.
    const automatic=(e,seen)=>available(clipFor(e),e)&&automaticAllowed(clipFor(e),seen)&&interactionReady(e)&&(!deferred||clipFor(e).routine||clipFor(e).comfort);
    const priority=e=>(clipFor(e)?.priority||0);
    function preferred(state){return state.pending.filter(e=>automatic(e,state.seen)&&priority(e)>0).sort((a,b)=>priority(b)-priority(a))[0]||null;}
    function refreshPriority(){priorityEntry=preferred(store.read());}
    refreshPriority();
    function countdown(value){options.countdown&&options.countdown(value);}
    // A finished modal keeps the room, but no longer owns a queue entry.
    function viewing(){return phase==='playing'||phase==='finished';}
    function reset(keepOpen){const wasViewing=viewing();phase=keepOpen?'finished':'waiting';deadline=0;countdown(null);if(wasViewing&&!keepOpen&&options.close)options.close();}
    function tick(){
      const active=options.active();
      if(!active){interactionClaims.clear();if(wasActive||viewing()){reset();current=null;deferred=false;postponed.clear();}wasActive=false;return;}
      wasActive=true;if(phase==='finished')return;
      if(current&&!current.replay&&!current.manual&&(!available(clipFor(current),current)||!interactionReady(current))){reset();current=null;}
      if(phase==='playing')return;
      let state=store.read();
      // A film may have been encountered before an interruption or an update.
      // Settle its old reservation without playing it or removing its memory.
      // Failed durable writes retain the original reservation and retry slowly.
      if(now()>=nextRetire){
        nextRetire=now()+5000;let retired=false;
        for(const entry of state.pending)if(!automaticAllowed(clipFor(entry),state.seen)&&clipFor(entry))retired=store.complete(entry.id)||retired;
        if(retired)state=store.read();
      }
      if(current&&!current.replay&&!current.manual&&!automaticAllowed(clipFor(current),state.seen)){reset();current=null;}
      const pending=state.pending;priorityEntry=preferred(state);
      // A new opening movie may replace a countdown, never a playing video.
      if(current&&priorityEntry&&priority(priorityEntry)>priority(current)){reset();current=null;}
      // A new human message is a direct response request, like manual replay.
      // Keep the recovery interval for unsolicited automatic movies.
      if(now()<waitUntil&&!(priorityEntry&&(clipFor(priorityEntry).comfort||clipFor(priorityEntry).exactAfterLetter))){if(phase==='countdown')reset();return;}
      if(current&&!options.ready(current,clipFor(current))){reset();current=null;}
      if(!current)current=priorityEntry||pending.find(e=>automatic(e,state.seen)&&options.ready(e,clipFor(e)))||null;
      if(!current||!options.ready(current,clipFor(current))){countdown(null);return;}
      if(phase!=='countdown'){phase='countdown';deadline=now()+(clipFor(current).leadMs??7000);}
      const left=Math.max(0,deadline-now());countdown(Math.ceil(left/1000));
      if(left===0){
        // A meal receipt is consumed durably before opening; interruption/failure
        // must not turn the same successful meal into a second automatic event.
        if(clipFor(current).once&&!store.complete(current.id)){postponed.add(current.id);reset();current=null;deferred=true;return;}
        phase='playing';countdown(null);options.play(current,clipFor(current));
      }
    }
    return {tick,
      releaseInteractions(){interactionClaims.clear();if(current&&!current.replay&&needsInteraction(clipFor(current))){reset();current=null;}refreshPriority();},
      resumeFromInteraction(kind){
        if(!options.active()||viewing())return false;
        const state=store.read(),entry=state.pending.find(e=>needsInteraction(clipFor(e))&&clipFor(e).daily===kind&&!interactionClaims.has(e.id)&&available(clipFor(e),e)&&automaticAllowed(clipFor(e),state.seen));
        if(!entry)return false;
        interactionClaims.add(entry.id);refreshPriority();return true;
      },
      hasPending(variant){const clip=clips[variant];return !!clip&&store.read().pending.some(e=>e.movie===clip.id&&e.scene===clip.scene);},
      earn(scene,id,joyMs,variant){const clip=clips[variant||scene];if(!available(clip)||clip.scene!==scene)return false;
        if(!automaticAllowed(clip,store.read().seen))return false;
        if(!available(clip,{id,scene,movie:clip.id}))return false;
        if(!store.earn({id,scene,movie:clip.id}))return false;
        if(needsInteraction(clip))interactionClaims.add(id);refreshPriority();
        waitUntil=Math.max(waitUntil,now()+Math.max(0,joyMs));return true;},
      memories(){const seen=new Set();return store.read().seen.map(id=>Object.values(clips).find(c=>c.id===id)).filter(Boolean).reverse().filter(c=>{const key=c.memoryId||c.id;if(seen.has(key))return false;seen.add(key);return true;});},
      // Directly selected destinations reuse the movie viewer, never the reward queue.
      visit(variant){const clip=clips[variant];
        if(!clip||!clip.destination||!availableFor(clip,options)||!options.active()||viewing()||options.canVisit&&!options.canVisit(clip))return false;
        if(phase==='countdown')reset();
        current={id:'visit-'+clip.id,scene:clip.scene,movie:clip.id,replay:true,destination:true,manual:true};
        wasActive=true;phase='playing';countdown(null);options.play(current,clip);return true;},
      replay(movie){if(!options.active()||viewing())return false;
        const clip=Object.values(clips).find(c=>c.id===movie);if(!clip||!store.read().seen.includes(movie)||options.eligible&&!options.eligible({id:'replay-'+movie,scene:clip.scene,movie,replay:true}))return false;
        // A valid manual choice preempts an unstarted cue without consuming it.
        if(phase==='countdown')reset();
        current={id:'replay-'+movie,scene:clip.scene,movie,replay:true,manual:true};phase='playing';countdown(null);options.play(current,clip);return true;},
      selectCurrent(id){if(!options.active()||phase!=='playing'||!current||current.id!==id)return false;current={...current,manual:true};return true;},
      encounter(id){return phase==='playing'&&current&&current.id===id&&(current.destination?typeof store.rememberTransient==='function'&&store.rememberTransient(current.movie):current.replay||store.remember(id));},
      finish(id,keepOpen){if(phase!=='playing'||!current||current.id!==id)return false;
        if(current.replay){reset(keepOpen);current=null;waitUntil=Math.max(waitUntil,now()+recoveryGap);refreshPriority();return true;}
        if(!available(clipFor(current),current)){reset(keepOpen);current=null;return false;}
        const saved=store.complete(id);if(!saved){deferred=true;postponed.add(id);}reset(keepOpen);current=null;waitUntil=Math.max(waitUntil,now()+recoveryGap);refreshPriority();return saved;},
      closeFinished(){if(phase!=='finished')return false;reset();waitUntil=Math.max(waitUntil,now()+recoveryGap);return true;},
      defer(){if(!current?.replay){deferred=true;if(current)postponed.add(current.id);}reset();current=null;return true;},
      unavailable(id){if(!current||current.id!==id||current.replay)return false;unavailable.add(id);reset();current=null;refreshPriority();return true;},
      suspend(){reset();current=null;wasActive=false;deferred=false;postponed.clear();interactionClaims.clear();waitUntil=0;},
      clip:clipFor,playing:viewing,busy:()=>viewing()||phase==='countdown',
      blocksAuto(){
        if(viewing()||phase==='countdown')return true;
        const state=store.read();
        return !!current&&automatic(current,state.seen)&&now()>=waitUntil||!!priorityEntry&&automatic(priorityEntry,state.seen)||
          state.pending.some(e=>clipFor(e)?.daily==='tap'&&automatic(e,state.seen));
      },
      state:()=>({phase,current:current&&{...current},waitUntil,deadline,deferred})};
  }
  function createMomiji(options){
    const now=options.now||Date.now;
    let motion=null,until=-1,breath=null;
    function clear(){motion=null;until=-1;breath=null;}
    return {observe(current,scene,active,period){
      if(!active||scene!=='momiji'||period==='night'){clear();return;}
      if(motion){
        if(now()>=motion.end){until=motion.end+60000;motion=null;}
        else if(!current||current.id!==motion.id||current.kind!=='look-back')motion=null;
      }
      if(current&&current.kind==='look-back'&&now()<current.startedAt+options.lookBackMs)
        motion={id:current.id,end:current.startedAt+options.lookBackMs};
    },
    start(scene){breath=scene==='momiji'&&until>=now()?{startedAt:now()}:null;},
    finish(completed,scene,period){
      const attempt=breath;breath=null;
      if(!completed||!attempt||now()-attempt.startedAt<60000||scene!=='momiji'||!['morning','day','evening'].includes(period))return false;
      const day=localDay(options.wallNow?options.wallNow():Date.now()),saved=options.read();
      if(saved.momijiDay>=day||saved.pending.some(e=>e.scene==='momiji'))return false;
      return options.earn('momiji','momiji-breath-'+day,0,period==='evening'?'momijiEvening':'momijiDay');
    },retire(current){
      if(motion&&current&&current.id===motion.id){if(now()>=motion.end)until=motion.end+60000;motion=null;}
    },clear};
  }
  function dailyStatus(raw,kind,time=Date.now()){
    const s=state(raw),day=localDay(time);return {day,used:(s.dailyDays[kind]||'')>=day||s.pending.some(e=>e.scene==='daily'&&dailyInfo(e.id,e.movie)?.kind===kind)};
  }
  const api=Object.freeze({catalog,queue,create,createMomiji,availableFor,automaticAllowed,localDay,hanaProgress,dailyInfo,dailyStatus,normalize:state});
  root.MaroOutingMovies=api;if(typeof module!=='undefined')module.exports=api;
})(typeof window==='undefined'?globalThis:window);
