---
title: Scope and Lifetime
description: The visibility and lifetime of C++ variables
---

# Scope and Lifetime

Scope determines where a name is visible in the program, while lifetime describes the period from an object's creation to its destruction.

```cpp
int main() {
  int outer{1};
  {
    int inner{2};
  } // inner's lifetime ends here
}
```

## Subtopics

- [Scope](/en/languages/cpp/cpp-basic/01-variables/02-scope-and-lifetime/01-scope/)
- [Storage Duration](/en/languages/cpp/cpp-basic/01-variables/02-scope-and-lifetime/02-storage-duration/)
