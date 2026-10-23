import { fetchTables, insertRecord } from "./apiClient.js";
import { cached, field, invalidate } from "./modelUtils.js";

function toBase64Url(bytes) {
  return btoa(String.fromCharCode(...new Uint8Array(bytes)))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

async function hashPassword(password) {
  if (typeof password !== "string" || password.length < 1) {
    throw new Error("Mật khẩu không được để trống.");
  }
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(password),
    "PBKDF2",
    false,
    ["deriveBits"]
  );
  const hash = await crypto.subtle.deriveBits(
    { name: "PBKDF2", salt, iterations: 120000, hash: "SHA-256" },
    key,
    256
  );
  return `pbkdf2-sha256$120000$${toBase64Url(salt)}$${toBase64Url(hash)}`;
}

export async function ensureAccountAvailable(record) {
  const existingAccounts = await fetchTables(["DANGNHAP"]);
  const username = String(record.tenDangNhap ?? "").trim();
  const accountType = String(record.loaiTaiKhoan ?? "").trim().toUpperCase();
  const duplicate = (existingAccounts.DANGNHAP || []).some(item =>
    String(field(item, "tenDangNhap") ?? "").trim() === username &&
    String(field(item, "loaiTaiKhoan") ?? "").trim().toUpperCase() === accountType
  );
  if (duplicate) {
    throw new Error("Tên đăng nhập và loại tài khoản đã tồn tại.");
  }
  return { username, accountType };
}

export async function createAccount(record) {
  const { username, accountType } = await ensureAccountAvailable(record);
  const { matKhau, ...account } = record;
  const result = await insertRecord("DANGNHAP", {
    ...account,
    tenDangNhap: username,
    loaiTaiKhoan: accountType,
    matKhau: await hashPassword(matKhau)
  });
  invalidate("accounts");
  return result;
}

export async function getAccounts() {
  return cached("accounts", async () => {
    const raw = await fetchTables(["DANGNHAP", "NHANVIEN", "KHACHHANG"]);
    const staff = raw.NHANVIEN || [];
    const customers = raw.KHACHHANG || [];
    return (raw.DANGNHAP || []).map(item => {
      const isCustomer = String(field(item, "loaiTaiKhoan")).toUpperCase() === "KHACHHANG";
      const owner = (isCustomer
        ? customers.find(entry => String(field(entry, "id_khachHang")) === String(field(item, "id_khachHang")))
        : staff.find(entry => field(entry, "CCCD") === field(item, "cccd_nhanVien"))) || {};
      return {
        id: field(item, "tenDangNhap"),
        username: field(item, "tenDangNhap"),
        name: field(owner, "hoTen") || "",
        email: field(owner, "email") || "",
        role: field(item, "loaiTaiKhoan"),
        status: field(item, "trangThai") === 0 ? "Bị khóa" : "Hoạt động"
      };
    });
  });
}
