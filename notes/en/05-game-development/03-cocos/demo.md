---
title: Cocos Start Demo
description: Log a startup message from a Cocos Creator TypeScript component
---

# Cocos Start Demo

In Cocos Creator 3.x, save the component as `StartupMessage.ts`, add it to an active node, and preview the scene. The engine calls `start` before the enabled component's first `update`.

```ts
import { _decorator, Component } from 'cc'

const { ccclass } = _decorator

@ccclass('StartupMessage')
export class StartupMessage extends Component {
  start(): void {
    console.log('Cocos component started')
  }
}
```
