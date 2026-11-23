(function(root){
'use strict';
const dailyGreetings=['きょうもここでまってたよ','きょうもあえてよかったぁ','なんだか、きみにあいたかったの','まろちゃんのこと、おぼえてた？','ゆっくりしていってね♪'];
const greetingOnly=dailyGreetings.concat(['きょうもきてくれたんだ！','きてくれた～♪ おはなししよ～','おかえり〜！ さっきぶりだね']);
const firstSight=['にじいろの おかしなんて、はじめて みた！','きゅ、きゅ〜っ！ にじいろの おかし、はじめて！','きゅぅ……こんな きれいな おやつ、はじめて……'];
const firstTaste=['わぁ……！ こんなの はじめて…！','きゅーっ♪ おはしで たべるおかし、はじめて'];
function dateKey(date){return date.getFullYear()+'-'+String(date.getMonth()+1).padStart(2,'0')+'-'+String(date.getDate()).padStart(2,'0');}
function create(storage){
 const key='maroDailyGreetingLinesV1';
 function state(date){try{const v=JSON.parse(storage.getItem(key)||'null');return v&&v.day===dateKey(date)&&Array.isArray(v.said)?v:{day:dateKey(date),said:[]};}catch(e){return null;}}
 function allowed(text,c){
  if(text==='まどのそと、ながめてたよ'&&c.scene!=='home')return false;
  if(greetingOnly.includes(text)&&c.source!=='selection'&&c.source!=='greeting')return false;
  if(dailyGreetings.includes(text)){const v=state(c.date);if(!v||v.said.includes(text))return false;}
  if(text==='おかえり〜！ さっきぶりだね'&&!c.reopened)return false;
  if(text==='きょうはどんなひだった？'&&(!(c.date.getHours()>=19&&c.date.getHours()<21)||c.lateNight))return false;
  if(text==='こんにちは！ おひる、なに たべた？'&&!(c.date.getHours()>=13&&c.date.getHours()<16))return false;
  if(text==='こんにちは！ ぽかぽか きもちいいね'&&!(Number.isFinite(c.temperature)&&c.temperature>=20&&c.temperature<=25))return false;
  if(firstSight.includes(text)&&!c.firstSight)return false;
  if(firstTaste.includes(text)&&!c.firstTaste)return false;
  if(text==='ねぇ！ いちどでいいから、たべてみたいの〜♪'&&!c.neverTastedRainbow)return false;
  return true;
 }
 function commit(text,c){
  if(!allowed(text,c))return false;
  if(!dailyGreetings.includes(text))return true;
  const v=state(c.date);if(!v||v.said.includes(text))return false;
  v.said.push(text);try{storage.setItem(key,JSON.stringify(v));return true;}catch(e){return false;}
 }
 return {allowed:allowed,commit:commit};
}
root.MaroDialogueRules={create:create,dailyGreetings:dailyGreetings,greetingOnly:greetingOnly};
})(typeof window==='undefined'?globalThis:window);
