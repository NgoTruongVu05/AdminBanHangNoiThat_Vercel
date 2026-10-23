import { initRemoteTable } from "./remoteTableController.js";
import { getStaff, createStaffWithAccount } from "../models/staffModel.js";
import { isValidEmail, isValidPhone, showAddForm } from "./shared.js";
export function initStaff(query, rerender) { return initRemoteTable("staff", query, rerender, getStaff); }
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
