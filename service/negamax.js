const Role = require('./util/role')
const SCORE = require('./util/scores')
const config = require('./util/config')
const board = require('./board')
const math = require('./util/math')
// const statistic = require('./util/statistic')

const MAX = SCORE.FIVE * 10
const MIN = -1 * MAX

let count = 0, //每次思考的节点数
    ABcut = 0, //AB剪枝次数
    cacheCount = 0, //zobrist缓存节点数
    cacheGet = 0 //zobrist缓存命中数量

let Cache = {}

function cache(deep, score) {
    if (!config.cache) return false
    if (score.abcut) return false // 被剪枝的不要缓存哦，因为分数是一个极值
    // 记得clone，因为score在搜索的时候可能会被改的，这里要clone一个新的
    const obj = {
        deep: deep,
        score: {
            score: score.score,
            steps: score.steps,
            step: score.step
        },
        board: board.toString()
    }
    Cache[board.zobrist.code] = obj
    // config.debug && console.log('add cache[' + board.zobrist.code + ']', obj)
    cacheCount++
}

/**
 * 极大极小值搜索
 *
 * @param {*} deep
 * @param {*} alpha
 * @param {*} beta
 * @param {*} role
 * @param {*} step
 * @param {*} steps
 * @param {*} spread
 * @returns
 */
function maxMinSearch(deep, alpha, beta, role, step, steps, spread) {
    config.debug && board.logSteps()
    if (config.cache) {
        let c = Cache[board.zobrist.code]
        if (c) {
            if (c.deep >= deep) { // 如果缓存中的结果搜索深度不比当前小，则结果完全可用
                cacheGet++
                // 记得clone，因为这个分数会在搜索过程中被修改，会使缓存中的值不正确
                return {
                    score: c.score.score,
                    steps: steps,
                    step: step + c.score.step,
                    c: c
                }
            } else {
                // 如果缓存的结果中搜索深度比当前小，那么任何一方出现双三及以上结果的情况下可用
                // TODO: 只有这一个缓存策略是会导致开启缓存后会和以前的结果有一点点区别的，其他几种都是透明的缓存策略
                if (math.greatOrEqualThan(c.score, SCORE.FOUR) || math.littleOrEqualThan(c.score, -SCORE.FOUR)) {
                    cacheGet++
                    return c.score
                }
            }
        }
    }
    // 此处对当前棋盘，针对当前角色进行估分
    let _e = board.evaluate(role)
    /**
     * 考虑到，
     * 若当前棋路造成的棋局，在当前角色方的分数大于等于连五的分数，或者
     * 当前已经遍历到最大深度，
     * 则将此叶子节点信息返回给父节点
     */
    let leaf = {
        score: _e,
        step: step,
        steps: steps
    }
    // 每次思考的节点数+1
    count++
    /**
     * 当搜索到底时，或者
     * 己方分数已经大于连五的分数或对手分数大于连五的分数时
     * 直接返回结果
     * 注意这里是小于0，而不是1，因为本次直接返回结果并没有下一步棋
     */
    if (deep <= 0 || math.greatOrEqualThan(_e, SCORE.FIVE) || math.littleOrEqualThan(_e, -SCORE.FIVE)) {
        return leaf
    }

    let best = {
        score: MIN,
        step: step,
        steps: steps
    }
    /**
     * 双方各下两个子之后，step > 1, 开启star spread 模式
     * 当总棋子数大于10后，仅返回大于等于活三的预选棋子列表，活二与邻居棋子列表忽略不计
     */
    let points = board.gen(role, board.count > 10 ? step > 1 : step > 3, step > 1)
    // 若叶子节点数为0，则返回当前叶子节点信息给父节点
    if (!points.length) return leaf

    config.debug && console.log('points:' + points.map((d) => '[' + d[0] + ',' + d[1] + ']').join(','))
    config.debug && console.log('A~B: ' + alpha + '~' + beta)
    /**
     * 1. 遍历子节点
     * 2. 并将子节点添加进棋盘中，用于叶子节点对棋局进行估分
     */
    for (let i = 0; i < points.length; i++) {
        let p = points[i]
        // 将叶子节点信息添加进棋盘对象
        board.put(p, role)
        // 遍历子节点时，搜索深度减一
        let _deep = deep - 1

        // 冲四延伸判断次数起始值
        let _spread = spread
        /**
         * 冲四延伸判断次数限制为1，判断一次则*_spread++*
         * 超出限制则不进行多余判断
        */
        if (_spread < config.spreadLimit) {
            /**
             * 冲四延伸
             * 若对手在此位置的分数大于等于连五的分数
             * 则增加搜索深度
             */
            if ((role == Role.com && p.scoreHum >= SCORE.FIVE) || (role == Role.hum && p.scoreCom >= SCORE.FIVE)) {
                // _deep = deep+1
                _deep += 2
                _spread++
            }
        }
        // 进行克隆，避免被修改
        let _steps = steps.slice(0)
        // 将当前子节点添加进路径列表中
        _steps.push(p)
        /**
         * 由于评估函数对于对手的评估是负数，
         * 即负得越多，对手优势越大
         * 因此，alpha&beta剪枝的判断范围需要取相反数，并且交换上下限
         * 由于MAX层与MIN层是交替的，
         * 所以可以共用此调用方式
         */
        let v = maxMinSearch(_deep, -beta, -alpha, Role.reverse(role), step + 1, _steps, _spread)
        v.score *= -1
        // 在思考完一条路径之后，需要将此棋子移除，用于思考另一条路径
        board.remove(p)

        /**
         * alpha&beta剪枝
         * 满足条件为  *alpha <= score <= beta* 即为可用路径
         */
        // 注意，这里决定了剪枝时使用的值必须比MAX小
        if (v.score > best.score) {
            best = v
        }
        // 在选取最大下限（alpha）时，由于下限需要不断提高，因此选择较大值作为新的alpha
        alpha = Math.max(best.score, alpha)
        // beta 剪枝
        // 这里不要直接返回原来的值，因为这样上一层会以为就是这个分，实际上这个节点直接剪掉就好了，根本不用考虑，也就是直接给一个很大的值让他被减掉
        // 这样会导致一些差不多的节点都被剪掉，但是没关系，不影响棋力
        // 一定要注意，这里必须是 greatThan 即 明显大于，而不是 greatOrEqualThan 不然会出现很多差不多的有用分支被剪掉，会出现致命错误
        /**
         * 如果当前分数大于最小上限 beta，
         * 即不满足 *score <= beta*
         * 则进行剪枝
         */
        if (math.greatOrEqualThan(v.score, beta)) {
            config.debug && console.log('AB Cut [' + p[0] + ',' + p[1] + ']' + v.score + ' >= ' + beta + '')
            ABcut++
            v.score = MAX - 1 // 被剪枝的，直接用一个极大值来记录，但是注意必须比MAX小
            v.abcut = 1 // 剪枝标记
            // cache(deep, v) // 别缓存被剪枝的，而且，这个返回到上层之后，也注意都不要缓存
            return v
        }
    }

    cache(deep, best)

    //console.log('end: role:' + role + ', deep:' + deep + ', best: ' + best)
    return best
}

