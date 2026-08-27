<h1>
  <img src="assets/hg-logo.svg" alt="" width="39" align="absmiddle" />
  <samp>Hitesh Goyal – Portfolio</samp>
</h1>

A data-driven static portfolio for AI engineering experience, projects, timeline, and credentials. The homepage is JSON-rendered; dedicated project pages share `data/projects.json` through a query-string shell.

## Highlights
- Profile, projects, timeline, and certificates load from JSON.
- Semantic HTML with a shared layout boundary in CSS custom properties.
- Timeline filters are a labelled button group (Work / Education / Certificates).

## Stack
- Vanilla HTML + CSS. No bundler and no npm dependencies.
- One classic script, `scripts/main.js`, for data loading and UI.
- Content lives under `data/` (`profile.json`, `projects.json`, `timeline.json`, `certificates.json`).

## Run Locally
1. Serve the root folder with any static server (e.g. `python3 -m http.server 8000`).
2. Visit `http://localhost:8000`.
3. Update JSON files to refresh content without touching markup.

HTML metadata, `sitemap.xml`, and `llms.txt` are static exceptions: crawlers that do not run JavaScript will not see per-project titles generated at runtime.

## Customising
- **Introduction/About:** Edit `data/profile.json`.
- **Projects:** Edit `data/projects.json` (cards, writeups, media, and `featured`).
- **Timeline:** Extend `data/timeline.json` with `work` or `education` entries.
- **Certificates:** Edit `data/certificates.json`.

## Screenshots
`node tools/capture-screenshots.mjs --preset all --theme both --motion both` writes PNGs under ignored `.artifacts/screenshots-spacing/{theme}/{motion}/{viewport}/`. Use `--preset quick` for a shorter desktop/mobile pass.

## Contact
- Email: [hiteshgoyal.business@gmail.com](mailto:hiteshgoyal.business@gmail.com)
- GitHub: [@indianeagle4599](https://github.com/indianeagle4599)
- LinkedIn: [Hitesh Goyal](https://www.linkedin.com/in/hitesh-goyal-5732bb208/)
