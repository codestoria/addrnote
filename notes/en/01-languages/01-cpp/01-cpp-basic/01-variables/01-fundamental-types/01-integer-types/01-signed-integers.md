---
title: Signed Integers
description: C++ signed integer types and their value ranges
---

# Signed Integers

Signed integers can represent negative values, zero, and positive values. `signed` is the default signedness for `int` and can usually be omitted.

```cpp
signed int balance{-20};
int temperature{-5};
long long distance{9'000'000};
```

Signed integer overflow is undefined behavior, so a calculation must remain within the range representable by its type.