/**
 * 负极大值搜索
 * @param {*} candidates 预选棋子的引用
 * @param {*} role 角色
 * @param {*} deep 深度
 * @param {*} alpha *最大下限*，即搜索到的最好值，任何比它更小的值就没用了
 * @param {*} beta *最小上线*，即对于对手来说最坏的值
 * @returns
 */
function negamax(candidates, role, deep, alpha, beta) {
    count = 0
    ABcut = 0 // alpha beta 剪枝数
    board.currentSteps = []

    for (let i = 0; i < candidates.length; i++) {
        // 此时是搜索第一步，将预选棋子作为第一步，添加进棋盘
        let p = candidates[i]
        board.put(p, role)
        let steps = [p]
        /**
         * 这里进行负极大值搜索
         * 由于之前走了第一步
         * 则下一层是对手棋子，分数与alpha、beta取相反数
         */
        let v = maxMinSearch(deep - 1, -beta, -alpha, Role.reverse(role), 1, steps.slice(0), 0)
        v.score *= -1
        alpha = Math.max(alpha, v.score)
        board.remove(p)
        p.v = v

    }

    config.log && console.log('迭代完成,deep=' + deep)
    config.log && console.log(candidates.map(function (d) {
        return '[' + d[0] + ',' + d[1] + ']' +
            ',score:' + d.v.score +
            ',step:' + d.v.step +
            ',steps:' + d.v.steps.join(';') +
            (d.v.c ? ',c:' + [d.v.c.score.steps || []].join(";") : '') +
            (d.v.vct ? (',vct:' + d.v.vct.join(';')) : '') +
            (d.v.vcf ? (',vcf:' + d.v.vcf.join(';')) : '')
    }))
    return alpha
}

