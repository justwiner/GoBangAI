const think = require('./negamax')
const board = require('./board')
const config = require('./util/config')

function IThink ({ chessRecords, spec, array, role }) {
    
    board.init(array)
    let result = think(undefined, config.searchDeep)
    return {
        index: {
            mulX: result[1],
            mulY: result[0]
        }
    }
}

exports = module.exports = {
    IThink
}