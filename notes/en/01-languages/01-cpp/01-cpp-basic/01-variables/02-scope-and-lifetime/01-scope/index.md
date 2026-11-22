---
title: Scope
description: C++ block, function, and namespace scope
---

# Scope

Scope limits the region of code in which a name can be found and used. An inner scope can access names from an enclosing scope, but the reverse is not true.

```cpp
int value{1};

int main() {
  int local{2};
  {
    int nested{3};
  }
}
```
