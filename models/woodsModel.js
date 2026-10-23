import { fetchTables, insertRecord } from "./apiClient.js";
import { cached, field, invalidate } from "./modelUtils.js";

export async function createWood(record) {
  const result = await insertRecord("LOAIGO", record);
  invalidate("woods");
  return result;
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
    return (raw.LOAIGO || []).filter(item => field(item, "trangThai") !== 0).map(item => {
      const id = field(item, "id_maGo");
      return [
        `LG${String(id).padStart(2, "0")}`,
        field(item, "tenGo") || "",
        "",
        (raw.SANPHAM || []).filter(product =>
          field(product, "id_maGo") === id && field(product, "trangThai") !== 0
        ).length
      ];
    });
  });
}
