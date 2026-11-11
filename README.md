# node-learn：Node.js 后端学习仓库

从零开始学 Node 后端。每课一个文件夹：**代码（带逐行注释）+ NOTES.md（原理讲解 + 作业）**。

仓库地址：https://github.com/joker0319/node-learn

环境：Node v22.22.2

## 学习路线

> 定位：目标岗位是前端 / AI 产品前端，Node 只需“能读懂、能改后端”，不追求后端深度。
> 因此第 1~4 课是主线，第 5~7 课改为**按需查阅**——真正遇到问题再回来学，不用按顺序刷完。

| 课 | 主题 | 状态 |
|----|------|------|
| 01 | 纯 http 模块手写服务器（路由、请求响应） | ✅ 已完成 |
| 02 | 原生 http 处理 POST / JSON（完整 TODO 接口） | ✅ 已完成 |
| 03 | fs 文件系统：数据真正存起来 | ✅ 已完成 |
| 04 | Express 重写：路由 + 中间件（**看清框架做了什么**） | ✅ 已建好，待你跑一遍 |
| 05 | 数据库：SQLite + 增删改查 | 按需（做后端/BFF 时再看） |
| 06 | 事件循环 / 异步原理 | 按需——**改到前端线学**，浏览器与 Node 同一套模型，只学一遍 |
| 07 | 登录鉴权 JWT、错误处理、CORS | 按需（做完整产品时再看） |

### 后续按需查阅的知识点

- **Stream / SSE**：改 MiraFrame 的流式推送时会用到（`res.write()` 就是流）
- **进程模型 / Redis pub/sub**：worker 与 web 进程之间传进度时用到
- **异步错误处理**：`async` 处理函数必须 catch，否则进程崩

## 怎么学

1. 看当前课的代码（每行都有注释）
2. 跑起来：`npm run l1`（数字对应课号）
3. 读 NOTES.md，完成文末的 3 个动手作业
4. 完成一课，把状态列改成 ✅，再开始下一课

## 目录结构

```
node-learn/
├── package.json        # npm run l1 快捷启动
├── README.md
└── lessons/
    ├── lesson-01/
    │   ├── server.js   # 本课代码
    │   └── NOTES.md    # 本课讲解 + 作业
    └── lesson-02/
        ├── server.js
        └── NOTES.md
```

## 每学完一课怎么提交

```bash
git add -A
git commit -m "第 3 课：fs 持久化"
git push
```

或者在 VS Code 左侧「源代码管理」面板：填消息 → 提交 → 同步更改。

