# Energy for AI: Instructions

## Use it online

Open **https://amalmehta.github.io/EnergyForAI/**. Nothing to install.

## Run it locally

You need Python 3 (to serve the files) and, to run the tests or rebuild the data, Node 18 or later.

```bash
python3 scripts/serve.py
```

Then open http://localhost:8000. (The page uses JavaScript modules, which browsers won't load from a `file://` path, so double-clicking `index.html` doesn't work.) `scripts/serve.py` turns caching off so edits show up on reload. Run `npm start` for the same thing.

## Run the tests

```bash
npm test
```

There are ten tests: eight cover the scoring model and two check the real data (every option is complete, every citation points to a listed source, and every region ranks without errors).

## Update the data

1. Edit `data/research.json`: options, regions, sources and context facts. Each number carries a `src` list of source ids.
2. Rebuild the browser copy:

   ```bash
   node scripts/build-data.mjs
   ```

3. Run `npm test` to catch broken citations or missing fields.

Short display names, fact-card headlines and gap-filling assumptions live in `scripts/build-data.mjs`.

## Using the explorer

- **Your project:** set the load (50 MW to 5 GW), the year you need power by, your region, and whether the load must run 24/7 without backup.
- **What matters most:** weight cost, speed to power, reliability and carbon from *Ignore* to *Critical*.
- **Best fit:** the top option, its numbers, why it ranked there, and the next two to consider.
- **Ranking:** click any row for its cited ranges, caveats and real deals (for example Microsoft–Crane, Amazon–Talen, Google–Fervo). Switch to **Table** for every number at once.
- **Chart:** cost against years to power, with your deadline marked. Hover a dot for details; click it to open that row.
- **Sources:** the numbered links in brackets jump to the source list at the bottom.

### Settings (gear icon, or ⌘, / Ctrl+,)

Theme (system, light or dark), cost units ($/MWh or ¢/kWh), carbon units, and whether to remember your inputs on this device. **Reset everything** clears saved settings.

### Feedback

The **Feedback** tab on the right edge opens a pre-filled GitHub issue that you review before posting. The site has no backend and sends nothing on its own.

## Deploy

GitHub Pages serves the `main` branch root as-is, with no build step. Push to `main` and the site updates within a minute or two.
