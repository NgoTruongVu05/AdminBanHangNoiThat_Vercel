import { getPromotions, getPrograms, getPromotionsByType, createPromotionsBulk, updateProgram, updatePromotionRule } from "../models/promotionsModel.js";
import { getProductOptions } from "../models/productsModel.js";
import { escapeHtml, showAlertModal, showConfirmModal, showEditForm, materialIcon } from "./shared.js";

const typeLabels = {
  product: "Theo sản phẩm",
  invoice: "Theo hóa đơn",
  voucher: "Theo voucher"
};

let activePromoTab = "programs";

export function initPromotions(query, rerender) {
  const addBtn = document.getElementById("add-btn");
  const updateAddButton = tab => {
    if (addBtn) addBtn.style.display = tab === "programs" ? "" : "none";
  };

  const activateTab = tab => {
    activePromoTab = tab || "programs";
    document.querySelectorAll(".promo-tab").forEach(item => item.classList.toggle("active", item.dataset.promoTab === activePromoTab));
    document.querySelectorAll(".promo-panel").forEach(panel => {
      panel.style.display = panel.dataset.promoPanel === activePromoTab ? "" : "none";
    });
    updateAddButton(activePromoTab);
  };

  document.querySelectorAll(".promo-tab").forEach(button => {
    button.onclick = () => activateTab(button.dataset.promoTab);
  });

  const bindRuleButton = (id, type) => {
    const button = document.getElementById(id);
    if (button) button.onclick = () => {
      Promise.resolve(openAddPromotion(type)).catch(error => {
        console.error("Không thể mở biểu mẫu thêm CTKM:", error);
      });
    };
  };
  bindRuleButton("add-product-promo-btn", "product");
  bindRuleButton("add-invoice-promo-btn", "invoice");
  bindRuleButton("add-voucher-promo-btn", "voucher");

  activateTab(activePromoTab);

  ["product", "invoice", "voucher"].forEach(type => {
    const select = document.getElementById(`${type}-program-filter`);
    if (select) select.onchange = () => renderTypePanel(type);
  });

  loadAndRender();
}

async function loadAndRender() {
  const programs = await getPrograms();
  const body = document.getElementById("programs-body");
  if (body) {
    body.innerHTML = programs.map(program => `
      <article class="master-card" data-view-program="${escapeHtml(program.id)}">
        <div class="master-card-top"><span class="master-card-code">${escapeHtml(program.id)}</span><span class="tag ${Number(program.trangThai) === 0 ? "locked" : "green"}">${escapeHtml(program.status)}</span></div>
        <div class="master-card-title">${escapeHtml(program.name)}</div>
        <div class="master-card-meta"><span class="material-symbols-outlined">date_range</span>${escapeHtml(program.ngayBD)} – ${escapeHtml(program.ngayKT)}<span>•</span>${program.count} CTKM</div>
      </article>
    `).join("");
    body.querySelectorAll(".master-card").forEach(card => {
      card.onclick = event => {
        if (event.target.closest("button")) return;
        Promise.resolve(openViewProgram(card.dataset.viewProgram)).catch(error => console.error(error));
      };
    });
    const firstProgram = body.querySelector("[data-view-program]");
    if (firstProgram) firstProgram.click();
  }

  ["product", "invoice", "voucher"].forEach(type => {
    const select = document.getElementById(`${type}-program-filter`);
    if (!select) return;
    const current = select.value;
    select.innerHTML = `<option value="">Tất cả chương trình</option>` +
      programs.map(program => `<option value="${escapeHtml(program.id)}">${escapeHtml(program.name)}</option>`).join("");
    select.value = current;
  });

  await renderTypePanel("product");
  await renderTypePanel("invoice");
  await renderTypePanel("voucher");
}

