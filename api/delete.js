const fs = require("fs");
const path = require("path");

function getEnvironmentValue(name) {
  if (process.env[name]) return process.env[name];
  if (process.env.VERCEL) return "";

  try {
    const envPath = path.join(process.cwd(), ".env.local");
    const line = fs.readFileSync(envPath, "utf8")
      .split(/\r?\n/)
      .find(entry => entry.trim().startsWith(`${name}=`));
    if (!line) return "";
    return line.slice(name.length + 1).trim().replace(/^"(.*)"$/, "$1").replace(/^'(.*)'$/, "$1");
  } catch {
    return "";
  }
}

module.exports = async function handler(request, response) {
  if (request.method !== "POST" && request.method !== "DELETE") {
    response.setHeader("Allow", "POST, DELETE");
    return response.status(405).json({ error: "Method Not Allowed" });
  }

  const url = getEnvironmentValue("SUPABASE_URL");
  const key = getEnvironmentValue("SUPABASE_ANON_KEY");
  if (!url || !key) {
    return response.status(500).json({ error: "Thiếu SUPABASE_URL hoặc SUPABASE_ANON_KEY trên Vercel." });
  }

  const body = request.body || {};
  const bucket = String(body.bucket || "").trim();
  let objectPath = String(body.path || "").trim();
  const imageUrl = String(body.url || "").trim();

  if (!bucket || !/^[a-zA-Z0-9._-]+$/.test(bucket)) {
    return response.status(400).json({ error: "Tên bucket không hợp lệ." });
  }

  if (!objectPath && imageUrl) {
    try {
      const parsed = new URL(imageUrl);
      const pathname = parsed.pathname;
      const publicMarker = `/storage/v1/object/public/${bucket}/`;
      const privateMarker = `/storage/v1/object/${bucket}/`;
      let marker = publicMarker;
      let index = pathname.indexOf(publicMarker);
      if (index < 0) {
        marker = privateMarker;
        index = pathname.indexOf(privateMarker);
      }
      if (index >= 0) {
        objectPath = decodeURIComponent(pathname.slice(index + marker.length));
      } else {
        const segments = pathname.split("/").filter(Boolean);
        if (segments.length) {
          objectPath = decodeURIComponent(segments[segments.length - 1]);
        }
      }
    } catch {
      objectPath = "";
    }
  }

  if (!objectPath) {
    return response.status(400).json({ error: "Thiếu đường dẫn ảnh cần xóa." });
  }

  const baseUrl = url.replace(/\/+$/, "").replace(/\/rest\/v1$/, "");

  try {
    const deleteResponse = await fetch(`${baseUrl}/storage/v1/object/${bucket}/${objectPath}`, {
      method: "DELETE",
      headers: {
        apikey: key,
        Authorization: `Bearer ${key}`
      }
    });

    if (!deleteResponse.ok) {
      const detail = await deleteResponse.text();
      console.error("Supabase storage delete failed:", { bucket, status: deleteResponse.status, detail });
      return response.status(deleteResponse.status).json({ error: "Không thể xóa ảnh trên Supabase Storage.", detail });
    }

    return response.status(200).json({ success: true });
  } catch (error) {
    console.error("Supabase storage delete request failed:", error);
    return response.status(502).json({ error: "Không thể xóa ảnh trên Supabase Storage." });
  }
};
