(function(root){
 'use strict';
 // Media events alone cannot establish liveness: play() may stay pending and
 // a decoder may stop advancing without emitting an error or ended event.
 function create(o){
  const now=o.now||(()=>performance.now());let current=null;
  function stop(){current=null;}
  return {
   watch(video,callbacks){current={video,callbacks,time:Number(video.currentTime)||0,progressAt:now(),started:false};},
   stop,
   tick(){
    const c=current;if(!c)return;
    if(!o.active()||o.silent()){c.progressAt=now();return;}
    if(!c.callbacks.current()){stop();return;}
    const time=Number(c.video.currentTime),duration=Number(c.video.duration),at=now();
    if(Number.isFinite(time)&&time>c.time+.04){c.started=true;c.time=time;c.progressAt=at;}
    if(c.started&&c.video.ended&&Number.isFinite(duration)&&duration>0&&time>=duration-.1){stop();c.callbacks.complete();return;}
    if(at-c.progressAt>=(c.started?5000:12000)){stop();c.callbacks.stalled(c.started?'progress_stopped':'playback_not_started');}
   }
  };
 }
 const api=Object.freeze({create});root.MaroMovieProgress=api;if(typeof module!=='undefined')module.exports=api;
})(typeof window==='undefined'?globalThis:window);
