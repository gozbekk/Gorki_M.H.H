const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const REPO = "gozbekk/Gorki_M.H.H";
const FILE = "data/stock.json";
const UPDATE_SECRET = "MH2026";

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

  try {
    // Get current SHA of stock.json
    const getResp = await fetch(
      `https://api.github.com/repos/${REPO}/contents/${FILE}`,
      { headers: { Authorization: `token ${GITHUB_TOKEN}`, Accept: "application/vnd.github.v3+json" } }
    );
    let sha = null;
    if (getResp.ok) {
      const fileData = await getResp.json();
      sha = fileData.sha;
    }

    const payload = JSON.stringify({ enc_raw, enc_posm, updated_at: updated_at || new Date().toISOString() });

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
          content: Buffer.from(payload, "utf-8").toString("base64"),
          ...(sha ? { sha } : {}),
        }),
      }
    );

    if (!putResp.ok) {
      const err = await putResp.json();
      throw new Error(JSON.stringify(err));
    }

    res.status(200).json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
