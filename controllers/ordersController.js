import { bindDomSearch, showConfirmModal, showAlertModal, materialIcon } from "./shared.js";
import { getOrders, approveOrder, cancelOrder, getOrderById, getOrderDetails } from "../models/ordersModel.js";

const escape = value => String(value ?? "").replace(/[&<>"']/g, character => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#039;" }[character]));

export async function initOrders(query, onQueryChange) {
  const orders = await getOrders();
  const orderData = orders.map(item => ({ code: item[0], name: item[1], date: item[2], amount: item[3], status: item[4] }));
  document.querySelector("#orders-body").innerHTML = orders.map((item, index) => {
    const trangThai = Number(item[6]);
    const tagClass = trangThai === 2 ? "green" : trangThai === 0 ? "locked" : "warn";
    const viewButton = `<button type="button" class="icon-btn" title="Xem chi tiết" aria-label="Xem chi tiết" data-view-index="${index}">${materialIcon("visibility")}</button>`;
    const cancelButton = trangThai === 1
      ? `<button type="button" class="icon-btn danger" title="Hủy" aria-label="Hủy" data-cancel-index="${index}">${materialIcon("cancel")}</button>`
      : "";
    const approveButton = trangThai === 1
      ? `<button type="button" class="icon-btn" title="Duyệt" aria-label="Duyệt" data-approve-index="${index}">${materialIcon("check")}</button>`
      : "";
    return `<tr data-row-index="${index}"><td class="code">${item[0]}</td><td><b>${item[1]}</b><div class="sub">CCCD: 001201018992 · SĐT: 0912.839.221</div></td>
    <td>Lê Mai Anh<div class="sub">CCCD: 001095004455</div></td><td class="mono">Đặt: ${item[2]}<br>Giao: 2026-04-20</td>
    <td class="money">${item[3]}</td><td><span class="tag ${tagClass}">${item[4]}</span></td>
    <td class="actions">${viewButton}${cancelButton}${approveButton}</td></tr>`;
  }).join("");
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
  bindDomSearch({ initialQuery: query, rowSelector: "#orders-body tr", onQueryChange, fields: { date: "Ngày đặt", amount: "Tổng tiền" }, defaultKeys: ["code", "name"], defaultLabel: "Mã và khách hàng", getFieldValue: (index, field) => orderData[index]?.[field], sideFilters: [{ selector: "#order-filter", getValue: (row, rowIndex) => orderData[rowIndex]?.status }] });

  document.querySelectorAll("#orders-body [data-view-index]").forEach(button => {
    const index = Number(button.dataset.viewIndex);
    button.onclick = () => openViewOrder(orders[index]).catch(error => showAlertModal(`Không thể xem chi tiết: ${error.message}`, "error"));
  });

  document.querySelectorAll("#orders-body [data-cancel-index]").forEach(button => {
    const index = Number(button.dataset.cancelIndex);
    button.onclick = () => openCancelOrder(orders[index]).catch(error => showAlertModal(`Không thể hủy hóa đơn: ${error.message}`, "error"));
  });

  document.querySelectorAll("#orders-body [data-approve-index]").forEach(button => {
    const index = Number(button.dataset.approveIndex);
    button.onclick = () => openApproveOrder(orders[index]).catch(error => showAlertModal(`Không thể duyệt hóa đơn: ${error.message}`, "error"));
  });
}

export async function openApproveOrder(order) {
  if (!order || Number(order[6]) !== 1) {
    showAlertModal("Chỉ được duyệt hóa đơn đang duyệt.", "error");
    return;
  }
  const ok = await showConfirmModal("Bạn có chắc muốn duyệt hóa đơn này?");
  if (!ok) return;
  try {
    await approveOrder(order[5]);
    document.dispatchEvent(new CustomEvent("data-added"));
    showAlertModal("Đã duyệt hóa đơn thành công.", "success");
  } catch (error) {
    console.error("Không thể duyệt hóa đơn:", error);
    showAlertModal(`Không thể duyệt hóa đơn: ${error.message}`, "error");
  }
}

export async function openCancelOrder(order) {
  if (!order || Number(order[6]) !== 1) {
    showAlertModal("Chỉ được hủy hóa đơn đang duyệt.", "error");
    return;
  }
  const ok = await showConfirmModal("Bạn có chắc muốn hủy hóa đơn này?");
  if (!ok) return;
  try {
    await cancelOrder(order[5]);
    document.dispatchEvent(new CustomEvent("data-added"));
    showAlertModal("Đã hủy hóa đơn thành công.", "success");
  } catch (error) {
    console.error("Không thể hủy hóa đơn:", error);
    showAlertModal(`Không thể hủy hóa đơn: ${error.message}`, "error");
  }
}

