---
title: MySQL Table Demo
description: Create a notes table with a primary key in MySQL
---

# MySQL Table Demo

In a selected database, create a `notes` table. The primary key uniquely identifies each note, and the `title` column cannot contain `NULL`.

```sql
CREATE TABLE notes (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  title VARCHAR(200) NOT NULL
);
```
