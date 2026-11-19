import { bindDomSearch, showConfirmModal, showAlertModal, materialIcon } from "./shared.js";
import { getOrders, approveOrder, cancelOrder, getOrderById, getOrderDetails } from "../models/ordersModel.js";

const escape = value => String(value ?? "").replace(/[&<>"']/g, character => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#039;" }[character]));

export async function initOrders(query, onQueryChange) {
  const orders = await getOrders();
  const orderData = orders.map(item => ({ code: item[0], name: item[1], date: item[2], amount: item[3], status: item[5] }));
  document.querySelector("#orders-body").innerHTML = orders.map((item, index) => {
    const trangThai = Number(item[7]);
    const tagClass = trangThai === 2 ? "green" : trangThai === 0 ? "locked" : "warn";
    return `<tr data-row-index="${index}" data-order-id="${escape(item[6])}"><td class="code">${escape(item[0])}</td><td><b>${escape(item[1])}</b></td><td>${escape(item[8])}</td><td class="mono">${escape(item[2])}</td><td class="mono">${escape(item[9] || "—")}</td><td class="money">${escape(item[3])}</td><td class="money payable">${escape(item[4])}</td><td><span class="tag ${tagClass}">${escape(item[5])}</span></td><td class="actions">${trangThai === 1 ? `<button type="button" class="icon-btn success" title="Duyệt hóa đơn" data-order-approve="${index}">${materialIcon("check_circle")}</button><button type="button" class="icon-btn danger" title="Hủy hóa đơn" data-order-cancel="${index}">${materialIcon("cancel")}</button>` : `<span class="muted">—</span>`}</td></tr>`;
  }).join("");
  const count = document.querySelector("#orders-count");
  if (count) count.textContent = `${orders.length} hóa đơn`;
  document.querySelectorAll("#orders-body tr").forEach((row, index) => {
    row.dataset.search = `${orders[index][0]} ${orders[index][1]}`.toLowerCase();
  });
  const orderFilter = document.querySelector("#order-filter");
  if (orderFilter) {
    const current = orderFilter.value;
    const values = ["Đang duyệt", "Đã hoàn thành", "Đã hủy"];
    orderFilter.innerHTML = `<option value="">Tất cả trạng thái</option>` + values.map(value => `<option value="${escape(value)}">${escape(value)}</option>`).join("");
    if ([...orderFilter.options].some(option => option.value === current)) orderFilter.value = current;
    else orderFilter.value = "";
  }
  bindDomSearch({ initialQuery: query,   rowSelector: "#orders-body tr", onQueryChange, fields: { date: "Ngày đặt", amount: "Tổng tiền" }, defaultKeys: ["code", "name"], defaultLabel: "Mã và khách hàng", getFieldValue: (index, field) => orderData[index]?.[field], sideFilters: [{ selector: "#order-filter", getValue: (row, rowIndex) => orderData[rowIndex]?.status }] });

  document.querySelectorAll("#orders-body tr").forEach(card => {
    const index = Number(card.dataset.rowIndex);
    card.onclick = event => {
      if (event.target.closest("button")) return;
      openViewOrder(orders[index]).catch(error => showAlertModal(`Không thể xem chi tiết: ${error.message}`, "error"));
    };
  });

  document.querySelectorAll("#orders-body [data-order-cancel]").forEach(button => button.onclick = event => {
    event.stopPropagation();
    openCancelOrder(orders[Number(button.dataset.orderCancel)]);
  });
  document.querySelectorAll("#orders-body [data-order-approve]").forEach(button => button.onclick = event => {
    event.stopPropagation();
    openApproveOrder(orders[Number(button.dataset.orderApprove)]);
  });

}

export async function openApproveOrder(order) {
  if (!order || Number(order[7]) !== 1) {
    showAlertModal("Chỉ được duyệt hóa đơn đang duyệt.", "error");
    return;
  }
  const ok = await showConfirmModal("Bạn có chắc muốn duyệt hóa đơn này?");
  if (!ok) return;
  try {
    await approveOrder(order[6]);
    document.dispatchEvent(new CustomEvent("data-added"));
    showAlertModal("Đã duyệt hóa đơn thành công.", "success");
  } catch (error) {
    console.error("Không thể duyệt hóa đơn:", error);
    showAlertModal(`Không thể duyệt hóa đơn: ${error.message}`, "error");
  }
}

export async function openCancelOrder(order) {
  if (!order || Number(order[7]) !== 1) {
    showAlertModal("Chỉ được hủy hóa đơn đang duyệt.", "error");
    return;
  }
  const ok = await showConfirmModal("Bạn có chắc muốn hủy hóa đơn này?");
  if (!ok) return;
  try {
    await cancelOrder(order[6]);
    document.dispatchEvent(new CustomEvent("data-added"));
    showAlertModal("Đã hủy hóa đơn thành công.", "success");
  } catch (error) {
    console.error("Không thể hủy hóa đơn:", error);
    showAlertModal(`Không thể hủy hóa đơn: ${error.message}`, "error");
  }
}

export async function openViewOrder(order) {
  const detailPanel = document.getElementById("order-detail-panel");
  if (!detailPanel) {
    showAlertModal("Không tìm thấy vùng hiển thị chi tiết hóa đơn.", "error");
    return;
  }
  const formatMoney = value => `${new Intl.NumberFormat("vi-VN").format(value)} ₫`;
  const [detail, items] = await Promise.all([getOrderById(order[6]), getOrderDetails(order[6])]);
  if (!detail) {
    showAlertModal("Không tìm thấy hóa đơn.", "error");
    return;
  }
  const rowsHtml = items.map(item => `
      <tr><td><div class="import-product"><span class="import-product-icon material-symbols-outlined" aria-hidden="true">deployed_code</span><span>${escape(item.productName)}</span></div></td>
      <td><span class="import-quantity">${item.soLuong}</span></td>
      <td>${formatMoney(item.donGia)}</td>
      <td class="import-total-cell">${formatMoney(item.thanhTien)}</td>
    </tr>`).join("");

  detailPanel.innerHTML = `
    <div class="detail-table-wrap">
      <table class="detail-table">
        <thead><tr><th>SẢN PHẨM</th><th>SỐ LƯỢNG</th><th>ĐƠN GIÁ</th><th>THÀNH TIỀN</th></tr></thead>
        <tbody>${rowsHtml || "<tr><td colspan=\"4\" class=\"import-empty\">Không có chi tiết</td></tr>"}</tbody>
      </table>
    </div>
    <div class="detail-promotions">
      <span>Khuyến mãi áp dụng</span>
      <div>${detail.promotionLabels.length ? detail.promotionLabels.map(label => `<span class="promotion-chip">${escape(label)}</span>`).join("") : "<span class=\"muted\">Không có</span>"}</div>
    </div>
    <div class="detail-total">
      <span>Tổng tiền hàng</span><strong>${formatMoney(detail.total)}</strong>
      <span>Tiền khuyến mãi</span><strong class="discount">${formatMoney(detail.promotionAmount)}</strong>
      <span>Thành tiền (sau CTKM)</span><strong>${formatMoney(detail.payableTotal)}</strong>
    </div>`;
  detailPanel.classList.remove("promotion-detail-panel");
  document.querySelectorAll("#orders-body tr").forEach(card => card.classList.toggle("active", card.dataset.orderId === String(order[6])));
}
