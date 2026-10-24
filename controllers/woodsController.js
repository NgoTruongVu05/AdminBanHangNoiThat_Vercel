import { bindDomSearch, rowActions, escapeHtml } from "./shared.js";
import { getWoods, createWood } from "../models/woodsModel.js";
import { showAddForm } from "./shared.js";

export function openAddWood() {
  showAddForm({
    title: "Thêm loại gỗ",
    fields: [{ name: "tenGo", label: "Tên loại gỗ" }],
    onSubmit: data => createWood({ tenGo: data.tenGo, trangThai: 1 })
  });
}

export async function initWoods(query, onQueryChange) {
  const woods = await getWoods();
  const woodData = woods.map(item => ({ code: item[0], name: item[1], count: item[3] }));
  const woodFields = { count: "Số sản phẩm" };
  document.querySelector("#woods-body").innerHTML = woods.map((item, index) => `<tr data-row-index="${index}" data-search="${escapeHtml(`${item[0]} ${item[1]}`.toLowerCase())}"><td class="code">${item[0]}</td><td><b>${item[1]}</b></td><td>${item[2]}</td>
    <td><span class="tag">${item[3]} sản phẩm</span></td><td class="actions">${rowActions(true)}</td></tr>`).join("");
  bindDomSearch({ initialQuery: query, rowSelector: "#woods-body tr", onQueryChange, fields: woodFields, defaultKeys: ["code", "name"], getFieldValue: (index, field) => woodData[index]?.[field] });
}
