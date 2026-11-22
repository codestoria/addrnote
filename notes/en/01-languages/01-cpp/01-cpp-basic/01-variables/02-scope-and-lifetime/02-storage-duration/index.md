---
title: Storage Duration
description: Automatic, static, thread, and dynamic storage duration in C++
---

# Storage Duration

Storage duration determines when storage for an object is acquired and released. C++ defines automatic, static, thread, and dynamic storage durations.

```cpp
int globalCount{0};

void record() {
  static int calls{0};
  ++calls;
}
```
