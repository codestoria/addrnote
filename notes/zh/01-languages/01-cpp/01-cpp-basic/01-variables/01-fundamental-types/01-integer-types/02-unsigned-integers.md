---
title: 无符号整数
description: C++ 无符号整数类型与模运算
---

# 无符号整数

无符号整数只表示零和正数。其算术按 $2^N$ 取模，其中 $N$ 是类型的位数。

```cpp
unsigned int flags{0U};
unsigned long long fileSize{4'096ULL};
```

无符号类型适合位掩码和明确需要模运算的场景。将它与有符号整数混合运算时，需要注意隐式类型转换。
