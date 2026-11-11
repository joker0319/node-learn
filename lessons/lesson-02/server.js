// ============================================================
// 第 2 课：POST 请求 + JSON，写出一个真正的 TODO 接口
// 运行：npm run l2（根目录）或 node --watch lessons/lesson-02/server.js
// 测试：浏览器只能发 GET，所以要用 curl 或 VS Code 的 .http 插件发 POST
//   curl -X POST http://localhost:3100/todos -H "Content-Type: application/json" -d '{"text":"学 Node"}'
//   curl http://localhost:3100/todos
// ============================================================

const http = require('http')

// ---------- 内存数据库 ----------
// 数据存在这个数组里（在内存中，进程一停就没了——第 3 课用 fs 存盘解决）
// 每个 todo 长这样：{ id: 1, text: '学 Node', done: false }
let todos = []
let nextId = 1

// ---------- 工具函数 ----------
// 三个路由都要"返回 JSON"，重复三次没意义，抽成一个函数。
// 以后写接口你都会用到这个模式：设置状态码 + Content-Type + JSON.stringify
function sendJSON(res, statusCode, data) {
  res.writeHead(statusCode, { 'Content-Type': 'application/json; charset=utf-8' })
  // 对象不能直接变成网络传输的内容，必须先 JSON.stringify 转成字符串
  res.end(JSON.stringify(data))
}

// ---------- 读取请求体 ----------
// 这是本课最重要的知识点！
//
// 第 1 课的 GET 请求没有"请求体"，但 POST 会把数据（比如一个 JSON）放在请求体里。
// 关键问题：请求体不是一次性给你的，而是一段一段（chunk）到达的——
// 就像水龙头放水，浏览器发多快、网络怎么分包，服务器无法控制。
//
// 所以 Node 的做法：req 本身是一个"可读流"（stream），
// 它会触发两种事件：
//   'data' 事件：每到达一段数据就触发一次，参数 chunk 是二进制数据（Buffer）
//   'end' 事件：数据全部到齐时触发一次，之后才能安全地解析
//
// 想象成：data 事件 = 不断往篮子里装水果，end 事件 = 篮子装满了可以吃了
function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = []
    req.on('data', (chunk) => chunks.push(chunk))
    req.on('end', () => {
      // Buffer.concat 把所有二进制段拼成一段，toString('utf8') 转成字符串
      resolve(Buffer.concat(chunks).toString('utf8'))
    })
    req.on('error', reject) // 网络出问题时走这里
  })
}

// ---------- 路由处理 ----------
async function handleRequest(req, res) {
  console.log(`收到请求：${req.method} ${req.url}`)

  // ---------------- GET /todos：查询所有 ----------------
  if (req.method === 'GET' && req.url === '/todos') {
    // 注意：这次先判断"方法 + 路径"两个条件。
    // 因为同一个路径 /todos 可以有不同的方法：GET 查、POST 建、DELETE 删。
    // 这就是 RESTful 风格的雏形：用 HTTP 方法表达"对资源做什么操作"。
    return sendJSON(res, 200, todos)
  }

  // ---------------- POST /todos：新建一条 ----------------
  if (req.method === 'POST' && req.url === '/todos') {
    // ① 先把请求体读完（异步！所以要 await）
    const body = await readBody(req)

    // ② 尝试把 JSON 字符串解析成 JS 对象
    //    客户端可能发来乱七八糟的内容（不是合法 JSON），必须防御性处理
    let data
    try {
      data = JSON.parse(body)
    } catch {
      // 解析失败 → 400 Bad Request："你发的东西我看不懂"
      return sendJSON(res, 400, { error: '请求体不是合法的 JSON' })
    }

    // ③ 校验业务字段：接口要"守住大门"，不能什么数据都收
    if (!data.text || typeof data.text !== 'string') {
      return sendJSON(res, 400, { error: '缺少 text 字段（必须是非空字符串）' })
    }

    // ④ 创建 todo 并存入"数据库"
    const todo = { id: nextId++, text: data.text, done: false }
    todos.push(todo)

    // ⑤ 返回 201 Created（"新建成功"的状态码，比 200 更精确）
    return sendJSON(res, 201, todo)
  }

  // ---------------- DELETE /todos/:id ----------------
  if (req.method === 'DELETE' && req.url.startsWith('/todos/')) {
    // ① 从路径里取出 id：split('/') 切成 ['', 'todos', '2']，取第 3 段
    const id = Number(req.url.split('/')[2])
    const index = todos.findIndex((t) => t.id === id) // 找到要删的 todo 在数组里的位置
    if (index === -1) {
      return sendJSON(res, 404, { error: `找不到 id=${id} 的 todo` })
    }
    todos.splice(index, 1) // 删除数组里的那一项
    res.writeHead(204) // 204 No Content：成功但没内容返回
    return res.end()
  }

  // ---------------- PUT /todos/:id ----------------
  if (req.method === 'PUT' && req.url.startsWith('/todos/')) {
    // ① 从路径里取出 id
    const id = Number(req.url.split('/')[2])
    const todo = todos.find((t) => t.id === id) // 找到要改的 todo，返回对象本身
    if (!todo) {
      return sendJSON(res, 404, { error: `找不到 id=${id} 的 todo` })
    }

    // ② 读请求体并解析 JSON
    const body = await readBody(req)
    let data
    try {
      data = JSON.parse(body)
    } catch {
      return sendJSON(res, 400, { error: '请求体不是合法的 JSON' })
    }

    // ③ 校验字段类型：不校验的话发 {} 会把 done 改成 undefined（字段直接从 JSON 里消失）
    if (typeof data.done !== 'boolean') {
      return sendJSON(res, 400, { error: 'done 必须是布尔值' })
    }

    todo.done = data.done // 更新 done 字段
    return sendJSON(res, 200, todo)
  }


  // ---------------- GET /：首页说明 ----------------
  if (req.url === '/') {
    return sendJSON(res, 200, {
      message: 'TODO API',
      usage: 'GET /todos 查询 | POST /todos 新建（body: {"text":"..."})',
    })
  }

  // ---------------- 都没匹配 → 404 ----------------
  return sendJSON(res, 404, { error: `找不到路由 ${req.method} ${req.url}` })
}

// ---------- 启动服务器 ----------
const server = http.createServer((req, res) => {
  // handleRequest 是 async 函数（里面有 await），
  // 如果它内部抛错（比如 await readBody 被拒绝），会变成一个未捕获的 Promise 异常。
  // 不 catch 的话进程可能直接崩掉。所以在这里统一兜底，返回 500。
  handleRequest(req, res).catch((err) => {
    console.error('服务器内部错误：', err)
    sendJSON(res, 500, { error: '服务器内部错误' })
  })
})

const PORT = process.env.PORT || 3100
server.listen(PORT, () => {
  console.log(`TODO API 已启动：http://localhost:${PORT}`)
  console.log('测试命令：')
  console.log(`  curl http://localhost:${PORT}/todos`)
  console.log(`  curl -X POST http://localhost:${PORT}/todos -H "Content-Type: application/json" -d '{"text":"学 Node"}'`)
})
