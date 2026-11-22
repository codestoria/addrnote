---
title: 作用域
description: C++ 块作用域、函数作用域与命名空间作用域
---

# 作用域

作用域限定了名称可被查找和使用的代码区域。内层作用域可以访问外层名称，反之则不可以。

```cpp
int value{1};

int main() {
  int local{2};
  {
    int nested{3};
  }
}
```
