function IThink ({ chessRecords, spec, array }) {
    let mulX = ""
    let mulY = ""
    let ifExist = false
    while (!ifExist) {
        mulX = Math.floor(Math.random() * (spec + 1))
        mulY = Math.floor(Math.random() * (spec + 1))
        ifExist = pointIfExist (chessRecords, {
            index: {
                mulX, mulY
            }
        })
        ifExist = !ifExist
    }
    let result = {}
    result = {
        index: {
            mulX,
            mulY
        }
    }
    return result
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