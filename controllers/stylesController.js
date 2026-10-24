import { initRemoteTable } from "./remoteTableController.js";
import { getStyles, createStyle, updateStyle, updateStyleStatus } from "../models/stylesModel.js";
import { getCategoryOptions } from "../models/categoriesModel.js";
import { showAddForm, showEditForm, showConfirmModal, showAlertModal } from "./shared.js";

export function initStyles(query, rerender) {
  return initRemoteTable("styles", query, rerender, getStyles, {
    onEdit: row => openEditStyle(row),
    onLock: row => toggleStyleLock(row),
    isLocked: row => row.trangThai === 0
  });
}

export async function openAddStyle() {
  const categories = await getCategoryOptions();
  showAddForm({
    title: "Thêm kiểu dáng nội thất",
    fields: [
      { name: "tenKieuDang", label: "Tên kiểu dáng" },
      { name: "id_loaiSP", label: "Loại sản phẩm", options: categories }
    ],
    onSubmit: data => createStyle({ tenKieuDang: data.tenKieuDang, id_loaiSP: Number(data.id_loaiSP), trangThai: 1 })
  });
}

export async function openEditStyle(style) {
  const categories = await getCategoryOptions();
  showEditForm({
    title: "Cập nhật kiểu dáng nội thất",
    fields: [
      { name: "tenKieuDang", label: "Tên kiểu dáng" },
      { name: "id_loaiSP", label: "Loại sản phẩm", options: categories }
    ],
    initialValues: { tenKieuDang: style.name, id_loaiSP: style.categoryId },
    onSubmit: data => {
      if (!String(data.tenKieuDang || "").trim()) throw new Error("Tên kiểu dáng không được để trống.");
      return updateStyle(style.rawId, { tenKieuDang: data.tenKieuDang, id_loaiSP: Number(data.id_loaiSP) });
    }
  });
}

export async function toggleStyleLock(style) {
  const locked = style.trangThai === 0;
  const ok = await showConfirmModal(locked ? "Mở khóa kiểu dáng này?" : "Khóa kiểu dáng này?");
  if (!ok) return;
  try {
    await updateStyleStatus(style.rawId, locked ? 1 : 0);
    document.dispatchEvent(new CustomEvent("data-updated"));
    showAlertModal(locked ? "Đã mở khóa kiểu dáng." : "Đã khóa kiểu dáng.", "success");
  } catch (error) {
    showAlertModal(`Không thể cập nhật trạng thái: ${error.message}`, "error");
  }
}
