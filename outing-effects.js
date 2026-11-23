/* Background-only scenery effects. Character artwork and event clocks are independent. */
(function(root){
'use strict';
const WIDTH=1086,HEIGHT=1448;
function cover(width,height){
 const scale=Math.max(width/WIDTH,height/HEIGHT);
 return {x:(WIDTH-width/scale)*.5,y:(HEIGHT-height/scale)*.42,w:width/scale,h:height/scale};
}
function createMoon(layer){return root.MaroMoonScenery.createMoon(layer);}
const vertex='attribute vec2 a_pos;varying vec2 v_uv;void main(){gl_Position=vec4(a_pos,0.,1.);v_uv=vec2((a_pos.x+1.)*.5,(1.-a_pos.y)*.5);}';
// Clean backplates remove the painted static sails only under the rotating rotor.
const assets={};
function decoded(src){
 if(!assets[src]){const img=new Image();img.src=src;assets[src]=img.decode().then(function(){return img;}).catch(function(error){delete assets[src];throw error;});}
 return assets[src];
}
function prepare(kind,period){
 if(kind==='moon')return Promise.resolve(null);
 const name=period==='day'?'meadow':period;
 return Promise.all([decoded('media/maro-flower-'+name+'-windmill-clear-v1.webp'),decoded('media/maro-windmill-rotor-v1.webp')]).then(function(images){return {clear:images[0],rotor:images[1]};});
}
const fragment=`precision mediump float;
uniform sampler2D u_image;uniform sampler2D u_clear;uniform sampler2D u_rotor;
uniform vec4 u_crop;uniform vec4 u_phase;uniform float u_spin;uniform float u_moon;varying vec2 v_uv;
vec4 background(vec2 q){
 q=clamp(q,vec2(0.),vec2(1.));vec4 c=texture2D(u_image,q);
 if(u_moon<.5){float cover=1.-smoothstep(120.,130.,length(q*vec2(1086.,1448.)-vec2(941.,297.)));if(cover>0.)c=mix(c,texture2D(u_clear,q),cover);}
 return c;
}
void main(){
 vec2 uv=u_crop.xy+v_uv*u_crop.zw,pixel=uv*vec2(1086.,1448.);vec4 original=background(uv);
 float rainbow=0.;
 if(u_moon<.5){
  float sky=(1.-smoothstep(.245,.267,uv.y))*smoothstep(.26,.34,uv.x);
  // Only the rainbow brightness and separate windmill sails animate.
  float tower=smoothstep(.83,.86,uv.x)*smoothstep(.175,.195,uv.y)*(1.-smoothstep(.31,.34,uv.y));sky*=1.-tower;
  float arc=length((uv-vec2(.64,.41))/vec2(.45,.34));rainbow=exp(-pow((arc-1.)*18.,2.))*sky;
 }
 // Keep every background sample at its original coordinate: no plant/tree/cloud warping.
 vec4 color=original;color.rgb+=vec3(.035)*rainbow*(.5+.5*sin(u_phase.w*2.+uv.x*10.));
 if(u_moon<.5){
  vec2 local=(pixel-vec2(941.,297.))/190.;float c=cos(u_spin),s=sin(u_spin);
  vec2 q=mat2(c,-s,s,c)*local+vec2(.5);
  if(q.x>0.&&q.x<1.&&q.y>0.&&q.y<1.){vec4 rotor=texture2D(u_rotor,q);color.rgb=mix(color.rgb,rotor.rgb,smoothstep(.08,.98,rotor.a));}
 }
 gl_FragColor=vec4(clamp(color.rgb,vec3(0.),vec3(1.)),1.);
}`;
function createWind(layer,active,kind){
 if(kind==='moon')return root.MaroMoonScenery.create(layer,active,cover);
 const canvas=document.createElement('canvas');canvas.className='flower-wind-canvas';canvas.setAttribute('aria-hidden','true');layer.appendChild(canvas);
 if(kind==='moon'){canvas.classList.add('moon-cloud-canvas');layer.insertBefore(canvas,layer.querySelector('.moon-stars'));}
 const media=matchMedia('(prefers-reduced-motion: reduce)');let gl,program,textures=[],image=null,backplate=null,raf=0,last=0,running=false,lost=false,enabled=false;
 try{
  gl=canvas.getContext('webgl',{alpha:false,antialias:false,depth:false,stencil:false,powerPreference:'low-power'});if(!gl)throw Error('no WebGL');
  function shader(type,source){const s=gl.createShader(type);gl.shaderSource(s,source);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS))throw Error('scenery shader');return s;}
  program=gl.createProgram();gl.attachShader(program,shader(gl.VERTEX_SHADER,vertex));gl.attachShader(program,shader(gl.FRAGMENT_SHADER,fragment));gl.linkProgram(program);if(!gl.getProgramParameter(program,gl.LINK_STATUS))throw Error('scenery program');gl.useProgram(program);
  const buffer=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,buffer);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,1,1]),gl.STATIC_DRAW);
  const attr=gl.getAttribLocation(program,'a_pos');gl.enableVertexAttribArray(attr);gl.vertexAttribPointer(attr,2,gl.FLOAT,false,0,0);
  for(let unit=0;unit<3;unit++){const texture=gl.createTexture();textures.push(texture);gl.activeTexture(gl.TEXTURE0+unit);gl.bindTexture(gl.TEXTURE_2D,texture);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,1,1,0,gl.RGBA,gl.UNSIGNED_BYTE,new Uint8Array([0,0,0,0]));}
  gl.uniform1i(gl.getUniformLocation(program,'u_image'),0);gl.uniform1i(gl.getUniformLocation(program,'u_clear'),1);gl.uniform1i(gl.getUniformLocation(program,'u_rotor'),2);
 }catch(e){lost=true;canvas.dataset.fallback='static';}
 function stop(){cancelAnimationFrame(raf);raf=0;running=false;canvas.style.opacity='0';
  // A lost buffer can already be empty. Remove it in this frame rather than
  // fading that invalid surface over the decoded original background.
  if(lost)canvas.style.visibility='hidden';
 }
 function draw(time){
  if(!gl||lost||!image)return false;
  const width=layer.clientWidth||1,height=layer.clientHeight||1,dpr=Math.min(devicePixelRatio||1,1.5),w=Math.round(width*dpr),h=Math.round(height*dpr);
  if(canvas.width!==w||canvas.height!==h){canvas.width=w;canvas.height=h;}
  const crop=cover(width,height);gl.viewport(0,0,w,h);gl.useProgram(program);gl.uniform4f(gl.getUniformLocation(program,'u_crop'),crop.x/WIDTH,crop.y/HEIGHT,crop.w/WIDTH,crop.h/HEIGHT);gl.uniform4f(gl.getUniformLocation(program,'u_phase'),(time*.00082)%(Math.PI*2),(time*.00047)%(Math.PI*2),(time*.00067)%(Math.PI*2),(time*.00006)%(Math.PI*2));gl.uniform1f(gl.getUniformLocation(program,'u_spin'),(time*Math.PI/36000)%(Math.PI*2));gl.uniform1f(gl.getUniformLocation(program,'u_moon'),kind==='moon'?1:0);gl.drawArrays(gl.TRIANGLE_STRIP,0,4);return true;
 }
 function frame(time){if(!running)return;if(time-last>=50){draw(time);last=time;}raf=requestAnimationFrame(frame);}
 function sync(){
  const next=enabled&&active()&&!document.hidden&&!media.matches&&!lost&&!!image;
  if(!next){stop();return;}if(running)return;
  running=true;last=0;draw(performance.now());canvas.style.opacity='1';raf=requestAnimationFrame(frame);
 }
 canvas.addEventListener('webglcontextlost',function(event){event.preventDefault();lost=true;canvas.dataset.fallback='static';stop();});
 // Retain the original opaque image on GPU failure; never replace it with an empty canvas.
 media.addEventListener('change',sync);
 return {canvas:canvas,setActive:function(value){enabled=!!value;sync();},setSource:function(img,parts){
  stop();image=img;backplate=parts&&parts.clear;if(!gl||lost)return;
  try{const images=[img,parts&&parts.clear||img,parts&&parts.rotor];images.forEach(function(source,unit){if(!source)return;gl.activeTexture(gl.TEXTURE0+unit);gl.bindTexture(gl.TEXTURE_2D,textures[unit]);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,source);});sync();}catch(e){lost=true;canvas.dataset.fallback='static';stop();}
 },draw:draw,state:function(){return {running:running,fallback:lost,source:image&&image.src,backplate:backplate&&backplate.src,kind:kind||'flowers'};}};
}
root.MaroOutingEffects={cover:cover,createMoon:createMoon,createWind:createWind,prepare:prepare};
})(typeof window==='undefined'?globalThis:window);
