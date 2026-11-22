---
title: 声明与定义
description: C++ 函数声明、定义与调用
---

# 声明与定义

函数声明向编译器介绍函数签名，函数定义则提供具体实现。

```cpp
int square(int value);

int square(int value) {
  return value * value;
}
```
