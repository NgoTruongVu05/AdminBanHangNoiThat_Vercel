import { fetchTables, insertRecord, updateRecord } from "./apiClient.js";
import { cached, field, invalidate } from "./modelUtils.js";

export async function createWood(record) {
  const result = await insertRecord("LOAIGO", record);
  invalidate("woods");
  return result;
}

export async function updateWood(id, record) {
  const result = await updateRecord("LOAIGO", { id_maGo: id }, record);
  invalidate("woods");
  invalidate("products");
  return result;
}

export async function updateWoodStatus(id, trangThai) {
  return updateWood(id, { trangThai });
}

export async function getWoodOptions() {
  const raw = await fetchTables(["LOAIGO"]);
  return (raw.LOAIGO || [])
    .filter(item => field(item, "trangThai") !== 0)
    .map(item => ({ value: field(item, "id_maGo"), label: field(item, "tenGo") || "" }));
}

export async function getWoods() {
  return cached("woods", async () => {
    const raw = await fetchTables(["LOAIGO", "SANPHAM"]);
    return (raw.LOAIGO || []).map(item => {
      const id = field(item, "id_maGo");
      return {
        rawId: id,
        id: `LG${String(id).padStart(2, "0")}`,
        name: field(item, "tenGo") || "",
        description: "",
        count: (raw.SANPHAM || []).filter(product =>
          field(product, "id_maGo") === id && field(product, "trangThai") !== 0
        ).length,
        status: field(item, "trangThai") === 0 ? "Đã khóa" : "Đang sử dụng",
        trangThai: Number(field(item, "trangThai") ?? 1)
      };
    });
  });
}
