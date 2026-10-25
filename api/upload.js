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

function sanitizeFileName(name) {
  const base = String(name || "image").replace(/[^a-zA-Z0-9._-]/g, "_");
  return `${Date.now()}-${base}`;
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

  if (!bucket || !fileName || !data) {
    return response.status(400).json({ error: "Thiếu thông tin tệp tải lên." });
  }

  const baseUrl = url.replace(/\/+$/, "").replace(/\/rest\/v1$/, "");
  const safeName = sanitizeFileName(fileName);

  try {
    const buffer = Buffer.from(data, "base64");
    const uploadResponse = await fetch(`${baseUrl}/storage/v1/object/${encodeURIComponent(bucket)}/${encodeURIComponent(safeName)}`, {
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
