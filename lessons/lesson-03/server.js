// ============================================================
// 第 3 课：用 fs 做持久化——重启不丢数据
// 运行：npm run l3
// 数据文件：lessons/lesson-03/data/todos.json
// 测试：建几条 todo → 按 Ctrl+C 停掉 → 重新启动 → 数据还在
// ============================================================

const http = require('http')
// fs 同时提供"同步"和"异步"两套 API，本课会对比着用：
//   fs        → 同步版 readFileSync / writeFileSync（会阻塞主线程）
//   fs/promises → 异步版 readFile / writeFile（返回 Promise，配合 await）
const fs = require('fs')
const fsp = require('fs/promises')
const path = require('path')

// __dirname 是"当前文件所在目录"的绝对路径（CommonJS 内置变量）
// 为什么必须拼绝对路径？因为 node 命令在哪个目录执行是不确定的，
// 用相对路径 'data/todos.json' 会以"启动时的工作目录"为基准，换个目录跑就找不到了。
const DATA_DIR = path.join(__dirname, 'data')
const DATA_FILE = path.join(DATA_DIR, 'todos.json')

// ---------- 工具函数 ----------
function sendJSON(res, statusCode, data) {
  res.writeHead(statusCode, { 'Content-Type': 'application/json; charset=utf-8' })
  res.end(JSON.stringify(data))
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = []
    req.on('data', (chunk) => chunks.push(chunk))
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')))
    req.on('error', reject)
  })
}

// ---------- 存储层：本课新增 ----------
// 为什么单独抽出来？因为"数据怎么存"和"接口怎么写"是两件事。
// 第 5 课换 SQLite 时，只改这两个函数，路由逻辑一行都不用动。
// 这叫"把易变的实现藏在稳定的接口后面"，是后端分层的基本意识。

// 启动时读一次（同步版，见 NOTES 为什么这里可以用同步）
function loadTodos() {
  try {
    // ensureDir：文件或目录不存在时先创建，否则第一次写入会报 ENOENT
    fs.mkdirSync(DATA_DIR, { recursive: true })
    const raw = fs.readFileSync(DATA_FILE, 'utf8')
    return JSON.parse(raw)
  } catch (err) {
    // 文件不存在 / 内容坏掉 → 从空数组开始，不让程序起不来
    console.warn('读取数据失败，从空数据开始：', err.message)
    return []
  }
}

// 每次改动后写回磁盘（异步版，见 NOTES 为什么这里必须用异步）
async function saveTodos(list) {
  // JSON.stringify 第三个参数 2 = 缩进 2 空格，让文件人能读懂（方便 debug）
  const content = JSON.stringify(list, null, 2)
  await fsp.writeFile(DATA_FILE, content, 'utf8')
}

// ---------- 初始化数据 ----------
let todos = loadTodos()
// nextId 不能再用 1 开始了，否则重启后新建的 todo 会和旧数据 id 撞车。
// 从已有数据里算最大 id + 1。
let nextId = todos.reduce((max, t) => Math.max(max, t.id), 0) + 1

console.log(`已加载 ${todos.length} 条数据，下一个 id = ${nextId}`)

// ---------- 路由 ----------
async function handleRequest(req, res) {
  console.log(`收到请求：${req.method} ${req.url}`)

  // GET /todos
  if (req.method === 'GET' && req.url === '/todos') {
    return sendJSON(res, 200, todos)
  }

  // POST /todos
  if (req.method === 'POST' && req.url === '/todos') {
    const body = await readBody(req)
    let data
    try {
      data = JSON.parse(body)
    } catch {
      return sendJSON(res, 400, { error: '请求体不是合法的 JSON' })
    }
    if (!data.text || typeof data.text !== 'string') {
      return sendJSON(res, 400, { error: '缺少 text 字段（必须是非空字符串）' })
    }

    const todo = { id: nextId++, text: data.text, done: false }
    todos.push(todo)

    // 关键的一行：改完内存后，立刻落盘。不写这行，重启就丢。
    await saveTodos(todos)

    return sendJSON(res, 201, todo)
  }

  // DELETE /todos/:id
  if (req.method === 'DELETE' && req.url.startsWith('/todos/')) {
    const id = Number(req.url.split('/')[2])
    const index = todos.findIndex((t) => t.id === id)
    if (index === -1) {
      return sendJSON(res, 404, { error: `找不到 id=${id} 的 todo` })
    }
    todos.splice(index, 1)
    await saveTodos(todos) // 删除也要落盘
    res.writeHead(204)
    return res.end()
  }

  // PUT /todos/:id
  if (req.method === 'PUT' && req.url.startsWith('/todos/')) {
    const id = Number(req.url.split('/')[2])
    const todo = todos.find((t) => t.id === id)
    if (!todo) {
      return sendJSON(res, 404, { error: `找不到 id=${id} 的 todo` })
    }

    const body = await readBody(req)
    let data
    try {
      data = JSON.parse(body)
    } catch {
      return sendJSON(res, 400, { error: '请求体不是合法的 JSON' })
    }
    if (typeof data.done !== 'boolean') {
      return sendJSON(res, 400, { error: 'done 必须是布尔值' })
    }

    todo.done = data.done
    await saveTodos(todos) // 修改也要落盘
    return sendJSON(res, 200, todo)
  }

  // 首页说明
  if (req.url === '/') {
    return sendJSON(res, 200, {
      message: 'TODO API（带持久化）',
      count: todos.length,
      dataFile: 'lessons/lesson-03/data/todos.json',
      usage: 'GET /todos 查询 | POST /todos 新建 | PUT /todos/:id 改 | DELETE /todos/:id 删',
    })
  }

  return sendJSON(res, 404, { error: `找不到路由 ${req.method} ${req.url}` })
}

// ---------- 启动 ----------
const server = http.createServer((req, res) => {
  handleRequest(req, res).catch((err) => {
    console.error('服务器内部错误：', err)
    sendJSON(res, 500, { error: '服务器内部错误' })
  })
})

const PORT = process.env.PORT || 3300
server.listen(PORT, () => {
  console.log(`TODO API 已启动：http://localhost:${PORT}`)
  console.log('试一试：建几条数据 → Ctrl+C 停掉 → 重新启动 → 数据还在')
})
