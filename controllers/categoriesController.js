import { bindSearch, rowActions } from "./shared.js";
import { getCategories, createCategory } from "../models/categoriesModel.js";
import { showAddForm } from "./shared.js";

export function openAddCategory() {
  showAddForm({
    title: "Thêm loại sản phẩm",
    fields: [{ name: "tenLoai", label: "Tên loại sản phẩm" }],
    onSubmit: data => createCategory({ tenLoai: data.tenLoai, trangThai: 1 })
  });
}

export async function initCategories(query, rerender) {
  const categories = await getCategories();
  const rows = categories.filter(item => `${item.id} ${item.name}`.toLowerCase().includes(query.toLowerCase()));
  document.querySelector("#categories-body").innerHTML = rows.map(item => `
    <tr><td class="code">${item.id}</td><td><b>${item.name}</b></td><td>${item.description}</td>
    <td><span class="tag">${item.count}</span></td><td><span class="tag">${item.styles} kiểu dáng</span></td>
    <td class="actions">${rowActions(true)}</td></tr>`).join("");
  bindSearch(rerender, query);
}
