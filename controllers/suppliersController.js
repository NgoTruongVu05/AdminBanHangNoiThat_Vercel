import { initRemoteTable } from "./remoteTableController.js";
import { getSuppliers, createSupplier, updateSupplier, updateSupplierStatus } from "../models/suppliersModel.js";
import { isValidPhone, showAddForm, showEditForm, showConfirmModal, showAlertModal } from "./shared.js";

export function initSuppliers(query, rerender) {
  return initRemoteTable("suppliers", query, rerender, getSuppliers, {
    onEdit: row => openEditSupplier(row),
    onLock: row => toggleSupplierLock(row),
    isLocked: row => row.trangThai === 0
  });
}

export async function openAddSupplier() {
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

export async function openEditSupplier(supplier) {
  showEditForm({
    title: "Cập nhật nhà cung cấp",
    fields: [
      { name: "tenNhaCungCap", label: "Tên nhà cung cấp" },
      { name: "diachi", label: "Địa chỉ" },
      { name: "sdt", label: "Số điện thoại" }
    ],
    initialValues: { tenNhaCungCap: supplier.name, diachi: supplier.address, sdt: supplier.phone },
    onSubmit: data => {
      if (!isValidPhone(data.sdt)) throw new Error("Số điện thoại không hợp lệ.");
      return updateSupplier(supplier.rawId, {
        tenNhaCungCap: data.tenNhaCungCap,
        diachi: data.diachi,
        sdt: data.sdt
      });
    }
  });
}

export async function toggleSupplierLock(supplier) {
  const locked = supplier.trangThai === 0;
  const ok = await showConfirmModal(locked ? "Mở khóa nhà cung cấp này?" : "Khóa nhà cung cấp này?");
  if (!ok) return;
  try {
    await updateSupplierStatus(supplier.rawId, locked ? 1 : 0);
    document.dispatchEvent(new CustomEvent("data-updated"));
    showAlertModal(locked ? "Đã mở khóa nhà cung cấp." : "Đã khóa nhà cung cấp.", "success");
  } catch (error) {
    showAlertModal(`Không thể cập nhật trạng thái: ${error.message}`, "error");
  }
}
