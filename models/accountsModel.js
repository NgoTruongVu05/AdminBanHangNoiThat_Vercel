import { fetchTables, insertRecord, updateRecord } from "./apiClient.js";
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

function fromBase64Url(value) {
  const base64 = value.replace(/-/g, "+").replace(/_/g, "/") + "===".slice((value.length + 3) % 4);
  return Uint8Array.from(atob(base64), character => character.charCodeAt(0));
}

async function verifyPassword(password, storedPassword) {
  if (typeof storedPassword !== "string") return false;
  if (!storedPassword.startsWith("pbkdf2-sha256$")) {
    return storedPassword === password;
  }
  const [, iterations, saltValue, hashValue] = storedPassword.split("$");
  if (!iterations || !saltValue || !hashValue) return false;
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(password),
    "PBKDF2",
    false,
    ["deriveBits"]
  );
  const hash = new Uint8Array(await crypto.subtle.deriveBits(
    { name: "PBKDF2", salt: fromBase64Url(saltValue), iterations: Number(iterations), hash: "SHA-256" },
    key,
    256
  ));
  const expected = fromBase64Url(hashValue);
  return hash.length === expected.length && hash.every((byte, index) => byte === expected[index]);
}

export async function authenticateAccount(username, password) {
  const normalizedUsername = String(username ?? "").trim();
  if (!normalizedUsername || typeof password !== "string" || !password) {
    throw new Error("Vui lòng nhập email và mật khẩu.");
  }

  const raw = await fetchTables(["DANGNHAP", "NHANVIEN"], { accountType: "NHANVIEN" });
  const account = (raw.DANGNHAP || []).find(item =>
    String(field(item, "tenDangNhap") ?? "").trim().toLowerCase() === normalizedUsername.toLowerCase()
  );
  if (!account || !(await verifyPassword(password, field(account, "matKhau")))) {
    throw new Error("Email hoặc mật khẩu chưa đúng.");
  }
  const accountType = String(field(account, "loaiTaiKhoan") ?? "")
    .trim()
    .toUpperCase();
  if (accountType !== "NHANVIEN") {
    throw new Error("Chỉ tài khoản nhân viên mới được phép đăng nhập.");
  }
  if (Number(field(account, "trangThai")) === 0) {
    throw new Error("Tài khoản đã bị khóa.");
  }
  const staff = (raw.NHANVIEN || []).find(item =>
    String(field(item, "CCCD")) === String(field(account, "cccd_nhanVien"))
  );
  const staffRole = Number(field(staff || {}, "vaiTro"));
  if (staffRole !== 0 && staffRole !== 1) {
    throw new Error("Tài khoản chưa được phân quyền hợp lệ.");
  }
  return {
    username: field(account, "tenDangNhap"),
    role: staffRole === 1 ? "QUANTRIVIEN" : "NHANVIEN"
  };
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

export async function updateAccount(match, record) {
  const result = await updateRecord("DANGNHAP", match, record);
  invalidate("accounts");
  return result;
}

export async function updateAccountStatus(match, trangThai) {
  return updateAccount(match, { trangThai });
}

export async function updateAccountPassword(match, password) {
  const hashed = await hashPassword(password);
  return updateAccount(match, { matKhau: hashed });
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
        : staff.find(entry => String(field(entry, "CCCD")) === String(field(item, "cccd_nhanVien")))) || {};
      return {
        id: field(item, "tenDangNhap"),
        username: field(item, "tenDangNhap"),
        name: field(owner, "hoTen") || "",
        email: field(owner, "email") || "",
        role: field(item, "loaiTaiKhoan"),
        status: field(item, "trangThai") === 0 ? "Bị khóa" : "Hoạt động",
         trangThai: Number(field(item, "trangThai") ?? 1),
      };
    });
  });
}
