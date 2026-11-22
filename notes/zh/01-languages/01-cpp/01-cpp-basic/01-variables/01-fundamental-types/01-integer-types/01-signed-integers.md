---
title: 有符号整数
description: C++ 有符号整数类型及其取值范围
---

# 有符号整数

有符号整数可以表示负数、零和正数。`signed` 是 `int` 的默认符号性，通常可以省略。

```cpp
signed int balance{-20};
int temperature{-5};
long long distance{9'000'000};
```

有符号整数溢出属于未定义行为，计算前应确保结果在类型可表示的范围内。
