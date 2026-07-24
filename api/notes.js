const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const REPO = "gozbekk/Gorki_M.H.H";
const FILE = "data/notes.json";
const SECRET = "MH2026";

async function readNotes() {
  const resp = await fetch(
    `https://api.github.com/repos/${REPO}/contents/${FILE}`,
    { headers: { Authorization: `token ${GITHUB_TOKEN}`, Accept: "application/vnd.github.v3+json" } }
  );
  if (!resp.ok) return { data: {}, sha: null };
  const file = await resp.json();
  try {
    return {
      data: JSON.parse(Buffer.from(file.content, "base64").toString("utf-8")),
      sha: file.sha,
    };
  } catch {
    return { data: {}, sha: file.sha };
  }
}

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  if (req.method === "OPTIONS") return res.status(200).end();

  if (req.method === "GET") {
    try {
      const { data } = await readNotes();
      res.setHeader("Cache-Control", "no-store");
      return res.status(200).json(data);
    } catch {
      return res.status(200).json({});
    }
  }

  if (req.method === "POST") {
    const auth = req.headers.authorization || "";
    if (auth !== `Bearer ${SECRET}`) return res.status(401).json({ error: "Unauthorized" });

    const { item, text } = req.body || {};
    if (!item) return res.status(400).json({ error: "Missing item" });

    try {
      const { data: notes, sha } = await readNotes();

      if (!text || !text.trim()) {
        delete notes[item];
      } else {
        notes[item] = {
          text: text.trim(),
          date: new Date().toISOString(),
        };
      }

      await fetch(`https://api.github.com/repos/${REPO}/contents/${FILE}`, {
        method: "PUT",
        headers: {
          Authorization: `token ${GITHUB_TOKEN}`,
          Accept: "application/vnd.github.v3+json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: text ? `Note: ${item}` : `Remove note: ${item}`,
          content: Buffer.from(JSON.stringify(notes, null, 2), "utf-8").toString("base64"),
          ...(sha ? { sha } : {}),
        }),
      });

      res.status(200).json({ success: true, notes });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }
}
