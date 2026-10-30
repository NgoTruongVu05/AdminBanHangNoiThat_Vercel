import { initRemoteTable } from "./remoteTableController.js";
import { getImports, createImport, getImportById, getImportDetails, updateImport, approveImport } from "../models/importsModel.js";
import { getProductOptions } from "../models/productsModel.js";
import { getSupplierOptions } from "../models/suppliersModel.js";
import { escapeHtml, showAlertModal, showConfirmModal } from "./shared.js";

export async function initImports(query, rerender) {
  await initRemoteTable("imports", query, rerender, getImports, {
    onEdit: row => openAddImport(row),
    onApprove: row => openApproveImport(row),
    onView: row => openViewImport(row)
  });
  const firstCard = document.querySelector("#imports-body .master-card");
  if (firstCard) firstCard.click();
}

export async function openEditImport(importRow) {
  if (!importRow || importRow.status !== "Đang nhập") {
    showAlertModal("Chỉ được sửa phiếu đang nhập.", "error");
    return;
  }
  await openAddImport(importRow);
}

export async function openApproveImport(importRow) {
  if (!importRow || importRow.status !== "Đang nhập") {
    showAlertModal("Chỉ được duyệt phiếu đang nhập.", "error");
    return;
  }
  const ok = await showConfirmModal("Bạn có chắc muốn duyệt phiếu nhập này?");
  if (!ok) return;
  try {
    await approveImport(importRow.rawId);
    document.dispatchEvent(new CustomEvent("data-added"));
    showAlertModal("Đã duyệt phiếu nhập thành công.", "success");
  } catch (error) {
    console.error("Không thể duyệt phiếu nhập:", error);
    showAlertModal(`Không thể duyệt phiếu nhập: ${error.message}`, "error");
  }
}

