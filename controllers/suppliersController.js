import { initRemoteTable } from "./remoteTableController.js";
import { getSuppliers, createSupplier } from "../models/suppliersModel.js";
import { isValidPhone, showAddForm } from "./shared.js";
export function initSuppliers(query, rerender) { return initRemoteTable("suppliers", query, rerender, getSuppliers); }
export function openAddSupplier() {
  showAddForm({
    title: "Thêm nhà cung cấp",
    fields: [
      { name: "tenNhaCungCap", label: "Tên nhà cung cấp" },
      { name: "diachi", label: "Địa chỉ" },
      { name: "sdt", label: "Số điện thoại" }
    ],
    onSubmit: data => {
      if (!isValidPhone(data.sdt)) throw new Error("Số điện thoại không hợp lệ.");
      return createSupplier({ ...data, trangThai: 1 });
    }
  });
}
