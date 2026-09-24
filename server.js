import "dotenv/config";
import express from "express";
import Anthropic from "@anthropic-ai/sdk";
import { analyzeUrl } from "./heuristics.js";

const app = express();
const PORT = process.env.PORT || 3000;

if (!process.env.ANTHROPIC_API_KEY) {
  console.warn(
    "\n⚠️  ANTHROPIC_API_KEY is not set. Copy .env.example to .env and add your key.\n"
  );
}

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

app.use(express.json());
app.use(express.static("public"));

app.post("/api/analyze", async (req, res) => {
  const { url } = req.body;

  if (!url || typeof url !== "string") {
    return res.status(400).json({ error: "Missing 'url' in request body" });
  }

  const heuristics = analyzeUrl(url);

  // Skip the AI call for obviously invalid input — no point spending tokens.
  if (!heuristics.valid) {
    return res.json({ heuristics, ai: null });
  }

  try {
    const prompt = `You are a cybersecurity analyst reviewing a URL for phishing risk.
Do not fetch the URL. Reason only from its structure, wording, and the heuristic
signals provided. Respond ONLY with JSON, no prose, no markdown fences, matching
exactly this shape:
{"riskLevel": "low" | "medium" | "high", "reasoning": "2-3 sentence explanation", "recommendation": "one short actionable sentence"}

URL: ${url}
Heuristic score (0-100, higher = more suspicious): ${heuristics.score}
Heuristic flags: ${heuristics.flags.length ? heuristics.flags.join("; ") : "none"}`;

    const message = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 300,
      messages: [{ role: "user", content: prompt }]
    });

    const text = message.content
      .filter((block) => block.type === "text")
      .map((block) => block.text)
      .join("")
      .replace(/```json|```/g, "")
      .trim();

    let ai;
    try {
      ai = JSON.parse(text);
    } catch {
      ai = { riskLevel: "unknown", reasoning: text, recommendation: "Review manually." };
    }

    res.json({ heuristics, ai });
  } catch (err) {
    console.error("Anthropic API error:", err.message);
    res.status(502).json({
      heuristics,
      ai: null,
      error: "AI analysis unavailable right now — showing heuristic results only."
    });
  }
});

app.listen(PORT, () => {
  console.log(`Phishing detector running at http://localhost:${PORT}`);
});
