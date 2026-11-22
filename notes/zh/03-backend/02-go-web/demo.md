---
title: Go Web 请求处理示例
description: 使用 http.HandleFunc 返回纯文本响应
---

# Go Web 请求处理示例

`http.HandleFunc` 为 `/hello` 注册处理函数。启动程序后，在浏览器中打开 `http://127.0.0.1:8080/hello` 即可看到纯文本响应。

```go
package main

import (
	"fmt"
	"log"
	"net/http"
)

func main() {
	http.HandleFunc("/hello", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "text/plain; charset=utf-8")
		fmt.Fprintln(w, "Hello from Go")
	})

	log.Fatal(http.ListenAndServe("127.0.0.1:8080", nil))
}
```
