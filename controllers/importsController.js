import { initRemoteTable } from "./remoteTableController.js";
import { getImports, createImport } from "../models/importsModel.js";
import { getProductOptions } from "../models/productsModel.js";
import { getSupplierOptions } from "../models/suppliersModel.js";
import { escapeHtml, showAlertModal } from "./shared.js";

export function initImports(query, rerender) {
  return initRemoteTable("imports", query, rerender, getImports);
}

export async function openAddImport() {
  const [products, suppliers] = await Promise.all([getProductOptions(), getSupplierOptions()]);

  const backdrop = document.createElement("div");
  backdrop.className = "modal-backdrop";

  const supplierOptionsHtml = suppliers.map(supplier =>
    `<option value="${escapeHtml(supplier.value)}">${escapeHtml(supplier.label)}</option>`
  ).join("");

  backdrop.innerHTML = `
    <form class="modal" style="max-width:780px;">
      <h2>Tạo phiếu nhập</h2>
      <div class="form-row"><label>Ngày nhập</label><input name="ngayNhap" type="date" required value="${new Date().toISOString().slice(0, 10)}"></div>
      <div class="form-row"><label>Nhà cung cấp</label><select name="ID_nhaCungCap" required><option value="">Chọn nhà cung cấp</option>${supplierOptionsHtml}</select></div>
      <div class="form-row"><label>Trạng thái</label><select name="trangThai" required><option value="0">Đang nhập</option><option value="1">Đã hoàn tất</option></select></div>
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

  const createItemRow = () => {
    const row = document.createElement("div");
    row.className = "import-item-row";
    row.style.cssText = "display:grid;grid-template-columns:2fr 1fr 1fr auto;gap:8px;margin-bottom:8px;align-items:center;";
    row.innerHTML = `
      <select name="sanPham" required></select>
      <input name="soLuong" type="text" inputmode="numeric" placeholder="Số lượng" required>
      <input name="donGia" type="text" inputmode="numeric" placeholder="Đơn giá" required>
      <button type="button" class="icon-btn danger" data-remove>×</button>`;
    const select = row.querySelector('select[name="sanPham"]');
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
    updateSelectOptions(select);
    refreshAllSelects();
  };

  createItemRow();
  backdrop.querySelector("#add-import-item").addEventListener("click", createItemRow);

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
      await createImport({
        ngayNhap: form.querySelector('[name="ngayNhap"]').value,
        trangThai: Number(form.querySelector('[name="trangThai"]').value),
        ID_nhaCungCap: Number(form.querySelector('[name="ID_nhaCungCap"]').value),
        tongTien,
        items
      });

      close();
      document.dispatchEvent(new CustomEvent("data-added"));
      showAlertModal("Đã thêm dữ liệu thành công.", "success");
    } catch (error) {
      submit.disabled = false;
      console.error("Không thể tạo phiếu nhập:", error);
      showAlertModal(`Không thể thêm dữ liệu: ${error.message}`, "error");
    }
  };
}
