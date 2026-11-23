(function(root){
  'use strict';
  // Inspect only the submitted human message, never AI replies or past history.
  function matches(value){
    if(typeof value!=='string')return false;
    const text=value.normalize('NFKC').replace(/無い/g,'ない').toLowerCase().replace(/[ァ-ヶ]/g,c=>String.fromCharCode(c.charCodeAt(0)-96));
    const plain=text.replace(/「[^」]*」|『[^』]*』|“[^”]*”|"[^"]*"/g,'');
    if(/(?:今は|いまは|もう)(?:元気|げんき|大丈夫|だいじょうぶ|平気|へいき)(?![がはも]?(?:ない|なく|出ない|でない)|ではない|じゃない)|元気になった|げんきになった|回復した/.test(plain))return false;
    return plain.split(/[。！？!?\n]|けど|けれど|でも/).some(part=>{
      if(/意味|いみ|翻訳|英語|せりふ|セリフ|台詞|という言葉|って言葉|物語|小説|映画|という設定/.test(part))return false;
      if(/(?:まろちゃん|まろち|友達|友だち|ともだち|彼女|彼|同僚|母|父|お母さん|お父さん|この子|あの子|犬|猫)(?:は|が|も|、|の様子)/.test(part)&&!/(?:私|わたし|僕|ぼく|自分|じぶん)/.test(part))return false;
      if(/(?:元気|げんき).{0,6}(?:ない|なく).{0,5}(?:わけじゃ|わけでは|ことは|とは思わない)|(?:悲しく|かなしく|寂しく|さみしく|さびしく|つらく|辛く|しんどく|苦しく|疲れて|つかれて)(?:は)?(?:ない|ありません)|(?:不安|ふあん)(?:じゃ|では)ない|心配してない|(?:落ち込んで|おちこんで)(?:い|は|いは)?ない/.test(part))return false;
      return /(?:元気|げんき)(?:が|は|も|では|の)?(?:出ない|でない|ない|なくて|なかった)|落ち込(?:ん|む)|おちこん|しょんぼり|へこん(?:だ|で)|気分が(?:沈|しず)|悲し(?:い|くて|かった)|かなし(?:い|くて|かった)|寂し(?:い|くて|かった)|さ[みび]し(?:い|くて|かった)|(?:つら|辛|しんど|くるし|苦し)(?:い|くて|かった)|(?:疲れ|つかれ)(?:た|てる|ている|ちゃった)|不安(?:だ|で|なの|です|にな)|ふあん|心配(?:だ|で|なの|です|して)|こわい|怖い|泣きたい|なきたい|泣いて|なみだが|涙が|消えたい|きえたい|死にたい|しにたい|生きるのが|もう(?:だめ|ダメ|無理|むり)|(?:やる気|やるき)(?:が)?(?:出ない|でない|ない)|大丈夫じゃない|だいじょうぶじゃない|ストレス|すとれす|いらいら|イライラ/.test(part);
    });
  }
  function create(){
    let serial=0,pending=null;
    const claimed=new Set();
    return {
      request(text){pending=null;if(!matches(text))return false;pending={id:'chat-comfort-'+(++serial),scene:'chat',movie:'chat-comfort-v1'};return true;},
      cancel(){pending=null;},
      claim(id){if(!pending||pending.id!==id)return false;claimed.add(id);pending=null;return true;},
      wrap(base){return Object.assign({},base,{
        read(){const state=base.read();return Object.assign({},state,{pending:(pending?[pending]:[]).concat(state.pending)});},
        remember(id){if(claimed.has(id))return typeof base.rememberTransient==='function'&&base.rememberTransient('chat-comfort-v1');return base.remember(id);},
        complete(id){if(claimed.has(id))return true;return base.complete(id);}
      });}
    };
  }
  const api=Object.freeze({matches,create});root.MaroChatComfort=api;
  if(typeof module!=='undefined')module.exports=api;
})(typeof window==='undefined'?globalThis:window);
