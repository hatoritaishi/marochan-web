// A sleep session keeps one approved deep pose across room/companion handoffs.
function maroDeepSleepPose(started) {
  var at = Number.isSafeInteger(started) && started > 0 ? started : 0;
  return ((Math.floor(at / 1000) ^ Math.floor(at / 131072)) & 1) ? 'b' : 'a';
}
