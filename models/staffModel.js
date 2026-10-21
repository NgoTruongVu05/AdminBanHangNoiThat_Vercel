import { fetchTables } from "./apiClient.js";
import { cached, field } from "./modelUtils.js";

export async function getStaff() {
  return cached("staff", async () => {
    const raw = await fetchTables(["NHANVIEN"]);
    return (raw.NHANVIEN || []).map(item => ({
      id: field(item, "CCCD"),
      name: field(item, "hoTen") || "",
      role: field(item, "vaiTro") === 1 ? "Quản trị viên" : "Nhân viên",
      phone: field(item, "sdt") || "",
      status: field(item, "trangThai") === 0 ? "Bị khóa" : "Đang hoạt động"
    }));
  });
}
