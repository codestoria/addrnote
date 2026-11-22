---
title: 存储期
description: C++ 对象的自动、静态、线程与动态存储期
---

# 存储期

存储期决定对象的存储在何时获得和释放。常见分类包括自动、静态、线程和动态存储期。

```cpp
int globalCount{0};

void record() {
  static int calls{0};
  ++calls;
}
```
