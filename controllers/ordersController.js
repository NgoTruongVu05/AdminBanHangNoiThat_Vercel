import { getOrders } from "../models/orders.js";
import { bindSearch } from "./shared.js";

export function initOrders(query, rerender) {
  const rows = getOrders().filter(item => `${item[0]} ${item[1]}`.toLowerCase().includes(query.toLowerCase()));
  document.querySelector("#orders-body").innerHTML = rows.map(item => `
    <tr><td class="code">${item[0]}</td><td><b>${item[1]}</b><div class="sub">CCCD: 001201018992 · SĐT: 0912.839.221</div></td>
    <td>Lê Mai Anh<div class="sub">CCCD: 001095004455</div></td><td class="mono">Đặt: ${item[2]}<br>Giao: 2026-04-20</td>
    <td class="money">${item[3]}</td><td><span class="tag ${item[4] === "Đang giao hàng" ? "blue" : item[4].startsWith("Chờ") ? "warn" : ""}">${item[4]}</span></td>
    <td class="actions">⊙　♧</td></tr>`).join("");
  bindSearch(rerender, query);
}
