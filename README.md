# Link Scan — AI Phishing URL Detector

Paste a URL and get two layers of analysis:

1. **Instant heuristic check** (runs on the server, no API call): flags things
   like raw IP hosts, punycode/homograph tricks, typosquatted brand names,
   suspicious TLDs, URL shorteners, and more.
2. **Claude-powered reasoning**: sends the URL plus the heuristic signals to
   Claude, which returns a risk level, reasoning, and a recommendation.

## Setup

1. Open this folder in VS Code.
2. Install dependencies:
   ```bash
   npm install
   ```
3. Copy the env template and add your key:
   ```bash
   cp .env.example .env
   ```
   Then edit `.env` and set `ANTHROPIC_API_KEY` to a real key from
   https://console.anthropic.com/settings/keys — **never commit this file**
   (it's already covered by `.gitignore`).
4. Run it:
   ```bash
   npm start
   ```
5. Open http://localhost:3000

## How it's structured

```
phishing-detector/
├── server.js          # Express server + /api/analyze endpoint
├── heuristics.js       # Rule-based URL red-flag checks (no API needed)
├── public/
│   ├── index.html
│   ├── style.css
│   └── script.js       # Frontend fetch + rendering logic
├── .env.example
└── package.json
```

## Why a backend at all?

The Anthropic API key must never be shipped to the browser — anyone could
open dev tools and steal it. The Express server holds the key server-side
and the frontend only ever talks to your own `/api/analyze` endpoint.

## Ideas to extend it

- Cache repeated scans of the same URL to save API calls.
- Add a browser extension wrapper that scans links on hover.
- Log scan history to a small SQLite file instead of just in-memory state.
- Add rate limiting (e.g. `express-rate-limit`) before exposing this publicly.
- Swap the heuristic module's brand list for a longer, config-driven list.

## Important note on real-world use

This is a decision-support tool, not a guarantee. Treat "high risk" as
"don't click, verify through another channel" — and treat "low risk" as
"no red flags found," not "definitely safe." Real phishing campaigns
evolve constantly; combine this with browser/email provider protections,
not instead of them.
