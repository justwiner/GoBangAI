const S = require('./util/scores')
const R = require('./util/role')
// const statistic = require('./util/statistic')
const array = require('./util/array')
const scorePoint = require('./util/evaluate-point')
const zobrist = require('./util/zobrist')
const config = require('./util/config')

let count = 0
let total = 0

/**
 * 根据棋型，得到相应的分数
 *
 * @param {*} 
 * @returns 分数
*/
function fixScore(type) {
    // 棋型分数小于活四，大于等于冲四
    if (type < S.FOUR && type >= S.BLOCKED_FOUR) {
        // 如果当前分数只够单独冲四，并且不足以构成冲四且活三的杀招
        if (type >= S.BLOCKED_FOUR && type < (S.BLOCKED_FOUR + S.THREE)) {
            //单独冲四，意义不大，则选择活三
            return S.THREE
        } else if (type >= S.BLOCKED_FOUR + S.THREE && type < S.BLOCKED_FOUR * 2) {
            // 当前棋子可以形成冲四与活三，但不能形成双冲四
            return S.FOUR //冲四活三，比双三分高，相当于自己形成活四
        } else {
            //双冲四 比活四分数也高
            return S.FOUR * 2
        }
    }
    return type
}

function starTo(point, points) {
    if (!points || !points.length) return false
    const a = point
    for (let i = 0; i < points.length; i++) {
        // 距离必须在5步以内
        const b = points[i]
        if ((Math.abs(a[0] - b[0]) > 4 || Math.abs(a[1] - b[1]) > 4)) return false
        // 必须在米子方向上
        if (!(a[0] === b[0] || a[1] === b[1] || (Math.abs(a[0] - b[0]) === Math.abs(a[1] - b[1])))) return false
    }
    return true
}

class Board {
    /**
     * 初始化棋盘对象
     * 传size，则初始化空的棋盘
     * 穿board（二维数组），则根据二维数组初始化棋盘
     * @param {*} sizeOrBoard
     * @memberof Board
     */
    init(sizeOrBoard) {
        this.evaluateCache = {}
        this.currentSteps = [] // 当前一次思考的步骤
        this.allSteps = []
        this.zobrist = zobrist
        zobrist.init() // 初始化zobrist置换表
        this._last = [false, false] // 记录最后一步
        this.count = 0; // 已落子数目
        let size = 0;
        /**
         * 传入的是一个二维数组
         * 则根据二维数组初始化棋盘
         * 并统计已落子的数目
         */
        if (sizeOrBoard.length) {
            this.board = sizeOrBoard
            size = this.board.length
            for (let i = 0; i < this.board.length; i++){
                // 统计每一行落子信息大于0（即已落子）的数目
                this.count += this.board[i].filter(d => d > 0).length
            }
        } else {
            /**
             * 传入的是数字
             * 则初始化空的二维数组，并设置到棋盘对象中
             */
            size = sizeOrBoard
            this.board = []
            for (let i = 0; i < size; i++) {
                let row = []
                for (let j = 0; j < size; j++) {
                    row.push(0)
                }
                this.board.push(row)
            }
        }
        // statistic.init(size)

        // 初始化双方得分情况（二维数组方式）
        this.comScore = array.create(size, size)
        this.humScore = array.create(size, size)

        // scoreCache[role][dir][row][column]
        this.scoreCache = [
            [], // placeholder
            [ // for role 1
                array.create(size, size),
                array.create(size, size),
                array.create(size, size),
                array.create(size, size)
            ],
            [ // for role 2
                array.create(size, size),
                array.create(size, size),
                array.create(size, size),
                array.create(size, size)
            ]
        ]
        // 初始化下棋双方在整个棋盘中的每个位置的分数
        this.initScore()

        // 对已有棋盘进行步数存储与评分
        if (sizeOrBoard.length) {
            for (let i = 0; i < size; i ++) {
                for (let j = 0 ; j < size; j ++) {
                    if (sizeOrBoard[i][j] !== 0) {
                        this.put([i, j], sizeOrBoard[i][j]);
                        // this.updateScore([i, j, sizeOrBoard[i][j]])
                    }
                }
            }
        }
    }

