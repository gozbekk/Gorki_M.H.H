const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const REPO = "gozbekk/Gorki_M.H.H";
const FILE = "data/stock.json";

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Cache-Control", "no-store");

  try {
    const resp = await fetch(
      `https://api.github.com/repos/${REPO}/contents/${FILE}`,
      { headers: { Authorization: `token ${GITHUB_TOKEN}`, Accept: "application/vnd.github.v3+json" } }
    );
    if (!resp.ok) return res.status(200).json({});
    const file = await resp.json();
    const data = JSON.parse(Buffer.from(file.content, "base64").toString("utf-8"));
    res.status(200).json(data);
  } catch {
    res.status(200).json({});
  }
}
