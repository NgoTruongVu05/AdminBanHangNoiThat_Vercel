import { bindSearch, rowActions } from "./shared.js";
import { getWoods } from "../models/woodsModel.js";

let dataPromise;

export async function initWoods(query, rerender) {
  dataPromise ??= getWoods();
  const woods = await dataPromise;
  const rows = woods.filter(item => `${item[0]} ${item[1]}`.toLowerCase().includes(query.toLowerCase()));
  document.querySelector("#woods-body").innerHTML = rows.map(item => `
    <tr><td class="code">${item[0]}</td><td><b>${item[1]}</b></td><td>${item[2]}</td>
    <td><span class="tag">${item[3]} sản phẩm</span></td><td class="actions">${rowActions(true)}</td></tr>`).join("");
  bindSearch(rerender, query);
}
