import { initRemoteTable } from "./remoteTableController.js";
import { getSuppliers, createSupplier, updateSupplier, updateSupplierStatus, deleteSupplier } from "../models/suppliersModel.js";
import { isValidPhone, showAddForm, showEditForm, showConfirmModal, showAlertModal, showLoadingModal } from "./shared.js";
import { getProvinces, getWards } from "../models/vietnamAddressModel.js";

async function getAddressFields() {
  const provinces = await getProvinces();
  return [
    { name: "tinhThanh", label: "Tỉnh/Thành phố", options: provinces.map(item => ({ value: String(item.code), label: item.name })) },
    { name: "phuongXa", label: "Phường/Xã", options: [], dependsOn: "tinhThanh", placeholder: "Chọn phường/xã", loadOptions: async provinceCode => (await getWards(provinceCode)).map(item => ({ value: String(item.code), label: item.name })) },
    { name: "duong", label: "Số nhà, tên đường" }
  ];
}

export function initSuppliers(query, rerender) {
  const loadSuppliers = async () => {
    const [suppliers, provinces] = await Promise.all([getSuppliers(), getProvinces()]);
    const provinceNames = new Map(provinces.map(item => [String(item.code), item.name]));
    return suppliers.map(item => ({
      ...item,
      address: [item.duong, item.phuongXa ? `Phường/Xã ${item.phuongXa}` : "", provinceNames.get(String(item.tinhThanh))].filter(Boolean).join(", ")
    }));
  };
  return initRemoteTable("suppliers", query, rerender, loadSuppliers, {
    onEdit: row => openEditSupplier(row),
    onLock: row => toggleSupplierLock(row),
    onDelete: row => deleteSupplierRow(row),
    isLocked: row => row.trangThai === 0
  });
}

async function deleteSupplierRow(supplier) {
  if (supplier.isDeleted !== 1) return showAlertModal("Không thể xóa nhà cung cấp này.", "warning");
  if (!await showConfirmModal("Bạn có chắc muốn xóa nhà cung cấp này?")) return;
  try { await deleteSupplier(supplier.rawId); document.dispatchEvent(new CustomEvent("data-updated")); showAlertModal("Đã xóa nhà cung cấp.", "success"); }
  catch (error) { showAlertModal(`Không thể xóa nhà cung cấp: ${error.message}`, "error"); }
}

export async function openAddSupplier() {
  const closeLoading = showLoadingModal("Đang mở biểu mẫu nhà cung cấp…");
  let addressFields;
  try { addressFields = await getAddressFields(); } finally { closeLoading(); }
  showAddForm({
    title: "Thêm nhà cung cấp",
    fields: [
      { name: "tenNhaCungCap", label: "Tên nhà cung cấp" },
      ...addressFields,
      { name: "sdt", label: "Số điện thoại" }
    ],
    onSubmit: data => {
      if (!isValidPhone(data.sdt)) throw new Error("Số điện thoại không hợp lệ.");
      if (!data.tinhThanh || !data.phuongXa || !data.duong) throw new Error("Vui lòng nhập đầy đủ địa chỉ.");
      return createSupplier({ ...data, tinhThanh: Number(data.tinhThanh), phuongXa: Number(data.phuongXa), trangThai: 1 });
    }
  });
}

export async function openEditSupplier(supplier) {
  const closeLoading = showLoadingModal("Đang mở biểu mẫu nhà cung cấp…");
  let addressFields;
  try { addressFields = await getAddressFields(); } finally { closeLoading(); }
  showEditForm({
    title: "Cập nhật nhà cung cấp",
    fields: [
      { name: "tenNhaCungCap", label: "Tên nhà cung cấp" },
      ...addressFields,
      { name: "sdt", label: "Số điện thoại" }
    ],
    initialValues: { tenNhaCungCap: supplier.name, tinhThanh: String(supplier.tinhThanh), phuongXa: String(supplier.phuongXa), duong: supplier.duong, sdt: supplier.phone },
    onSubmit: data => {
      if (!isValidPhone(data.sdt)) throw new Error("Số điện thoại không hợp lệ.");
      if (!data.tinhThanh || !data.phuongXa || !data.duong) throw new Error("Vui lòng nhập đầy đủ địa chỉ.");
      return updateSupplier(supplier.rawId, {
        tenNhaCungCap: data.tenNhaCungCap,
        tinhThanh: Number(data.tinhThanh),
        phuongXa: Number(data.phuongXa),
        duong: data.duong,
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
