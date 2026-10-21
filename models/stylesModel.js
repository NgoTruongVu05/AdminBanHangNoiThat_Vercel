import { fetchTables } from "./apiClient.js";
import { cached, field } from "./modelUtils.js";

export async function getStyles() {
  return cached("styles", async () => {
    const raw = await fetchTables(["KIEUDANG", "LOAISP"]);
    const categories = raw.LOAISP || [];
    return (raw.KIEUDANG || []).map(item => ({
      id: `KD${field(item, "id_kieuDang")}`,
      name: field(item, "tenKieuDang") || "",
      category: field(categories.find(entry => field(entry, "id_loaiSP") === field(item, "id_loaiSP")) || {}, "tenLoai") || "",
      status: field(item, "trangThai") === 0 ? "Đã ẩn" : "Đang sử dụng"
    }));
  });
}
