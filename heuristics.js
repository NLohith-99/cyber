// heuristics.js
// Fast, deterministic red-flag checks for a URL. Runs before (and alongside)
// the AI call so obviously bad URLs get an instant verdict without burning
// an API call, and so the AI has structured signals to reason over.

const SUSPICIOUS_TLDS = new Set([
  "zip", "mov", "top", "xyz", "gq", "tk", "ml", "cf", "work", "click", "loan"
]);

const URL_SHORTENERS = new Set([
  "bit.ly", "tinyurl.com", "t.co", "goo.gl", "ow.ly", "is.gd", "buff.ly"
]);

const BRAND_KEYWORDS = [
  "paypal", "apple", "microsoft", "google", "amazon", "netflix",
  "bankofamerica", "wellsfargo", "chase", "irs", "facebook", "instagram"
];

function isIpAddress(hostname) {
  return /^(\d{1,3}\.){3}\d{1,3}$/.test(hostname);
}

function levenshtein(a, b) {
  const dp = Array.from({ length: a.length + 1 }, (_, i) =>
    [i, ...Array(b.length).fill(0)]
  );
  for (let j = 0; j <= b.length; j++) dp[0][j] = j;
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      dp[i][j] = a[i - 1] === b[j - 1]
        ? dp[i - 1][j - 1]
        : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
    }
  }
  return dp[a.length][b.length];
}

export function analyzeUrl(rawUrl) {
  const flags = [];
  let score = 0; // 0 = clean, higher = more suspicious
  let parsed;

  try {
    parsed = new URL(rawUrl.trim());
  } catch {
    return {
      valid: false,
      score: 100,
      flags: ["Not a well-formed URL"],
      verdict: "invalid"
    };
  }

  const hostname = parsed.hostname.toLowerCase();
  const fullUrl = rawUrl.toLowerCase();

  if (parsed.protocol !== "https:") {
    flags.push("Not using HTTPS");
    score += 15;
  }

  if (isIpAddress(hostname)) {
    flags.push("Hostname is a raw IP address");
    score += 30;
  }

  const tld = hostname.split(".").pop();
  if (SUSPICIOUS_TLDS.has(tld)) {
    flags.push(`Uncommon/high-abuse TLD: .${tld}`);
    score += 15;
  }

  if (URL_SHORTENERS.has(hostname)) {
    flags.push("Known URL shortener (destination is hidden)");
    score += 10;
  }

  const subdomainCount = hostname.split(".").length - 2;
  if (subdomainCount >= 3) {
    flags.push("Excessive subdomains");
    score += 15;
  }

  if (/[@]/.test(fullUrl)) {
    flags.push("Contains '@' (can hide real destination)");
    score += 20;
  }

  if (hostname.includes("xn--")) {
    flags.push("Punycode hostname (possible homograph attack)");
    score += 25;
  }

  for (const brand of BRAND_KEYWORDS) {
    if (hostname.includes(brand)) continue; // legit case handled below
    const labels = hostname.split(".");
    for (const label of labels) {
      const dist = levenshtein(label, brand);
      if (dist > 0 && dist <= 2 && label.length >= brand.length - 2) {
        flags.push(`Hostname resembles "${brand}" but isn't (typosquat risk)`);
        score += 25;
        break;
      }
    }
  }

  if (/\d{4,}/.test(hostname)) {
    flags.push("Long numeric sequence in hostname");
    score += 10;
  }

  const verdict = score >= 50 ? "high-risk" : score >= 20 ? "suspicious" : "low-risk";

  return { valid: true, hostname, score: Math.min(score, 100), flags, verdict };
}
