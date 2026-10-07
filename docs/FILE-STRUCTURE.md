# Energy for AI: File Structure

```
EnergyForAI/
├── index.html              The page: header, intro and fact cards, controls, results, settings and feedback dialogs
├── css/style.css           All styling; light and dark color tokens; responsive layout
├── js/
│   ├── app.js              UI: reads controls, renders the best fit, ranking, table, chart; settings, feedback, saved state
│   ├── model.js            Scoring model (pure functions, no DOM), shared by the browser and the tests
│   └── data.js             Generated from data/research.json — don't edit by hand
├── data/research.json      Researched figures with sources: options, regions, context facts, 47 sources
├── scripts/
│   ├── build-data.mjs      Builds js/data.js from the research (gap-filling, display names, card headlines)
│   └── serve.py            Local dev server with caching off
├── tests/model.test.mjs    Model and data-integrity tests (npm test)
├── docs/
│   ├── INSTRUCTIONS.md     Setup, run, use, update data, deploy
│   ├── SYSTEM-DESIGN.md    Architecture, flows, decisions, testing, limits
│   ├── FILE-STRUCTURE.md   This file
│   └── images/             README screenshots (explorer.png, explorer-dark.png, chart.png)
├── package.json            npm scripts: test, start
├── EnergyForAI.md          The original project brief and changelog
└── README.md               What it is, screenshots, links
```