export async function openAddImport(existingImport = null) {
  if (existingImport && existingImport.status !== "Đang nhập") {
    showAlertModal("Chỉ được sửa phiếu đang nhập.", "error");
    return;
  }


  const [products, suppliers] = await Promise.all([getProductOptions(), getSupplierOptions()]);
  let importData = null;
  let details = [];
  if (existingImport) {
    importData = await getImportById(existingImport.rawId);
    details = await getImportDetails(existingImport.rawId);
  }

  const backdrop = document.createElement("div");
  backdrop.className = "modal-backdrop";

  const supplierOptionsHtml = suppliers.map(supplier =>
    `<option value="${escapeHtml(supplier.value)}" ${importData && String(importData.supplierId) === String(supplier.value) ? "selected" : ""}>${escapeHtml(supplier.label)}</option>`
  ).join("");

  backdrop.innerHTML = `
    <form class="modal" style="max-width:780px;">
      <h2>${existingImport ? "Sửa phiếu nhập" : "Tạo phiếu nhập"}</h2>
      <div class="form-row"><label>Ngày nhập</label><input name="ngayNhap" type="date" required value="${importData ? importData.date : new Date().toISOString().slice(0, 10)}"></div>
      <div class="form-row"><label>Nhà cung cấp</label><select name="ID_nhaCungCap" required><option value="">Chọn nhà cung cấp</option>${supplierOptionsHtml}</select></div>
      <div class="form-row"><label>Chi tiết sản phẩm</label>
        <div style="display:grid;grid-template-columns:2fr 1fr 1fr auto;gap:8px;margin-bottom:4px;font-weight:600;">
          <div>Sản phẩm</div>
          <div>Số lượng</div>
          <div>Đơn giá</div>
          <div></div>
        </div>
        <div id="import-items"></div>
        <button type="button" class="btn alt" id="add-import-item">Thêm sản phẩm</button>
      </div>
      <div class="modal-actions"><button type="button" class="btn alt" data-cancel>Hủy</button><button class="btn" type="submit">Lưu dữ liệu</button></div>
    </form>`;

  document.body.append(backdrop);
  const form = backdrop.querySelector("form");
  const itemsContainer = backdrop.querySelector("#import-items");

  const getSelectedValues = (excludeSelect) => new Set(
    [...itemsContainer.querySelectorAll('select[name="sanPham"]')]
      .filter(select => select !== excludeSelect)
      .map(select => select.value)
      .filter(Boolean)
  );

  const updateSelectOptions = (select) => {
    const current = select.value;
    const excluded = getSelectedValues(select);
    select.innerHTML = `<option value="">Chọn sản phẩm</option>` + products
      .filter(product => !excluded.has(String(product.value)))
      .map(product => `<option value="${escapeHtml(product.value)}" data-price="${escapeHtml(product.price)}" ${String(product.value) === String(current) ? "selected" : ""}>${escapeHtml(product.label)}</option>`)
      .join("");
  };

  const refreshAllSelects = () => {
    itemsContainer.querySelectorAll('select[name="sanPham"]').forEach(updateSelectOptions);
  };

  const createItemRow = (initialItem = null) => {
    const row = document.createElement("div");
    row.className = "import-item-row";
    row.style.cssText = "display:grid;grid-template-columns:2fr 1fr 1fr auto;gap:8px;margin-bottom:8px;align-items:center;";
    row.innerHTML = `
      <select name="sanPham" required></select>
      <input name="soLuong" type="text" inputmode="numeric" placeholder="Số lượng" required>
      <input name="donGia" type="text" inputmode="numeric" placeholder="Đơn giá" required>
      <button type="button" class="icon-btn danger" data-remove>×</button>`;
    const select = row.querySelector('select[name="sanPham"]');
    const qtyInput = row.querySelector('input[name="soLuong"]');
    const priceInput = row.querySelector('input[name="donGia"]');

    if (initialItem) {
      qtyInput.value = initialItem.soLuong;
      priceInput.value = initialItem.donGia;
    }

    select.addEventListener("change", () => {
      refreshAllSelects();
    });
    row.querySelector("[data-remove]").addEventListener("click", () => {
      if (itemsContainer.querySelectorAll(".import-item-row").length > 1) {
        row.remove();
        refreshAllSelects();
      }
    });
    itemsContainer.append(row);

    if (initialItem) {
      updateSelectOptions(select);
      select.value = String(initialItem.ID_sanPham);
    } else {
      updateSelectOptions(select);
    }
    refreshAllSelects();
  };

  if (existingImport && details.length) {
    details.forEach(detail => createItemRow(detail));
  } else {
    createItemRow();
  }
  backdrop.querySelector("#add-import-item").addEventListener("click", () => createItemRow());

  const close = () => backdrop.remove();
  backdrop.querySelector("[data-cancel]").onclick = close;
  backdrop.onclick = event => { if (event.target === backdrop) close(); };

  form.onsubmit = async event => {
    event.preventDefault();
    const submit = form.querySelector('button[type="submit"]');
    submit.disabled = true;
    try {
      const items = [];
      itemsContainer.querySelectorAll(".import-item-row").forEach(row => {
        const productId = row.querySelector('select[name="sanPham"]').value;
        const quantity = Number(row.querySelector('input[name="soLuong"]').value);
        const price = Number(row.querySelector('input[name="donGia"]').value);
        if (!productId) throw new Error("Vui lòng chọn sản phẩm.");
        if (!Number.isFinite(quantity) || quantity <= 0) throw new Error("Số lượng phải lớn hơn 0.");
        if (!Number.isFinite(price) || price <= 0) throw new Error("Đơn giá không hợp lệ.");
        items.push({
          ID_sanPham: Number(productId),
          soLuong: quantity,
          donGia: price,
          thanhTien: quantity * price
        });
      });
      if (!items.length) throw new Error("Vui lòng thêm ít nhất một sản phẩm.");

      const tongTien = items.reduce((sum, item) => sum + item.thanhTien, 0);
      const supplierId = form.querySelector('[name="ID_nhaCungCap"]').value;
      if (!supplierId) throw new Error("Vui lòng chọn nhà cung cấp.");
      const payload = {
        ngayNhap: form.querySelector('[name="ngayNhap"]').value,
        trangThai: 0,
        ID_nhaCungCap: Number(supplierId),
        tongTien,
        items
      };

      if (existingImport) {
        await updateImport(existingImport.rawId, payload);
      } else {
        await createImport(payload);
      }

      close();
      document.dispatchEvent(new CustomEvent("data-added"));
      showAlertModal(existingImport ? "Đã cập nhật phiếu nhập thành công." : "Đã thêm dữ liệu thành công.", "success");
    } catch (error) {
      submit.disabled = false;
      console.error(existingImport ? "Không thể cập nhật phiếu nhập:" : "Không thể tạo phiếu nhập:", error);
      showAlertModal(`Không thể ${existingImport ? "cập nhật" : "thêm"} dữ liệu: ${error.message}`, "error");
    }
  };
}


