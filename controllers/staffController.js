import { initRemoteTable } from "./remoteTableController.js";
import { getStaff, createStaffWithAccount, updateStaff, updateStaffStatus } from "../models/staffModel.js";
import { isValidEmail, isValidPhone, showAddForm, showEditForm, showConfirmModal, showAlertModal } from "./shared.js";

export function initStaff(query, rerender) {
  return initRemoteTable("staff", query, rerender, getStaff, {
    onEdit: row => openEditStaff(row),
    onLock: row => toggleStaffLock(row),
    isLocked: row => row.trangThai === 0
  });
}

export function openAddStaff() {
  showAddForm({
    title: "Thêm nhân viên",
    fields: [
      { name: "tenDangNhap", label: "Tên đăng nhập" },
      { name: "matKhau", label: "Mật khẩu", type: "password" },
      { name: "CCCD", label: "CCCD nhân viên" },
      { name: "hoTen", label: "Họ và tên" },
      { name: "sdt", label: "Số điện thoại" },
      { name: "email", label: "Email", type: "email" },
      {
        name: "vaiTro",
        label: "Vai trò",
        options: [
          { value: "0", label: "Nhân viên" },
          { value: "1", label: "Quản trị viên" }
        ]
      }
    ],
    onSubmit: data => {
      if (!/^\d{12}$/.test(data.CCCD)) throw new Error("CCCD phải gồm đúng 12 chữ số.");
      if (!isValidPhone(data.sdt)) throw new Error("Số điện thoại không hợp lệ.");
      if (!isValidEmail(data.email)) throw new Error("Email không hợp lệ.");
      return createStaffWithAccount(
        { CCCD: data.CCCD, hoTen: data.hoTen, sdt: data.sdt, email: data.email, vaiTro: Number(data.vaiTro), trangThai: 1 },
        { tenDangNhap: data.tenDangNhap, matKhau: data.matKhau, loaiTaiKhoan: "NHANVIEN", cccd_nhanVien: data.CCCD, trangThai: 1 }
      );
    }
  });
}

export async function openEditStaff(staff) {
  showEditForm({
    title: "Cập nhật nhân viên",
    fields: [
      { name: "hoTen", label: "Họ và tên" },
      { name: "sdt", label: "Số điện thoại" },
      { name: "email", label: "Email", type: "email" },
      {
        name: "vaiTro",
        label: "Vai trò",
        options: [
          { value: "0", label: "Nhân viên" },
          { value: "1", label: "Quản trị viên" }
        ]
      }
    ],
    initialValues: { hoTen: staff.name, sdt: staff.phone, email: staff.email || "", vaiTro: String(staff.vaiTro ?? 0) },
    onSubmit: data => {
      if (!isValidPhone(data.sdt)) throw new Error("Số điện thoại không hợp lệ.");
      if (!isValidEmail(data.email)) throw new Error("Email không hợp lệ.");
      return updateStaff(staff.rawId, { hoTen: data.hoTen, sdt: data.sdt, email: data.email, vaiTro: Number(data.vaiTro) });
    }
  });
}

export async function toggleStaffLock(staff) {
  const locked = staff.trangThai === 0;
  const ok = await showConfirmModal(locked ? "Mở khóa nhân viên này?" : "Khóa nhân viên này?");
  if (!ok) return;
  try {
    await updateStaffStatus(staff.rawId, locked ? 1 : 0);
    document.dispatchEvent(new CustomEvent("data-updated"));
    showAlertModal(locked ? "Đã mở khóa nhân viên." : "Đã khóa nhân viên.", "success");
  } catch (error) {
    showAlertModal(`Không thể cập nhật trạng thái: ${error.message}`, "error");
  }
}
