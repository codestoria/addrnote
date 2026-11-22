---
title: Unity Start Demo
description: Log an initialization message from a Unity MonoBehaviour
---

# Unity Start Demo

Save this script as `StartupMessage.cs` and attach it to an active GameObject. When you enter Play mode, Unity calls `Start` before the enabled component's first `Update`, and the message appears in the Console.

```csharp
using UnityEngine;

public class StartupMessage : MonoBehaviour
{
    private void Start()
    {
        Debug.Log("Unity component started");
    }
}
```
