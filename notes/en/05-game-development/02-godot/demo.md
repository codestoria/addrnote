---
title: Godot Ready Demo
description: Print a message when a Godot node is ready
---

# Godot Ready Demo

Attach this script to the root node of a scene and run the scene. Godot calls `_ready` after the node and its children enter the scene tree and the children's `_ready` callbacks have run.

```gdscript
extends Node

func _ready() -> void:
    print("Godot node is ready")
```
