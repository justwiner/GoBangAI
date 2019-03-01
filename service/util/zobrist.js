const R = require('./role')
const Random = require("random-js")

// 置换表hash算法，用hash值表示当前棋局

let Zobrist = function (size) {
    // 设置棋盘尺寸
    this.size = size || 15;
}

// 初始化自己和对手的hash值
Zobrist.prototype.init = function () {
    this.white = [];
    this.black = [];
    for (let i = 0; i < this.size * this.size; i++) {
        this.white.push(this._rand());
        this.black.push(this._rand());
    }

    this.code = this._rand();
}

// 获取高质量随机数，确保完全不重复
let engine = Random.engines.mt19937().autoSeed()
Zobrist.prototype._rand = function () {
    return Random.integer(1, 1000000000)(engine); //再多一位就溢出了。。
}

// 通过异或操作记录棋局
Zobrist.prototype.go = function (x, y, role) {
    let index = this.size * x + y;
    this.code ^= (role == R.white ? this.white[index] : this.black[index]);
    return this.code;
}

let zobrist = new Zobrist();
zobrist.init();

exports = module.exports = zobrist;