async function renderTypePanel(type) {
  const body = document.getElementById(`${type}-promos-body`);
  if (!body) return;
  const select = document.getElementById(`${type}-program-filter`);
  const programName = select ? select.value : "";
  const items = await getPromotionsByType(typeLabels[type], programName);
  body.innerHTML = items.map(item => {
    if (type === "product") {
      return `
        <tr>
          <td>${escapeHtml(item.programId || item.id)}</td>
          <td>${escapeHtml(item.name)}</td>
          <td>${escapeHtml(item.sanPham)}</td>
          <td>${escapeHtml(item.mucGiam)}</td>
          <td>${escapeHtml(item.ngayBD)}</td>
          <td>${escapeHtml(item.ngayKT)}</td>
          <td><span class="tag ${Number(item.trangThai) === 0 ? "locked" : "green"}">${escapeHtml(item.status)}</span></td>
          <td class="actions">
            <button type="button" class="icon-btn" title="Sửa" data-edit-rule="${escapeHtml(item.id)}">${materialIcon("edit")}</button>
            <button type="button" class="icon-btn" title="${Number(item.trangThai) === 0 ? "Mở khóa" : "Khóa"}" data-toggle-rule="${escapeHtml(item.id)}" data-type="${type}" data-next-status="${Number(item.trangThai) === 0 ? 1 : 0}">${materialIcon(Number(item.trangThai) === 0 ? "lock_open" : "lock")}</button>
          </td>
        </tr>
      `;
    }
    if (type === "invoice") {
      return `
        <tr>
          <td>${escapeHtml(item.id)}</td>
          <td>${escapeHtml(item.name)}</td>
          <td>${escapeHtml(item.minTotal)}</td>
          <td>${escapeHtml(item.mucGiam)}</td>
          <td>${escapeHtml(item.ngayBD)}</td>
          <td>${escapeHtml(item.ngayKT)}</td>
          <td><span class="tag ${Number(item.trangThai) === 0 ? "locked" : "green"}">${escapeHtml(item.status)}</span></td>
          <td class="actions">
            <button type="button" class="icon-btn" title="Sửa" data-edit-rule="${escapeHtml(item.id)}">${materialIcon("edit")}</button>
            <button type="button" class="icon-btn" title="${Number(item.trangThai) === 0 ? "Mở khóa" : "Khóa"}" data-toggle-rule="${escapeHtml(item.id)}" data-type="${type}" data-next-status="${Number(item.trangThai) === 0 ? 1 : 0}">${materialIcon(Number(item.trangThai) === 0 ? "lock_open" : "lock")}</button>
          </td>
        </tr>
      `;
    }
    return `
      <tr>
        <td>${escapeHtml(item.id)}</td>
        <td>${escapeHtml(item.name)}</td>
        <td>${escapeHtml(item.maVoucher)}</td>
        <td>${escapeHtml(item.mucGiam)}</td>
        <td>${escapeHtml(item.soLuong)}</td>
        <td>${escapeHtml(item.ngayBD)}</td>
        <td>${escapeHtml(item.ngayKT)}</td>
        <td><span class="tag ${Number(item.trangThai) === 0 ? "locked" : "green"}">${escapeHtml(item.status)}</span></td>
        <td class="actions">
          <button type="button" class="icon-btn" title="Sửa" data-edit-rule="${escapeHtml(item.id)}">${materialIcon("edit")}</button>
            <button type="button" class="icon-btn" title="${Number(item.trangThai) === 0 ? "Mở khóa" : "Khóa"}" data-toggle-rule="${escapeHtml(item.id)}" data-type="${type}" data-next-status="${Number(item.trangThai) === 0 ? 1 : 0}">${materialIcon(Number(item.trangThai) === 0 ? "lock_open" : "lock")}</button>
        </td>
      </tr>
    `;
  }).join("");
  body.querySelectorAll("[data-edit-rule]").forEach(btn => {
    btn.onclick = () => Promise.resolve(openEditPromotionRule(btn.dataset.editRule, type)).catch(error => console.error(error));
  });
  body.querySelectorAll("[data-toggle-rule]").forEach(btn => {
    btn.onclick = async () => {
      const id = btn.dataset.toggleRule;
      const typeKey = btn.dataset.type;
      const typeLabel = typeLabels[typeKey];
      const next = Number(btn.dataset.nextStatus);
      const confirmed = await showConfirmModal(next === 0 ? "Bạn có chắc muốn khóa CTKM này?" : "Bạn có chắc muốn mở khóa CTKM này?");
      if (!confirmed) return;
      try {
        await updatePromotionRule(id, typeLabel, { trangThai: next });
        await renderTypePanel(typeKey);
        showAlertModal(next === 0 ? "Đã khóa CTKM." : "Đã mở khóa CTKM.", "success");
      } catch (error) {
        console.error(error);
        showAlertModal("Không thể cập nhật trạng thái CTKM.", "error");
      }
    };
  });
}