    /**
     * 初始化棋盘分数
     * @memberof Board
     */
    initScore() {

        let board = this.board

        for (let i = 0; i < board.length; i++) {
            for (let j = 0; j < board[i].length; j++) {
                // 空位，对双方都打分
                if (board[i][j] == R.empty) {
                    /**
                     * 必须是米子方向上有2个邻居的才打分
                     * 否则默认0分
                     */
                    if (this.hasNeighbor(i, j, 2, 2)) {
                        // 获取电脑在此落子点的分数
                        let cs = scorePoint(this, i, j, R.com)
                        // 获取对方在此落子点的分数
                        let hs = scorePoint(this, i, j, R.hum)
                        // 将分数分别保存下来
                        this.comScore[i][j] = cs
                        this.humScore[i][j] = hs
                    }

                } else if (board[i][j] == R.com) { // 对电脑打分，玩家此位置分数为0
                    this.comScore[i][j] = scorePoint(this, i, j, R.com)
                    this.humScore[i][j] = 0
                } else if (board[i][j] == R.hum) { // 对玩家打分，电脑位置分数为0
                    this.humScore[i][j] = scorePoint(this, i, j, R.hum)
                    this.comScore[i][j] = 0
                }
            }
        }
    }

    /**
     * 只更新一个点附近的分数
     * 因为某一个点的变化，只能影响以它为中心，半径为2的米子范围
     * 参见 evaluate point 中的代码，为了优化性能，在更新分数的时候可以指定只更新某一个方向的分数
     * @param {*} p 落子坐标
     * @memberof Board
     */
    updateScore(p) {
        let radius = 4,
            board = this.board,
            self = this,
            len = this.board.length

        function update(x, y, dir) {
            let role = self.board[x][y]
            // 不是对手的棋子
            if (role !== R.reverse(R.com)) {
                let cs = scorePoint(self, x, y, R.com, dir)
                self.comScore[x][y] = cs
                // statistic.table[x][y] += cs
            } else self.comScore[x][y] = 0
            // 是对手的棋子
            if (role !== R.reverse(R.hum)) {
                let hs = scorePoint(self, x, y, R.hum, dir)
                self.humScore[x][y] = hs
                // statistic.table[x][y] += hs
            } else self.humScore[x][y] = 0

        }
        // 无论是不是空位 都需要更新
        // -
        for (let i = -radius; i <= radius; i++) {
            let x = p[0],
                y = p[1] + i
            if (y < 0) continue
            if (y >= len) break
            update(x, y, 0)
        }

        // 丨
        for (let i = -radius; i <= radius; i++) {
            let x = p[0] + i,
                y = p[1]
            if (x < 0) continue
            if (x >= len) break
            update(x, y, 1)
        }

        // \
        for (let i = -radius; i <= radius; i++) {
            let x = p[0] + i,
                y = p[1] + i
            if (x < 0 || y < 0) continue
            if (x >= len || y >= len) break
            update(x, y, 2)
        }

        // /
        for (let i = -radius; i <= radius; i++) {
            let x = p[0] + i,
                y = p[1] - i
            if (x < 0 || y < 0) continue
            if (x >= len || y >= len) continue
            update(x, y, 3)
        }


    }

    /**
     *下子
     * @param {*} p 落子坐标
     * @param {*} role 角色
     * @memberof Board
     */
    put(p, role) {
        p.role = role
        config.debug && console.log('put [' + p + ']' + ' ' + role)
        this.board[p[0]][p[1]] = role
        this.zobrist.go(p[0], p[1], role)
        // 落子之后需要更新分数
        this.updateScore(p)
        // 添加到总步数列表中
        this.allSteps.push(p)
        // 添加到当前步数列表中
        this.currentSteps.push(p)
        // 棋子数目加 1
        this.count++
    }

    //移除棋子
    remove(p) {
        let r = this.board[p[0]][p[1]]
        config.debug && console.log('remove [' + p + ']' + ' ' + r)
        this.zobrist.go(p[0], p[1], r)
        this.board[p[0]][p[1]] = R.empty
        this.updateScore(p)
        this.allSteps.pop()
        this.currentSteps.pop()
        this.count--
    }

    logSteps() {
        console.log("steps:" + this.allSteps.map((d) => '[' + d[0] + ',' + d[1] + ']').join(','))
    }

    /**
     * 评估函数
     * 这里只算当前分，而不是在空位下一步之后的分
     * @param {*} role
     * @returns
     * @memberof Board
     */
    evaluate(role) {
        // 这里都是用正整数初始化的，所以初始值是0
        this.comMaxScore = 0
        this.humMaxScore = 0
        // 拿取到当前棋盘的引用
        let board = this.board
        //遍历出最高分，开销不大
        // L：得到当前棋盘，我方和敌方的总分
        for (let i = 0; i < board.length; i++) {
            for (let j = 0; j < board[i].length; j++) {
                if (board[i][j] == R.com) {
                    this.comMaxScore += fixScore(this.comScore[i][j])
                } else if (board[i][j] == R.hum) {
                    this.humMaxScore += fixScore(this.humScore[i][j])
                }
            }
        }
        // 有冲四延伸了，不需要专门处理冲四活三
        // 不过这里做了这一步，可以减少电脑胡乱冲四的毛病
        //this.comMaxScore = fixScore(this.comMaxScore)
        //this.humMaxScore = fixScore(this.humMaxScore)
        let result = (role == R.com ? 1 : -1) * (this.comMaxScore - this.humMaxScore)
        return result
    }

