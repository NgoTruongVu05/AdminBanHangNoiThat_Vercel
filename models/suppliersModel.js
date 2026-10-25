import { fetchTables, insertRecord, updateRecord } from "./apiClient.js";
import { cached, field, invalidate } from "./modelUtils.js";

export async function createSupplier(record) {
  const result = await insertRecord("NHACUNGCAP", record);
  invalidate("suppliers");
  return result;
}

export async function updateSupplier(id, record) {
  const result = await updateRecord("NHACUNGCAP", { id_nhaCungCap: id }, record);
  invalidate("suppliers");
  return result;
}

export async function updateSupplierStatus(id, trangThai) {
  return updateSupplier(id, { trangThai });
}

export async function getSupplierOptions() {
  const raw = await fetchTables(["NHACUNGCAP"]);
  return (raw.NHACUNGCAP || [])
    .filter(item => field(item, "trangThai") !== 0)
    .map(item => ({
      value: field(item, "id_nhaCungCap"),
      label: field(item, "tenNhaCungCap") || ""
    }));
}

export async function getSuppliers() {
  return cached("suppliers", async () => {
    const raw = await fetchTables(["NHACUNGCAP"]);
    return (raw.NHACUNGCAP || []).map(item => ({
      rawId: field(item, "id_nhaCungCap"),
      id: `NCC${field(item, "id_nhaCungCap")}`,
      name: field(item, "tenNhaCungCap") || "",
      address: field(item, "diachi") || "",
      phone: field(item, "sdt") || "",
      status: field(item, "trangThai") === 0 ? "Đã khóa" : "Đang hợp tác",
      trangThai: Number(field(item, "trangThai") ?? 1)
    }));
  });
}
