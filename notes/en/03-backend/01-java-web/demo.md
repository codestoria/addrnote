---
title: Java Web Servlet Demo
description: Handle an HTTP GET request with HttpServlet doGet
---

# Java Web Servlet Demo

In a web application deployed to a Jakarta Servlet container, `@WebServlet` maps this servlet to `/hello` within the application's context. A GET request invokes `doGet`, which returns UTF-8 plain text.

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
