/** 
 * 定义角色
 * 电脑： 1
 * 真人： 2
 */
exports = module.exports = {
    white: 1,
    black: 2,
    empty: 0,
    reverse: function(r) {
      return r == 1 ? 2 : 1;
    }
  }
  