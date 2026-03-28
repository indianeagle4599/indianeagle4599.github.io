# Hitesh Goyal – Portfolio

A single-page, data-driven portfolio that spotlights my AI engineering experience, timeline, and curated credentials.

## Highlights
- Pulls profile, timeline, and certificates from JSON so content changes stay Git-only.
- Minimal, GPU-inspired UI built with semantic HTML, custom CSS, and dusting of motion for scroll cues.
- Responsive timeline filters (tap again to reset) plus a dedicated About section fed directly from the profile data.

## Stack
- Vanilla HTML + CSS for layout, typography, and subtle gradients.
- Lightweight ES modules in `scripts/main.js` for lifecycle (profile, timeline, certificates) and UI interactions.
- Data stored under `data/` (`profile.json`, `timeline.json`, `certificates.json`) for easy authoring.

## Run Locally
1. Serve the root folder with any static server (e.g. `python3 -m http.server 8000`).
2. Visit `http://localhost:8000`.
3. Update JSON files to refresh content without touching markup.

## Customising
- **Hero/About:** Edit `data/profile.json` – change summary, highlights, CTA text, socials.
- **Timeline:** Extend `data/timeline.json` with new `work`, `education`, or `project` entries.
- **Certificates:** Add more cards by editing `data/certificates.json`.

## Contact
- Email: [hiteshgoyal.business@gmail.com](mailto:hiteshgoyal.business@gmail.com)
- GitHub: [@indianeagle4599](https://github.com/indianeagle4599)
- LinkedIn: [Hitesh Goyal](https://www.linkedin.com/in/hitesh-goyal-5732bb208/)
