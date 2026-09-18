# Link Scan — AI Phishing URL Detector

Paste a URL and get two layers of analysis:

1. Instant heuristic checks for structural phishing indicators.
2. Claude-powered reasoning based on the URL and heuristic signals.

## Setup

1. Install dependencies:
   \`\`\`bash
   npm install
   \`\`\`
2. Copy \`.env.example\` to \`.env\` and add your Anthropic API key.
3. Start the server:
   \`\`\`bash
   npm start
   \`\`\`
4. Open http://localhost:3000

Never commit your \`.env\` file or API keys. The included \`.gitignore\` excludes it.

## Project structure

- \`server.js\` — Express server and API endpoint
- \`heuristics.js\` — deterministic URL checks
- \`index.html\` — web interface
- \`script.js\` — frontend logic
- \`style.css\` — styling

This is a decision-support tool, not a guarantee that a URL is safe or malicious.