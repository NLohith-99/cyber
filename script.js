const form = document.getElementById("scan-form");
const input = document.getElementById("url-input");
const scanBtn = document.getElementById("scan-btn");
const status = document.getElementById("status");
const results = document.getElementById("results");
const heuristicReadout = document.getElementById("heuristic-readout");
const aiBlock = document.getElementById("ai-block");
const verdictLevel = document.getElementById("verdict-level");
const verdictReasoning = document.getElementById("verdict-reasoning");
const verdictRecommendation = document.getElementById("verdict-recommendation");
const historySection = document.getElementById("history");
const historyList = document.getElementById("history-list");

const history = [];

function renderHeuristics(h) {
  if (!h.valid) {
    heuristicReadout.innerHTML = `<div class="flag">${h.flags[0]}</div>`;
    return;
  }

  const flagsHtml = h.flags.length
    ? h.flags.map((f) => `<div class="flag">${f}</div>`).join("")
    : `<div class="clean">No structural red flags found</div>`;

  heuristicReadout.innerHTML = `
    ${flagsHtml}
    <div class="score-row">
      <span>Heuristic score</span>
      <strong>${h.score}/100 — ${h.verdict}</strong>
    </div>
  `;
}

function renderAi(ai, fallbackError) {
  if (fallbackError) {
    aiBlock.hidden = false;
    verdictLevel.textContent = "unavailable";
    verdictLevel.className = "verdict__level unknown";
    verdictReasoning.textContent = fallbackError;
    verdictRecommendation.textContent = "";
    return;
  }
  if (!ai) {
    aiBlock.hidden = true;
    return;
  }

  aiBlock.hidden = false;
  const level = ["low", "medium", "high"].includes(ai.riskLevel) ? ai.riskLevel : "unknown";
  verdictLevel.textContent = level + " risk";
  verdictLevel.className = `verdict__level ${level}`;
  verdictReasoning.textContent = ai.reasoning || "";
  verdictRecommendation.textContent = ai.recommendation || "";
}

function riskColorVar(level) {
  return { low: "var(--low)", medium: "var(--medium)", high: "var(--high)" }[level] || "var(--text-dim)";
}

function addToHistory(url, level) {
  history.unshift({ url, level });
  if (history.length > 6) history.pop();

  historySection.hidden = false;
  historyList.innerHTML = history
    .map(
      (item) => `
      <li>
        <span class="dot" style="background:${riskColorVar(item.level)}"></span>
        <span class="url">${item.url}</span>
      </li>`
    )
    .join("");
}

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  const url = input.value.trim();
  if (!url) return;

  scanBtn.disabled = true;
  status.textContent = "Running structural checks and asking Claude…";
  results.hidden = true;
  aiBlock.hidden = true;

  try {
    const res = await fetch("/api/analyze", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url })
    });
    const data = await res.json();

    results.hidden = false;
    renderHeuristics(data.heuristics);

    if (data.error) {
      renderAi(null, data.error);
    } else {
      renderAi(data.ai, null);
    }

    if (data.heuristics.valid) {
      const level = data.ai?.riskLevel || (data.heuristics.verdict === "high-risk" ? "high" : data.heuristics.verdict === "suspicious" ? "medium" : "low");
      addToHistory(url, level);
    }

    status.textContent = "";
  } catch (err) {
    status.textContent = "Scan failed — check the server is running.";
  } finally {
    scanBtn.disabled = false;
  }
});
