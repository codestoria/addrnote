---
title: Redis String Demo
description: Write and read a string value with Redis SET and GET
---

# Redis String Demo

In a test Redis database, use `redis-cli` to set the value of `demo:note:title`, then read it back. `SET` returns `OK` and `GET` returns `First note`.

```text
SET demo:note:title "First note"
GET demo:note:title
```
