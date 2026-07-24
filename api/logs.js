const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const REPO = "gozbekk/Gorki_M.H.H";
const FILE = "data/visits.json";

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  const secret = req.headers.authorization || "";
  if (secret !== "Bearer MH2026") return res.status(401).json({ error: "Unauthorized" });

  try {
    const getResp = await fetch(
      `https://api.github.com/repos/${REPO}/contents/${FILE}`,
      { headers: { Authorization: `token ${GITHUB_TOKEN}`, Accept: "application/vnd.github.v3+json" } }
    );
    if (!getResp.ok) return res.status(200).json([]);
    const fileData = await getResp.json();
    const visits = JSON.parse(Buffer.from(fileData.content, "base64").toString("utf-8"));
    res.status(200).json(visits.reverse());
  } catch {
    res.status(200).json([]);
  }
}
