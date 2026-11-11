# 第 2 课笔记：POST + JSON —— 后端"接数据、验数据、回数据"

## 本课核心：三个新概念

### 1. 请求体是一段一段到达的（流）

第 1 课 GET 请求只有 header，第 2 课 POST 有 body，而 body **不是一次性到达**的：

```
浏览器发数据 ──→ [chunk1] [chunk2] [chunk3] ──→ 服务器收齐才算完
```

所以 `req` 是一个可读流，你要监听两个事件：

```js
req.on('data', (chunk) => chunks.push(chunk))  // 每段到达时装进篮子
req.on('end', () => { /* 全部到齐，可以解析了 */ })
```

**为什么 Node 要这么设计？** 因为网络传输本来就是不连续的。如果给你"一次性拿到完整 body"的假象，Node 就得在内存里偷偷攒数据——对大文件（比如上传 1GB 视频）会把内存撑爆。流的模式逼你面对真实世界，这是 Node 性能好的根本原因之一。

**为什么不直接 `req.body`？** 这正是 Express 存在的意义之一：`app.use(express.json())` 中间件帮你把上面那套 data/end 拼装逻辑封装掉了。你手写过一次，以后用 Express 时才知道它在帮你干嘛。

### 2. JSON 是前后端的"普通话"

前端发：`JSON.stringify(obj)` → 字符串 → 网络传输 → 后端 `JSON.parse(str)` → 对象。
后端返回：`JSON.stringify(data)` → 字符串 → 前端 `response.json()` 自动解析。

配套的 HTTP 约定：
- 请求头 `Content-Type: application/json` 告诉服务器"我发的是 JSON"
- 响应头 `Content-Type: application/json; charset=utf-8` 告诉浏览器"我回的是 JSON"

### 3. 状态码是接口的"表情"

| 状态码 | 含义 | 什么时候用 |
|---|---|---|
| 200 | 成功 | 查询成功 |
| 201 | Created | **新建**资源成功（比 200 更精确） |
| 400 | Bad Request | 客户端发的数据有问题（JSON 不合法、字段缺失） |
| 404 | Not Found | 路由不存在 |
| 500 | Internal Server Error | 服务器自己的锅 |

**面试常问：400 和 500 的区别？** 400 是客户端的错（先改你的请求），500 是服务端的错（查服务器日志）。

## 本课代码的防护逻辑（真实接口的标准动作）

POST /todos 处理流程，每一步都可能"退货"：

```
读 body → JSON.parse 失败？→ 400
        → text 字段缺失/类型不对？→ 400
        → 都通过 → 存库 → 201 返回新数据
```

记住这个顺序：**解析 → 校验 → 业务 → 响应**。第 4 课 Express 的"校验中间件"就是把第②步抽出来复用。

## RESTful 一句话入门

用 URL 表示资源，用 HTTP 方法表示操作：

```
GET    /todos   → 列表（读）
POST   /todos   → 新建（增）
PUT    /todos/3 → 更新 id=3（改，第 3 课加）
DELETE /todos/3 → 删除 id=3（删，作业里做）
```

同一个 `/todos` 路径，方法不同含义不同——所以代码里要先判断 `req.method` 再判断 `req.url`。

## 动手作业

1. **加 DELETE**：`DELETE /todos/2` 删除 id=2 的条目。提示：路径不再固定，需要用 `req.url.startsWith('/todos/')` + `split('/')[2]` 取出 id；找不到 id 返回 404。成功可以用状态码 204（No Content，没有响应体）。
2. **加 PUT**：`PUT /todos/2` + body `{"done": true}` 切换完成状态。
3. **故意发坏数据**，观察防护逻辑：
   ```bash
   curl -X POST http://localhost:3100/todos -d '这不是json'
   curl -X POST http://localhost:3100/todos -H "Content-Type: application/json" -d '{}'
   ```
   各返回什么状态码？为什么？

## 面试衔接

- **问：POST 请求体为什么不能同步读取？** 答：请求体通过网络分包异步到达，Node 以流的形式暴露，必须监听 data/end 事件拼装。
- **问：JSON.parse 失败会怎样？** 答：抛 SyntaxError，所以接口必须 try/catch 并返回 400，否则走到 500 或崩溃。
- **问：204 和 200 的区别？** 答：204 表示成功且无响应体，常用于 DELETE；200 必须有响应体。
