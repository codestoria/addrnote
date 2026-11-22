---
title: Unity Start 示例
description: 通过 Unity 的 MonoBehaviour 输出初始化消息
---

# Unity Start 示例

将脚本保存为 `StartupMessage.cs`，并挂载到一个已激活的游戏对象上。进入播放模式后，Unity 会在已启用组件的第一次 `Update` 之前调用 `Start`，并在控制台中显示消息。

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
