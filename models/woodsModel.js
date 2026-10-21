import { fetchTables } from "./apiClient.js";
import { cached, field } from "./modelUtils.js";

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
