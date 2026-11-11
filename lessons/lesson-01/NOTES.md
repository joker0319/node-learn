# 第 1 课笔记：http 服务器是怎么工作的

## 一句话总结

> 后端服务器的本质：**一个一直运行的程序，监听某个端口，收到请求 → 处理 → 返回响应**。
> Express、NestJS 都只是把这三步封装得更顺手，底层全是这个 http 模块。

## 逐行原理讲解

### 1. `require('http')`

- Node 和浏览器最大的区别：浏览器没有能力"监听端口"，Node 有，因为 Node 跑在你的机器/服务器上，而不在浏览器沙箱里。
- 内置模块不用 `npm install`，Node 安装时就已经带好了。常用的内置模块：`http`、`fs`（文件）、`path`（路径）、`crypto`（加密）。

### 2. `handleRequest(req, res)`

- 这里的关键是理解 `req` 和 `res` 不是"数据"，而是**带方法的对象**：
  - `req`：你能从中**读**信息 —— `req.url`、`req.method`、`req.headers`
  - `res`：你能往里面**写**信息 —— `res.writeHead()`、`res.end()`
- Node 是**事件驱动**的：这个函数不是你自己调用的，而是"有请求来了"这个事件发生时被调用。没请求时它就不跑，Node 进程空着等。

### 3. `res.writeHead(200, {...})` 和 `res.end()`

- `writeHead` = 写 HTTP 响应的"信封"：状态码 + 响应头。
- `res.end(...)` = 把内容装进信封寄出去。**必须调用 end，否则浏览器会一直转圈等**（因为连接没有结束）。
- 为什么要设 `Content-Type`？浏览器靠它决定怎么解析内容。写 JSON 时会改成 `application/json`，这是第 2 课的内容。

### 4. `server.listen(3000)`

- "端口"可以理解为服务器大楼上的房间号。一台机器一个 IP，靠端口区分不同的服务。
- 端口被占用会报错 `EADDRINUSE` —— 说明有别的程序占了这个房间。

## 与浏览器前端的对照表

| 前端（你熟悉的） | Node 后端（对应的） |
|---|---|
| `import` | `require`（CJS）或 `import`（ESM） |
| `fetch()` 发请求 | `req` 接收请求 |
| 渲染 DOM 响应用户点击 | `res.end()` 响应 HTTP 请求 |
| 事件监听 `addEventListener('click')` | `http.createServer(handleRequest)` |
| 页面常驻内存 | 进程常驻内存，`listen` 后不会退出 |

## 动手作业（改代码验证，比看十遍有用）

1. 加一个 `/time` 路由，返回当前时间（提示：`new Date().toLocaleString()`）。
2. 把端口改成 4000，重启后验证访问地址变化；再改回 3000 但**不重启旧进程**，看看 `EADDRINUSE` 报错长什么样。
3. 在 `handleRequest` 开头加 `console.log(req.headers)`，用浏览器访问，观察终端输出了什么。

## 面试衔接

- **问：Node 为什么适合做后端？** 答：事件驱动 + 非阻塞 IO，单线程就能扛大量 IO 密集请求（细节在第 6 课事件循环展开）。
- **问：`req` 和 `res` 是什么？** 答：分别是可读流（IncomingMessage）和可写流（ServerResponse）—— "流"的概念在 Stream 课展开，这里先记住名字。