export async function openViewOrder(order) {
  const formatMoney = value => `${new Intl.NumberFormat("vi-VN").format(value)} ₫`;
  const formatDate = value => value ? String(value).slice(0, 10) : "";
  const detail = await getOrderById(order[5]);
  const items = await getOrderDetails(order[5]);
  if (!detail) {
    showAlertModal("Không tìm thấy hóa đơn.", "error");
    return;
  }
  const isCompleted = detail.trangThai === 2;
  const isCanceled = detail.trangThai === 0;
  const statusBannerClass = isCanceled ? "import-status-canceled" : isCompleted ? "import-status-completed" : "import-status-pending";
  const statusIcon = isCanceled ? "cancel" : isCompleted ? "check_circle" : "pending";
  const rowsHtml = items.map(item => `
      <td><div class="import-product"><span class="import-product-icon material-symbols-outlined" aria-hidden="true">deployed_code</span><span>${escape(item.productName)}</span></div></td>
      <td><span class="import-quantity">${item.soLuong}</span></td>
      <td>${formatMoney(item.donGia)}</td>
      <td class="import-total-cell">${formatMoney(item.thanhTien)}</td>
    </tr>`).join("");

  const backdrop = document.createElement("div");
  backdrop.className = "modal-backdrop";
  backdrop.innerHTML = `
    <section class="modal import-detail-modal" role="dialog" aria-modal="true" aria-labelledby="order-detail-title">
      <header class="import-detail-header">
        <div class="import-detail-title-icon material-symbols-outlined" aria-hidden="true">receipt_long</div>
        <div>
          <div class="import-detail-title-row">
            <h2 id="order-detail-title">Chi tiết hóa đơn</h2>
            <span class="import-code">${escape(detail.id)}</span>
          </div>
          <p>Thông tin chi tiết đơn hàng bán hàng</p>
        </div>
        <button type="button" class="import-detail-close" data-close aria-label="Đóng"><span class="material-symbols-outlined" aria-hidden="true">close</span></button>
      </header>
      <div class="import-detail-content">
        <div class="import-summary">
          <div class="import-summary-item">
            <span class="import-summary-icon material-symbols-outlined" aria-hidden="true">qr_code_2</span>
            <div><span class="import-summary-label">MÃ HÓA ĐƠN</span><strong>${escape(detail.id)}</strong></div>
          </div>
          <div class="import-summary-item">
            <span class="import-summary-icon material-symbols-outlined" aria-hidden="true">calendar_month</span>
            <div><span class="import-summary-label">NGÀY ĐẶT</span><strong>${escape(formatDate(detail.date))}</strong></div>
          </div>
          <div class="import-summary-item">
            <span class="import-summary-icon material-symbols-outlined" aria-hidden="true">person</span>
            <div><span class="import-summary-label">KHÁCH HÀNG</span><strong>${escape(detail.customerName)}</strong></div>
          </div>
          <div class="import-summary-item">
            <span class="import-summary-icon material-symbols-outlined" aria-hidden="true">badge</span>
            <div><span class="import-summary-label">NHÂN VIÊN LẬP</span><strong>${escape(detail.employeeName || "—")}</strong></div>
          </div>
        </div>
        <div class="import-status-banner ${statusBannerClass}">
          <div><span class="material-symbols-outlined" aria-hidden="true">${statusIcon}</span><span>Trạng thái hóa đơn</span></div>
          <span class="import-status"><span></span>${escape(detail.statusText)}</span>
        </div>
        <div class="import-products-heading"><h3>DANH SÁCH SẢN PHẨM</h3><span>${items.length} sản phẩm</span></div>
        <div class="import-products-table-wrap">
          <div class="import-products-scroll">
            <table class="import-products-table">
              <thead><tr><th>SẢN PHẨM</th><th>SỐ LƯỢNG</th><th>ĐƠN GIÁ</th><th>THÀNH TIỀN</th></tr></thead>
              <tbody>${rowsHtml || "<tr><td colspan=\"4\" class=\"import-empty\">Không có chi tiết</td></tr>"}</tbody>
            </table>
          </div>
          <div class="import-grand-total"><strong>Tổng tiền thanh toán</strong><strong>${formatMoney(detail.total)}</strong></div>
        </div>
      </div>
    </section>`;
  document.body.append(backdrop);
  const close = () => backdrop.remove();
  backdrop.querySelector("[data-close]").onclick = close;
  backdrop.onclick = event => { if (event.target === backdrop) close(); };
}