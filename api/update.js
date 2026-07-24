const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const REPO = "gozbekk/Gorki_M.H.H";
const FILE = "data/stock.json";
const UPDATE_SECRET = "MH2026";

async function getSha() {
  const resp = await fetch(
    `https://api.github.com/repos/${REPO}/contents/${FILE}`,
    { headers: { Authorization: `token ${GITHUB_TOKEN}`, Accept: "application/vnd.github.v3+json" } }
  );
  if (!resp.ok) return null;
  const file = await resp.json();
  return file.sha || null;
}

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const auth = req.headers.authorization || "";
  if (auth !== `Bearer ${UPDATE_SECRET}`) return res.status(401).json({ error: "Unauthorized" });

  const { enc_raw, enc_posm, updated_at } = req.body || {};
  if (!enc_raw || !enc_posm) return res.status(400).json({ error: "Missing data" });

  const payload = JSON.stringify({ enc_raw, enc_posm, updated_at: updated_at || new Date().toISOString() });
  const content = Buffer.from(payload, "utf-8").toString("base64");

  // Try up to 3 times in case of SHA conflict (409/422)
  for (let attempt = 0; attempt < 3; attempt++) {
    const sha = await getSha();
    const putResp = await fetch(
      `https://api.github.com/repos/${REPO}/contents/${FILE}`,
      {
        method: "PUT",
        headers: {
          Authorization: `token ${GITHUB_TOKEN}`,
          Accept: "application/vnd.github.v3+json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: "Update stock data",
          content,
          ...(sha ? { sha } : {}),
        }),
      }
    );

    if (putResp.ok) {
      return res.status(200).json({ success: true });
    }

    const errBody = await putResp.json().catch(() => ({}));
    // 409/422 = SHA conflict → retry with fresh SHA
    if ((putResp.status === 409 || putResp.status === 422) && attempt < 2) {
      continue;
    }

    return res.status(500).json({ error: errBody.message || JSON.stringify(errBody) });
  }

  return res.status(500).json({ error: "Conflict after retries" });
}
