---
title: 作用域与生命周期
description: C++ 变量的可见范围与存活时间
---

# 作用域与生命周期

作用域决定名称在代码中的可见范围，生命周期则描述对象从创建到销毁的时间。

```cpp
int main() {
  int outer{1};
  {
    int inner{2};
  } // inner 的生命周期在此结束
}
```

## 子主题

- [作用域](/zh/languages/cpp/cpp-basic/01-variables/02-scope-and-lifetime/01-scope/)
- [存储期](/zh/languages/cpp/cpp-basic/01-variables/02-scope-and-lifetime/02-storage-duration/)
