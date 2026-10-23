import { fetchTables, insertRecord } from "./apiClient.js";
import { cached, field, invalidate } from "./modelUtils.js";

export async function createSupplier(record) {
  const result = await insertRecord("NHACUNGCAP", record);
  invalidate("suppliers");
  return result;
}

export async function getSuppliers() {
  return cached("suppliers", async () => {
    const raw = await fetchTables(["NHACUNGCAP"]);
    return (raw.NHACUNGCAP || []).filter(item => field(item, "trangThai") !== 0).map(item => ({
      id: `NCC${field(item, "id_nhaCungCap")}`,
      name: field(item, "tenNhaCungCap") || "",
      address: field(item, "diachi") || "",
      phone: field(item, "sdt") || "",
      status: "Đang hợp tác"
    }));
  });
}
