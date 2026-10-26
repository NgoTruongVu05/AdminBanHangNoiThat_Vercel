import { getPromotions, getPrograms, getPromotionsByType, createPromotionsBulk } from "../models/promotionsModel.js";
import { getProductOptions } from "../models/productsModel.js";
import { escapeHtml, showAlertModal } from "./shared.js";

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
      <tr>
        <td>${escapeHtml(program.name)}</td>
        <td>${escapeHtml(program.period)}</td>
        <td>${escapeHtml(program.status)}</td>
        <td>${program.count}</td>
      </tr>
    `).join("");
  }

  ["product", "invoice", "voucher"].forEach(type => {
    const select = document.getElementById(`${type}-program-filter`);
    if (!select) return;
    const current = select.value;
    select.innerHTML = `<option value="">Tất cả chương trình</option>` +
      programs.map(program => `<option value="${escapeHtml(program.name)}">${escapeHtml(program.name)}</option>`).join("");
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
          <td>${escapeHtml(item.id)}</td>
          <td>${escapeHtml(item.name)}</td>
          <td>${escapeHtml(item.sanPham)}</td>
          <td>${escapeHtml(item.mucGiam)}</td>
          <td>${escapeHtml(item.period)}</td>
          <td>${escapeHtml(item.status)}</td>
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
          <td>${escapeHtml(item.period)}</td>
          <td>${escapeHtml(item.status)}</td>
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
        <td>${escapeHtml(item.period)}</td>
        <td>${escapeHtml(item.status)}</td>
      </tr>
    `;
  }).join("");
}

export async function openAddPromotion(fixedType = null) {
  const products = await getProductOptions();
  const programs = fixedType ? (await getPrograms()).filter(program => Number(program.trangThai) === 1) : [];
  const programSelectOptions = programs.map(program => `<option value="${escapeHtml(program.name)}">${escapeHtml(program.name)} (${escapeHtml(program.period)})</option>`).join("");
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
            <label>Trạng thái<select name="trangThai">
              <option value="1">Đang áp dụng</option>
              <option value="0">Đã tắt</option>
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
    };

    if (typeSelect) card.append(typeSelect);
    card.append(fields, removeButton);
    container.append(card);

    function renderFields() {
      fields.innerHTML = "";
      if (rule.type === "product") {
        const productSelect = document.createElement("select");
        productSelect.innerHTML = `<option value="">Chọn sản phẩm</option>` +
          products.map(product => `<option value="${product.value}">${escapeHtml(product.label)}</option>`).join("");
        productSelect.value = rule.id_sanPham || "";
        productSelect.onchange = event => { rule.id_sanPham = event.target.value; };

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
      };
    }

    renderFields();
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

    if (fixedType) {
      const programName = String(formData.get("programName") || "").trim();
      const program = programs.find(item => item.name === programName);
      if (!program) {
        showAlertModal("Vui lòng chọn chương trình khuyến mãi.", "warning");
        return;
      }
      name = program.name;
      ngayBD = program.ngayBD;
      ngayKT = program.ngayKT;
      trangThai = Number(program.trangThai ?? 1);
    } else {
      name = String(formData.get("name") || "").trim();
      ngayBD = formData.get("ngayBD");
      ngayKT = formData.get("ngayKT");
      trangThai = Number(formData.get("trangThai"));
      if (!name || !ngayBD || !ngayKT) {
        showAlertModal("Vui lòng nhập đầy đủ thông tin chương trình.", "warning");
        return;
      }
    }

    if (!rules.length) {
      showAlertModal("Vui lòng thêm ít nhất một CTKM.", "warning");
      return;
    }

    const submitButton = event.target.querySelector('button[type="submit"]');
    submitButton.disabled = true;
    try {
      const rulePayloads = rules.map(rule => {
        if (rule.type === "product") {
          if (!rule.id_sanPham || !rule.mucGiam) {
            throw new Error("Vui lòng chọn sản phẩm và mức giảm.");
          }
          return {
            type: "Theo sản phẩm",
            id_sanPham: rule.id_sanPham,
            phanTram: rule.mucGiam
          };
        }
        if (rule.type === "invoice") {
          if (!rule.minTotal || !rule.mucGiam) {
            throw new Error("Vui lòng nhập tổng tối thiểu và mức giảm.");
          }
          return {
            type: "Theo hóa đơn",
            minTotal: rule.minTotal,
            phanTram: rule.mucGiam
          };
        }
        if (!rule.maVoucher || !rule.mucGiam) {
          throw new Error("Vui lòng nhập mã voucher và mức giảm.");
        }
        return {
          type: "Theo voucher",
          maVoucher: rule.maVoucher,
          phanTram: rule.mucGiam,
          soLuong: rule.soLuong
        };
      });

      await createPromotionsBulk({ name, ngayBD, ngayKT, trangThai }, rulePayloads);
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

