import { initRemoteTable } from "./remoteTableController.js";
import { getAccounts, updateAccountStatus, updateAccountPassword } from "../models/accountsModel.js";
import { showEditForm, showConfirmModal, showAlertModal } from "./shared.js";

export function initAccounts(query, rerender) {
  return initRemoteTable("accounts", query, rerender, getAccounts, {
    onEdit: row => openEditAccount(row),
    onLock: row => toggleAccountLock(row),
    isLocked: row => row.trangThai === 0
  });
}

export async function openEditAccount(account) {
  showEditForm({
    title: "Cập nhật tài khoản",
    fields: [{ name: "matKhau", label: "Mật khẩu mới", type: "password" }],
    initialValues: { matKhau: "" },
    onSubmit: data => {
      if (!String(data.matKhau || "").trim()) throw new Error("Mật khẩu không được để trống.");
      return updateAccountPassword({ tenDangNhap: account.username, loaiTaiKhoan: account.role }, data.matKhau);
    }
  });
}

export async function toggleAccountLock(account) {
  const locked = account.trangThai === 0;
  const ok = await showConfirmModal(locked ? "Mở khóa tài khoản này?" : "Khóa tài khoản này?");
  if (!ok) return;
  try {
    await updateAccountStatus({ tenDangNhap: account.username, loaiTaiKhoan: account.role }, locked ? 1 : 0);
    document.dispatchEvent(new CustomEvent("data-updated"));
    showAlertModal(locked ? "Đã mở khóa tài khoản." : "Đã khóa tài khoản.", "success");
  } catch (error) {
    showAlertModal(`Không thể cập nhật trạng thái: ${error.message}`, "error");
  }
}
