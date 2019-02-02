/*
 * 棋型表示
 * 用一个6位数表示棋型，从高位到低位分别表示
 * 连五，活四，眠四，活三，活二/眠三，活一/眠二, 眠一
 */

// 给单个棋型打分

exports = module.exports = {
    ONE: 10, // 活一
    TWO: 100, // 活二
    THREE: 1000, // 活三
    FOUR: 100000, // 活四
    FIVE: 10000000, // 连五
    BLOCKED_ONE: 1, // 冲一
    BLOCKED_TWO: 10, // 冲二
    BLOCKED_THREE: 100, // 冲三
    BLOCKED_FOUR: 10000 // 冲四
  }
  
  // 总分数
  const score = {
    TWO: 'TWO', // 活二
    TWO_THREE: 'TWO_THREE', // 双三
    BLOCK_FOUR: 'BLOCKED_FOUR', // 冲四
    FOUR_THREE: 'FOUR_THREE', // 冲四活三
    FOUR: 'FOUR', // 活四
    FIVE: 'FIVE', // 连五
  }
  