export async function openViewProgram(programId) {
  const detailPanel = document.getElementById("program-detail-panel");
  if (!detailPanel) {
    showAlertModal("Không tìm thấy vùng hiển thị chi tiết chương trình.", "error");
    return;
  }
  const promotions = await getPromotions();
  const rules = promotions.filter(item => String(item.programId) === String(programId) && item.type !== "(Chưa có CTKM)");
  const programs = await getPrograms();
  const program = programs.find(item => String(item.id) === String(programId));
  const programName = program ? program.name : programId;

  const backdrop = document.createElement("div");
  backdrop.className = "modal-backdrop";

  const status = program?.status || "Đang áp dụng";
  const isCompleted = Number(program?.trangThai ?? 1) === 1;
  const rowsHtml = rules.length ? rules.map(item => `
    <tr>
      <td>${escapeHtml(item.programId || item.id)}</td>
      <td><span class="tag">${escapeHtml(item.type)}</span></td>
      <td>${escapeHtml(item.detail || "")}</td>
      <td>${escapeHtml(item.mucGiam || "")}</td>
      <td><span class="tag ${Number(item.trangThai) === 0 ? "locked" : "green"}">${escapeHtml(item.status)}</span></td>
    </tr>
  `).join("") : `<tr><td colspan="5">Chưa có CTKM nào.</td></tr>`;

  backdrop.innerHTML = `
    <section class="modal import-detail-modal promotion-detail-modal" role="dialog" aria-modal="true" aria-labelledby="promotion-detail-title">
      <header class="import-detail-header ${isCompleted ? "import-status-completed" : "import-status-pending"}">
        <div class="import-detail-title-icon material-symbols-outlined" aria-hidden="true">local_offer</div>
        <div class="import-detail-header-main">
          <div class="import-summary">
            <div class="import-summary-item"><span class="import-summary-icon material-symbols-outlined" aria-hidden="true">calendar_month</span><div><span class="import-summary-label">NGÀY BẮT ĐẦU</span><strong>${escapeHtml(program?.ngayBD || "")}</strong></div></div>
            <div class="import-summary-item"><span class="import-summary-icon material-symbols-outlined" aria-hidden="true">event</span><div><span class="import-summary-label">NGÀY KẾT THÚC</span><strong>${escapeHtml(program?.ngayKT || "")}</strong></div></div>
            ${program?.note ? `<div class="import-summary-item"><span class="import-summary-icon material-symbols-outlined" aria-hidden="true">notes</span><div><span class="import-summary-label">GHI CHÚ</span><strong>${escapeHtml(program.note)}</strong></div></div>` : ""}
          </div>
        </div>
        <span class="import-status"><span></span>${escapeHtml(status)}</span>
        <div class="detail-actions"><button type="button" class="btn alt" data-detail-edit>Sửa chương trình</button><button type="button" class="btn" data-detail-toggle>${isCompleted ? "Khóa chương trình" : "Mở khóa chương trình"}</button></div>
      </header>
      <div class="import-detail-content">
        <div class="import-products-heading"><h3>DANH SÁCH CTKM</h3><span>${rules.length} CTKM</span></div>
        <div class="import-products-table-wrap">
          <div class="import-products-scroll">
            <table class="import-products-table">
              <thead><tr><th>MÃ CTKM</th><th>LOẠI</th><th>CHI TIẾT</th><th>MỨC GIẢM</th><th>TRẠNG THÁI</th></tr></thead>
              <tbody>${rowsHtml || "<tr><td colspan=\"5\" class=\"import-empty\">Không có CTKM</td></tr>"}</tbody>
            </table>
          </div>
        </div>
      </div>
    </section>
  `;

  detailPanel.innerHTML = backdrop.querySelector("section").innerHTML;
  detailPanel.classList.add("promotion-detail-panel");
  detailPanel.querySelector("[data-detail-edit]")?.addEventListener("click", () => openEditProgram(programId));
  detailPanel.querySelector("[data-detail-toggle]")?.addEventListener("click", async () => {
    const next = isCompleted ? 0 : 1;
    const confirmed = await showConfirmModal(next === 0 ? "Bạn có chắc muốn khóa chương trình này?" : "Bạn có chắc muốn mở khóa chương trình này?");
    if (!confirmed) return;
    try {
      await updateProgram(programId, { name: program.name, ngayBD: program.ngayBD, ngayKT: program.ngayKT, trangThai: next, note: program.note || "" });
      await loadAndRender();
      showAlertModal(next === 0 ? "Đã khóa chương trình." : "Đã mở khóa chương trình.", "success");
    } catch (error) {
      console.error(error);
      showAlertModal("Không thể cập nhật trạng thái chương trình.", "error");
    }
  });
  document.querySelectorAll("#programs-body .master-card").forEach(card => card.classList.toggle("active", card.dataset.viewProgram === String(programId)));
}

