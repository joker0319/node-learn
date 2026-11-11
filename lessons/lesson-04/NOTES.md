# 第 4 课笔记：Express 把什么变简单了

## 一、同样是 TODO API，三代代码对比

| 版本 | 行数 | 你要自己做的事 |
|---|---|---|
| 第 2 课（原生） | 161 | 方法/路径全等匹配、手写 readBody、手拼 `split('/')[2]`、手写 404 |
| 第 3 课（原生 + fs） | 164 | 同上 + 手动落盘、手动算 nextId |
| **第 4 课（Express）** | **129** | 只写业务逻辑 |

**重点不是少了 30 行，而是少了"仪式感代码"**：路由声明、请求体解析、路径参数、错误兜底，全部由框架接管。剩下的 129 行里，几乎每一行都在表达业务意图。

## 二、Express 帮你做的四件事（一条条对上你手写过的代码）

| 你手写的 | Express 的等价物 |
|---|---|
| `if (req.method === 'GET' && req.url === '/todos')` | `app.get('/todos', handler)` |
| `readBody()` 监听 data/end 拼 Buffer | `app.use(express.json())` |
| `Number(req.url.split('/')[2])` | `req.params.id` |
| `sendJSON(res, 200, data)` | `res.json(data)` |
| `handleRequest(...).catch(...)` | `app.use((err, req, res, next) => {})` |
| 末尾的 404 分支 | `app.use((req, res) => ...)` 放在最后 |

**结论：框架不是魔法，是把"每个请求都要走一遍的固定流程"抽象成了可组合的函数。** 你现在能看懂 NestJS 的 `@Controller` / `@Get` 装饰器了——本质就是 `app.get` 的声明式写法。

## 三、中间件：本课唯一的新概念

```js
app.use((req, res, next) => {
  // 请求进来时做的事
  next()          // 交给下一个中间件/路由
})
```

### 执行顺序是"洋葱"，不是"列表"

```
请求 → 中间件A 前半 → 中间件B 前半 → 路由 → 中间件B 后半 → 中间件A 后半 → 响应
```

代码里能体现"后半"的写法是监听 `res.on('finish')`——本课的日志中间件就是这么拿到耗时的。

### 三个必须记住的规则

1. **不调 `next()` 请求就卡死**。忘了 next 是新手最经典的 bug，现象是：请求一直 pending，浏览器转圈。
2. **`app.use` 的顺序就是执行顺序**。`express.json()` 必须放在会读 `req.body` 的路由**之前**，否则 `req.body` 是 undefined。
3. **路径前缀匹配**。`app.use('/api', mw)` 只对 `/api/*` 生效，这就是 NestJS 里 `app.useGlobalPipes()` 和模块级中间件的来源。

### 中间件能干什么（真实项目里的用途）

- 鉴权（解析 token，往 `req.user` 上挂用户信息）
- 日志 / 链路追踪（本课的耗时统计）
- 限流、CORS、压缩、请求体大小限制
- 统一错误处理（4 个参数的那个）

## 四、两个版本差异的细节

**1. Express 5 的 async 路由会自动转发错误**

Express 5 里，`async (req, res) => { throw ... }` 会被自动捕获交给错误中间件；Express 4 时代必须自己 `try/catch` 或包一层。这就是为什么第 2 课你手写了 `handleRequest(...).catch()`。

**2. `res.status(204).end()` 依然要 `end()`**

`res.json()` 内部已经调了 end，但 204 没有响应体，所以必须显式 `end()`。

## 五、动手作业

1. 把日志中间件改成"只记录慢请求"（耗时 > 50ms 才打印）。
2. 加一个中间件，给每个响应加 `X-Response-Time` 头（提示：`res.setHeader`）。
3. 故意把 `express.json()` 移到路由**后面**，用 POST 试试，观察 `req.body` 变成什么，理解顺序的重要性。
4. 思考题：既然 Express 这么方便，为什么第 2、3 课还要手写？——因为面试问"中间件原理"时，答"就是 `(req,res,next)` 组成的数组依次执行"和答"我不知道，反正 `app.use` 就行"，是两个段位。

## 六、面试衔接

- **问：中间件是什么？** 答：一个 `(req, res, next)` 函数，按注册顺序组成执行链；调用 next 进入下一个，不调用则请求终止。错误中间件靠 4 个参数识别。
- **问：express.json() 做了什么？** 答：监听请求流的 data/end，拼接 Buffer，按 Content-Type 解析成对象挂到 `req.body`；同时有大小限制。
- **问：为什么 404 中间件要放最后？** 答：中间件按顺序执行，只有前面的路由都没匹配上，才会走到它。
- **问：Express 和 NestJS 的关系？** 答：NestJS 默认用 Express 作为 HTTP 适配器（也可换 Fastify），装饰器语法在启动时转换成路由注册，底层仍是同一套中间件模型。
