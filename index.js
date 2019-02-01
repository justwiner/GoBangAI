const {IThink} = require('./service/index')
const express = require('express')
const app = express()

app.use(express.json())
app.use(express.urlencoded({extended: false}))

/*
  跨域配置：响应头允许跨域
*/
app.all('*', (req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'PUT, GET, POST, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'X-Requested-With,content-type,x-access-token');
    if(req.method=="OPTIONS") res.sendStatus(200);
    else next();
  })

const json = {
    code: 200,
    msg: '请求成功'
}

app.get("/", function (req, res) {
    res.send(json)
})

// 定义五子棋AI请求路径
app.post("/game", function (req, res) {
    /**
     * IThink - 五子棋AI主方法
     * 返回值为计算的落子结果
     */
    res.send(IThink(req.body))
})

// 定义服务器端口
app.listen(5438, function () {
    console.log("启动服务 http://localhost:5438 ")
})