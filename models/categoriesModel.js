import { fetchTables } from "./apiClient.js";
import { field } from "./modelUtils.js";

export async function getCategories() {
  const raw = await fetchTables(["LOAISP", "KIEUDANG", "SANPHAM"]);
  return (raw.LOAISP || []).filter(item => field(item, "trangThai") !== 0).map(item => {
    const id = field(item, "id_loaiSP");
    return {
      id: `LSP${String(id).padStart(2, "0")}`,
      name: field(item, "tenLoai") || "",
      description: "",
      count: (raw.SANPHAM || []).filter(product =>
        field(product, "id_loaiSP") === id && field(product, "trangThai") !== 0
      ).length,
      styles: (raw.KIEUDANG || []).filter(style => field(style, "id_loaiSP") === id).length
    };
  });
}
