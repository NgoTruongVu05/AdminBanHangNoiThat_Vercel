const fs = require("fs");
const path = require("path");

const tables = [
  ["nhacungcap", "NHACUNGCAP"], ["loaisp", "LOAISP"], ["loaigo", "LOAIGO"], ["kieudang", "KIEUDANG"],
  ["chuongtrinhkhuyenmai", "CHUONGTRINHKHUYENMAI"], ["nhanvien", "NHANVIEN"], ["khachhang", "KHACHHANG"],
  ["sanpham", "SANPHAM"], ["phieunhap", "PHIEUNHAP"], ["chitietphieunhap", "CHITIETPHIEUNHAP"], ["chitiethoadon", "CHITIETHOADON"], ["hoadon", "HOADON"],
  ["kmtheosanpham", "KMTHEOSANPHAM"], ["kmtheohd", "KMTHEOHD"], ["kmtheovoucher", "KMTHEOVOUCHER"],
  ["dangnhap?select=tendangnhap,matkhau,loaitaikhoan,id_khachhang,cccd_nhanvien,trangthai", "DANGNHAP"]
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
  if (!["GET", "POST", "PATCH", "DELETE"].includes(request.method)) {
    response.setHeader("Allow", "GET, POST, PATCH, DELETE");
    return response.status(405).json({ error: "Method Not Allowed" });
  }

  const url = getEnvironmentValue("SUPABASE_URL");
  const key = getEnvironmentValue("SUPABASE_ANON_KEY");
  if (!url || !key) {
    return response.status(500).json({ error: "Thiếu SUPABASE_URL hoặc SUPABASE_ANON_KEY trên Vercel." });
  }

  if (request.method === "POST") {
    const table = String(request.body?.table || "").toLowerCase();
    const record = request.body?.record;
    const tableEntry = tables.find(([name]) => name.split("?")[0] === table);
    if (!tableEntry || !record || typeof record !== "object" || Array.isArray(record)) {
      return response.status(400).json({ error: "Bảng hoặc dữ liệu thêm vào không hợp lệ." });
    }
    try {
      const baseUrl = url.replace(/\/+$/, "").replace(/\/rest\/v1$/, "");
      const tableResponse = await fetch(`${baseUrl}/rest/v1/${tableEntry[0].split("?")[0]}`, {
        method: "POST",
        headers: {
          apikey: key,
          Authorization: `Bearer ${key}`,
          "Content-Type": "application/json",
          Prefer: "return=representation"
        },
        body: JSON.stringify(record)
      });
      if (!tableResponse.ok) {
        const detail = await tableResponse.text();
        console.error("Supabase insert failed:", { table, status: tableResponse.status, detail });
        return response.status(tableResponse.status).json({ error: "Không thể thêm dữ liệu vào cơ sở dữ liệu.", detail });
      }
      return response.status(201).json({ data: await tableResponse.json() });
    } catch (error) {
      console.error("Supabase insert request failed:", error);
      return response.status(502).json({ error: "Không thể ghi dữ liệu vào Supabase." });
    }
  }

  if (request.method === "PATCH") {
    const table = String(request.body?.table || "").toLowerCase();
    const record = request.body?.record;
    const match = request.body?.match || {};
    const tableEntry = tables.find(([name]) => name.split("?")[0] === table);
    if (!tableEntry || !record || typeof record !== "object" || Array.isArray(record)) {
      return response.status(400).json({ error: "Bảng hoặc dữ liệu cập nhật không hợp lệ." });
    }
    try {
      const baseUrl = url.replace(/\/+$/, "").replace(/\/rest\/v1$/, "");
      const query = Object.entries(match).map(([key, value]) => `${encodeURIComponent(String(key).toLowerCase())}=eq.${encodeURIComponent(value)}`).join("&");
      const endpoint = `${tableEntry[0].split("?")[0]}?${query}`;
      const tableResponse = await fetch(`${baseUrl}/rest/v1/${endpoint}`, {
        method: "PATCH",
        headers: {
          apikey: key,
          Authorization: `Bearer ${key}`,
          "Content-Type": "application/json",
          Prefer: "return=representation"
        },
        body: JSON.stringify(record)
      });
      if (!tableResponse.ok) {
        const detail = await tableResponse.text();
        console.error("Supabase update failed:", { table, status: tableResponse.status, detail });
        return response.status(tableResponse.status).json({ error: "Không thể cập nhật dữ liệu.", detail });
      }
      return response.status(200).json({ data: await tableResponse.json() });
    } catch (error) {
      console.error("Supabase update request failed:", error);
      return response.status(502).json({ error: "Không thể ghi dữ liệu vào Supabase." });
    }
  }


  if (request.method === "DELETE") {
    const table = String(request.body?.table || "").toLowerCase();
    const match = request.body?.match || {};
    const tableEntry = tables.find(([name]) => name.split("?")[0] === table);
    if (!tableEntry) {
      return response.status(400).json({ error: "Bảng xóa không hợp lệ." });
    }
    try {
      const baseUrl = url.replace(/\/+$/, "").replace(/\/rest\/v1$/, "");
      const query = Object.entries(match).map(([key, value]) => `${encodeURIComponent(String(key).toLowerCase())}=eq.${encodeURIComponent(value)}`).join("&");
      const endpoint = `${tableEntry[0].split("?")[0]}?${query}`;
      const tableResponse = await fetch(`${baseUrl}/rest/v1/${endpoint}`, {
        method: "DELETE",
        headers: {
          apikey: key,
          Authorization: `Bearer ${key}`,
          Prefer: "return=representation"
        }
      });
      if (!tableResponse.ok) {
        const detail = await tableResponse.text();
        console.error("Supabase delete failed:", { table, status: tableResponse.status, detail });
        return response.status(tableResponse.status).json({ error: "Không thể xóa dữ liệu.", detail });
      }
      return response.status(200).json({ data: await tableResponse.json() });
    } catch (error) {
      console.error("Supabase delete request failed:", error);
      return response.status(502).json({ error: "Không thể ghi dữ liệu vào Supabase." });
    }
  }


  try {
    const baseUrl = url.replace(/\/+$/, "").replace(/\/rest\/v1$/, "");
    const requestedTables = request.query?.tables ||
      new URL(request.url || "", "http://localhost").searchParams.get("tables");
    const accountType = request.query?.accountType ||
      new URL(request.url || "", "http://localhost").searchParams.get("accountType");
    const selectedTables = requestedTables
      ? tables.filter(([, keyName]) => requestedTables.split(",").map(name => name.trim().toUpperCase()).includes(keyName))
      : tables;
    if (requestedTables && !selectedTables.length) {
      return response.status(400).json({ error: "Danh sách bảng không hợp lệ." });
    }
    const result = await Promise.all(selectedTables.map(async ([table, keyName]) => {
      let endpoint = table.includes("?") ? table : `${table}?select=*`;
      if (keyName === "DANGNHAP" && accountType) {
        endpoint += `&loaitaikhoan=eq.${encodeURIComponent(accountType)}`;
      }
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
