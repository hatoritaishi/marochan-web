/* Outing owns one background transition and one immutable arrival/home cue. */
(function(root){
'use strict';
const copy={"arrival":["わぁ。おはな、いっぱいだね。","くんくん。やさしいにおい。","ちいさなおはな、みーつけた。","おはなのなかに、はいっちゃった。"],"home":["ただいま。おはな、きれいだったね。","ただいま。おそとのかぜ、きもちよかったね。","ただいま。おはなのにおい、ついてきたかな。","ただいま。ちいさないいこと、みつけたね。","ただいま。また、いっしょにいこうね。","ただいま。おうちも、ほっとするね。"],"normal":["かぜが、おはなのにおいをはこんできたよ。","ここにいると、おみみもそよそよ。","きみは、どのおはながすき？"],"thinking":["おはなにも、くすぐったいってあるのかな。","はなびらって、かぜのおてがみかな。","ちょうちょは、おはなのなまえをしってるかな。","おはなのかげも、いいにおいするのかな。"],"screen-tap":["ちょんちょん。あのおはな、みて。","ねぇねぇ。かわいいおはな、みつけた。","ちょんちょん。おはなと、ごあいさつ。"],"screen-tap-closed":["ねぇねぇ。おはなと、せーのでにこっ。","ちょんちょん。えへへ、おはなにかこまれた。","ねぇねぇ。きみもおはなも、にこにこ。"],"screen-tap-sparkle":["ねぇねぇ。あっちにも、おはながあるよ。","ちょんちょん。ちょうちょ、みつけた。","ねぇねぇ。つぎは、どんないろかな。"],"greeting":["きゅっ。おはなばたけで、こんにちは。","きみもきた。いっしょに、ながめよ。","おはなも、きみにごあいさつ。"],"greeting-open":["こっちだよ。おはな、いっぱい。","やっほ。かぜも、きてくれたよ。","きみに、そよそよのおてて。"],"jump":["わーい。おはなのまんなかだ。","きゅっ。うれしくて、ぴょこん。","ちょうちょと、めがあっちゃった。"],"open-arms":["おはなのにおい、いっぱいだね。","このけしき、きみとわけっこ。","かぜを、おててでむかえるよ。"],"hands-back-tilt":["きみのすきないろ、ここにあるかな。","まろちゃん、おはなのおとなりだよ。","おはなのおはなし、きこえるかな。"],"look-back":["うしろにも、おはながさいてたよ。","かぜと、おはながゆれてるね。","ちょうちょ、あっちにいったね。"],"paw-wave":["おはなにも、うぃんく。","そよかぜに、はいたっち。","きみに、おはなばたけのにこっ。"],"heart-hug":["おはなのまんなかで、だいすきぎゅっ。","きみとみつけたけしき、ぎゅっ。","おはなみたいなうれしさ、つめたよ。"],"pet":["なでなでと、そよかぜ。きもちいい。","きみのおててで、おはなみたいにほわっ。","えへへ。おそとでも、なでなでうれしい。"],"snack-beg":["おはなをみながら、おやつにしよ？","きみのおやつ、ここでもいいにおい。","ちいさなぴくにっく、しない？"],"drool-beg":["おはなのにおいもするけど、おやつもきになるの。","ぴくにっくのおやつ、ひとくちほしいな。","あれれ。おやつをみたら、よだれがでちゃった。"],"snack-wait":["おはなのとなりで、まってるね。","かぜさんより、そーっとまつよ。","ここで、おやつをいただいてもいい？"],"snack-disappointed":["そっか。おはなをみて、まってるね。","いまは、おやつおやすみだね。","うん。きみと、けしきをながめるね。"],"eating":["もぐもぐ。おそとでたべるの、おいしいね。","おはなのにおいと、おやつのにおい。","もぐ。ちいさなぴくにっくだね。"],"meal-after":["ふぅ。おはなとおやつ、しあわせ。","おそとのおやつ、ごちそうさま。","おなかも、おはなみたいにほわほわ。"],"memory":["ここでたべたおやつ、おぼえておこうね。","おはなとおやつ、いいおもいでだね。","また、いっしょにぴくにっくしようね。"],"snack-excited":["きゅっ。おはなばたけで、おやつだ。","おやつをみたら、わくわくしちゃった。","ぴくにっくのおやつ、うれしいな。"],"caught":["あっ。おはなをみてたら、おやつにおててが。","みつかっちゃった。ひとくち、ほしくなったの。","おそとのおやつ、きになっちゃった。"],"game-proud":["えっへん。おはなのまえで、できたよ。","きみといっしょに、じょうずにできたね。","おはなも、みててくれたかな。"],"breathing":["すぅ……おはなのにおい。はぁ……。","かぜにあわせて、ゆっくりふぅ。","きみと、おはなと、しんこきゅう。"],"yawn":["ふわぁ……おはなも、ねむくなったかな。","ふぁ……やさしいかぜで、あくびでちゃった。","んん……おそとでも、ねむねむ。"],"sleepy":["んぅ……おはなのにおい、やさしいね……。","まぶたが……はなびらみたいに、ふわぁ……。","そよそよ……もうすこし、ぼんやり……。"],"waking":["ん……おはな、まださいてるね。","ふぁ……おはなばたけで、めがさめたよ。","おはなのゆめ、みてたかも。"],"rest-start":["おはなのとなりで、ちょっとすわるね。","ここで、かぜをきいてようね。","あんよも、おはなとひとやすみ。"],"rest-talk":["すわると、おはなとめがあうね。","おみみのそばを、かぜがとおったよ。","おはなをながめて、のんびりだね。"],"rest-pet":["そよかぜと、なでなで。ほっとするね。","すわったまま、えへへ。","おはなのそばで、やさしいおてて。"],"rest-end":["ふぅ。おはなと、ゆっくりできたね。","あんよ、またげんきになったよ。","たっちして、けしきをみようかな。"],"sleep-start":["おはなのにおいを、ゆめにつれてくね……。","そよかぜ、やさしくふいててね……。","ふぁ……おはなのゆめ、みられるかな……。"],"sleep-talk":["むにゃ……おはな、ふわぁ……。","ちょうちょ……まってぇ……。","すぅ……はなびら……。"],"sleep-pet":["むにゃ……おてて、あったかぁ……。","ふぅ……かぜと、なでなで……。","んぅ……おはなも、すやすや……。"],"balance":["おはなのとなりで、かたあしぴたっ。","そよかぜに、ゆらゆら〜。","おはなにさわらないように、そーっとね。"],"fall":["きゅっ！？ あんよが……！","きゅっ！？ おっとっと……！","きゅっ！？ ころんじゃう……！"],"crying":["ぷぅ……くさのうえで、ころんじゃったの……。","ぷぅ……おはなのとなりで、おててまってるの……。","ぷぅ……いっしょに、たっちしてほしいな……。"],"aftermath":["きゅぅ～……びっくりしたよぉ……。","きゅぅ～……おはなをみるまえに、おこしてぇ……。","きゅぅ～……きみのおてて、かしてぇ……。"],"rescue":["ありがとう。おはなのとなりに、もどれたよ。","きみのおててで、ほっとしたよ。","たすけてくれて、ありがとう。もうだいじょうぶ。"],"pet-beg":["おはなのそばで、なでなでして？","そよかぜみたいに、やさしくなでて？","きみのおててで、ほっとしたいな。"],"returned":["えへへ。ひとりで、たっちできたよ。","おはなのとなりで、ぴたっともどれたよ。","ころばずに、もどれたよ。みててくれた？"],"paw-wave-perfect":["わぁい。おはなばたけで、ぴょんっ。","きみと、ぴったりあったね。","おはなも、みててくれたかな。"],"memory-away":["いっしょにたべたおやつ、おぼえてるよ。","おやつのおもいで、ほわほわだね。","また、いっしょにおやつをたべようね。"]};
copy.moonArrival=['わぁ。おつきさま、まんまる。','おほしさま、きらきらだね。','きみと、つきをみたかったの。','しーっ。よるのはらっぱだよ。'];
copy.moonHome=['ただいま。おつきさま、きれいだったね。','ただいま。おほしさま、きらきらしてたね。','ただいま。いっしょにみられて、うれしいな。','ただいま。よるのおさんぽ、たのしかったね。'];
copy.moonDayArrival=['わぁ。はらっぱ、ひろいね。','くさのうえ、ふわふわだね。','そよかぜ、きもちいいね。','きみと、のんびりしようね。'];
copy.moonDayHome=['ただいま。はらっぱ、きもちよかったね。','ただいま。かぜと、あそんできたよ。','ただいま。いっしょのおさんぽ、うれしかったな。','ただいま。また、はらっぱにいこうね。'];
const momijiCopy={
 "arrival": [
  "わぁ。もみじ、まっかだね。",
  "もみじのトンネル、きれいだね。",
  "きみと、あきのおさんぽだね。",
  "あかと、きいろ。いっぱいみつけたよ。"
 ],
 "home": [
  "ただいま。もみじ、きれいだったね。",
  "ただいま。きみと、あきをみつけたね。",
  "ただいま。また、もみじをみにいこうね。",
  "ただいま。おさんぽ、たのしかったね。"
 ],
 "morning": [
  "あさのひかりで、もみじがきらきら。",
  "すがすがしいね。きみと、あさのおさんぽ。"
 ],
 "evening": [
  "ゆうひで、もみじがもっとあかいね。",
  "そろそろ、もみじもおやすみかな。",
  "ゆうやけと、もみじ。どっちもきれいだね。"
 ],
 "normal": [
  "もみじ、ちいさなおててみたい。",
  "あかいはっぱと、きいろいはっぱ。どっちがすき？",
  "もみじのむこうまで、みちがつづいてるね。",
  "きみといっしょだと、おさんぽもうれしいな。"
 ],
 "thinking": [
  "もみじも、あきにおきがえするのかな。",
  "このみちは、どこまでつづいてるのかな。",
  "もみじのおてて、まろちゃんよりおおきいかな。"
 ],
 "screen-tap": [
  "ねぇねぇ。あのあかいもみじ、みて。",
  "ちょんちょん。きいろいはっぱも、みつけたよ。"
 ],
 "screen-tap-closed": [
  "えへへ。もみじといっしょに、にこっ。",
  "きみと、あきのけしきをわけっこ。"
 ],
 "screen-tap-sparkle": [
  "わぁ。もみじが、きらきらしてるね。",
  "あっちのもみじも、きれいだよ。"
 ],
 "greeting": [
  "もみじのしたで、こんにちは。",
  "きみもきた。いっしょに、もみじをみよう。"
 ],
 "greeting-open": [
  "こっちだよ。もみじ、きれいだよ。",
  "やっほ。あきのおさんぽ、いっしょにしよう。"
 ],
 "jump": [
  "わーい。もみじにかこまれちゃった。",
  "きゅっ。うれしくて、ぴょこん。"
 ],
 "open-arms": [
  "このもみじ、きみといっしょにみたかったの。",
  "あきのかぜ、きもちいいね。"
 ],
 "hands-back-tilt": [
  "きみのすきなもみじ、みつかった？",
  "もみじをみてると、ほっとするね。"
 ],
 "look-back": [
  "うしろのもみじも、まっかだね。",
  "きたみちも、もみじでいっぱいだよ。"
 ],
 "paw-wave": [
  "もみじのおててに、まろちゃんのおてて。",
  "きみに、もみじのしたでうぃんく。"
 ],
 "paw-wave-perfect": [
  "わぁい。もみじのしたで、ぴょんっ。",
  "きみと、ぴったりあったね。"
 ],
 "heart-hug": [
  "きみとみつけたあき、ぎゅっ。",
  "もみじみたいに、ぽかぽかのきもち。"
 ],
 "pet": [
  "もみじのしたでも、なでなでうれしい。",
  "きみのおてて、あきのひかりみたい。"
 ],
 "pet-beg": [
  "もみじをみながら、なでなでして？",
  "きみのおててで、ほっとしたいな。"
 ],
 "snack-beg": [
  "もみじをみながら、おやつにしよ？",
  "ここで、ちいさなぴくにっくしない？"
 ],
 "snack-excited": [
  "きゅっ。もみじのしたで、おやつだ。",
  "おさんぽのおやつ、うれしいな。"
 ],
 "drool-beg": [
  "けしきもきれいだけど、おやつもきになるの。",
  "あれれ。おやつをみたら、よだれがでちゃった。"
 ],
 "snack-wait": [
  "もみじをみながら、まってるね。",
  "ここで、おやつをいただいてもいい？"
 ],
 "snack-disappointed": [
  "うん。いまは、もみじをながめてるね。",
  "そっか。きみと、けしきをみてようね。"
 ],
 "eating": [
  "もぐもぐ。もみじをみながら、おやつだね。",
  "おそとでたべるおやつ、おいしいね。"
 ],
 "meal-after": [
  "ふぅ。もみじとおやつ、しあわせ。",
  "おさんぽのおやつ、ごちそうさま。"
 ],
 "memory": [
  "もみじのしたでたべたおやつ、おぼえておくね。",
  "あきのけしきとおやつ、いいおもいでだね。"
 ],
 "memory-away": [
  "いっしょにたべたおやつ、おぼえてるよ。",
  "また、いっしょにおやつをたべようね。"
 ],
 "caught": [
  "あっ。もみじをみてたら、おやつにおててが。",
  "みつかっちゃった。ひとくち、ほしくなったの。"
 ],
 "game-proud": [
  "えっへん。もみじのまえで、できたよ。",
  "きみといっしょに、じょうずにできたね。"
 ],
 "breathing": [
  "すぅ……あきのくうき。はぁ……。",
  "きみと、もみじと、しんこきゅう。"
 ],
 "yawn": [
  "ふわぁ……あきのかぜ、きもちいいね。",
  "ふぁ……おさんぽで、あくびでちゃった。"
 ],
 "sleepy": [
  "んぅ……もみじのいろ、やさしいね……。",
  "きみと、けしきをみながら、ぼんやり……。"
 ],
 "waking": [
  "ん……もみじ、まだきれいだね。",
  "もみじのゆめ、みてたかも。"
 ],
 "rest-start": [
  "もみじのしたで、ちょっとひとやすみ。"
 ],
 "rest-talk": [
  "きみと、もみじをながめて、のんびり。"
 ],
 "rest-pet": [
  "もみじのしたで、やさしいおてて。"
 ],
 "rest-end": [
  "ふぅ。きみと、ゆっくりできたね。"
 ],
 "sleep-start": [
  "もみじのけしきを、ゆめにつれてくね……。"
 ],
 "sleep-talk": [
  "むにゃ……もみじ、まっか……。"
 ],
 "sleep-pet": [
  "むにゃ……おてて、あったかぁ……。"
 ],
 "balance": [
  "もみじのしたで、かたあしぴたっ。",
  "きみ、みててね。そーっと、ぴたっ。"
 ],
 "fall": [
  "きゅっ！？ あんよが……！",
  "きゅっ！？ おっとっと……！"
 ],
 "crying": [
  "ぷぅ……ころんじゃったの……。",
  "ぷぅ……きみのおてて、まってるの……。"
 ],
 "aftermath": [
  "きゅぅ～……びっくりしたよぉ……。",
  "きゅぅ～……きみのおてて、かしてぇ……。"
 ],
 "rescue": [
  "ありがとう。もみじのしたに、もどれたよ。",
  "たすけてくれて、ありがとう。もうだいじょうぶ。"
 ],
 "returned": [
  "えへへ。もみじのしたで、たっちできたよ。",
  "ひとりで、もどれたよ。みててくれた？"
 ]
};
const motions=[
 {id:'open-arms',kind:'open-arms',duration:3500},
 {id:'banzai',kind:'outing-banzai',duration:5860},
 {id:'pet-jump',kind:'outing-pet-jump',duration:4880},
 {id:'hands-back',kind:'hands-back-tilt',duration:4800}
];
const hanaCopy=Object.assign({},copy,{
 arrival:['わぁ。さくらと、おはないっぱい。','しゃぼんだま、ふわり。きれいだね。','きみと、はなあかりにきたよ。','おはなとあわが、ごあいさつ。'],
 home:['ただいま。しゃぼんだま、きれいだったね。','ただいま。さくらのにおい、ついてきたかな。','ただいま。ふわり、たのしかったね。','ただいま。また、はなあかりへいこうね。'],
 normal:['あわのなかに、にじがみえるね。','さくらのはなびら、ふわりふわり。','おはなとあわに、かこまれちゃった。'],
 thinking:['しゃぼんだま、どこまでいくのかな。','あわに、おはなのいろがうつってる。'],
 'screen-tap':['ねぇねぇ。あのしゃぼんだま、みて。','ちょんちょん。さくらも、ふわり。'],
 'open-arms':['さくらとあわを、おててでむかえるよ。','このけしき、きみとわけっこ。'],
 'look-back':['うしろにも、しゃぼんだま。','さくらのむこうへ、ふわり。']
});
const christmasCopy={
 arrival:['わぁ。おかしのクリスマス村だよ。','ゆきのおうち、かわいいね。','おかしのもりで、クリスマスのおさんぽ。'],
 nightArrival:['わぁ。クリスマスのでんき、きらきら。','おかしのおうちも、あかりがついたね。','きみと、クリスマスのひかりをみたかったの。'],
 home:['ただいま。クリスマス村、たのしかったね。','ただいま。おかしのおうち、かわいかったね。','ただいま。また、いっしょにいこうね。'],
 morning:['あさのゆき、ふんわりひかってるね。','おかしのおうちも、おはよう。'],
 day:['まっしろなゆきと、おかしのおうち。かわいいね。','キャンディのしましま、みつけたよ。'],
 evening:['ゆうやけで、ゆきがももいろだね。','クリスマス村も、ゆうがたのおいろだね。'],
 night:['きらきら。もみのきにも、あかりがいっぱい。','おかしのおうちのまど、あったかそうだね。'],
 normal:['クリスマス村で、きみといっしょ。','ゆきのぼうしをかぶった、もみのきだね。'],
 thinking:['おかしのおうち、あまいにおいがするかな。'],
 'screen-tap':['ねぇねぇ。あのおかしのおうち、みて。'],
 'open-arms':['このクリスマスのけしき、きみとわけっこ。'],
 pet:['クリスマス村でも、なでなでうれしい。'],
 breathing:['すぅ……ふゆのくうき。はぁ……。']
};
function pick(items,random){return items[Math.max(0,Math.min(items.length-1,Math.floor(random()*items.length)))];}
function plan(scene,random,from,period){
 const event=scene==='home'?'home':'arrival';
 const daylight=period&&period!=='night';
 const lines=scene==='christmas'?(period==='night'?christmasCopy.nightArrival:christmasCopy.arrival):scene==='home'&&from==='christmas'?christmasCopy.home:scene==='hana'?hanaCopy.arrival:scene==='home'&&from==='hana'?hanaCopy.home:scene==='momiji'?momijiCopy.arrival:scene==='home'&&from==='momiji'?momijiCopy.home:scene==='moon'?(daylight?copy.moonDayArrival:copy.moonArrival):scene==='home'&&from==='moon'?(daylight?copy.moonDayHome:copy.moonHome):copy[event];
 return Object.freeze(Object.assign({text:pick(lines,random),event:event,scene:scene,from:from||'home'},pick(motions,random)));
}
function create(env){
 let scene='home',phase='idle',cue=null,serial=0,timer=null,fadeTimer=null,moonNight=false;
 const later=env.setTimeout||setTimeout,cancel=env.clearTimeout||clearTimeout;
 const night=function(){return !!(env.isNight&&env.isNight());};
 const available=function(target){const period=env.period?env.period():(night()?'night':'day');return target==='home'||target==='moon'||target==='christmas'||(target==='flowers'||target==='momiji')&&!night()||target==='hana'&&!night()&&(period==='morning'||period==='day');};
 try{const saved=env.storage.getItem('maroOutingSceneV1');if(saved==='flowers'||saved==='moon'||saved==='momiji'||saved==='hana'||saved==='christmas')scene=saved;
  const marker=env.storage.getItem('maroOutingMoonNightV1');
  // Before daytime visits existed, a saved moon scene always meant overnight.
  moonNight=scene==='moon'&&(night()||marker!=='0');}catch(e){}
 // Restore only the area's current visiting hours; never replay an old cue.
 if(!available(scene)){scene='home';save();}
 else if(scene==='moon'&&moonNight)save(); // Persist an overnight restore before the next clock tick.
 function save(){if(scene!=='moon')moonNight=false;try{env.storage.setItem('maroOutingSceneV1',scene);env.storage.setItem('maroOutingMoonNightV1',moonNight?'1':'0');}catch(e){}}
 function state(){return {scene:scene,phase:phase,cue:cue};}
 function notify(){env.changed(state());}
 function finish(checkClock){cancel(timer);cancel(fadeTimer);timer=fadeTimer=null;env.endCue();cue=null;phase='idle';notify();if(checkClock!==false)syncClock();}
 function syncClock(){
  if(scene==='moon'&&night()&&!moonNight){moonNight=true;save();}
  if(available(scene)||phase!=='idle')return;
  if(env.active()&&env.canReturn&&env.canReturn()){void travelTo('home');return;}
  // Sleeping, eating, a fall, a modal, or a paused app keeps its current event.
  // Only the scenery changes; no waking, pet reward or replacement speech.
  scene='home';save();env.showScene(scene,!env.active());notify();
 }
 function interrupt(){
  if(phase==='idle')return;
  ++serial;finish(false);
  if(!available(scene)){scene='home';save();notify();}
  env.showScene(scene,true); // Late loads may not resurrect an interrupted cue.
 }
 async function travel(destination){
  if(phase!=='idle'||!env.canTravel())return false;
  const target=scene==='home'?(destination||(night()?'moon':'flowers')):'home';
  if(!['home','moon','flowers','momiji','hana','christmas'].includes(target)||!available(target))return false;
  return travelTo(target);
 }
 async function travelTo(target){
  const id=++serial,chosen=plan(target,env.random||Math.random,scene,moonNight?'night':env.period?env.period():night()?'night':'day');
  phase='loading';notify();env.depart();
  let timeout;
  try{
   await Promise.race([env.prepare(target),new Promise((_,reject)=>{timeout=later(()=>reject(Error('outing image timeout')),10000);})]);
   cancel(timeout);
   if(id!==serial)return false;
   if(!env.active()){interrupt();return false;}
   // A daytime departure may finish decoding after the nighttime boundary.
   if(!available(target)){finish();env.showScene(scene,true);return false;}
   // Commit only a decoded scene. Closing mid-fade settles on this same scene.
   if(env.stand)env.stand();
   scene=target;moonNight=target==='moon'&&night();save();phase='transition';env.showScene(scene,false);notify();
   if(target!=='home'&&env.visited)env.visited({scene:target,period:env.period?env.period():night()?'night':'day'});
   fadeTimer=later(function(){
    if(id!==serial)return;
    if(!env.active()){interrupt();return;}
    phase='cue';cue=Object.freeze(Object.assign({serial:id,startedAt:env.now()},chosen));
    notify();env.beginCue(cue);
    // Includes the opaque standing handoff; no queued input is replayed.
    timer=later(function(){if(id===serial)finish();},chosen.duration+250);
   },env.reduced()?0:1600);
   return true;
  }catch(error){
   cancel(timeout);
   if(id===serial){finish(false);if(!available(scene)){scene='home';save();notify();}env.showScene(scene,true);env.failed(error);}
   return false;
  }
 }
 env.showScene(scene,true);notify();
 return {travel:travel,interrupt:interrupt,syncClock:syncClock,state:state,blocked:function(){return phase!=='idle';}};
}
function flowerLine(family,original,random){
 const pool=copy[family];if(!pool||random()>=.5)return original;
 return pick(pool,random);
}
function sceneLine(scene,family,original,random,period){
 if(scene==='christmas'){const pool=family==='normal'&&christmasCopy[period]?christmasCopy[period]:christmasCopy[family];return pool&&random()<.5?pick(pool,random):original;}
 if(scene==='hana'){const pool=hanaCopy[family];return pool&&random()<.5?pick(pool,random):original;}
 if(scene==='flowers')return flowerLine(family,original,random);
 if(scene!=='momiji')return original;
 const pool=family==='normal'&&momijiCopy[period]?momijiCopy[period]:momijiCopy[family];
 if(!pool||random()>=.5)return original;
 return pick(pool,random);
}
root.MaroOuting={sceneLine:sceneLine,christmasCopy:christmasCopy,hanaCopy:hanaCopy,momijiCopy:momijiCopy,create:create,plan:plan,copy:copy,motions:motions,flowerLine:flowerLine};
})(typeof window==='undefined'?globalThis:window);
