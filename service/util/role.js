/** 
 * 定义角色
 * 电脑： 1
 * 真人： 2
 */
exports = module.exports = {
    com: 1,
    hum: 2,
    empty: 0,
    reverse: function(r) {
      return r == 1 ? 2 : 1;
    }
  }
  