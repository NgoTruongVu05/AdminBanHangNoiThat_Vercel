import { bindSearch, rowActions } from "./shared.js";
import { getWoods, createWood } from "../models/woodsModel.js";
import { showAddForm } from "./shared.js";

export function openAddWood() {
  showAddForm({
    title: "Thêm loại gỗ",
    fields: [{ name: "tenGo", label: "Tên loại gỗ" }],
    onSubmit: data => createWood({ tenGo: data.tenGo, trangThai: 1 })
  });
}

export async function initWoods(query, rerender) {
  const woods = await getWoods();
  const rows = woods.filter(item => `${item[0]} ${item[1]}`.toLowerCase().includes(query.toLowerCase()));
  document.querySelector("#woods-body").innerHTML = rows.map(item => `
    <tr><td class="code">${item[0]}</td><td><b>${item[1]}</b></td><td>${item[2]}</td>
    <td><span class="tag">${item[3]} sản phẩm</span></td><td class="actions">${rowActions(true)}</td></tr>`).join("");
  bindSearch(rerender, query);
}
