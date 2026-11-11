// ============================================================
// 第 1 课：你的第一个 Node 后端服务器（纯 http 模块，不用框架）
// 运行方式：node lessons/lesson-01/server.js
// 或者在本仓库根目录执行：npm run l1
// 跑起来后浏览器打开 http://localhost:3000
// ============================================================

// ① 引入 Node 内置的 http 模块
// Node 自带很多"内置模块"（不用 npm install），http 是其中之一。
// require 是 CommonJS 的模块引入语法（Node 传统方式），
// 对应前端 ES Module 的 import，效果类似：import http from 'http'
const http = require('http')

// ② 定义"收到请求时怎么办"的处理函数
// 每次有人访问你的服务器，Node 就会调用这个函数一次，并传入两个对象：
//   req  = request  请求对象：里面是"对方想要什么"（路径、方法、请求头、请求体）
//   res  = response 响应对象：你往里面写的东西，最终会被发回给对方
function handleRequest(req, res) {
  // req.url 是请求的路径，比如访问 http://localhost:3000/about 时它是 '/about'
  // req.method 是请求方法：GET / POST / PUT / DELETE ...
  console.log(`收到请求：${req.method} ${req.url}`)

  // 路由表：加新路由只需要在对象里加一行。
  // Express 的 app.get('/', handler) 本质就是这个对象的封装。
  const routes = {
    '/': () => res.end('这是首页'),
    '/about': () => res.end('这是关于页'),
    '/time': () => res.end(`当前时间：${new Date().toLocaleString()}`),
  }
  const handler = routes[req.url]

  if (handler) {
    // 统一设置状态码和响应头：200 = 成功
    // Content-Type 告诉浏览器"我返回的是纯文本"
    res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8' })
    handler()
  } else {
    // 都没匹配上 → 404
    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' })
    res.end('404 页面不存在')
  }
}

// ③ 创建服务器实例，把处理函数交给它
// 注意：到这一步服务器还没启动，只是"造好了"
const server = http.createServer(handleRequest)
// ④ 启动监听
// listen 让 Node 占住 3000 端口，开始接客。
// 服务器的本质就是：一个一直运行、监听端口、处理请求的程序。
// 回调函数在"成功开始监听"后执行一次，适合打日志。
// 端口的行业惯例写法：优先读环境变量 PORT，没有就用 3000 兜底（Node 世界的惯例端口）。
// 用法：PORT=4000 node server.js
// 为什么不写死？部署到服务器/云平台时，平台会通过环境变量告诉你"用哪个端口"。
const PORT = process.env.PORT || 3000
server.listen(PORT, () => {
  console.log(`服务器已启动：http://localhost:${PORT}`)
  // 按 Ctrl + C 可以停掉服务器
})
