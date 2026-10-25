import { fetchTables, insertRecord, updateRecord } from "./apiClient.js";
import { cached, field, invalidate } from "./modelUtils.js";
import { createAccount, ensureAccountAvailable, updateAccountStatus } from "./accountsModel.js";

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

export async function updateStaff(id, record) {
  const result = await updateRecord("NHANVIEN", { CCCD: id }, record);
  invalidate("staff");
  return result;
}

export async function updateStaffStatus(id, trangThai) {
  try {
    await updateAccountStatus({ cccd_nhanVien: id }, trangThai);
  } catch (error) {
    console.warn("Không thể đồng bộ trạng thái DANGNHAP cho nhân viên:", error.message);
  }
  invalidate("staff");
  invalidate("accounts");
}

export async function getStaff() {
  return cached("staff", async () => {
    const raw = await fetchTables(["NHANVIEN", "DANGNHAP"]);
    const accounts = raw.DANGNHAP || [];
    return (raw.NHANVIEN || []).map(item => {
      const account = accounts.find(entry =>
        String(field(entry, "cccd_nhanVien")) === String(field(item, "CCCD"))
      );
      const trangThai = Number(field(account || {}, "trangThai") ?? 1);
      return {
        rawId: field(item, "CCCD"),
        id: field(item, "CCCD"),
        name: field(item, "hoTen") || "",
        role: field(item, "vaiTro") === 1 ? "Quản trị viên" : "Nhân viên",
        phone: field(item, "sdt") || "",
        email: field(item, "email") || "",
        status: trangThai === 0 ? "Bị khóa" : "Đang hoạt động",
        trangThai,
        vaiTro: field(item, "vaiTro")
      };
    });
  });
}
