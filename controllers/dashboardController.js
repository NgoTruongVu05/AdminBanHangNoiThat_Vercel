import { getProducts } from "../models/products.js";
import { getWoods } from "../models/woods.js";
import { getOrders } from "../models/orders.js";

export function initDashboard() {
  const products = getProducts();
  const woods = getWoods();
  const orders = getOrders();
  document.querySelector("#revenue-chart").innerHTML = [58, 78, 68, 54, 78, 78].map((height, index) => `<div class="bar-wrap"><div class="bar ${index === 5 ? "active" : ""}" style="height:${height}%"></div><span class="bar-label">${["Tháng 11", "Tháng 12", "Tháng 01", "Tháng 02", "Tháng 03", "Tháng 04"][index]}</span></div>`).join("");
  document.querySelector("#wood-list").innerHTML = woods.map(item => `<div class="wood-item"><div class="wood-row"><b>${item[1]}</b><span>${item[3]} mẫu (${Math.round(item[3] / 8 * 100)}%)</span></div><div class="progress"><i style="width:${item[3] / 8 * 100}%"></i></div></div>`).join("");
  document.querySelector("#stock-alerts").innerHTML = products.filter(item => item.stock <= 3).map(item => `<div class="alert-row"><div><div class="alert-name">${item.name}</div><small>Mã: ${item.id} · Chất liệu: ${item.wood}</small></div><div class="quantity">${item.stock} cái<small>${item.stock === 2 ? "Hết hàng" : "Cần nhập thêm"}</small></div></div>`).join("");
  document.querySelector("#recent-orders").innerHTML = orders.map(item => `<div class="order-row"><div><div class="order-name"><span class="code">${item[0]}</span>　${item[1]}</div><small>Ngày đặt: ${item[2]} · Trạng thái: ${item[4]}</small></div><div class="quantity">${item[3]}</div></div>`).join("");
}
