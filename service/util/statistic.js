const array = require('./array')

class Statistic {
  // 初始化空的二维数组
  init (size) {
    this.table = array.create(size, size);
  }

  print (candidates) {
    console.log(this.table.map(function (r) { return r.map(i=>parseInt(Math.sqrt(i/10000))).join(',') }))
    let max = 0;
    let p;
    for (let i=0; i<candidates.length; i++) {
      let c = candidates[i];
      let s = this.table[c[0]][c[1]];
      if (s > max) {
        max = s;
        p = [c[0], c[1]];
      }
    }
    console.log('历史表推荐走法:', p);
  }
}

exports = module.exports = new Statistic()
