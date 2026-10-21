import { bindSearch } from "./shared.js";

export function initWoods(query, rerender, data) {
  const rows = data.woods.filter(item => `${item[0]} ${item[1]}`.toLowerCase().includes(query.toLowerCase()));
  document.querySelector("#woods-body").innerHTML = rows.map(item => `
    <tr><td class="code">${item[0]}</td><td><b>${item[1]}</b></td><td>${item[2]}</td>
    <td><span class="tag">${item[3]} sản phẩm</span></td><td class="actions">♢　♧</td></tr>`).join("");
  bindSearch(rerender, query);
}
