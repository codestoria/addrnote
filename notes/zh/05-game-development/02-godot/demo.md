---
title: Godot _ready 示例
description: 在 Godot 节点就绪时输出消息
---

# Godot _ready 示例

将脚本挂载到场景的根节点上，然后运行场景。当前节点及其子节点进入场景树、且子节点执行完各自的 `_ready` 回调后，Godot 会调用当前节点的 `_ready`。

```gdscript
extends Node

func _ready() -> void:
    print("Godot node is ready")
```
