import { initRemoteTable } from "./remoteTableController.js";
import { getImports, createImport } from "../models/importsModel.js";
import { showAddForm } from "./shared.js";
export function initImports(query, rerender) { return initRemoteTable("imports", query, rerender, getImports); }
export function openAddImport() {
  showAddForm({
    title: "Tạo phiếu nhập",
    fields: [
      { name: "ngayNhap", label: "Ngày nhập", type: "date" },
      { name: "trangThai", label: "Trạng thái", options: [{ value: "Đang nhập", label: "Đang nhập" }, { value: "Đã hoàn tất nhập kho", label: "Đã hoàn tất nhập kho" }] }
    ],
    onSubmit: data => createImport(data)
  });
}
