(function(root){
  'use strict';
  // Message photos live in the app's private WebView database, separately from text/API memory.
  // There is no in-memory image archive and no automatic deletion of old conversations.
  var database=null;
  function open(){
    if(database)return database;
    database=new Promise(function(resolve){
      try{
        var request=root.indexedDB.open('maroChatImagesV1',1);
        request.onupgradeneeded=function(){request.result.createObjectStore('images',{keyPath:'id'});};
        request.onsuccess=function(){var db=request.result;db.onversionchange=function(){db.close();database=null;};resolve(db);};
        request.onerror=request.onblocked=function(){resolve(null);database=null;};
      }catch(error){resolve(null);database=null;}
    });
    return database;
  }
  function valid(image){return typeof image==='string'&&image.length<=1400000&&/^data:image\/jpeg;base64,[A-Za-z0-9+/]+={0,2}$/.test(image);}
  async function thumbnail(source){
    if(!valid(source))throw Error('Invalid chat image');
    var picture=new Image(),canvas=null;
    try{
      picture.src=source;await picture.decode();
      // Keep the available source pixels and JPEG bytes, rather than making a
      // second lossy 320px copy. Older small images remain readable unchanged.
      var scale=Math.min(1,1280/Math.max(picture.naturalWidth,picture.naturalHeight));
      if(scale===1)return source;
      canvas=document.createElement('canvas');canvas.width=Math.max(1,Math.round(picture.naturalWidth*scale));canvas.height=Math.max(1,Math.round(picture.naturalHeight*scale));
      var ctx=canvas.getContext('2d');ctx.fillStyle='white';ctx.fillRect(0,0,canvas.width,canvas.height);ctx.drawImage(picture,0,0,canvas.width,canvas.height);
      for(var quality of [.9,.84,.78]){var result=canvas.toDataURL('image/jpeg',quality);if(valid(result))return result;}
      throw Error('Chat image too large');
    }finally{picture.removeAttribute('src');if(canvas)canvas.width=canvas.height=0;}
  }
  async function save(id,image,kind){
    if(typeof id!=='string'||!id||id.length>200||!valid(image))return false;
    var db=await open();if(!db)return false;
    return new Promise(function(resolve){
      try{
        var tx=db.transaction('images','readwrite');
        tx.objectStore('images').put({id:id,image:image,kind:kind==='video'?'video':kind==='animation'?'animation':'photo'});
        tx.oncomplete=function(){resolve(true);};tx.onabort=tx.onerror=function(){resolve(false);};
      }catch(error){resolve(false);}
    });
  }
  async function load(id){
    var db=await open();if(!db||typeof id!=='string'||!id)return null;
    return new Promise(function(resolve){
      try{var request=db.transaction('images','readonly').objectStore('images').get(id);
        request.onsuccess=function(){var value=request.result;resolve(value&&valid(value.image)?value:null);};
        request.onerror=function(){resolve(null);};
      }catch(error){resolve(null);}
    });
  }
  root.MaroChatImages={thumbnail:thumbnail,save:save,load:load};
})(window);
