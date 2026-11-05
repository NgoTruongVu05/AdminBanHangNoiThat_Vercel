import { invalidate } from "./modelUtils.js";

// Keep a response per table instead of per screen-shaped combination of tables.
// A later screen can therefore reuse HOADON/SANPHAM already loaded elsewhere.
const tableCache = new Map();
const tableCacheKeys = new Map();

// These are the only columns used by the admin UI. Keeping this list here also
// makes the API request explicit and avoids returning large unused payloads.
const tableColumns = {
  NHACUNGCAP: "id_nhacungcap,tennhacungcap,sdt,trangthai,isdeleted,tinhthanh,phuongxa,duong",
  LOAISP: "id_loaisp,tenloai,trangthai,isdeleted",
  LOAIGO: "id_mago,tengo,trangthai,isdeleted",
  KIEUDANG: "id_kieudang,tenkieudang,id_loaisp,trangthai,isdeleted",
  CHUONGTRINHKHUYENMAI: "id_mactkm,tenctkm,ngaybd,ngaykt,ghichu,trangthai,isdeleted",
  NHANVIEN: "cccd,hoten,sdt,email,vaitro",
  KHACHHANG: "id_khachhang,hoten,sdt,email",
  DIACHIGIAOHANG: "id_diachi,id_khachhang,tinhthanh,phuongxa,duong,macdinh",
  SANPHAM: "id_sanpham,tensanpham,id_kieudang,id_mago,dongia,soluong,trangthai,isdeleted,mota,hinhanh",
  PHIEUNHAP: "id_phieunhap,ngaynhap,trangthai,tongtien,id_nhacungcap",
  CHITIETPHIEUNHAP: "id_phieunhap,id_sanpham,soluong,dongia,thanhtien",
  CHITIETHOADON: "id_hoadon,id_sanpham,soluong,dongia,thanhtien",
  HOADON: "id_hoadon,id_khachhang,cccd_nhanvien,ngaydat,ngaygiao,id_diachigiaohang,tongtien,trangthai",
  KMTHEOSANPHAM: "id_mactkm,id_sanpham,phantram,trangthai",
  KMTHEOHD: "id_km_hd,id_mactkm,muctienkm,phantram,trangthai",
  KMTHEOVOUCHER: "id_voucher,id_mactkm,phantram,soluong,soluonghientai,trangthai",
  DANGNHAP: "tendangnhap,matkhau,loaitaikhoan,id_khachhang,cccd_nhanvien,trangthai"
};

export async function fetchTables(tableNames, options = {}) {
  const normalizedTables = [...new Set(tableNames.map(name => String(name).toUpperCase()))].sort();
  const accountType = options.accountType ? String(options.accountType).toUpperCase() : "";
  const keyFor = table => `table:${table}:${table === "DANGNHAP" ? accountType : ""}`;
  const missing = normalizedTables.filter(table => !tableCache.has(keyFor(table)));
  if (missing.length) {
    const columns = Object.fromEntries(missing.map(table => [table, tableColumns[table] || "*"]));
    const query = encodeURIComponent(missing.join(","));
    const accountQuery = accountType ? `&accountType=${encodeURIComponent(accountType)}` : "";
    const response = await fetch(`/api/data?tables=${query}&columns=${encodeURIComponent(JSON.stringify(columns))}${accountQuery}`, { cache: "no-store" });
    if (!response.ok) throw new Error(`API trả về ${response.status}`);
    const payload = await response.json();
    if (payload.failures?.length) console.warn("Một số bảng Supabase không tải được:", payload.failures);
    const data = payload.data || payload;
    missing.forEach(table => tableCache.set(keyFor(table), Promise.resolve(data[table] || [])));
  }
  const cacheKey = `tables:${normalizedTables.join(",")}:${accountType}`;
  tableCacheKeys.set(cacheKey, normalizedTables);
  const entries = await Promise.all(normalizedTables.map(async table => [table, await tableCache.get(keyFor(table))]));
  return Object.fromEntries(entries);
}

export function clearTableCache(changedTables = null) {
  const changed = changedTables && new Set(changedTables.map(name => String(name).toUpperCase()));
  tableCacheKeys.forEach((tables, cacheKey) => {
    if (!changed || tables.some(table => changed.has(table))) invalidate(cacheKey);
  });
  [...tableCache.keys()].forEach(key => {
    const table = key.split(":")[1];
    if (!changed || changed.has(table)) tableCache.delete(key);
  });
}

function invalidateChangedTable(table) {
  clearTableCache([table]);
}

export async function insertRecord(table, record) {
  const databaseRecord = Object.fromEntries(
    Object.entries(record).map(([name, value]) => [name.toLowerCase(), value])
  );
  const response = await fetch("/api/data", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ table, record: databaseRecord })
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.detail ? `${payload.error || `API trả về ${response.status}`} (${payload.detail})` : (payload.error || `API trả về ${response.status}`));
  invalidateChangedTable(table);
  return payload.data;
}

export async function updateRecord(table, match, record) {
  const databaseRecord = Object.fromEntries(
    Object.entries(record).map(([name, value]) => [name.toLowerCase(), value])
  );
  const databaseMatch = Object.fromEntries(
    Object.entries(match || {}).map(([name, value]) => [name.toLowerCase(), value])
  );
  const response = await fetch("/api/data", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ table, record: databaseRecord, match: databaseMatch })
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.detail ? `${payload.error || `API trả về ${response.status}`} (${payload.detail})` : (payload.error || `API trả về ${response.status}`));
  invalidateChangedTable(table);
  return payload.data;
}

export async function deleteRecord(table, match) {
  const databaseMatch = Object.fromEntries(
    Object.entries(match || {}).map(([name, value]) => [name.toLowerCase(), value])
  );
  const response = await fetch("/api/data", {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ table, match: databaseMatch })
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.detail ? `${payload.error || `API trả về ${response.status}`} (${payload.detail})` : (payload.error || `API trả về ${response.status}`));
  invalidateChangedTable(table);
  return payload.data;
}
