import { fetchTables, insertRecord, updateRecord } from "./apiClient.js";
import { cached, field, invalidate } from "./modelUtils.js";

export async function createStyle(record) {
  const result = await insertRecord("KIEUDANG", record);
  invalidate("styles");
  return result;
}

export async function updateStyle(id, record) {
  const result = await updateRecord("KIEUDANG", { id_kieuDang: id }, record);
  invalidate("styles");
  invalidate("products");
  return result;
}

export async function updateStyleStatus(id, trangThai) {
  return updateStyle(id, { trangThai });
}

export async function getStyleOptions() {
  const raw = await fetchTables(["KIEUDANG"]);
  return (raw.KIEUDANG || [])
    .filter(item => field(item, "trangThai") !== 0)
    .map(item => ({
      value: field(item, "id_kieuDang"),
      label: field(item, "tenKieuDang") || "",
      categoryId: field(item, "id_loaiSP")
    }));
}

export async function getStyles() {
  return cached("styles", async () => {
    const raw = await fetchTables(["KIEUDANG", "LOAISP"]);
    const categories = raw.LOAISP || [];
    return (raw.KIEUDANG || []).map(item => ({
      rawId: field(item, "id_kieuDang"),
      id: `KD${field(item, "id_kieuDang")}`,
      name: field(item, "tenKieuDang") || "",
      category: field(categories.find(entry => field(entry, "id_loaiSP") === field(item, "id_loaiSP")) || {}, "tenLoai") || "",
      categoryId: field(item, "id_loaiSP"),
      status: field(item, "trangThai") === 0 ? "Đã ẩn" : "Đang sử dụng",
      trangThai: Number(field(item, "trangThai") ?? 1)
    }));
  });
}
