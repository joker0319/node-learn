// ============================================================
// 第 4 课：用 Express 重写同一个 TODO API
// 运行：npm run l4
// 对比看：lessons/lesson-02/server.js（原生 http，约 155 行）
//        lessons/lesson-03/server.js（原生 + 持久化，约 170 行）
//        本文件（Express + 持久化，约 110 行）
// 目的不是学 Express 的 API，而是看清"框架到底替你做了哪些事"
// ============================================================

const express = require('express')
const fs = require('fs')
const fsp = require('fs/promises')
const path = require('path')

const app = express()

// ---------- 存储层（和第 3 课一样，只是复用了同一套思路）----------
const DATA_DIR = path.join(__dirname, 'data')
const DATA_FILE = path.join(DATA_DIR, 'todos.json')

function loadTodos() {
  try {
    fs.mkdirSync(DATA_DIR, { recursive: true })
    return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'))
  } catch {
    return []
  }
}

async function saveTodos(list) {
  await fsp.writeFile(DATA_FILE, JSON.stringify(list, null, 2), 'utf8')
}

let todos = loadTodos()
let nextId = todos.reduce((max, t) => Math.max(max, t.id), 0) + 1

// ---------- 中间件：本课唯一需要真正理解的新概念 ----------
// 中间件 = 一个 (req, res, next) 函数，在请求到达路由之前（或之后）执行。
// 它可以：改 req/res、直接结束响应、或者调用 next() 交给下一个中间件。
//
// 你在第 2 课手写的 readBody（监听 data/end 拼 chunks 再 JSON.parse）
// 就是下面这一行的全部内容：
app.use(express.json())

// 自定义中间件：请求日志 + 耗时统计
// 这类"每个请求都要做一遍"的事，就是中间件的典型用途（鉴权、限流、CORS 同理）
app.use((req, res, next) => {
  const start = Date.now()
  // 'finish' 事件在响应真正发出去之后触发，所以能拿到准确耗时
  res.on('finish', () => {
    console.log(`${req.method} ${req.url} → ${res.statusCode} (${Date.now() - start}ms)`)
  })
  next() // 关键：不调用 next() 请求就会卡在这里（永远不返回）
})

// ---------- 路由 ----------
// 对比第 2 课：那边的 if (req.method === 'GET' && req.url === '/todos')
// 在这里变成了声明式的一行 app.get('/todos') —— 方法 + 路径，一眼看清

app.get('/todos', (req, res) => {
  res.json(todos) // res.json() = writeHead + Content-Type + JSON.stringify，三合一
})

app.post('/todos', async (req, res) => {
  // 注意：不用再 await readBody，express.json() 已经把结果放进 req.body
  const { text } = req.body

  if (!text || typeof text !== 'string') {
    // res.status(400).json(...) 就是第 2 课的 sendJSON(res, 400, ...)
    return res.status(400).json({ error: '缺少 text 字段（必须是非空字符串）' })
  }

  const todo = { id: nextId++, text, done: false }
  todos.push(todo)
  await saveTodos(todos)
  res.status(201).json(todo)
})

// 动态路由：:id 是路径参数，Express 自动解析到 req.params.id
// 对比第 3 课：Number(req.url.split('/')[2]) —— 手写解析，还容易写错（你的 slice bug）
app.put('/todos/:id', async (req, res) => {
  const id = Number(req.params.id)
  const todo = todos.find((t) => t.id === id)
  if (!todo) {
    return res.status(404).json({ error: `找不到 id=${id} 的 todo` })
  }

  if (typeof req.body.done !== 'boolean') {
    return res.status(400).json({ error: 'done 必须是布尔值' })
  }

  todo.done = req.body.done
  await saveTodos(todos)
  res.json(todo)
})

app.delete('/todos/:id', async (req, res) => {
  const id = Number(req.params.id)
  const index = todos.findIndex((t) => t.id === id)
  if (index === -1) {
    return res.status(404).json({ error: `找不到 id=${id} 的 todo` })
  }
  todos.splice(index, 1)
  await saveTodos(todos)
  res.status(204).end() // 204 依然要 end()，只是不带内容
})

// ---------- 兜底 404 ----------
// 放在所有路由之后：能走到这里的请求，说明前面都没匹配上
app.use((req, res) => {
  res.status(404).json({ error: `找不到路由 ${req.method} ${req.url}` })
})

// ---------- 统一错误处理 ----------
// 注意：错误中间件必须写 4 个参数 (err, req, res, next)，参数个数是 Express 识别它的唯一方式。
// 作用等价于第 2 课那个 handleRequest(...).catch()，但由框架统一接管：
// 任何路由里抛错、或 async 函数返回 rejected Promise，都会自动跳到这里。
app.use((err, req, res, next) => {
  console.error('服务器内部错误：', err)
  res.status(500).json({ error: '服务器内部错误' })
})

// ---------- 启动 ----------
// app.listen 内部就是 http.createServer(app).listen()，这一点没变
const PORT = process.env.PORT || 3400
app.listen(PORT, () => {
  console.log(`Express TODO API 已启动：http://localhost:${PORT}`)
  console.log('试试：curl localhost:3400/todos')
})
