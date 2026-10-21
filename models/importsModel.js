import { fetchTables } from "./apiClient.js";
import { cached, date, field } from "./modelUtils.js";

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
