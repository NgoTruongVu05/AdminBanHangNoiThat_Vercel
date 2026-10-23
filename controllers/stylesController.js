import { initRemoteTable } from "./remoteTableController.js";
import { getStyles, createStyle } from "../models/stylesModel.js";
import { getCategoryOptions } from "../models/categoriesModel.js";
import { showAddForm } from "./shared.js";
export function initStyles(query, rerender) { return initRemoteTable("styles", query, rerender, getStyles); }
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
