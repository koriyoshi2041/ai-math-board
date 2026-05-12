# AI Math Foundations · Learning Board

A NotebookLM-style learning board for graduate-level "Mathematical Foundations of AI" — built as a single-page React app (vanilla, no build step).

**Live demo**: https://ai-math-board.vercel.app

## What's inside

8 chapters covering matrix analysis, sparse representation, information theory, Bayesian inference, convex / non-convex optimization. Each chapter has:

- A long bottom-up "★ 纵览" (~20-30K Chinese characters) — motivation-driven, intuition-first, with derivations and analogies
- A tree mindmap with KaTeX-rendered formulas
- Khan-style lesson reader
- 70-100 flashcards with intuition / mnemonic
- 70-90 quiz questions with per-option explanations
- Mistakes review + summary tab

## Stack

- React 18 + Babel in-browser transpilation (no build step)
- KaTeX 0.16 for math rendering
- localStorage-based progress persistence
- Vercel for hosting

## Local dev

```bash
python3 -m http.server 8765
# open http://127.0.0.1:8765/Notebook%20Board.html
```

## License

MIT

PRs welcome — feel free to open one.
