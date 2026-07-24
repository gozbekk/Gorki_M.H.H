const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const REPO = "gozbekk/Gorki_M.H.H";
const FILE = "data/visits.json";
const MAX_ENTRIES = 300;

function parseDevice(ua) {
  if (!ua) return { device: "Bilinmiyor", os: "?", browser: "?" };
  const mobile = /iPhone|Android.*Mobile|Mobile.*Android/i.test(ua);
  const tablet = /iPad|Android(?!.*Mobile)/i.test(ua);
  const device = mobile ? "📱 Telefon" : tablet ? "📟 Tablet" : "💻 Bilgisayar";
  const os = /iPhone|iPad/i.test(ua) ? "iOS"
    : /Android/i.test(ua) ? "Android"
    : /Windows/i.test(ua) ? "Windows"
    : /Mac/i.test(ua) ? "macOS"
    : /Linux/i.test(ua) ? "Linux" : "?";
  const browser = /Edg\//i.test(ua) ? "Edge"
    : /OPR|Opera/i.test(ua) ? "Opera"
    : /Chrome/i.test(ua) ? "Chrome"
    : /Firefox/i.test(ua) ? "Firefox"
    : /Safari/i.test(ua) ? "Safari" : "?";
  return { device, os, browser };
}

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();

  const ip = (req.headers["x-forwarded-for"] || "").split(",")[0].trim() || "?";
  const ua = req.headers["user-agent"] || "";
  const { device, os, browser } = parseDevice(ua);
  const { page = "Ürün" } = req.body || {};

  const entry = {
    t: new Date().toISOString(),
    ip: ip.replace(/(\d+\.\d+)\.\d+\.\d+/, "$1.x.x"), // mask last 2 octets
    device,
    os,
    browser,
    page,
  };

  try {
    const getResp = await fetch(
      `https://api.github.com/repos/${REPO}/contents/${FILE}`,
      { headers: { Authorization: `token ${GITHUB_TOKEN}`, Accept: "application/vnd.github.v3+json" } }
    );
    let visits = [], sha = null;
    if (getResp.ok) {
      const fileData = await getResp.json();
      sha = fileData.sha;
      try { visits = JSON.parse(Buffer.from(fileData.content, "base64").toString("utf-8")); } catch {}
    }

    visits.push(entry);
    if (visits.length > MAX_ENTRIES) visits = visits.slice(-MAX_ENTRIES);

    await fetch(`https://api.github.com/repos/${REPO}/contents/${FILE}`, {
      method: "PUT",
      headers: {
        Authorization: `token ${GITHUB_TOKEN}`,
        Accept: "application/vnd.github.v3+json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        message: "track visit",
        content: Buffer.from(JSON.stringify(visits), "utf-8").toString("base64"),
        ...(sha ? { sha } : {}),
      }),
    });

    res.status(200).json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
