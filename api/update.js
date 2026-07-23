const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const REPO = "gozbekk/Gorki_M.H.H";
const FILE = "index.html";
const UPDATE_SECRET = "MH2026";

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const auth = req.headers.authorization || "";
  if (auth !== `Bearer ${UPDATE_SECRET}`) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const { enc_raw, enc_posm } = req.body || {};
  if (!enc_raw || !enc_posm) {
    return res.status(400).json({ error: "Missing enc_raw or enc_posm" });
  }

  try {
    // Get current file from GitHub
    const getResp = await fetch(
      `https://api.github.com/repos/${REPO}/contents/${FILE}`,
      {
        headers: {
          Authorization: `token ${GITHUB_TOKEN}`,
          Accept: "application/vnd.github.v3+json",
        },
      }
    );
    if (!getResp.ok) throw new Error("GitHub GET failed: " + getResp.status);
    const fileData = await getResp.json();

    // Decode content
    let html = Buffer.from(fileData.content, "base64").toString("utf-8");

    // Replace encrypted blobs
    html = html.replace(/const ENC_RAW="[^"]*";/, `const ENC_RAW="${enc_raw}";`);
    html = html.replace(/const ENC_POSM="[^"]*";/, `const ENC_POSM="${enc_posm}";`);

    // Push updated file to GitHub
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
          message: "Update stock data via admin panel",
          content: Buffer.from(html, "utf-8").toString("base64"),
          sha: fileData.sha,
        }),
      }
    );

    if (!putResp.ok) {
      const err = await putResp.json();
      throw new Error("GitHub PUT failed: " + JSON.stringify(err));
    }

    res.status(200).json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
}
