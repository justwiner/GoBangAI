/*
 * 启发式评估函数
 * 这个是专门给某一个位置打分的，不是给整个棋盘打分的
 * 并且是只给某一个角色打分
 */
const R = require('./role')
const score = require('./scores')
/**
 * 表示当前位置棋子的分数
 * 为了性能考虑，增加了一个dir参数，如果没有传入则默认计算所有四个方向，如果传入值，则只计算其中一个方向的值
 * @param {*} b 棋盘对象
 * @param {*} px 行数
 * @param {*} py 列数
 * @param {*} role 角色
 * @param {*} dir 指定方向
 * @returns
 */
function scorePoint(b, px, py, role, dir) {
    let board = b.board // 棋盘对象
    let result = 0 // 最终当前位置得分
    let count = 0, // 正向方向上，默认已构成五子的所存在的棋子数目
        block = 0, // 超出次数，也称碰壁次数，即遇到边界，或者遇到敌方棋子
        empty = 0 // 空位坐标，X_X才存在空位为 1 ，X_O不存在空位
        secondCount = 0 //另一个方向的count

    let len = board.length // 棋盘长度

    function reset() {
        count = 1 // 正向方向上，默认已构成五子的所存在的棋子数目为1，即传入位置棋子本身
        block = 0 // 超出次数为0，也称碰壁次数，即遇到边界，或者遇到敌方棋子
        empty = -1 // 默认值，无任何意义，起始值为 0
        secondCount = 0 //反方向上的count，默认为 0
    }

    // 方向为横向的评估
    // 注意：始终以最左侧最0点
    if (dir === undefined || dir === 0) {
        reset()
        // 右方向从当前位置向右遍历， → →
        for (let i = py + 1; true; i++) {
            // 如果超出棋盘边界，则跳出循环
            if (i >= len) {
                // 超出次数加一
                block++
                break
            }
            // 未超出，则拿到当前棋子
            let t = board[px][i]
            /**
             * 如果当前位置未落子
             */
            if (t === R.empty) {
                /**
                 * 如果不是最右侧边界的点，且
                 * 当前棋子的右侧棋子是与当前玩家同一角色
                 */
                if (empty == -1 && i < len - 1 && board[px][i + 1] == role) {
                    empty = count
                    continue
                } else {
                    break
                }
            }
            /**
             * 如果当前位置与当前玩家相同
             */
            if (t === role) {
                count++
                continue
            } else {
                block++
                break
            }
        }

        // 左方向从当前位置向左遍历， ← ←
        for (let i = py - 1; true; i--) {
            if (i < 0) {
                block++
                break
            }
            let t = board[px][i]
            if (t === R.empty) {
                if (empty == -1 && i > 0 && board[px][i - 1] == role) {
                    empty = 0 //注意这里是0，因为是从右往左走的
                    continue
                } else {
                    break
                }
            }
            if (t === role) {
                secondCount++
                empty !== -1 && empty++ //注意这里，如果左边又多了己方棋子，那么empty的位置就变大了
                continue
            } else {
                block++
                break
            }
        }

        count += secondCount
        // 将位置为px行，py列的角色为role的棋子，在横向（0）上的评分记录缓存下来
        b.scoreCache[role][0][px][py] = countToScore(count, block, empty)
    }
    result += b.scoreCache[role][0][px][py]
    // 纵向方向上的评估
    // 注意：以最上方为 0点
    if (dir === undefined || dir === 1) {

        reset()
        // 先向下遍历
        for (let i = px + 1; true; i++) {
            if (i >= len) {
                block++
                break
            }
            let t = board[i][py]
            if (t === R.empty) {
                if (empty == -1 && i < len - 1 && board[i + 1][py] == role) {
                    empty = count
                    continue
                } else {
                    break
                }
            }
            if (t === role) {
                count++
                continue
            } else {
                block++
                break
            }
        }
        // 再向上遍历
        for (let i = px - 1; true; i--) {
            if (i < 0) {
                block++
                break
            }
            let t = board[i][py]
            if (t === R.empty) {
                if (empty == -1 && i > 0 && board[i - 1][py] == role) {
                    empty = 0
                    continue
                } else {
                    break
                }
            }
            if (t === role) {
                secondCount++
                empty !== -1 && empty++ //注意这里，如果上方又多了己方棋子，那么empty的位置就变大了
                continue
            } else {
                block++
                break
            }
        }

        count += secondCount

        b.scoreCache[role][1][px][py] = countToScore(count, block, empty)
    }
    result += b.scoreCache[role][1][px][py]


    // 方向为 \
    // 注意： 以左上侧为 0 点
    if (dir === undefined || dir === 2) {
        reset()

        for (let i = 1; true; i++) {
            let x = px + i,
                y = py + i
            if (x >= len || y >= len) {
                block++
                break
            }
            let t = board[x][y]
            if (t === R.empty) {
                if (empty == -1 && (x < len - 1 && y < len - 1) && board[x + 1][y + 1] == role) {
                    empty = count
                    continue
                } else {
                    break
                }
            }
            if (t === role) {
                count++
                continue
            } else {
                block++
                break
            }
        }

        for (let i = 1; true; i++) {
            let x = px - i,
                y = py - i
            if (x < 0 || y < 0) {
                block++
                break
            }
            let t = board[x][y]
            if (t === R.empty) {
                if (empty == -1 && (x > 0 && y > 0) && board[x - 1][y - 1] == role) {
                    empty = 0
                    continue
                } else {
                    break
                }
            }
            if (t === role) {
                secondCount++
                empty !== -1 && empty++ //注意这里，如果左上边又多了己方棋子，那么empty的位置就变大了
                continue
            } else {
                block++
                break
            }
        }

        count += secondCount

        b.scoreCache[role][2][px][py] = countToScore(count, block, empty)
    }
    result += b.scoreCache[role][2][px][py]


    // 方向为 /
    // 注意： 以右上侧为 0 点
    if (dir === undefined || dir === 3) {
        reset()

        for (let i = 1; true; i++) {
            let x = px + i,
                y = py - i
            if (x < 0 || y < 0 || x >= len || y >= len) {
                block++
                break
            }
            let t = board[x][y]
            if (t === R.empty) {
                if (empty == -1 && (x < len - 1 && y < len - 1) && board[x + 1][y - 1] == role) {
                    empty = count
                    continue
                } else {
                    break
                }
            }
            if (t === role) {
                count++
                continue
            } else {
                block++
                break
            }
        }

        for (let i = 1; true; i++) {
            let x = px - i,
                y = py + i
            if (x < 0 || y < 0 || x >= len || y >= len) {
                block++
                break
            }
            let t = board[x][y]
            if (t === R.empty) {
                if (empty == -1 && (x > 0 && y > 0) && board[x - 1][y + 1] == role) {
                    empty = 0
                    continue
                } else {
                    break
                }
            }
            if (t === role) {
                secondCount++
                empty !== -1 && empty++ //注意这里，如果右上边又多了己方棋子，那么empty的位置就变大了
                continue
            } else {
                block++
                break
            }
        }

        count += secondCount

        b.scoreCache[role][3][px][py] = countToScore(count, block, empty)
    }
    result += b.scoreCache[role][3][px][py]

    return result
}

