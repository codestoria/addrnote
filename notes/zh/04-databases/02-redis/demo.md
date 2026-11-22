---
title: Redis 字符串示例
description: 使用 Redis 的 SET 与 GET 读写字符串
---

# Redis 字符串示例

在测试用的 Redis 数据库中，通过 `redis-cli` 写入键 `demo:note:title`，再读取它的值。`SET` 返回 `OK`，`GET` 返回 `First note`。

```text
SET demo:note:title "First note"
GET demo:note:title
```
