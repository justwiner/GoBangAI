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

app.post("/game", function (req, res) {
    console.log(req.body)
    res.send(json)
})

app.listen(5438, function () {
    console.log("启动服务 http://localhost:5438 ")
})