/**
 * 将棋型计算成分数
 * @param {*} count 允许构成五子的已有数目
 * @param {*} block 碰壁（超出）次数，碰壁1次，说明有一侧是边界或者敌方棋子
 * @param {*} empty 空位坐标，什么是空位（X_X，即是空位为1，X_O不是，两侧棋色不同不构成空位）
 * @returns
 */
function countToScore(count, block, empty) {
    if (empty === undefined) empty = 0

    //没有空位
    if (empty <= 0) {
        if (count >= 5) return score.FIVE
        if (block === 0) {
            switch (count) {
                case 1:
                    return score.ONE
                case 2:
                    return score.TWO
                case 3:
                    return score.THREE
                case 4:
                    return score.FOUR
            }
        }

        if (block === 1) {
            switch (count) {
                case 1:
                    return score.BLOCKED_ONE
                case 2:
                    return score.BLOCKED_TWO
                case 3:
                    return score.BLOCKED_THREE
                case 4:
                    return score.BLOCKED_FOUR
            }
        }

    } else if (empty === 1 || empty == count - 1) {
        /**
         * 当第一个是空位时
         * 遇到第一个是空位的话
         * empty在上次方法中，计算了一次empty=count即跳出循环，如第56行
         * 随后遇到相同棋色的棋子，count+=1,
         * 然后有可能就结束循环了
         * 因此empty == count - 1，即有可能代表第一个为空位
         */
        // O_OOOOO -> count = 6
        if (count >= 6) {
            return score.FIVE
        }
        if (block === 0) {
            switch (count) {
                case 2:
                    return score.TWO / 2 // 此时 count = 2， empty = 1， 棋型为 _O_O_，为半个活二，真正的活二是： _OO_
                case 3:
                    return score.THREE
                case 4:
                    return score.BLOCKED_FOUR
                case 5:
                    return score.FOUR
            }
        }

        if (block === 1) {
            switch (count) {
                case 2:
                    return score.BLOCKED_TWO
                case 3:
                    return score.BLOCKED_THREE
                case 4:
                    return score.BLOCKED_FOUR
                case 5:
                    return score.BLOCKED_FOUR
            }
        }
    } else if (empty === 2 || empty == count - 2) {
        //第二个是空位
        if (count >= 7) {
            return score.FIVE
        }
        if (block === 0) {
            switch (count) {
                case 3:
                    return score.THREE
                case 4:
                case 5:
                    return score.BLOCKED_FOUR
                case 6:
                    return score.FOUR
            }
        }

        if (block === 1) {
            switch (count) {
                case 3:
                    return score.BLOCKED_THREE
                case 4:
                    return score.BLOCKED_FOUR
                case 5:
                    return score.BLOCKED_FOUR
                case 6:
                    return score.FOUR
            }
        }

        if (block === 2) {
            switch (count) {
                case 4:
                case 5:
                case 6:
                    return score.BLOCKED_FOUR
            }
        }
    } else if (empty === 3 || empty == count - 3) {
        if (count >= 8) {
            return score.FIVE
        }
        if (block === 0) {
            switch (count) {
                case 4:
                case 5:
                    return score.THREE
                case 6:
                    return score.BLOCKED_FOUR
                case 7:
                    return score.FOUR
            }
        }

        if (block === 1) {
            switch (count) {
                case 4:
                case 5:
                case 6:
                    return score.BLOCKED_FOUR
                case 7:
                    return score.FOUR
            }
        }

        if (block === 2) {
            switch (count) {
                case 4:
                case 5:
                case 6:
                case 7:
                    return score.BLOCKED_FOUR
            }
        }
    } else if (empty === 4 || empty == count - 4) {
        if (count >= 9) {
            return score.FIVE
        }
        if (block === 0) {
            switch (count) {
                case 5:
                case 6:
                case 7:
                case 8:
                    return score.FOUR
            }
        }

        if (block === 1) {
            switch (count) {
                case 4:
                case 5:
                case 6:
                case 7:
                    return score.BLOCKED_FOUR
                case 8:
                    return score.FOUR
            }
        }

        if (block === 2) {
            switch (count) {
                case 5:
                case 6:
                case 7:
                case 8:
                    return score.BLOCKED_FOUR
            }
        }
    } else if (empty === 5 || empty == count - 5) {
        return score.FIVE
    }

    return 0
}

exports = module.exports = scorePoint;