/* One fixed village, four decoded skies. Lighting is baked into the night art. */
(function(root){
'use strict';
const sources=Object.freeze({morning:'media/maro-candy-snow-morning-v1.webp',day:'media/maro-candy-snow-day-v1.webp',evening:'media/maro-candy-snow-evening-v1.webp',night:'media/maro-candy-snow-night-v1.webp'});
function create(layer){
 const images=[new Image(),new Image()],cache={};let visible=0,period='',request=0,pending=null,fadeTimer=null;
 images.forEach(function(image){image.className='roomimg';image.alt='';image.style.opacity='0';layer.appendChild(image);});
 function prepare(next,instant){
  if(!sources[next])return Promise.reject(Error('Unknown village period'));
  if(next===period){if(pending&&pending.period!==next){++request;pending=null;}return Promise.resolve();}
  if(pending&&pending.period===next)return pending.promise;
  const token=++request,src=sources[next];
  if(!cache[src]){const image=new Image();image.src=src;cache[src]=image.decode().then(function(){return src;}).catch(function(error){delete cache[src];throw error;});}
  const promise=cache[src].then(function(url){
   if(token!==request)return;
   const index=1-visible,image=images[index];image.src=url;
   return image.decode().then(function(){
    if(token!==request)return;
    clearTimeout(fadeTimer);const old=images[visible];old.insertAdjacentElement('afterend',image);
    image.style.transition='none';image.style.opacity='0';void image.offsetWidth;
    const immediate=instant||!period||matchMedia('(prefers-reduced-motion: reduce)').matches;
    image.style.transition=immediate?'none':'opacity 1.6s ease';image.style.opacity='1';
    if(immediate)old.style.opacity='0';else fadeTimer=setTimeout(function(){if(token===request)old.style.opacity='0';},1600);
    visible=index;period=next;pending=null;
   });
  }).catch(function(error){if(token===request)pending=null;throw error;});
  pending={period:next,promise:promise};return promise;
 }
 return {prepare:prepare,get image(){return images[visible];},state:function(){return {period:period,pending:!!pending};}};
}
root.MaroChristmasScenery={sources:sources,create:create};
})(typeof window==='undefined'?globalThis:window);
