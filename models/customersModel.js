import { fetchTables } from "./apiClient.js";
import { cached, field } from "./modelUtils.js";

export async function getCustomers() {
  return cached("customers", async () => {
    const raw = await fetchTables(["KHACHHANG"]);
    return (raw.KHACHHANG || []).map(item => ({
      id: String(field(item, "id_khachHang")),
      name: field(item, "hoTen") || "",
      phone: field(item, "SDT") || field(item, "sdt") || "",
      email: field(item, "email") || "",
      orders: 0,
      spending: 0,
      status: field(item, "trangThai") === 0 ? "Bị khóa" : "Bình thường"
    }));
  });
}
