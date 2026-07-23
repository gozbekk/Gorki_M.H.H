export default async function handler(req, res) {
  const SHAREPOINT_URL =
    "https://moethennessy-my.sharepoint.com/:x:/p/gozbek/IQDZ3em8y30hSbP7eNAUZuxbAVagZjZ5CxyuL-DOkOpatgY?e=71i4PV&download=1";

  try {
    const response = await fetch(SHAREPOINT_URL, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        Accept:
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/octet-stream,*/*",
      },
    });

    if (!response.ok) {
      return res
        .status(response.status)
        .json({ error: "SharePoint fetch failed: " + response.status });
    }

    const buffer = await response.arrayBuffer();

    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    res.setHeader("Cache-Control", "s-maxage=900, stale-while-revalidate");
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.status(200).send(Buffer.from(buffer));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
