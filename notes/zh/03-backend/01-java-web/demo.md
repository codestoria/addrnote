---
title: Java Web Servlet 示例
description: 使用 HttpServlet 的 doGet 处理 HTTP GET 请求
---

# Java Web Servlet 示例

应用部署到 Jakarta Servlet 容器后，`@WebServlet` 将应用上下文中的 `/hello` 映射到这个 Servlet。GET 请求会调用 `doGet`，返回 UTF-8 纯文本。

```java
package example;

import jakarta.servlet.annotation.WebServlet;
import jakarta.servlet.http.HttpServlet;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;

@WebServlet("/hello")
public class HelloServlet extends HttpServlet {
    @Override
    protected void doGet(HttpServletRequest request, HttpServletResponse response)
            throws IOException {
        response.setContentType("text/plain; charset=UTF-8");
        response.getWriter().println("Hello from Java");
    }
}
```
