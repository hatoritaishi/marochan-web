// Unlimited invitations at night; keep one session at a time and use wall-time boundaries.
function createMaroLateNight(storage) {
  var key='maroLateNightV1', value=null, hour=3600000;
  try { value=JSON.parse(storage.getItem(key)||'null'); } catch(e) {}
  if(!value||!Number.isFinite(value.lastUsed)||value.lastUsed<0)value={lastUsed:0,session:null};
  function save(){storage.setItem(key,JSON.stringify(value));}
  function valid(s){return s&&Number.isFinite(s.start)&&s.start>0&&s.ready===s.start+180000&&
    s.end===s.start+hour&&(s.sleepAt===s.end+15000||s.sleepAt===s.end)&&Number.isFinite(s.nightEnd)&&s.nightEnd>s.start;}
  if(value.session&&!valid(value.session))value.session=null;
  return {
    available:function(now){return !value.session||now>=Math.min(value.session.sleepAt,value.session.nightEnd);},
    session:function(){return value.session;},
    begin:function(now,nightEnd,mode){
      if(!this.available(now)||!(nightEnd>now))return null;
      var next={lastUsed:now,session:{start:now,ready:now+180000,end:now+hour,sleepAt:now+hour+(mode==='early'?0:15000),nightEnd:nightEnd}};
      // Persist before accepting a click. A storage failure does not start a session.
      try{storage.setItem(key,JSON.stringify(next));}catch(e){return null;}
      value=next;return value.session;
    },
    finish:function(){value.session=null;try{save();}catch(e){}},
    merge:function(lastUsed,session){
      if(Number.isFinite(lastUsed))value.lastUsed=Math.max(value.lastUsed,lastUsed);
      if(valid(session)&&(!value.session||session.start>=value.session.start))value.session=session;
      try{save();}catch(e){}
    },
    lastUsed:function(){return value.lastUsed;}
  };
}

// Early mornings share the same durable invitation without the night closing grace.
function isMaroEarlyWakeSession(session){return !!(session&&session.sleepAt===session.end);}
