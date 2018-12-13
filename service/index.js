const think = require('./negamax')
const board = require('./board')
const config = require('./util/config')

function IThink ({ chessRecords, spec, array, role }) {
    
    board.init(array)
    let result = think(undefined, config.searchDeep)
    return {
        index: {
            mulX: result[0],
            mulY: result[1]
        }
    }
}

// 模拟AI落子辅助函数-此落点是否存在
function pointIfExist (chessRecords, point) {
    const {mulX, mulY} = point.index
    let ifExist = false
    for (let i = 0 ; i < chessRecords.length; i ++) {
        if ((mulX === (chessRecords[i].point.index.mulX - 1)) && (mulY === chessRecords[i].point.index.mulY - 1)) {
            ifExist = true;
            break
        }
    }
    return ifExist;
}

exports = module.exports = {
    IThink
}