import { bindSearch } from "./shared.js";

export function initCategories(query, rerender, data) {
  const rows = data.categories.filter(item => `${item.id} ${item.name}`.toLowerCase().includes(query.toLowerCase()));
  document.querySelector("#categories-body").innerHTML = rows.map(item => `
    <tr><td class="code">${item.id}</td><td><b>${item.name}</b></td><td>${item.description}</td>
    <td><span class="tag">${item.count}</span></td><td><span class="tag">${item.styles} kiểu dáng</span></td>
    <td class="actions">♢　♧</td></tr>`).join("");
  bindSearch(rerender, query);
}