/**
 * 迭代加深优化
 * 从2层开始，逐步增加搜索深度，直到找到胜利走法或者达到深度限制为止
 * 比如我们搜索6层深度，那么我们先尝试2层，如果没有找到能赢的走法，再尝试4层，最后尝试6层。
 * 我们只尝试偶数层。因为奇数层其实是电脑比玩家多走了一步，忽视了玩家的防守，并不会额外找到更好的解法。
 * 
 * 因为下棋永远是最快获胜即可，因此完全的深度遍历，再将路径最短的结果选出来，时间耗费太长
 * 所以采用迭代加深，将搜索深度逐渐加深，保证了搜索出来的那个必然是最短路径！
 * *提示：由于每一步棋的下一步棋有几十种可能，因此下一次增加深度的遍历的时间开销远比上一次的多！*
 * *因此就算低深度的搜索重复，也远比一次性搜到底快*
 * @param {*} candidates 启发式评估函数的结果
 * @param {*} role 角色
 * @param {*} deep 搜索深度
 * @returns
 */
function deeping(candidates, role, deep) {
    Cache = {} // 每次开始迭代的时候清空缓存。这里缓存的主要目的是在每一次的时候加快搜索，而不是长期存储。事实证明这样的清空方式对搜索速度的影响非常小（小于10%)
    let bestScore = 0
    /**
     * 层数类似与人脑思考的步数，
     * *若当前是本服务器思考*，
     * *那么第一层即是假想对手走的棋*，
     * *第二层是假想己方走的棋*，
     * *同理得出，偶数层为己方所思考的棋路*
     */
    // 传入的预选棋子列表的引用，在负极大值搜索之后，会赋予路径、分数与是否构成棋形的信息
    for (let i = 2; i <= deep; i += 2) {
        // 拿取到负极大值算法搜索结果分数
        bestScore = negamax(candidates, role, i, MIN, MAX)
        // 若此分数大于连五的分数，则不再搜索
        if (math.greatOrEqualThan(bestScore, SCORE.FIVE))
            break // 能赢了
    }

    // 美化一下
    candidates = candidates.map(function (d) {
        let r = [d[0], d[1]]
        r.score = d.v.score
        r.step = d.v.step
        r.steps = d.v.steps
        if (d.v.vct) r.vct = d.v.vct
        if (d.v.vcf) r.vcf = d.v.vcf
        return r
    })

    // 降序排序
    // 经过测试，这个如果放在上面的for循环中（就是每次迭代都排序），反而由于迭代深度太浅，排序不好反而会降低搜索速度。
    candidates.sort(function (a, b) {
        if (math.equal(a.score, b.score)) {
            // 大于零是优势，尽快获胜，因此取步数短的
            // 小于0是劣势，尽量拖延，因此取步数长的
            if (a.score >= 0) {
                if (a.step !== b.step) return a.step - b.step
                else return b.score - a.score // 否则 选取当前分最高的（直接评分)
            } else {
                if (a.step !== b.step) return b.step - a.step
                else return b.score - a.score // 否则 选取当前分最高的（直接评分)
            }
        } else return (b.score - a.score)
    })

    let result = candidates[0]

    result.min = Math.min.apply(Math, result.steps.map(d => d.score))
    config.log && console.log("选择节点：" + candidates[0] + ", 分数:" + result.score.toFixed(3) + ", 步数:" + result.step + ', 最小值：' + result.min)
    config.log && console.log('搜索节点数:' + count + ',AB剪枝次数:' + ABcut)
    config.log && console.log('搜索缓存:' + '总数 ' + cacheCount + ', 命中率 ' + (cacheGet / cacheCount * 100).toFixed(3) + '%, ' + cacheGet + '/' + cacheCount)
    //注意，减掉的节点数实际远远不止 ABcut 个，因为减掉的节点的子节点都没算进去。实际 4W个节点的时候，剪掉了大概 16W个节点
    config.log && console.log('当前统计：' + count + '个节点,NPS:' + Math.floor(count / time) + 'N/S')
    board.log()
    // config.log && console.log("===============统计表===============")
    // config.debug && statistic.print(candidates)

    return result
}

function deepAll(role, deep) {
    role = role || Role.com
    deep = deep === undefined ? config.searchDeep : deep
    const candidates = board.gen(role)
    return deeping(candidates, role, deep)
}

exports = module.exports = deepAll