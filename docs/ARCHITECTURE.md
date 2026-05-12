# Architecture

Single-page React 18 app, no build step. Babel transpiles JSX in-browser, dependencies vendored under `vendor/`.

## File layout

```
Notebook Board.html        Entry point
app.jsx                    Top-level shell
data.jsx                   Chapter registry
components-mindmap.jsx     TreeMindmap + ChapterSidebar
components-cards.jsx       Flashcards / Quiz / Mistakes / Articles
components-course.jsx      LessonReader
chapters/ch{0..7}*.js      Per-chapter content
vendor/                    React / KaTeX / Babel
styles.css                 All styling
```

## Data flow

1. Each `chapters/ch*.js` sets `window.CONTENT_CH<N>`.
2. `data.jsx` aggregates into `window.CONTENT` + `window.CHAPTERS`.
3. `app.jsx` selects chapter + tab and dispatches.
4. Progress persisted to `localStorage` under `aimath:progress:<chapterId>`.
