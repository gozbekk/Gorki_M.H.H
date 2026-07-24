import crypto from "crypto";
import * as XLSX from "xlsx";

const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const REPO = "gozbekk/Gorki_M.H.H";
const FILE = "data/stock.json";
const SECRET = "MH2026";
const PWD = process.env.DATA_PASSWORD || "MH2026";

// CryptoJS-compatible AES-256-CBC encryption (EVP_BytesToKey)
function evpKey(password, salt) {
  const pwd = Buffer.from(password, "utf8");
  let result = Buffer.alloc(0);
  let prev = Buffer.alloc(0);
  while (result.length < 48) {
    prev = crypto.createHash("md5").update(Buffer.concat([prev, pwd, salt])).digest();
    result = Buffer.concat([result, prev]);
  }
  return { key: result.slice(0, 32), iv: result.slice(32, 48) };
}

function aesEncrypt(text, password) {
  const salt = crypto.randomBytes(8);
  const { key, iv } = evpKey(password, salt);
  const cipher = crypto.createCipheriv("aes-256-cbc", key, iv);
  const encrypted = Buffer.concat([cipher.update(text, "utf8"), cipher.final()]);
  return Buffer.concat([Buffer.from("Salted__"), salt, encrypted]).toString("base64");
}

function spSn(v) {
  if (v === undefined || v === null || v === "") return 0;
  return Math.round(parseFloat(String(v).replace(/[^0-9.-]/g, "")) || 0);
}

function isPosm(item) {
  const s = String(item).toUpperCase();
  return s.startsWith("POD") || s.startsWith("POS") || s.startsWith("MAT") || s.startsWith("GLO");
}

function spBrand(desc) {
  const d = desc.toLowerCase().trim();
  const pfx = [["na/mc","Moët & Chandon"],["sc/mc","Moët & Chandon"],["na/dp","Dom Pérignon"],["sc/dp","Dom Pérignon"],["na/cp","Veuve Clicquot"],["sc/cp","Veuve Clicquot"],["na/kg","Krug"],["sc/kg","Krug"],["na/ru","Ruinart"],["sc/ru","Ruinart"],["na/ad","Ardbeg"],["na/ar","Ardbeg"],["sc/ar","Ardbeg"],["na/gn","Glenmorangie"],["na/bv","Belvédère"],["na/vo","Volcán de mi Tierra"],["na/cb","Cloudy Bay"],["sc/cb","Cloudy Bay"]];
  for (const [p, b] of pfx) if (d.startsWith(p)) return b;
  const kw = [["hennessy","Hennessy"],["hennesy","Hennessy"],["hy ","Hennessy"],["moet","Moët & Chandon"],["moët","Moët & Chandon"],["dom perignon","Dom Pérignon"],["dom pérignon","Dom Pérignon"],["veuve","Veuve Clicquot"],["clicquot","Veuve Clicquot"],["krug","Krug"],["ruinart","Ruinart"],["glenmorangie","Glenmorangie"],["ardbeg","Ardbeg"],["belvedere","Belvédère"],["belvédère","Belvédère"],["cloudy bay","Cloudy Bay"],["terrazas","Terrazas"],["armand de brignac","Armand de Brignac"],["chandon","Chandon"],["cheval","Cheval Blanc"]];
  for (const [k, b] of kw) if (d.includes(k)) return b;
  return "Diğer";
}

function spCl(desc) {
  const m = desc.match(/(\d+(?:[.,]\d+)?)\s*cl/i);
  if (m) return parseFloat(m[1].replace(",", "."));
  const m2 = desc.match(/(\d+(?:[.,]\d+)?)\s*l\b/i);
  if (m2) return parseFloat(m2[1].replace(",", ".")) * 100;
  return 0;
}

function spPosmType(desc) {
  const d = desc.toLowerCase();
  if (d.includes("glorifier")) return "Glorifier";
  if (d.includes("podium")) return "Podium";
  if (d.includes("poster")) return "Poster";
  if (d.includes("raf")) return "Raf";
  return "Diğer";
}

async function getSha() {
  const resp = await fetch(`https://api.github.com/repos/${REPO}/contents/${FILE}`, {
    headers: { Authorization: `token ${GITHUB_TOKEN}`, Accept: "application/vnd.github.v3+json" },
  });
  if (!resp.ok) return null;
  const f = await resp.json();
  return f.sha || null;
}

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const auth = req.headers.authorization || "";
  if (auth !== `Bearer ${SECRET}`) return res.status(401).json({ error: "Unauthorized" });

  try {
    const { file } = req.body || {};
    if (!file) return res.status(400).json({ error: "Missing file (base64)" });

    const buf = Buffer.from(file, "base64");
    const wb = XLSX.read(buf, { type: "buffer" });

    // Sheet 2: commitments (orders)
    const committed = {};
    if (wb.SheetNames.length > 1) {
      const s2 = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[1]], { header: "A", defval: "" });
      s2.slice(1).forEach((row) => {
        const item = String(row.A || "").trim();
        if (isPosm(item)) return;
        const qty = spSn(row.H);
        if (item && qty > 0) committed[item] = qty;
      });
    }

    // Sheet 1: main stock
    const rows = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { header: "A", defval: "" });
    const nd = [], np = [];
    rows.slice(1).forEach((row) => {
      const item = String(row.A || "").trim();
      const desc = String(row.B || "").trim();
      if (!item) return;
      const sol02 = spSn(row.H), git = spSn(row.E), total = spSn(row.D);
      if (isPosm(item)) {
        if (sol02 > 0) np.push({ item, desc, total, git, sol02, brand: spBrand(desc), type: spPosmType(desc), cl: spCl(desc) });
      } else {
        const cmt = committed[item] || 0;
        if (!sol02 && !cmt) return;
        nd.push({ item, desc, total, git, sol01: spSn(row.F), sol02, cmt, brand: spBrand(desc), cl: spCl(desc) });
      }
    });

    if (nd.length === 0) return res.status(400).json({ error: "No product rows parsed — check Excel column layout" });

    const enc_raw = aesEncrypt(JSON.stringify(nd), PWD);
    const enc_posm = aesEncrypt(JSON.stringify(np), PWD);
    const updated_at = new Date().toISOString();
    const payload = JSON.stringify({ enc_raw, enc_posm, updated_at });
    const content = Buffer.from(payload, "utf-8").toString("base64");

    for (let attempt = 0; attempt < 3; attempt++) {
      const sha = await getSha();
      const putResp = await fetch(`https://api.github.com/repos/${REPO}/contents/${FILE}`, {
        method: "PUT",
        headers: {
          Authorization: `token ${GITHUB_TOKEN}`,
          Accept: "application/vnd.github.v3+json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ message: "Auto-update stock data", content, ...(sha ? { sha } : {}) }),
      });
      if (putResp.ok) return res.status(200).json({ success: true, products: nd.length, posm: np.length, updated_at });
      const errBody = await putResp.json().catch(() => ({}));
      if ((putResp.status === 409 || putResp.status === 422) && attempt < 2) continue;
      return res.status(500).json({ error: errBody.message || JSON.stringify(errBody) });
    }
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
