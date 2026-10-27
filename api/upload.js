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

function sanitizeFileName(name, contentType = "") {
  const raw = String(name || "").trim();
  const lastDot = raw.lastIndexOf(".");
  let base = raw;
  let ext = "";
  if (lastDot > 0 && lastDot < raw.length - 1) {
    base = raw.slice(0, lastDot);
    ext = raw.slice(lastDot + 1);
  }

  // Keep only S3/Supabase-safe characters and collapse repeated separators.
  const safeBase = String(base || "image")
    .replace(/[^a-zA-Z0-9._-]/g, "_")
    .replace(/_+/g, "_")
    .replace(/^[._-]+|[._-]+$/g, "")
    .slice(0, 80) || "image";

  let safeExt = String(ext || "")
    .replace(/[^a-zA-Z0-9]/g, "")
    .slice(0, 10)
    .toLowerCase();

  // Infer an extension when the original file name does not provide one.
  if (!safeExt) {
    const type = String(contentType || "").toLowerCase();
    if (type.includes("png")) safeExt = "png";
    else if (type.includes("jpeg") || type.includes("jpg")) safeExt = "jpg";
    else if (type.includes("webp")) safeExt = "webp";
    else if (type.includes("gif")) safeExt = "gif";
    else if (type.includes("svg")) safeExt = "svg";
  }

  const unique = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  return safeExt ? `${unique}-${safeBase}.${safeExt}` : `${unique}-${safeBase}`;
}

module.exports = async function handler(request, response) {
  if (request.method !== "POST") {
    response.setHeader("Allow", "POST");
    return response.status(405).json({ error: "Method Not Allowed" });
  }

  const url = getEnvironmentValue("SUPABASE_URL");
  const key = getEnvironmentValue("SUPABASE_ANON_KEY");
  if (!url || !key) {
    return response.status(500).json({ error: "Thiếu SUPABASE_URL hoặc SUPABASE_ANON_KEY trên Vercel." });
  }

  const body = request.body || {};
  const bucket = String(body.bucket || "").trim();
  const fileName = String(body.fileName || "").trim();
  const contentType = String(body.contentType || "application/octet-stream").trim();
  const data = String(body.data || "").trim();

  if (!bucket || !/^[a-zA-Z0-9._-]+$/.test(bucket)) {
    return response.status(400).json({ error: "Tên bucket không hợp lệ." });
  }
  if (!fileName || !data) {
    return response.status(400).json({ error: "Thiếu thông tin tệp tải lên." });
  }

  const baseUrl = url.replace(/\/+$/, "").replace(/\/rest\/v1$/, "");
  const safeName = sanitizeFileName(fileName, contentType);

  try {
    const buffer = Buffer.from(data, "base64");
    if (buffer.length > 1 * 1024 * 1024) {
      return response.status(413).json({ error: "Ảnh vượt quá 1MB. Vui lòng chọn ảnh nhỏ hơn." });
    }
    const uploadResponse = await fetch(`${baseUrl}/storage/v1/object/${bucket}/${safeName}`, {
      method: "POST",
      headers: {
        apikey: key,
        Authorization: `Bearer ${key}`,
        "Content-Type": contentType,
        "x-upsert": "true"
      },
      body: buffer
    });

    if (!uploadResponse.ok) {
      const detail = await uploadResponse.text();
      console.error("Supabase storage upload failed:", { bucket, status: uploadResponse.status, detail });
      return response.status(uploadResponse.status).json({ error: "Không thể tải ảnh lên Supabase Storage.", detail });
    }

    const publicUrl = `${baseUrl}/storage/v1/object/public/${bucket}/${safeName}`;
    return response.status(201).json({ url: publicUrl });
  } catch (error) {
    console.error("Supabase storage upload request failed:", error);
    return response.status(502).json({ error: "Không thể tải ảnh lên Supabase Storage." });
  }
};