export async function openEditProgram(programId) {
  const programs = await getPrograms();
  const program = programs.find(item => String(item.id) === String(programId));
  if (!program) return;
  showEditForm({
    title: "Cập nhật chương trình khuyến mãi",
    fields: [
      { name: "tenCTKM", label: "Tên chương trình" },
      { name: "ngayBD", label: "Ngày bắt đầu", type: "date" },
      { name: "ngayKT", label: "Ngày kết thúc", type: "date" },
      { name: "ghiChu", label: "Ghi chú", type: "textarea", required: false }
    ],
    initialValues: { tenCTKM: program.name, ngayBD: program.ngayBD, ngayKT: program.ngayKT, ghiChu: program.note || "" },
    onSubmit: data => {
      if (!String(data.tenCTKM || "").trim()) throw new Error("Tên chương trình không được để trống.");
      if (!data.ngayBD || !data.ngayKT) throw new Error("Vui lòng chọn ngày bắt đầu và ngày kết thúc.");
      if (new Date(data.ngayBD) > new Date(data.ngayKT)) throw new Error("Ngày bắt đầu phải nhỏ hơn hoặc bằng ngày kết thúc.");
      return updateProgram(programId, {
        name: String(data.tenCTKM).trim(),
        ngayBD: data.ngayBD,
        ngayKT: data.ngayKT,
        note: String(data.ghiChu || "").trim()
      });
    }
  });
}

export async function openEditPromotionRule(id, typeKey) {
  const type = typeLabels[typeKey];
  const promotions = await getPromotions();
  const item = promotions.find(promotion => String(promotion.id) === String(id));
  if (!item) return;

  if (typeKey === "product") {
    showEditForm({
      title: "Cập nhật CTKM theo sản phẩm",
      fields: [
        { name: "phanTram", label: "Mức giảm (%)", type: "text" }
      ],
      initialValues: { phanTram: item.phanTram },
      onSubmit: data => {
        const phanTram = Number(data.phanTram);
        if (!Number.isFinite(phanTram) || phanTram <= 0) throw new Error("Mức giảm phải là số lớn hơn 0.");
        return updatePromotionRule(id, type, { phanTram });
      }
    });
    return;
  }

  if (typeKey === "invoice") {
    showEditForm({
      title: "Cập nhật CTKM theo hóa đơn",
      fields: [
        { name: "phanTram", label: "Mức giảm (%)", type: "text" }
      ],
      initialValues: { phanTram: item.phanTram },
      onSubmit: data => {
        const phanTram = Number(data.phanTram);
        if (!Number.isFinite(phanTram) || phanTram <= 0) throw new Error("Mức giảm phải là số lớn hơn 0.");
        return updatePromotionRule(id, type, { phanTram });
      }
    });
    return;
  }

  showEditForm({
    title: "Cập nhật CTKM theo voucher",
    fields: [
      { name: "phanTram", label: "Mức giảm (%)", type: "text" },
      { name: "soLuong", label: "Số lượng", type: "text" }
    ],
    initialValues: { phanTram: item.phanTram, soLuong: item.soLuong },
    onSubmit: data => {
      const phanTram = Number(data.phanTram);
      const soLuong = Number(data.soLuong);
      if (!Number.isFinite(phanTram) || phanTram <= 0) throw new Error("Mức giảm phải là số lớn hơn 0.");
      if (!Number.isFinite(soLuong) || soLuong <= 0) throw new Error("Số lượng phải là số lớn hơn 0.");
      return updatePromotionRule(id, type, { phanTram, soLuong });
    }
  });
}


