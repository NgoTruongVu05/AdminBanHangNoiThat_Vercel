const fs = require("fs");
const path = require("path");

const tables = [
  ["nhacungcap", "NHACUNGCAP"], ["loaisp", "LOAISP"], ["loaigo", "LOAIGO"], ["kieudang", "KIEUDANG"],
  ["chuongtrinhkhuyenmai", "CHUONGTRINHKHUYENMAI"], ["nhanvien", "NHANVIEN"], ["khachhang", "KHACHHANG"],
  ["sanpham", "SANPHAM"], ["phieunhap", "PHIEUNHAP"], ["hoadon", "HOADON"],
  ["dangnhap?select=id_taikhoan,tendangnhap,loaitaikhoan,cccd_nhanvien,trangthai", "DANGNHAP"]
];

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
  if (request.method !== "GET") {
    response.setHeader("Allow", "GET");
    return response.status(405).json({ error: "Method Not Allowed" });
  }

  const url = getEnvironmentValue("SUPABASE_URL");
  const key = getEnvironmentValue("SUPABASE_ANON_KEY");
  if (!url || !key) {
    return response.status(500).json({ error: "Thiếu SUPABASE_URL hoặc SUPABASE_ANON_KEY trên Vercel." });
  }

  try {
    const baseUrl = url.replace(/\/+$/, "").replace(/\/rest\/v1$/, "");
    const result = await Promise.all(tables.map(async ([table, keyName]) => {
      const endpoint = table.includes("?") ? table : `${table}?select=*`;
      const tableResponse = await fetch(`${baseUrl}/rest/v1/${endpoint}`, {
        headers: { apikey: key, Authorization: `Bearer ${key}` }
      });
      if (!tableResponse.ok) {
        const detail = await tableResponse.text();
        return [keyName, [], { table, status: tableResponse.status, detail }];
      }
      return [keyName, await tableResponse.json(), null];
    }));
    const failures = result.filter(([, , failure]) => failure);
    if (failures.length) {
      console.error("Supabase table requests failed:", failures.map(([, , failure]) => failure));
    }
    return response.status(200).json({
      data: Object.fromEntries(result.map(([name, rows]) => [name, rows])),
      failures: failures.map(([, , failure]) => failure)
    });
  } catch (error) {
    console.error("Supabase data request failed:", error);
    return response.status(502).json({ error: "Không thể tải dữ liệu từ Supabase." });
  }
}
