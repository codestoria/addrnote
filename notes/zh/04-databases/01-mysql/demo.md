---
title: MySQL 建表示例
description: 在 MySQL 中创建带主键的笔记表
---

# MySQL 建表示例

在已选中的数据库中创建 `notes` 表。主键唯一标识每条笔记，`NOT NULL` 要求标题不能为 `NULL`。

```sql
CREATE TABLE notes (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  title VARCHAR(200) NOT NULL
);
```
