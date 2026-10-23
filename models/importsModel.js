import { fetchTables, insertRecord } from "./apiClient.js";
import { cached, date, field, invalidate } from "./modelUtils.js";

export async function createImport(record) {
  const result = await insertRecord("PHIEUNHAP", record);
  invalidate("imports");
  return result;
}

export async function getImports() {
  return cached("imports", async () => {
    const raw = await fetchTables(["PHIEUNHAP"]);
    return (raw.PHIEUNHAP || []).map(item => ({
      id: `PN${field(item, "id_phieuNhap")}`,
      date: date(field(item, "ngayNhap")),
      supplier: "",
      count: 0,
      status: field(item, "trangThai") || ""
    }));
  });
}
