(function(root){
  'use strict';
  var pages=root.MaroPC?.pages;
  var saveLabel=pages?'この端末に自動保存':'PCに自動保存';
  var host=document.createElement('aside');host.id='pc-tools';host.setAttribute('aria-label',pages?'この端末での保存':'PCでの保存');
  host.innerHTML='<div class="pc-brand">まろちゃん <small>PCのおへや</small></div><p id="pc-save-status" role="status">PCに自動保存</p><button id="pc-export">バックアップを保存</button><button id="pc-import">バックアップを読み込む</button><button id="pc-recovery">おてがみの復旧状況</button><p class="pc-note">お部屋・おでかけ・おしゃべり・おもいでは、いつものボタンから。音はせっていで変えられるよ。</p>';
  if(pages){
    var webPage=document.getElementById('settingsWebPage');
    webPage.appendChild(host);
    host.querySelector('.pc-brand').remove();
    host.querySelector('.pc-note').remove();
    root.MaroWebNotifications?.installSettings();
  }else document.body.appendChild(host);
  if(root.MaroPC&&root.MaroPC.saveMini&&root.MaroPCRoom){
    var miniStyles=document.createElement('link');miniStyles.rel='stylesheet';miniStyles.href=pages?'./pc-mini/mini.css?v=3':'./pc-mini/mini.css';document.head.appendChild(miniStyles);
    var miniModule=document.createElement('script');miniModule.type='module';miniModule.src=pages?'./pc-mini/mini-v3.mjs':'./pc-mini/mini.mjs';document.body.appendChild(miniModule);
  }
  var status=host.querySelector('#pc-save-status'),savedAt=0;
  status.textContent=saveLabel;
  root.addEventListener('maro-pc-saved',function(){savedAt=Date.now();status.textContent=saveLabel+' '+new Date(savedAt).toLocaleTimeString('ja-JP');});
  if(!root.MaroPC||!root.MaroPC.ready())status.textContent='PCの保存先を確認してください';
  function show(message){status.textContent=message;}
  host.querySelector('#pc-export').onclick=async function(){
    try{await root.MaroPC.api('/api/backup',{});var value=await root.MaroPC.api('/api/export');
      var blob=new Blob([JSON.stringify(value)],{type:'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a');
      a.href=url;a.download='まろちゃんバックアップ-'+new Date().toISOString().slice(0,10)+'.json';a.click();setTimeout(function(){URL.revokeObjectURL(url);},60000);show(pages?'ダウンロードへバックアップを保存しました':'PC内とダウンロードへバックアップを保存しました');
    }catch(error){show(error.message);}
  };
  host.querySelector('#pc-import').onclick=function(){
    var input=document.createElement('input');input.type='file';input.accept='.json,application/json';
    input.onchange=async function(){try{if(!input.files[0])return;var value=JSON.parse(await input.files[0].text());var result=await root.MaroPC.api('/api/import',value);show('読み込みました。既存データは保持しています。再読み込みで反映します。');
      var button=document.createElement('button');button.textContent='再読み込み';button.onclick=function(){location.reload();};host.appendChild(button);
    }catch(error){show('読み込めませんでした。'+error.message);}};input.click();
  };
  var recovery=host.querySelector('#pc-recovery');
  if(pages){
    recovery.id='pc-lock';recovery.textContent='この端末をロック';
    recovery.onclick=async function(){try{await root.MaroPC.lock();}catch(error){show(error.message);}};
  }else{
    recovery.onclick=async function(){try{var value=await root.MaroPC.api('/api/recovery');show('元のおてがみ '+value.expectedLetters+'通 ／ 本文を復旧できたもの '+value.verifiedLetters+'通。'+value.status);}catch(error){show(error.message);}};
  }
  // Store selected camera photos in the same PC database as chat image history.
  root.MaroCameraPhotos={savePhoto:function(id,image){root.MaroPC.api('/api/image',{id:'camera:'+Date.now()+':'+id,image:image,kind:'photo'}).then(function(){root.maroVision.photoSaved(id,true);},function(){root.maroVision.photoSaved(id,false);});}};
  var cancelled=new Set(),segments=new Map();
  async function jpeg(image){
    var width=image.naturalWidth||image.videoWidth,height=image.naturalHeight||image.videoHeight;
    var scale=Math.min(1,1280/Math.max(width,height)),canvas=document.createElement('canvas');canvas.width=Math.max(1,Math.round(width*scale));canvas.height=Math.max(1,Math.round(height*scale));
    var ctx=canvas.getContext('2d');ctx.fillStyle='white';ctx.fillRect(0,0,canvas.width,canvas.height);ctx.drawImage(image,0,0,canvas.width,canvas.height);
    for(var quality of [.94,.9,.84,.76]){var value=canvas.toDataURL('image/jpeg',quality);if(value.length<=1400000)return value;}
    throw Error('size_limit');
  }
  root.MaroAlbumMedia={
    cancelPick:function(id){cancelled.add(id);},releaseMedia:function(id){root.MaroPC.releaseMedia?.(id);},
    cancelSegment:function(id){var controller=segments.get(id);if(controller)controller.abort();segments.delete(id);},
    readSegment:function(id,mediaId,index){var controller=new AbortController();segments.set(id,controller);
      root.MaroPC.api('/api/media-segment',{mediaId:mediaId,index:index},{signal:controller.signal}).then(function(segment){if(!controller.signal.aborted)root.MaroMediaReview.receiveSegment(id,'ready',segment);},function(){if(!controller.signal.aborted)root.MaroMediaReview.receiveSegment(id,'failed',{reason:'decode_failed'});}).finally(function(){segments.delete(id);});},
    pickMedia:function(id){
      var input=document.createElement('input');input.type='file';input.accept='image/jpeg,image/png,image/webp,image/gif,video/*';
      function deliver(status,value){if(!cancelled.has(id)&&root.maroVision)root.maroVision.albumPicked(id,status,value);else if(value?.mediaId)root.MaroPC.releaseMedia?.(value.mediaId);cancelled.delete(id);}
      input.addEventListener('cancel',function(){deliver('cancelled',null);});
      input.onchange=async function(){var file=input.files[0];if(!file){deliver('cancelled',null);return;}var url=URL.createObjectURL(file);
        try{
          if(file.size>256*1024*1024)throw Error('size_limit');
          if(file.type.startsWith('video/')){
            var video=document.createElement('video');video.muted=true;video.preload='auto';video.src=url;
            await new Promise(function(resolve,reject){video.onloadedmetadata=resolve;video.onerror=reject;});
            var duration=Math.floor(video.duration*1000);if(!Number.isFinite(duration)||duration<=0)throw Error('decode_failed');if(duration>1800000)throw Error('duration_limit');
            deliver('selected',await root.MaroPC.upload(file,'video',duration));video.removeAttribute('src');video.load();
          }else{
            if(file.type==='image/gif'){deliver('selected',await root.MaroPC.upload(file,'animation',0));return;}
            var image=new Image();image.src=url;await image.decode();deliver('selected',{kind:'photo',image:await jpeg(image)});
          }
        }catch(error){deliver('failed',{reason:['size_limit','duration_limit','unsupported_animation'].includes(error.message)?error.message:'decode_failed'});}
        finally{URL.revokeObjectURL(url);}
      };input.click();
    }
  };
  // Android normally sends foreground/resume after ready; the browser owns it here.
  function foreground(){if(root.maroAndroidApp)root.maroAndroidApp.setActive(!document.hidden);}
  document.addEventListener('visibilitychange',foreground);
  root.addEventListener('pageshow',foreground);
  root.addEventListener('pagehide',function(){if(root.maroAndroidApp)root.maroAndroidApp.setActive(false);});
  foreground();
})(window);
