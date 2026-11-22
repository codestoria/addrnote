---
title: Semantic HTML Demo
description: Structure a page with a header, navigation, and an article
---

# Semantic HTML Demo

Use `header` for the site introduction, `nav` for its navigation links, `main` for the page's primary content, and `article` for a self-contained note.

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>Field Notes</title>
  </head>
  <body>
    <header>
      <p>Field Notes</p>
      <nav aria-label="Contents">
        <a href="#first-note">First note</a>
      </nav>
    </header>
    <main>
      <article aria-labelledby="first-note">
        <h1 id="first-note">First note</h1>
        <p>Maples turned red this week.</p>
      </article>
    </main>
  </body>
</html>
```
