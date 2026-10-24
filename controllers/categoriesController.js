import { bindDomSearch, rowActions, escapeHtml } from "./shared.js";
import { getCategories, createCategory } from "../models/categoriesModel.js";
import { showAddForm } from "./shared.js";

export function openAddCategory() {
  showAddForm({
    title: "Thêm loại sản phẩm",
    fields: [{ name: "tenLoai", label: "Tên loại sản phẩm" }],
    onSubmit: data => createCategory({ tenLoai: data.tenLoai, trangThai: 1 })
  });
}

export async function initCategories(query, onQueryChange) {
  const categories = await getCategories();
  const categoryData = categories.map(item => ({ code: item.id, name: item.name, count: item.count, styles: `${item.styles} kiểu dáng` }));
  const categoryFields = { count: "Số sản phẩm", styles: "Số lượng kiểu dáng" };
  document.querySelector("#categories-body").innerHTML = categories.map((item, index) => `<tr data-row-index="${index}" data-search="${escapeHtml(`${item.id} ${item.name}`.toLowerCase())}"><td class="code">${item.id}</td><td><b>${item.name}</b></td><td>${item.description}</td>
    <td><span class="tag">${item.count}</span></td><td><span class="tag">${item.styles} kiểu dáng</span></td>
    <td class="actions">${rowActions(true)}</td></tr>`).join("");
  bindDomSearch({ initialQuery: query, rowSelector: "#categories-body tr", onQueryChange, fields: categoryFields, defaultKeys: ["code", "name"], getFieldValue: (index, field) => categoryData[index]?.[field] });
}
