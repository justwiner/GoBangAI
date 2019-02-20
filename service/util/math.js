/**
 * 此文件内容用于判断棋形之间的相似性
 */
const S = require('./scores')

// 阈值
let threshold = 1.15

/**
 * 判断两个棋形是否相同
 * 由于棋形分数不一定相同，
 * 因此需要一个阈值盘控制某个范围内的分数是否属于相同的棋形
 * 
 * 例如94 与 110
 * 两者按理，应同属于 活一 的棋形，但由于分数值不同，通常无法判断
 * 因此我们规定，
 * *score/阈值 ~ scoreX阈值 的范围内*，都是属于同种棋形
 * 当score为负值时，范围是：*scoreX阈值 ~ score/阈值*
 * 94 与 100 同在 86.9 ~ 115 之间， 因此属于同种棋形
 */
let equal = function(a, b) {
  b = b || 0.01
  return b >= 0 ? ((a >= b / threshold) && (a <= b * threshold))
          : ((a >= b * threshold) && (a <= b / threshold))
}
let greatThan = function(a, b) {
  // 注意处理b为0的情况，通过加一个0.1 做简单的处理
  // 通过乘除号放大范围的两侧
  // 即基数越大，乘除后的结果也相差越大
  return b >= 0 ? (a >= (b+0.1) * threshold) : (a >= (b+0.1) / threshold)
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

// 判断 p 是否包含于arrays
let containPoint = function (arrays, p) {
  for (let i=0;i<arrays.length;i++) {
    let a = arrays[i]
    if (a[0] === p[0] && a[1] === p[1]) return true
  }
  return false
}

// 判断两个点是否坐标相同
let pointEqual = function (a, b) {
  return a[0] === b[0] && a[1] === b[1]
}

// 将分数近似处理为某个棋形的分数
let round = function (score) {
  // 正负号只代表着对自身是否有利
  let neg = score < 0 ? -1 : 1
  // 棋形的判断仍需要绝对值，但最终返回结果仍需要加上正负号（是否有利于己方）
  let abs = Math.abs(score)
  // 如果分数小于等于活一的一半，则近似于0分
  if (abs <= S.ONE / 2) return 0
  // 如果分数小于等于活二的一半，大于活一的一半，则近似于活一
  if (abs <= S.TWO / 2 && abs > S.ONE / 2) return neg * S.ONE
  // 如果分数小于等于活三的一半，大于活二的一半，则近似于活二
  if (abs <= S.THREE / 2 && abs > S.TWO / 2) return neg * S.TWO
  // 如果分数小于等于活三的1.5倍（即近似于双三），大于活三的一半，则近似于活三
  if (abs <= S.THREE * 1.5 && abs > S.THREE / 2) return neg * S.THREE
  // 如果分数小于等于活四的一半，大于活三的1.5倍（即近似于双三），则近似于双三
  if (abs <= S.FOUR / 2 && abs > S.THREE * 1.5) return neg * S.THREE*2
  // 如果分数小于等于连五的一半，大于活四的一半，则近似于活四
  if (abs <= S.FIVE / 2 && abs > S.FOUR / 2) return neg * S.FOUR
  // 否则分数为连五的分数
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
