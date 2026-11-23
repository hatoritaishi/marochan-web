(function(root){
  'use strict';
  var MONTHLY_YEN=3000, YEN_PER_USD=180, DAILY_MS=1800000, SEGMENT_MS=60000;
  function failure(code,message){var error=new Error(message);error.code=code;return error;}
  function abortError(){return failure('cancelled','確認を取り消しました。');}
  function stamp(now){return new Date(now+9*3600000).toISOString().slice(0,10);}
  function finite(value){return typeof value==='number'&&Number.isFinite(value)&&value>=0;}
  function createLedger(storage,now){
    now=now||Date.now;var key='maroApiBudgetV1';
    function load(){
      var raw;try{raw=storage.getItem(key);}catch(e){throw failure('budget-storage','予算の記録を読み込めません。');}
      if(raw===null)return {version:1,months:{},days:{}};
      var state;try{state=JSON.parse(raw);}catch(e){throw failure('budget-storage','予算の記録を確認できません。');}
      if(!state||state.version!==1||!state.months||!state.days||Array.isArray(state.months)||Array.isArray(state.days)||raw.length>100000)throw failure('budget-storage','予算の記録を確認できません。');
      Object.keys(state.months).forEach(function(month){var row=state.months[month];if(!/^\d{4}-\d{2}$/.test(month)||!row||!finite(row.spentUsd)||!row.reservations||Array.isArray(row.reservations)||Object.keys(row.reservations).some(function(id){return !finite(row.reservations[id]);}))throw failure('budget-storage','予算の記録を確認できません。');});
      Object.keys(state.days).forEach(function(day){if(!/^\d{4}-\d{2}-\d{2}$/.test(day)||!finite(state.days[day]))throw failure('budget-storage','利用時間の記録を確認できません。');});
      return state;
    }
    function save(state){
      Object.keys(state.months).sort().slice(0,-3).forEach(function(k){delete state.months[k];});
      Object.keys(state.days).sort().slice(0,-40).forEach(function(k){delete state.days[k];});
      try{var text=JSON.stringify(state);storage.setItem(key,text);if(storage.getItem(key)!==text)throw Error('not stored');}catch(e){throw failure('budget-storage','予算の記録を保存できないため、送信を止めました。');}
    }
    function monthRow(state,month){return state.months[month]||(state.months[month]={spentUsd:0,reservations:{}});}
    function total(row){return row.spentUsd+Object.keys(row.reservations).reduce(function(sum,id){return sum+row.reservations[id];},0);}
    function check(amount){var state=load(),month=stamp(now()).slice(0,7),row=monthRow(state,month);if(!finite(amount)||total(row)+amount>MONTHLY_YEN/YEN_PER_USD+1e-9)throw failure('budget-limit','今月のAPI予算の目安（3,000円）に達しました。送信を止めています。');}
    return {
      check:check,
      reserve:function(id,amount){check(amount);var state=load(),month=stamp(now()).slice(0,7),row=monthRow(state,month);if(Object.prototype.hasOwnProperty.call(row.reservations,id))throw Error('duplicate reservation');row.reservations[id]=amount;save(state);return {id:id,month:month,reservedUsd:amount};},
      settle:function(ticket,amount){var state=load(),row=monthRow(state,ticket.month);if(!Object.prototype.hasOwnProperty.call(row.reservations,ticket.id))return;row.spentUsd+=finite(amount)?amount:row.reservations[ticket.id];delete row.reservations[ticket.id];save(state);},
      checkDuration:function(ms){var state=load(),day=stamp(now());if(!Number.isInteger(ms)||ms<0||(state.days[day]||0)+ms>DAILY_MS)throw failure('media-daily-limit','動画とGIFの確認は1日30分までです。今日はここまでにしようね。');},
      addDuration:function(ms){this.checkDuration(ms);var state=load(),day=stamp(now());state.days[day]=(state.days[day]||0)+ms;save(state);},
      snapshot:function(){var state=load(),day=stamp(now()),row=monthRow(state,day.slice(0,7));return {month:day.slice(0,7),estimatedYen:Math.ceil(total(row)*YEN_PER_USD),monthlyYen:MONTHLY_YEN,dailyMs:state.days[day]||0,dailyLimitMs:DAILY_MS,yenPerUsd:YEN_PER_USD};}
    };
  }
  function validMeta(media){return !!media&&media.protocolVersion===2&&(media.kind==='video'||media.kind==='animation')&&typeof media.mediaId==='string'&&media.mediaId.length>0&&media.mediaId.length<=120&&Number.isInteger(media.durationMs)&&media.durationMs>0&&media.durationMs<=DAILY_MS&&media.segmentDurationMs===SEGMENT_MS&&media.segmentCount===Math.ceil(media.durationMs/SEGMENT_MS);}
  function createClient(options){
    var storage=options.storage,now=options.now||Date.now,ledger=createLedger(storage,now),serial=0,pending=new Map(),cache=new Map();
    var nativeFetch=options.fetch,bridge=options.bridge||function(){return root.MaroAlbumMedia;};
    function requestId(){serial++;return 'media-'+now().toString(36)+'-'+serial;}
    function progress(callback,text){if(callback)callback(text);}
    async function budgetFetch(url,init){
      init=init||{};if(String(init.method||'GET').toUpperCase()!=='POST')return nativeFetch(url,init);
      if(init.signal&&init.signal.aborted)throw abortError();
      var body;try{body=JSON.parse(init.body);}catch(e){throw failure('invalid-request','送信内容を確認できません。');}
      var quote=body.mode==='media-analyze'?.05:body.mode==='media-reply'?.15:body.mode==='daily-letter'?.04:.02;
      var ticket=ledger.reserve(requestId(),quote),started=false;
      try{
        if(init.signal&&init.signal.aborted){ledger.settle(ticket,0);throw abortError();}
        if(body.mode==='media-analyze'||body.mode==='media-reply'){body.budget={maxUsd:quote};init=Object.assign({},init,{body:JSON.stringify(body)});}
        started=true;var response=await nativeFetch(url,init),data;
        try{data=await response.clone().json();}catch(e){}
        var usage=data&&data.usage,known=usage&&usage.usageComplete!==false&&finite(usage.estimatedUsd);
        var noCharge=!response.ok&&[400,402,413,415].indexOf(response.status)!==-1&&!usage;
        ledger.settle(ticket,known?usage.estimatedUsd:noCharge?0:undefined);
        return response;
      }catch(error){if(!started)ledger.settle(ticket,0);else ledger.settle(ticket,undefined);throw error;}
    }
    function receiveSegment(id,status,segment){
      var row=pending.get(id);if(!row)return;
      var reasons={size_limit:'動画・GIFの読み込み容量を超えました。端末の空きメモリやファイルの大きさを確認してね。',duration_limit:'動画・GIFは1つ30分以内を選んでね。',unsupported_animation:'このアニメーションの形式を読み込めませんでした。',decode_failed:'動画・GIFや音声を読み込めませんでした。'};
      var reason=status==='failed'&&segment&&Object.prototype.hasOwnProperty.call(reasons,segment.reason)?segment.reason:null;
      row.finish(status==='ready'?null:failure('media-read-'+(reason||status),reason?reasons[reason]:status==='cancelled'?'読み込みを取り消しました。':'動画・GIFや音声を読み込めませんでした。'),segment);
    }
    function readSegment(media,index,signal){
      return new Promise(function(resolve,reject){
        var native=bridge(),id=requestId(),timer;
        if(!native||typeof native.readSegment!=='function'){reject(failure('media-native-unavailable','詳しい動画・GIFの読み込みにはアプリの更新が必要です。'));return;}
        function cancel(){try{if(typeof native.cancelSegment==='function')native.cancelSegment(id);}catch(e){}finish(abortError());}
        function finish(error,value){if(!pending.has(id))return;pending.delete(id);clearTimeout(timer);if(signal)signal.removeEventListener('abort',cancel);if(error)reject(error);else resolve(value);}
        pending.set(id,{finish:finish,mediaId:media.mediaId});
        if(signal){signal.addEventListener('abort',cancel,{once:true});if(signal.aborted){cancel();return;}}
        timer=setTimeout(function(){try{if(native.cancelSegment)native.cancelSegment(id);}catch(e){}finish(failure('media-read-timeout','動画の読み込みに時間がかかっています。'));},300000);
        try{native.readSegment(id,media.mediaId,index);}catch(e){finish(failure('media-native-unavailable','動画の読み込みを開始できませんでした。'));}
      });
    }
    async function post(url,body,signal){var response=await budgetFetch(url,{method:'POST',headers:{'Content-Type':'application/json'},signal:signal,body:JSON.stringify(body)}),data;try{data=await response.json();}catch(e){throw failure('media-server-response','動画のおへんじを確認できませんでした。');}if(!response.ok)throw failure(data&&data.code||'media-server-error',data&&data.error||'動画の確認ができませんでした。');return data;}
    async function review(options){
      var media=options.media,signal=options.signal;
      if(!validMeta(media))throw failure('media-metadata','動画・GIFの情報を確認できません。');
      if(signal&&signal.aborted)throw abortError();
      var native=bridge();if(!native||typeof native.readSegment!=='function')throw failure('media-native-unavailable','動画・GIFを詳しく見るにはアプリの更新が必要です。');
      var cached=cache.get(media.mediaId);if(!cached){cached={segments:new Map(),durationMs:media.durationMs,kind:media.kind};cache.set(media.mediaId,cached);}
      if(cached.durationMs!==media.durationMs||cached.kind!==media.kind)throw failure('media-metadata','動画・GIFの情報が変わりました。選び直してね。');
      var remainingMs=media.durationMs;cached.segments.forEach(function(s){remainingMs-=s.endMs-s.startMs;});ledger.checkDuration(remainingMs);ledger.check((media.segmentCount-cached.segments.size)*.05+.15);
      progress(options.onProgress,'動画・GIFを確認する準備をしているよ…');
      var capabilityResponse=await nativeFetch(options.url,{signal:signal,cache:'no-store'}),capability=await capabilityResponse.json();
      if(!capabilityResponse.ok||capability.mediaProtocolVersion!==2||capability.denseMedia!==true||capability.mediaAudio!==true)throw failure('dense-media-not-ready','動画・GIFの詳しい確認は、サーバーの更新を待っているよ。');
      var summaries=[];
      for(var index=0;index<media.segmentCount;index++){
        if(signal&&signal.aborted)throw abortError();
        var summary=cached.segments.get(index);
        if(!summary){
          progress(options.onProgress,(index+1)+' / '+media.segmentCount+'：動きと音を読み込んでいるよ…');
          var segment=await readSegment(media,index,signal);
          var start=index*SEGMENT_MS,end=Math.min(media.durationMs,start+SEGMENT_MS);
          if(!segment||segment.index!==index||segment.startMs!==start||segment.endMs!==end||segment.durationMs!==media.durationMs||segment.kind!==media.kind||!Array.isArray(segment.frames)||!segment.frames.length||segment.frames.length>800)throw failure('media-segment','動画の読み込み結果を確認できません。');
          if(segment.audioStatus==='unavailable')throw failure('media-audio-unavailable','動画の音声を読み込めませんでした。音声を含めて確認するため、送信を止めました。');
          ledger.checkDuration(end-start);
          progress(options.onProgress,(index+1)+' / '+media.segmentCount+'：'+segment.frames.length+'場面'+(segment.audioStatus==='present'?'と音声':'')+'を見ているよ…');
          summary=await post(options.url,{mode:'media-analyze',requestId:requestId(),segment:segment},signal);
          segment=null;
          if(summary.mode!=='media-analyze'||summary.index!==index||summary.startMs!==start||summary.endMs!==end||typeof summary.summary!=='string'||!summary.summary.trim()||summary.summary.length>16000)throw failure('media-server-response','動画の確認結果を受け取れませんでした。');
          ledger.addDuration(end-start);
          summary={index:index,startMs:start,endMs:end,summary:summary.summary,audioSummary:summary.audioSummary||'',audioStatus:summary.audioStatus};cached.segments.set(index,summary);
        }
        summaries.push(summary);
      }
      progress(options.onProgress,'最後まで見たよ。おへんじを考えているよ…');
      return post(options.url,{mode:'media-reply',requestId:requestId(),message:options.message,history:options.history,appContext:options.appContext,kind:media.kind,durationMs:media.durationMs,segments:summaries},signal);
    }
    function release(media){
      if(!media||!media.mediaId)return;cache.delete(media.mediaId);
      pending.forEach(function(row,id){if(row.mediaId===media.mediaId)row.finish(abortError());});
      try{var native=bridge();if(native&&typeof native.releaseMedia==='function')native.releaseMedia(media.mediaId);}catch(e){}
    }
    return {review:review,fetch:budgetFetch,receiveSegment:receiveSegment,release:release,validMeta:validMeta,budget:ledger.snapshot,ledger:ledger};
  }
  var exports={createClient:createClient,createLedger:createLedger,validMeta:validMeta,MONTHLY_YEN:MONTHLY_YEN,YEN_PER_USD:YEN_PER_USD,DAILY_MS:DAILY_MS};
  if(typeof module==='object'&&module.exports)module.exports=exports;
  if(root&&root.document){var client=createClient({storage:root.localStorage,fetch:root.fetch.bind(root)});root.MaroMediaReview=client;}
})(typeof window==='object'?window:globalThis);