import { fetchTables, insertRecord } from "./apiClient.js";
import { cached, field, invalidate } from "./modelUtils.js";
import { createAccount, ensureAccountAvailable } from "./accountsModel.js";

export async function createStaff(record) {
  const result = await insertRecord("NHANVIEN", record);
  invalidate("staff");
  return result;
}
export async function createStaffWithAccount(staff, account) {
  const existingStaff = await fetchTables(["NHANVIEN"]);
  const duplicate = (existingStaff.NHANVIEN || []).some(item =>
    String(field(item, "CCCD")) === String(staff.CCCD)
  );
  if (duplicate) {
    throw new Error("CCCD nhân viên đã tồn tại.");
  }
  await ensureAccountAvailable(account);
  const createdStaff = await createStaff(staff);
  await createAccount(account);
  return createdStaff;
}

export async function getStaff() {
  return cached("staff", async () => {
    const raw = await fetchTables(["NHANVIEN"]);
    return (raw.NHANVIEN || []).map(item => ({
      id: field(item, "CCCD"),
      name: field(item, "hoTen") || "",
      role: field(item, "vaiTro") === 1 ? "Quản trị viên" : "Nhân viên",
      phone: field(item, "sdt") || "",
      status: field(item, "trangThai") === 0 ? "Bị khóa" : "Đang hoạt động"
    }));
  });
}
