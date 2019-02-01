exports = module.exports = {
  // 创建一个值全为0的二维数组
  create: function (w, h) {
    let emptyArray = []
    let row = []
    for (let i = 0; i < w; i++) {
      row = []
      for (var j = 0; j < h; j++) {
        row.push(0)
      }
      emptyArray.push(row)
    }
    return emptyArray
  }
}