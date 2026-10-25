import { bindDomSearch, rowActions } from "./shared.js";
import { getOrders } from "../models/ordersModel.js";

const escape = value => String(value ?? "").replace(/[&<>"']/g, character => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#039;" }[character]));

let dataPromise;

export async function initOrders(query, onQueryChange) {
  dataPromise ??= getOrders();
  const orders = await dataPromise;
  const orderData = orders.map(item => ({ code: item[0], name: item[1], date: item[2], amount: item[3], status: item[4] }));
  const orderFields = { date: "Ngày đặt", amount: "Tổng tiền" };
  document.querySelector("#orders-body").innerHTML = orders.map((item, index) => `
    <tr data-row-index="${index}"><td class="code">${item[0]}</td><td><b>${item[1]}</b><div class="sub">CCCD: 001201018992 · SĐT: 0912.839.221</div></td>
    <td>Lê Mai Anh<div class="sub">CCCD: 001095004455</div></td><td class="mono">Đặt: ${item[2]}<br>Giao: 2026-04-20</td>
    <td class="money">${item[3]}</td><td><span class="tag ${item[4] === "Đang giao hàng" ? "blue" : item[4].startsWith("Chờ") ? "warn" : ""}">${item[4]}</span></td>
    <td class="actions">${rowActions(true)}</td></tr>`).join("");
  document.querySelectorAll("#orders-body tr").forEach((row, index) => {
    row.dataset.search = `${orders[index][0]} ${orders[index][1]}`.toLowerCase();
  });
  const orderFilter = document.querySelector("#order-filter");
if (orderFilter) {
  const current = orderFilter.value;
  const values = ["Chờ xác nhận", "Đã hoàn tất"];
  orderFilter.innerHTML = `<option value="">Tất cả trạng thái</option>` + values.map(value => `<option value="${escape(value)}">${escape(value)}</option>`).join("");
  if ([...orderFilter.options].some(option => option.value === current)) orderFilter.value = current;
  else orderFilter.value = "";
}
bindDomSearch({ initialQuery: query, rowSelector: "#orders-body tr", onQueryChange, fields: orderFields, defaultKeys: ["code", "name"], defaultLabel: "Mã và khách hàng", getFieldValue: (index, field) => orderData[index]?.[field], sideFilters: [{ selector: "#order-filter", getValue: (row, rowIndex) => orderData[rowIndex]?.status }] });
}
