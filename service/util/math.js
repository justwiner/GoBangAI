const S = require('./scores')

let threshold = 1.15

let equal = function(a, b) {
  b = b || 0.01
  return b >= 0 ? ((a >= b / threshold) && (a <= b * threshold))
          : ((a >= b * threshold) && (a <= b / threshold))
}
let greatThan = function(a, b) {
  return b >= 0 ? (a >= (b+0.1) * threshold) : (a >= (b+0.1) / threshold) // 注意处理b为0的情况，通过加一个0.1 做简单的处理
}
let greatOrEqualThan = function(a, b) {
  return equal(a, b) || greatThan(a, b)
}
let littleThan = function(a, b) {
  return b >= 0 ? (a <= (b-0.1) / threshold) : (a <= (b-0.1) * threshold)
}
let littleOrEqualThan = function(a, b) {
  return equal(a, b) || littleThan(a, b)
}

let containPoint = function (arrays, p) {
  for (var i=0;i<arrays.length;i++) {
    var a = arrays[i]
    if (a[0] === p[0] && a[1] === p[1]) return true
  }
  return false
}

let pointEqual = function (a, b) {
  return a[0] === b[0] && a[1] === b[1]
}

let round = function (score) {
  var neg = score < 0 ? -1 : 1
  var abs = Math.abs(score)
  if (abs <= S.ONE / 2) return 0
  if (abs <= S.TWO / 2 && abs > S.ONE / 2) return neg * S.ONE
  if (abs <= S.THREE / 2 && abs > S.TWO / 2) return neg * S.TWO
  if (abs <= S.THREE * 1.5 && abs > S.THREE / 2) return neg * S.THREE
  if (abs <= S.FOUR / 2 && abs > S.THREE * 1.5) return neg * S.THREE*2
  if (abs <= S.FIVE / 2 && abs > S.FOUR / 2) return neg * S.FOUR
  return neg * S.FIVE
}

exports = module.exports = {
  equal,
  greatThan,
  greatOrEqualThan,
  littleThan,
  littleOrEqualThan,
  containPoint,
  pointEqual,
  round
}
