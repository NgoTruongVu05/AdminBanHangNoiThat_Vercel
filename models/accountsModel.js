import { fetchTables } from "./apiClient.js";
import { cached, field } from "./modelUtils.js";

export async function getAccounts() {
  return cached("accounts", async () => {
    const raw = await fetchTables(["DANGNHAP", "NHANVIEN"]);
    const staff = raw.NHANVIEN || [];
    return (raw.DANGNHAP || []).map(item => ({
      id: `TK${field(item, "id_taiKhoan")}`,
      username: field(item, "tenDangNhap"),
      name: field(staff.find(entry => field(entry, "CCCD") === field(item, "cccd_nhanVien")) || {}, "hoTen") || "",
      role: field(item, "loaiTaiKhoan"),
      status: field(item, "trangThai") === 0 ? "Bị khóa" : "Hoạt động"
    }));
  });
}
