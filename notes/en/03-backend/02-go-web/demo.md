---
title: Go Web Handler Demo
description: Serve a plain-text response with http.HandleFunc
---

# Go Web Handler Demo

`http.HandleFunc` registers a handler for `/hello`. After starting the program, open `http://127.0.0.1:8080/hello` to see the plain-text response.

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
