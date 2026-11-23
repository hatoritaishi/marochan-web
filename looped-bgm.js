(function(root,factory){
 var create=factory();if(typeof module==='object'&&module.exports)module.exports=create;else root.createMaroLoopedBgm=create;
})(typeof window!=='undefined'?window:globalThis,function(){
 'use strict';
 // Keep the existing media-player API and mixer. Only approved looping tracks
 // use a single PCM source; ordinary songs retain their native media transport.
 return function(media,graphFor,host){
  host=host||(typeof window!=='undefined'?window:globalThis);
  var mode=false,playing=false,offset=0,origin=0,source=null,graph=null,
    buffer=null,bufferUrl='',serial=0,promise=null,download=null;
  function emit(type){media.dispatchEvent(new host.Event(type));}
  function position(){
   var value=playing&&source?graph.context.currentTime-origin:offset;
   return buffer?((value%buffer.duration)+buffer.duration)%buffer.duration:value;
  }
  function retire(){if(source){source.stop();source.disconnect();source=null;}}
  function pause(){
   var wasPlaying=mode&&playing&&!!source;if(source)offset=position();
   serial++;playing=false;promise=null;retire();
   if(download){download.abort();download=null;}media.pause();
   if(wasPlaying)emit('pause');
  }
  function reset(){pause();mode=false;offset=0;buffer=null;bufferUrl='';}
  function startSource(){
   source=graph.context.createBufferSource();source.buffer=buffer;source.loop=true;
   source.loopStart=0;source.loopEnd=buffer.duration;source.connect(graph.musicInput);
   origin=graph.context.currentTime-offset;source.start(0,offset);
  }
  function play(){
   if(!media.loop)return media.play();
   if(mode&&playing&&promise)return promise;
   graph=graphFor();
   if(!graph||!graph.context.createBufferSource||!graph.context.decodeAudioData){
    if(mode){mode=false;try{media.currentTime=offset;}catch(error){}}
    return media.play();
   }
   var id=++serial,url=media.src;media.pause();mode=true;playing=true;
   promise=(async function(){
    try{
     await graph.context.resume();
     if(id!==serial||media.src!==url||!media.loop)throw Error('BGM playback cancelled');
     if(!buffer||bufferUrl!==url){
      var controller=new host.AbortController();download=controller;
      var response=await host.fetch(url,{signal:controller.signal});
      if(!response.ok)throw Error('BGM audio unavailable');
      var bytes=await response.arrayBuffer();
      if(id!==serial||media.src!==url||!media.loop)throw Error('BGM playback cancelled');
      var decoded=await graph.context.decodeAudioData(bytes);
      if(id!==serial||media.src!==url||!media.loop)throw Error('BGM playback cancelled');
      buffer=decoded;bufferUrl=url;
     }
     if(id!==serial||media.src!==url||!media.loop)throw Error('BGM playback cancelled');
     offset=((offset%buffer.duration)+buffer.duration)%buffer.duration;
     startSource();emit('play');emit('playing');
    }catch(error){if(id===serial){playing=false;promise=null;retire();}throw error;}
    finally{if(id===serial)download=null;}
   })();
   return promise;
  }
  var player={mediaElement:media,play:play,pause:pause,
   load:function(){reset();return media.load();},
   addEventListener:function(){return media.addEventListener.apply(media,arguments);},
   removeEventListener:function(){return media.removeEventListener.apply(media,arguments);}
  };
  Object.defineProperties(player,{
   src:{get:function(){return media.src;},set:function(value){reset();media.src=value;}},
   currentSrc:{get:function(){return mode?media.src:media.currentSrc;}},
   // A pending decode is still silent; playback begins only with a PCM source.
   paused:{get:function(){return mode?(!playing||!source):media.paused;}},
   ended:{get:function(){return mode?false:media.ended;}},
   duration:{get:function(){return mode&&buffer?buffer.duration:media.duration;}},
   currentTime:{get:function(){return mode?position():media.currentTime;},set:function(value){
    if(!mode&&!media.loop){media.currentTime=value;return;}
    mode=true;offset=Math.max(0,Number(value)||0);if(buffer)offset%=buffer.duration;
    emit('seeking');if(source){retire();startSource();}emit('seeked');
   }},
   loop:{get:function(){return media.loop;},set:function(value){if(!value&&mode){pause();mode=false;}media.loop=!!value;}},
   volume:{get:function(){return media.volume;},set:function(value){media.volume=value;}},
   preload:{get:function(){return media.preload;},set:function(value){media.preload=value;}},
   error:{get:function(){return media.error;}}
  });
  return player;
 };
});
