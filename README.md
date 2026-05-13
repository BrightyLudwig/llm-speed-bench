# LLM Speed Bench

公开大模型 API 性能测速与排行榜网站。

在线访问：http://47.85.45.45:18673

## 功能

- 输入 API Key、接口地址、模型名称、测试 Prompt、并发数和总批次数
- 执行 OpenAI Chat Completions 兼容接口测速
- 展示 TPS、Tokens/s、平均延迟、总耗时等指标
- 自动保存每次测试结果
- 首页展示 Tokens/s 最高的 Top 5 公开排行榜
- API Key 仅用于本次请求，不会保存到历史结果或仓库

## 本地开发

```bash
npm install
npm run dev
```

打开 http://localhost:3000。

## 常用命令

```bash
npm run lint
npm run build
npm run start -- -H 0.0.0.0 -p 18673
```

## 数据存储

测试历史保存在服务器本地：

```text
data/benchmark-results.jsonl
```

该文件已被 `.gitignore` 排除，不会提交到开源仓库。

## License

MIT
