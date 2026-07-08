# Arc & Ledger Tax Tools - branding assets

Assets for the MCP directory + OpenAI app submissions.

| File | What it is | Notes |
|---|---|---|
| `logo-monogram-ink.png` | Server logo, A&L monogram (ink on transparent), 512x512 | Reuse of `public/logos/monogram-ink.png`. Primary listing logo. |
| `logo-monogram-white.png` | Monogram (white), 512x512 | For dark backgrounds. |
| `favicon-source.png` | Favicon source, 200x200 | Reuse of `public/squarelogo.png`; the live site serves this at `/squarelogo.png` (see `index.html`). Favicon verification: the docs origin `https://www.arcandledger.com` already serves this icon. |
| `screenshots/01..05-*.png` | Five tool-response screenshots, ~2080px wide (2x @ 1040 CSS px) | Cropped to the response only (prompt excluded per Anthropic's carousel spec). Generated from REAL tool output by `scripts/gen-screenshots.mjs`. |
| `screenshots/prompts.txt` | The paired prompt for each screenshot | Kept separate from the images, per Anthropic's spec. |

## SVG logo

The task calls for an SVG logo in addition to PNG. The brand's vector monogram is
not in this website repo (only the exported 512px PNGs are). Use the PNG for
submission; if a directory strictly requires SVG, export it from the brand kit.
The PNGs here are lossless and 512px, which both directories accept.

## Regenerating

```bash
node scripts/gen-examples.mjs      # -> docs/worked-examples.json (real tool output)
PW_CHROMIUM=/opt/pw-browsers/chromium-1194/chrome-linux/chrome \
  node scripts/gen-screenshots.mjs # -> assets/screenshots/*.png + prompts.txt
```