export async function openAddPromotion(fixedType = null) {
  const products = await getProductOptions();
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const programs = fixedType ? (await getPrograms()).filter(program => Number(program.trangThai) === 1 && new Date(program.ngayKT) >= today) : [];
  let selectedProgramId = programs[0]?.id || null;
  const promotions = fixedType ? await getPromotions() : [];
  const programProductIds = new Map();
  if (fixedType) {
    promotions.forEach(promotion => {
      if (promotion.type !== "Theo sản phẩm") return;
      const ids = String(promotion.sanPhamId || "").split(",").map(value => value.trim()).filter(Boolean);
      const programId = String(promotion.programId || "");
      if (!programProductIds.has(programId)) programProductIds.set(programId, new Set());
      ids.forEach(id => programProductIds.get(programId).add(id));
    });
  }
  const programSelectOptions = programs.map((program, index) => `<option value="${escapeHtml(program.id)}" ${index === 0 ? "selected" : ""}>${escapeHtml(program.name)} (${escapeHtml(program.period)})</option>`).join("");
  if (fixedType && !programs.length) {
    showAlertModal("Không có chương trình khuyến mãi đang hiệu lực.", "warning");
    return;
  }
  const backdrop = document.createElement("div");
  backdrop.className = "modal-backdrop";
  backdrop.innerHTML = `
    <section class="modal" style="max-width:760px;max-height:90vh;display:flex;flex-direction:column;overflow:hidden;">
      <h2>${fixedType ? `Thêm CTKM ${escapeHtml(typeLabels[fixedType])}` : "Thêm chương trình khuyến mãi"}</h2>
      <form id="program-form" style="display:flex;flex-direction:column;flex:1;min-height:0;">
        <div class="form-row">
          ${fixedType ? `
            <label>Chương trình khuyến mãi<select name="programName" required>
              <option value="">Chọn chương trình</option>
              ${programSelectOptions}
            </select></label>
          ` : `
            <label>Tên chương trình<input name="name" required></label>
            <label>Ngày bắt đầu<input name="ngayBD" type="date" required></label>
            <label>Ngày kết thúc<input name="ngayKT" type="date" required></label>
            <label>Ghi chú<textarea name="ghiChu" rows="2" style="width:100%;"></textarea></label>
            <label>Trạng thái<select name="trangThai">
              <option value="1">Đang áp dụng</option>
              <option value="0">Đã khóa</option>
            </select></label>
          `}
        </div>
        <h3 style="margin:16px 0 8px;">Danh sách CTKM</h3>
        <div id="rules-container" style="flex:1;min-height:0;overflow-y:auto;padding-right:4px;margin-bottom:8px;"></div>
        <button type="button" class="btn alt" id="add-rule-btn" style="margin-top:8px;">+ Thêm CTKM</button>
        <div class="modal-actions">
          <button type="button" class="btn alt" data-cancel>Hủy</button>
          <button type="submit" class="btn">Lưu chương trình</button>
        </div>
      </form>
    </section>`;
  document.body.append(backdrop);
  const close = () => backdrop.remove();
  backdrop.querySelector("[data-cancel]").onclick = close;
  backdrop.onclick = event => { if (event.target === backdrop) close(); };

  const rules = [];
  const container = backdrop.querySelector("#rules-container");
  const addRuleButton = backdrop.querySelector("#add-rule-btn");

  const programSelect = fixedType ? backdrop.querySelector('select[name="programName"]') : null;
  if (programSelect) {
    programSelect.addEventListener("change", () => {
      selectedProgramId = programSelect.value || null;
      rules.forEach(rule => {
        if (rule.type === "product") {
          rule.id_sanPham = "";
          if (rule._productSelect) rule._productSelect.value = "";
        }
      });
      refreshProductOptions();
    });
  }

  function refreshProductOptions() {
    rules.forEach(rule => {
      if (rule.type !== "product" || !rule._productSelect) return;
      const current = rule._productSelect.value;
      const usedProductIds = new Set(programProductIds.get(String(selectedProgramId || "")) || []);
      rules.forEach(item => {
        if (item !== rule && item.type === "product" && item.id_sanPham) usedProductIds.add(String(item.id_sanPham));
      });
      rule._productSelect.innerHTML = `<option value="">Chọn sản phẩm</option>` +
        products
          .filter(product => !usedProductIds.has(String(product.value)) || String(product.value) === String(current))
          .map(product => `<option value="${product.value}">${escapeHtml(product.label)}</option>`).join("");
      if ([...rule._productSelect.options].some(option => option.value === current)) {
        rule._productSelect.value = current;
      } else {
        rule.id_sanPham = "";
        rule._productSelect.value = "";
      }
    });
  }

  function addRule(type = fixedType || "product") {
    if (fixedType) type = fixedType;
    const rule = { type };
    rules.push(rule);

    const card = document.createElement("div");
    card.style = "border:1px solid #e6e1d8;padding:12px;border-radius:8px;margin-bottom:10px;display:grid;gap:10px;";

    const typeSelect = fixedType ? null : document.createElement("select");
    if (typeSelect) {
      typeSelect.innerHTML = `
        <option value="product">Theo sản phẩm</option>
        <option value="invoice">Theo hóa đơn</option>
        <option value="voucher">Theo voucher</option>`;
      typeSelect.value = type;
    }

    const fields = document.createElement("div");
    fields.className = "form-row";

    const removeButton = document.createElement("button");
    removeButton.type = "button";
    removeButton.className = "btn alt";
    removeButton.textContent = "Xóa CTKM";
    removeButton.onclick = () => {
      const index = rules.indexOf(rule);
      if (index >= 0) rules.splice(index, 1);
      card.remove();
      refreshProductOptions();
    };

    if (typeSelect) card.append(typeSelect);
    card.append(fields, removeButton);
    container.append(card);

    function renderFields() {
      fields.innerHTML = "";
      if (rule.type === "product") {
        const productSelect = document.createElement("select");
        const usedProductIds = new Set(programProductIds.get(String(selectedProgramId || "")) || []);
        rules.forEach(item => {
          if (item !== rule && item.type === "product" && item.id_sanPham) usedProductIds.add(String(item.id_sanPham));
        });
        productSelect.innerHTML = `<option value="">Chọn sản phẩm</option>` +
          products
            .filter(product => !usedProductIds.has(String(product.value)) || String(product.value) === String(rule.id_sanPham || ""))
            .map(product => `<option value="${product.value}">${escapeHtml(product.label)}</option>`).join("");
        productSelect.value = rule.id_sanPham || "";
        rule._productSelect = productSelect;
        productSelect.onchange = event => {
          rule.id_sanPham = event.target.value;
          refreshProductOptions();
        };

        const productLabel = document.createElement("label");
        productLabel.textContent = "Sản phẩm";
        productLabel.append(productSelect);

        const discountInput = document.createElement("input");
        discountInput.placeholder = "VD: 10%";
        discountInput.value = rule.mucGiam || "";
        discountInput.oninput = event => { rule.mucGiam = event.target.value; };

        const discountLabel = document.createElement("label");
        discountLabel.textContent = "Mức giảm (%)";
        discountLabel.append(discountInput);

        fields.append(productLabel, discountLabel);
      } else if (rule.type === "invoice") {
        const minInput = document.createElement("input");
        minInput.placeholder = "VD: 5000000";
        minInput.value = rule.minTotal || "";
        minInput.oninput = event => { rule.minTotal = event.target.value; };

        const minLabel = document.createElement("label");
        minLabel.textContent = "Tổng tiền tối thiểu";
        minLabel.append(minInput);

        const discountInput = document.createElement("input");
        discountInput.placeholder = "VD: 10%";
        discountInput.value = rule.mucGiam || "";
        discountInput.oninput = event => { rule.mucGiam = event.target.value; };

        const discountLabel = document.createElement("label");
        discountLabel.textContent = "Mức giảm (%)";
        discountLabel.append(discountInput);

        fields.append(minLabel, discountLabel);
      } else {
        const codeInput = document.createElement("input");
        codeInput.value = rule.maVoucher || "";
        codeInput.oninput = event => { rule.maVoucher = event.target.value; };

        const codeLabel = document.createElement("label");
        codeLabel.textContent = "Mã voucher";
        codeLabel.append(codeInput);

        const discountInput = document.createElement("input");
        discountInput.placeholder = "VD: 10%";
        discountInput.value = rule.mucGiam || "";
        discountInput.oninput = event => { rule.mucGiam = event.target.value; };

        const discountLabel = document.createElement("label");
        discountLabel.textContent = "Mức giảm (%)";
        discountLabel.append(discountInput);

        const quantityInput = document.createElement("input");
        quantityInput.placeholder = "VD: 100";
        quantityInput.value = rule.soLuong || "";
        quantityInput.oninput = event => { rule.soLuong = event.target.value; };

        const quantityLabel = document.createElement("label");
        quantityLabel.textContent = "Số lượng";
        quantityLabel.append(quantityInput);

        fields.append(codeLabel, discountLabel, quantityLabel);
      }
    }

    if (typeSelect) {
      typeSelect.onchange = event => {
        rule.type = event.target.value;
        renderFields();
        refreshProductOptions();
      };
    }

    renderFields();
    refreshProductOptions();
  }

  addRuleButton.onclick = () => addRule(fixedType || "product");
  addRule(fixedType || "product");


  backdrop.querySelector("#program-form").onsubmit = async event => {
    event.preventDefault();
    const formData = new FormData(event.target);
    let name = "";
    let ngayBD = "";
    let ngayKT = "";
    let trangThai = 1;
    let note = "";
    selectedProgramId = programs[0]?.id || null;

    if (fixedType) {
      const programId = String(formData.get("programName") || "").trim();
      const program = programs.find(item => String(item.id) === programId);
      if (!program) {
        showAlertModal("Vui lòng chọn chương trình khuyến mãi.", "warning");
        return;
      }
      name = program.name;
      ngayBD = program.ngayBD;
      ngayKT = program.ngayKT;
      trangThai = Number(program.trangThai ?? 1);
      note = program.note || "";
      selectedProgramId = program.id;
    } else {
      name = String(formData.get("name") || "").trim();
      ngayBD = formData.get("ngayBD");
      ngayKT = formData.get("ngayKT");
      trangThai = Number(formData.get("trangThai"));
      note = String(formData.get("ghiChu") || "").trim();
      if (!name || !ngayBD || !ngayKT) {
        showAlertModal("Vui lòng nhập đầy đủ thông tin chương trình.", "warning");
        return;
      }
      if (new Date(ngayBD) > new Date(ngayKT)) {
        showAlertModal("Ngày bắt đầu phải nhỏ hơn hoặc bằng ngày kết thúc.", "warning");
        return;
      }
    }

    if (fixedType && !rules.length) {
      showAlertModal("Vui lòng thêm ít nhất một CTKM.", "warning");
      return;
    }

    const submitButton = event.target.querySelector('button[type="submit"]');
    submitButton.disabled = true;
    try {
      const rulePayloads = rules.map(rule => {
        if (rule.type === "product") {
          const mucGiam = Number(rule.mucGiam);
          if (!rule.id_sanPham) {
            throw new Error("Vui lòng chọn sản phẩm.");
          }
          if (!Number.isFinite(mucGiam) || mucGiam <= 0) {
            throw new Error("Mức giảm phải là số lớn hơn 0.");
          }
          return {
            type: "Theo sản phẩm",
            id_sanPham: rule.id_sanPham,
            phanTram: mucGiam
          };
        }
        if (rule.type === "invoice") {
          const minTotal = Number(rule.minTotal);
          const mucGiam = Number(rule.mucGiam);
          if (!Number.isFinite(minTotal) || minTotal <= 0) {
            throw new Error("Tổng tiền tối thiểu phải là số lớn hơn 0.");
          }
          if (!Number.isFinite(mucGiam) || mucGiam <= 0) {
            throw new Error("Mức giảm phải là số lớn hơn 0.");
          }
          return {
            type: "Theo hóa đơn",
            minTotal,
            phanTram: mucGiam
          };
        }
        const mucGiam = Number(rule.mucGiam);
        const soLuong = Number(rule.soLuong);
        if (!rule.maVoucher) {
          throw new Error("Vui lòng nhập mã voucher.");
        }
        if (!Number.isFinite(mucGiam) || mucGiam <= 0) {
          throw new Error("Mức giảm phải là số lớn hơn 0.");
        }
        if (!Number.isFinite(soLuong) || soLuong <= 0) {
          throw new Error("Số lượng phải là số lớn hơn 0.");
        }
        return {
          type: "Theo voucher",
          maVoucher: rule.maVoucher,
          phanTram: mucGiam,
          soLuong
        };
      });

      await createPromotionsBulk({ name, ngayBD, ngayKT, trangThai, note, id: selectedProgramId }, rulePayloads);
      showAlertModal(fixedType ? "Đã thêm CTKM vào chương trình." : "Đã thêm chương trình khuyến mãi.", "success");
      close();
      document.dispatchEvent(new CustomEvent("data-added"));
    } catch (error) {
      showAlertModal(`Không thể thêm: ${error.message}`, "error");
    } finally {
      submitButton.disabled = false;
    }
  };
}