export async function openViewImport(importRow) {
  if (!importRow) return;
  const detailPanel = document.getElementById("import-detail-panel");
  if (!detailPanel) {
    showAlertModal("Không tìm thấy vùng hiển thị chi tiết phiếu nhập.", "error");
    return;
  }
  const [importData, details] = await Promise.all([
    getImportById(importRow.rawId),
    getImportDetails(importRow.rawId)
  ]);

  const backdrop = document.createElement("div");
  backdrop.className = "modal-backdrop";
  const total = details.reduce((sum, item) => sum + item.thanhTien, 0);
  const formatDate = value => {
    const [year, month, day] = String(value || "").slice(0, 10).split("-");
    return year && month && day ? `${day}/${month}/${year}` : "—";
  };
  const formatMoney = value => `${new Intl.NumberFormat("vi-VN").format(value)} ₫`;
  const status = importRow.status || "Đang nhập";
  const isCompleted = status === "Đã hoàn tất";
  const rowsHtml = details.map(item => `
    <tr>
      <td><div class="import-product"><span class="import-product-icon material-symbols-outlined" aria-hidden="true">deployed_code</span><span>${escapeHtml(item.productName)}</span></div></td>
      <td><span class="import-quantity">${item.soLuong}</span></td>
      <td>${formatMoney(item.donGia)}</td>
      <td class="import-total-cell">${formatMoney(item.thanhTien)}</td>
    </tr>`).join("");

  backdrop.innerHTML = `
    <section class="modal import-detail-modal" role="dialog" aria-modal="true" aria-labelledby="import-detail-title">
      <header class="import-detail-header ${isCompleted ? "import-status-completed" : "import-status-pending"}">
        <div class="import-detail-title-icon material-symbols-outlined" aria-hidden="true">description</div>
        <div class="import-detail-header-main">
          <div class="import-summary">
            <div class="import-summary-item"><span class="import-summary-icon material-symbols-outlined" aria-hidden="true">calendar_month</span><div><span class="import-summary-label">NGÀY NHẬP</span><strong>${formatDate(importData?.date || importRow.date)}</strong></div></div>
            <div class="import-summary-item"><span class="import-summary-icon material-symbols-outlined" aria-hidden="true">business</span><div><span class="import-summary-label">NHÀ CUNG CẤP</span><strong>${escapeHtml(importData?.supplierName || importRow.supplier)}</strong></div></div>
          </div>
        </div>
        <span class="import-status"><span></span>${escapeHtml(status)}</span>
        ${!isCompleted ? `<div class="detail-actions"><button type="button" class="btn alt" data-detail-edit>Sửa</button><button type="button" class="btn" data-detail-approve>Duyệt phiếu</button></div>` : ""}
      </header>
      <div class="import-detail-content">
        <div class="import-products-heading"><h3>DANH SÁCH SẢN PHẨM</h3><span>${details.length} sản phẩm</span></div>
        <div class="import-products-table-wrap">
          <div class="import-products-scroll">
            <table class="import-products-table">
              <thead><tr><th>SẢN PHẨM</th><th>SỐ LƯỢNG</th><th>ĐƠN GIÁ</th><th>THÀNH TIỀN</th></tr></thead>
              <tbody>${rowsHtml || "<tr><td colspan=\"4\" class=\"import-empty\">Không có chi tiết</td></tr>"}</tbody>
            </table>
          </div>
          <div class="import-grand-total"><strong>Tổng tiền thanh toán</strong><strong>${formatMoney(total)}</strong></div>
        </div>
      </div>
    </section>`;

  detailPanel.innerHTML = backdrop.querySelector("section").innerHTML;
  detailPanel.classList.remove("promotion-detail-panel");
  detailPanel.querySelector("[data-detail-edit]")?.addEventListener("click", () => openAddImport(importRow));
  detailPanel.querySelector("[data-detail-approve]")?.addEventListener("click", () => openApproveImport(importRow));
  document.querySelectorAll("#imports-body .master-card").forEach(card => card.classList.toggle("active", card.dataset.rowId === String(importRow.rawId)));
}
