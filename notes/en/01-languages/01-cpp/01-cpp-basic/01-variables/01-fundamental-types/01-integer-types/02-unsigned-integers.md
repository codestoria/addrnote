---
title: Unsigned Integers
description: C++ unsigned integer types and modular arithmetic
---

# Unsigned Integers

Unsigned integers represent zero and positive values. Their arithmetic is performed modulo $2^N$, where $N$ is the number of bits in the type.

```cpp
unsigned int flags{0U};
unsigned long long fileSize{4'096ULL};
```

Unsigned types are useful for bit masks and code that explicitly requires modular arithmetic. Mixing them with signed integers requires care because implicit conversions can produce surprising results.
