import { initRemoteTable } from "./remoteTableController.js";
import { getCustomers, createCustomerWithAccount } from "../models/customersModel.js";
import { isValidEmail, isValidPhone, showAddForm } from "./shared.js";
export function initCustomers(query, rerender) { return initRemoteTable("customers", query, rerender, getCustomers); }
export function openAddCustomer() {
  showAddForm({
    title: "Thêm khách hàng",
    fields: [
      { name: "tenDangNhap", label: "Tên đăng nhập" },
      { name: "matKhau", label: "Mật khẩu", type: "password" },
      { name: "hoTen", label: "Họ và tên" },
      { name: "SDT", label: "Số điện thoại" },
      { name: "email", label: "Email", type: "email", required: false }
    ],
    onSubmit: data => {
      if (!isValidPhone(data.SDT)) throw new Error("Số điện thoại không hợp lệ.");
      if (data.email && !isValidEmail(data.email)) throw new Error("Email không hợp lệ.");
      return createCustomerWithAccount(
        { hoTen: data.hoTen, SDT: data.SDT, email: data.email, trangThai: 1 },
        { tenDangNhap: data.tenDangNhap, matKhau: data.matKhau, loaiTaiKhoan: "KHACHHANG", trangThai: 1 }
      );
    }
  });
}
