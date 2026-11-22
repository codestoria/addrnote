---
title: Cocos start 示例
description: 通过 Cocos Creator 的 TypeScript 组件输出启动消息
---

# Cocos start 示例

在 Cocos Creator 3.x 中，将组件保存为 `StartupMessage.ts`，添加到一个已激活的节点上，然后预览场景。引擎会在已启用组件的第一次 `update` 之前调用 `start`。

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