    log() {
        config.log && console.log('star: ' + (count / total * 100).toFixed(2) + '%, ' + count + '/' + total)
    }
    
    /**
     * 启发函数
     * 变量starBread的用途是用来进行米子计算
     * 所谓米子计算，只是，如果第一步尝试了一个位置A，那么接下来尝试的位置有两种情况：
     * 1: 大于等于活三的位置
     * 2: 在A的米子位置上
     * 注意只有对小于活三的棋才进行starSpread优化
     * 
     * gen 函数的排序是非常重要的，因为好的排序能极大提升AB剪枝的效率。
     * 而对结果的排序，是要根据role来的
     */
    
    gen(role, onlyThrees, starSpread) {
        if (this.count <= 0) return [[7, 7]]
        let fives = []
        let comfours = []
        let humfours = []
        let comblockedfours = []
        let humblockedfours = []
        let comtwothrees = []
        let humtwothrees = []
        let comthrees = []
        let humthrees = []
        let comtwos = []
        let humtwos = []
        let neighbors = []

        let board = this.board
        let reverseRole = R.reverse(role)
        // 找到双方的最后进攻点
        const attackPoints = [] // 进攻点
        const defendPoints = [] // 防守点


        // 默认情况下 我们遍历整个棋盘。但是在开启star模式下，我们遍历的范围就会小很多
        // 只需要遍历以两个点为中心正方形。
        // 注意除非专门处理重叠区域，否则不要把两个正方形分开算，因为一般情况下这两个正方形会有相当大的重叠面积，别重复计算了
        if (starSpread && config.star) {

            let i = this.currentSteps.length - 1
            while (i >= 0) {
                let p = this.currentSteps[i]
                if (reverseRole === R.com && p.scoreCom >= S.THREE ||
                    reverseRole === R.hum && p.scoreHum >= S.THREE) {
                    defendPoints.push(p)
                    break
                }
                i -= 2
            }

            i = this.currentSteps.length - 2
            while (i >= 0) {
                let p = this.currentSteps[i]
                if (role === R.com && p.scoreCom >= S.THREE ||
                    role === R.hum && p.scoreHum >= S.THREE) {
                    attackPoints.push(p)
                    break;
                }
                i -= 2
            }

            if (!attackPoints.length) attackPoints.push(this.currentSteps[0].role === role ? this.currentSteps[0] : this.currentSteps[1])
            if (!defendPoints.length) defendPoints.push(this.currentSteps[0].role === reverseRole ? this.currentSteps[0] : this.currentSteps[1])
        }

        for (let i = 0; i < board.length; i++) {
            for (let j = 0; j < board.length; j++) {
                if (board[i][j] == R.empty) {

                    if (this.allSteps.length < 6) {
                        if (!this.hasNeighbor(i, j, 1, 1)) continue
                    } else if (!this.hasNeighbor(i, j, 2, 2)) continue

                    let scoreHum = this.humScore[i][j]
                    let scoreCom = this.comScore[i][j]
                    let maxScore = Math.max(scoreCom, scoreHum)

                    if (onlyThrees && maxScore < S.THREE) continue

                    let p = [i, j]
                    p.scoreHum = scoreHum
                    p.scoreCom = scoreCom
                    p.score = maxScore
                    p.role = role

                    total++
                    /* 双星延伸，以提升性能
                     * 思路：每次下的子，只可能是自己进攻，或者防守对面（也就是对面进攻点）
                     * 我们假定任何时候，绝大多数情况下进攻的路线都可以按次序连城一条折线，那么每次每一个子，一定都是在上一个己方棋子的八个方向之一。
                     * 因为既可能自己进攻，也可能防守对面，所以是最后两个子的米子方向上
                     * 那么极少数情况，进攻路线无法连成一条折线呢?很简单，我们对前双方两步不作star限制就好，这样可以 兼容一条折线中间伸出一段的情况
                     */
                    if (starSpread && config.star) {
                        let roleScore = role === R.com ? p.scoreCom : p.scoreHum
                        let deRoleScore = role === R.com ? p.scoreHum : p.scoreCom

                        if (maxScore >= S.FOUR) {} else if (maxScore >= S.BLOCKED_FOUR && starTo(this.currentSteps[this.currentSteps.length - 1])) {
                            //star 路径不是很准，所以考虑冲四防守对手最后一步的棋
                        } else if (
                            starTo(p, attackPoints) || starTo(p, defendPoints)
                        ) {} else {
                            count++
                            continue
                        }
                    }

                    if (scoreCom >= S.FIVE) { //先看电脑能不能连成5
                        fives.push(p)
                    } else if (scoreHum >= S.FIVE) { //再看玩家能不能连成5
                        //别急着返回，因为遍历还没完成，说不定电脑自己能成五。
                        fives.push(p)
                    } else if (scoreCom >= S.FOUR) {
                        comfours.push(p)
                    } else if (scoreHum >= S.FOUR) {
                        humfours.push(p)
                    } else if (scoreCom >= S.BLOCKED_FOUR) {
                        comblockedfours.push(p)
                    } else if (scoreHum >= S.BLOCKED_FOUR) {
                        humblockedfours.push(p)
                    } else if (scoreCom >= 2 * S.THREE) {
                        //能成双三也行
                        comtwothrees.push(p)
                    } else if (scoreHum >= 2 * S.THREE) {
                        humtwothrees.push(p)
                    } else if (scoreCom >= S.THREE) {
                        comthrees.push(p)
                    } else if (scoreHum >= S.THREE) {
                        humthrees.push(p)
                    } else if (scoreCom >= S.TWO) {
                        comtwos.unshift(p)
                    } else if (scoreHum >= S.TWO) {
                        humtwos.unshift(p)
                    } else neighbors.push(p)
                }
            }
        }

        //如果成五，是必杀棋，直接返回
        if (fives.length) return fives

        // 自己能活四，则直接活四，不考虑冲四
        if (role === R.com && comfours.length) return comfours
        if (role === R.hum && humfours.length) return humfours

        // 对面有活四冲四，自己冲四都没，则只考虑对面活四 （此时对面冲四就不用考虑了)

        if (role === R.com && humfours.length && !comblockedfours.length) return humfours
        if (role === R.hum && comfours.length && !humblockedfours.length) return comfours

        // 对面有活四自己有冲四，则都考虑下
        let fours = role === R.com ? comfours.concat(humfours) : humfours.concat(comfours)
        let blockedfours = role === R.com ? comblockedfours.concat(humblockedfours) : humblockedfours.concat(comblockedfours)
        if (fours.length) return fours.concat(blockedfours)

        let result = []
        if (role === R.com) {
            result =
                comtwothrees
                .concat(humtwothrees)
                .concat(comblockedfours)
                .concat(humblockedfours)
                .concat(comthrees)
                .concat(humthrees)
        }
        if (role === R.hum) {
            result =
                humtwothrees
                .concat(comtwothrees)
                .concat(humblockedfours)
                .concat(comblockedfours)
                .concat(humthrees)
                .concat(comthrees)
        }

        // result.sort(function(a, b) { return b.score - a.score })

        //双三很特殊，因为能形成双三的不一定比一个活三强
        if (comtwothrees.length || humtwothrees.length) {
            return result
        }


        // 只返回大于等于活三的棋
        if (onlyThrees) {
            return result
        }


        let twos
        if (role === R.com) twos = comtwos.concat(humtwos)
        else twos = humtwos.concat(comtwos)

        twos.sort(function (a, b) {
            return b.score - a.score
        })
        result = result.concat(twos.length ? twos : neighbors)

        //这种分数低的，就不用全部计算了
        if (result.length > config.countLimit) {
            return result.slice(0, config.countLimit)
        }

        return result
    }

    /**
     * 判断在米子方向上长度为distance，是否有count个邻居
     * 
     * @param {*} x 横坐标
     * @param {*} y 纵坐标
     * @param {*} distance 长度
     * @param {*} count 
     * @returns
     * @memberof Board
     */
    hasNeighbor(x, y, distance, count) {
        let board = this.board
        let len = board.length
        let startX = x - distance
        let endX = x + distance
        let startY = y - distance
        let endY = y + distance
        for (let i = startX; i <= endX; i++) {
            // 超出棋盘的点位不计算在内
            if (i < 0 || i >= len) continue
            for (let j = startY; j <= endY; j++) {
                // 超出棋盘的点位不计算在内
                if (j < 0 || j >= len) continue
                // 目标点不计算在内
                if (i == x && j == y) continue
                if (board[i][j] != R.empty) {
                    count--
                    if (count <= 0) return true
                }
            }
        }
        return false
    }

    toString() {
        return this.board.map(function (d) {
            return d.join(',')
        }).join('\n')
    }
}

let board = new Board()

exports = module.exports = board;