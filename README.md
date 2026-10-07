# Energy for AI

Where should an AI data center get its power? Set your load, deadline and US region, and Energy for AI ranks eleven power options by cost, carbon, speed to power and reliability. Every figure links to its source.

**[Open the explorer →](https://amalmehta.github.io/EnergyForAI/)**

![The explorer: your project on the left, the best fit and full ranking on the right](docs/images/explorer.png)

![Cost against time to power, with your deadline marked](docs/images/chart.png)

```mermaid
flowchart LR
  R[47 public sources<br/>Lazard, EIA, LBNL, NREL, IEA…] --> D[data/research.json]
  D -->|scripts/build-data.mjs| J[js/data.js]
  U[Your load, deadline,<br/>region, priorities] --> M[js/model.js<br/>regional adjustments + weighted score]
  J --> M --> V[Best fit · ranking · chart · table]
```

## Docs

- [How to set up, run and use it](docs/INSTRUCTIONS.md)
- [System design](docs/SYSTEM-DESIGN.md)
- [What's where](docs/FILE-STRUCTURE.md)
- [Original brief](EnergyForAI.md)
