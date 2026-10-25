import { bindDomSearch, rowActions, escapeHtml, showAddForm, showEditForm, showConfirmModal, showAlertModal } from "./shared.js";
import { getCategories, createCategory, updateCategory, updateCategoryStatus } from "../models/categoriesModel.js";

export function openAddCategory() {
  showAddForm({
    title: "Thêm loại sản phẩm",
    fields: [{ name: "tenLoai", label: "Tên loại sản phẩm" }],
    onSubmit: data => createCategory({ tenLoai: data.tenLoai, trangThai: 1 })
  });
}

export async function openEditCategory(category) {
  showEditForm({
    title: "Cập nhật loại sản phẩm",
    fields: [{ name: "tenLoai", label: "Tên loại sản phẩm" }],
    initialValues: { tenLoai: category.name },
    onSubmit: data => {
      if (!String(data.tenLoai || "").trim()) throw new Error("Tên loại sản phẩm không được để trống.");
      return updateCategory(category.rawId, { tenLoai: data.tenLoai });
    }
  });
}

export async function initCategories(query, onQueryChange) {
  const categories = await getCategories();
  const categoryData = categories.map(item => ({ code: item.id, name: item.name, count: item.count, styles: `${item.styles} kiểu dáng`, status: item.status, trangThai: item.trangThai }));
  const categoryFields = { count: "Số sản phẩm", styles: "Số lượng kiểu dáng" };
  document.querySelector("#categories-body").innerHTML = categories.map((item, index) => `<tr data-row-index="${index}" data-search="${escapeHtml(`${item.id} ${item.name}`.toLowerCase())}"><td class="code">${item.id}</td><td><b>${item.name}</b></td>
    <td><span class="tag">${item.count}</span></td><td><span class="tag">${item.styles} kiểu dáng</span></td>
    <td><span class="tag ${item.trangThai === 0 ? "locked" : "green"}">${escapeHtml(item.status)}</span></td>
    <td class="actions">${rowActions(false, "", `data-edit="${item.rawId}"`, true, `data-lock="${item.rawId}"`, item.trangThai === 0)}</td></tr>`).join("");
  const categoryFilter = document.querySelector("#category-filter");
if (categoryFilter) {
  const current = categoryFilter.value;
  const values = ["Đã khóa", "Đang sử dụng"];
  categoryFilter.innerHTML = `<option value="">Tất cả trạng thái</option>` + values.map(value => `<option value="${escapeHtml(value)}">${escapeHtml(value)}</option>`).join("");
  if ([...categoryFilter.options].some(option => option.value === current)) categoryFilter.value = current;
  else categoryFilter.value = "";
}
bindDomSearch({ initialQuery: query, rowSelector: "#categories-body tr", onQueryChange, fields: categoryFields, defaultKeys: ["code", "name"], getFieldValue: (index, field) => categoryData[index]?.[field], sideFilters: [{ selector: "#category-filter", getValue: (row, rowIndex) => categoryData[rowIndex]?.status }] });

  document.querySelectorAll("[data-edit]").forEach(button => {
    button.onclick = () => {
      const id = button.dataset.edit;
      const category = categories.find(item => String(item.rawId) === String(id));
      if (category) openEditCategory(category).catch(error => showAlertModal(`Không thể mở biểu mẫu: ${error.message}`, "error"));
    };
  });
  document.querySelectorAll("[data-lock]").forEach(button => {
    button.onclick = async () => {
      const id = Number(button.dataset.lock);
      const category = categories.find(item => Number(item.rawId) === id);
      if (!category) return;
      const locked = category.trangThai === 0;
      const ok = await showConfirmModal(locked ? "Mở khóa loại sản phẩm này?" : "Khóa loại sản phẩm này?");
      if (!ok) return;
      try {
        await updateCategoryStatus(id, locked ? 1 : 0);
        document.dispatchEvent(new CustomEvent("data-updated"));
        showAlertModal(locked ? "Đã mở khóa loại sản phẩm." : "Đã khóa loại sản phẩm.", "success");
      } catch (error) {
        showAlertModal(`Không thể cập nhật trạng thái: ${error.message}`, "error");
      }
    };
  });
}
