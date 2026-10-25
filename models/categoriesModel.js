import { fetchTables, insertRecord, updateRecord } from "./apiClient.js";
import { cached, field, invalidate } from "./modelUtils.js";

export async function createCategory(record) {
  const result = await insertRecord("LOAISP", record);
  invalidate("categories");
  return result;
}

export async function updateCategory(id, record) {
  const result = await updateRecord("LOAISP", { id_loaiSP: id }, record);
  invalidate("categories");
  invalidate("products");
  return result;
}

export async function updateCategoryStatus(id, trangThai) {
  return updateCategory(id, { trangThai });
}

export async function getCategoryOptions() {
  const raw = await fetchTables(["LOAISP"]);
  return (raw.LOAISP || [])
    .filter(item => field(item, "trangThai") !== 0)
    .map(item => ({ value: field(item, "id_loaiSP"), label: field(item, "tenLoai") || "" }));
}

export async function getProductCategoryOptions() {
  const raw = await fetchTables(["LOAISP", "KIEUDANG"]);
  const styleCategoryIds = new Set(
    (raw.KIEUDANG || [])
      .filter(item => field(item, "trangThai") !== 0)
      .map(item => String(field(item, "id_loaiSP")))
  );
  return (raw.LOAISP || [])
    .filter(item =>
      field(item, "trangThai") !== 0 &&
      styleCategoryIds.has(String(field(item, "id_loaiSP")))
    )
    .map(item => ({ value: field(item, "id_loaiSP"), label: field(item, "tenLoai") || "" }));
}

export async function getCategories() {
  return cached("categories", async () => {
    const raw = await fetchTables(["LOAISP", "KIEUDANG", "SANPHAM"]);
    return (raw.LOAISP || []).map(item => {
      const id = field(item, "id_loaiSP");
      return {
        rawId: id,
        id: `LSP${String(id).padStart(2, "0")}`,
        name: field(item, "tenLoai") || "",
        description: "",
        count: (raw.SANPHAM || []).filter(product => {
          const style = (raw.KIEUDANG || []).find(item =>
            field(item, "id_kieuDang") === field(product, "id_kieuDang")
          );
          return field(style || {}, "id_loaiSP") === id && field(product, "trangThai") !== 0;
        }).length,
        styles: (raw.KIEUDANG || []).filter(style => field(style, "id_loaiSP") === id).length,
        status: field(item, "trangThai") === 0 ? "Đã khóa" : "Đang sử dụng",
        trangThai: Number(field(item, "trangThai") ?? 1)
      };
    });
  });
}
