export const money = value => new Intl.NumberFormat("vi-VN").format(value) + " ₫";

export const materialIcon = name => `<span class="material-symbols-outlined" aria-hidden="true">${name}</span>`;
const escapeHtml = value => String(value ?? "").replace(/[&<>"']/g, character => ({
  "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;"
}[character]));

export const rowActions = (includeDelete = false, deleteAttributes = "", editAttributes = "", includeLock = false, lockAttributes = "", locked = false) => `
  <button type="button" class="icon-btn" title="Sửa" aria-label="Sửa" ${editAttributes}>${materialIcon("edit")}</button>
  ${includeLock ? `<button type="button" class="icon-btn ${locked ? "danger" : ""}" title="${locked ? "Mở khóa" : "Khóa"}" aria-label="${locked ? "Mở khóa" : "Khóa"}" ${lockAttributes}>${materialIcon(locked ? "lock_open_right" : "lock")}</button>` : ""}
  ${includeDelete ? `<button type="button" class="icon-btn danger" title="Xóa" aria-label="Xóa" ${deleteAttributes}>${materialIcon("delete")}</button>` : ""}`;

export const toolbar = (placeholder, button = "Thêm mới", filters = "") => `
  <div class="toolbar">
    <input class="search" id="search" placeholder="${placeholder}">
    ${filters}
    <div class="spacer"></div>
    <button class="btn" id="add-btn">${materialIcon("add")}<span>${button}</span></button>
  </div>`;

export const bindSearch = (callback, value) => {
  const search = document.querySelector("#search");
  if (!search) return;
  search.value = value;
  search.oninput = event => callback(event.target.value);
};

export function isValidPhone(value) {
  const phone = String(value ?? "").replace(/[\s().-]/g, "");
  return /^(?:0|\+84)\d{9,10}$/.test(phone);
}

export function isValidEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value ?? "").trim());
}

export function showAlertModal(message, type = "info") {
  const backdrop = document.createElement("div");
  backdrop.className = "alert-backdrop";
  const modal = document.createElement("section");
  modal.className = `alert-modal alert-${type}`;
  modal.setAttribute("role", "alertdialog");
  modal.setAttribute("aria-modal", "true");
  modal.innerHTML = `<div class="alert-modal-icon">${materialIcon(type === "success" ? "check_circle" : type === "error" ? "error" : "info")}</div>
    <p>${escapeHtml(message)}</p>
    <button type="button" class="btn" data-alert-close>Đóng</button>`;
  backdrop.append(modal);
  document.body.append(backdrop);
  const close = () => backdrop.remove();
  modal.querySelector("[data-alert-close]").onclick = close;
  backdrop.onclick = event => { if (event.target === backdrop) close(); };
  modal.querySelector("[data-alert-close]").focus();
}

export { escapeHtml };

export function bindDomSearch({
  initialQuery = "",
  rowSelector,
  onQueryChange,
  onFilter,
  debounceMs = 150,
  fields = null,
  defaultKeys = ["code", "name"],
  defaultLabel = "Mã và tên",
  getFieldValue = null,
   sideFilters = []
} = {}) {
  const search = document.querySelector("#search");
  if (!search) return;

  const getRows = () => Array.from(document.querySelectorAll(rowSelector || "tbody tr"));
  let selectedField = "default";
  let fieldSelect = null;

  if (fields) {
    fieldSelect = document.createElement("select");
    fieldSelect.id = "search-field";
    fieldSelect.style.cssText = "height:34px;margin-left:8px;border:1px solid #dce5ee;border-radius:8px;padding:0 8px;background:#f8fafc;color:#4b5d75;";
    const makeOption = (value, label) => {
      const option = document.createElement("option");
      option.value = value;
      option.textContent = label;
      return option;
    };
    fieldSelect.append(makeOption("default", defaultLabel));
    Object.entries(fields).forEach(([key, label]) => {
      fieldSelect.append(makeOption(key, label));
    });
    fieldSelect.append(makeOption("__all__", "Tất cả"));
    search.insertAdjacentElement("afterend", fieldSelect);
  }

  const readValue = (row, rowIndex, field) => {
    if (typeof getFieldValue === "function") return getFieldValue(rowIndex, field);
    return row.dataset[field] ?? "";
  };

  const applyFilter = query => {
    const normalized = String(query ?? "").trim().toLowerCase();
    const sideFilterValues = (sideFilters || []).map(sf => ({
      sf,
      value: String(document.querySelector(sf.selector)?.value ?? "").trim()
    }));
    let visible = 0;
    const rows = getRows();
    rows.forEach((row, domIndex) => {
      const rowIndex = Number(row.dataset.rowIndex ?? domIndex);
      let haystack = "";
      if (selectedField === "default") {
        haystack = defaultKeys.map(key => readValue(row, rowIndex, key)).join(" ");
      } else if (selectedField === "__all__") {
        haystack = (fields ? Object.keys(fields) : []).map(key => readValue(row, rowIndex, key)).join(" ");
        haystack += " " + (row.textContent || "");
      } else {
        haystack = readValue(row, rowIndex, selectedField);
      }
      let show = !normalized || String(haystack).toLowerCase().includes(normalized);
      if (show) {
        for (const { sf, value } of sideFilterValues) {
          if (value) {
            const rowValue = typeof sf.getValue === "function" ? sf.getValue(row, rowIndex) : "";
            if (String(rowValue).trim() !== value) { show = false; break; }
          }
        }
      }
      row.style.display = show ? "" : "none";
      if (show) visible += 1;
    });
    onFilter?.(query, visible, rows.length);
  };

  search.value = initialQuery ?? "";
  search.oninput = event => {
    const value = event.target.value;
    onQueryChange?.(value);
    clearTimeout(search._searchTimer);
    search._searchTimer = setTimeout(() => applyFilter(value), debounceMs);
  };
  if (fieldSelect) {
    fieldSelect.onchange = event => {
      selectedField = event.target.value;
      applyFilter(search.value);
    };
  }
  (sideFilters || []).forEach(sf => {
    const el = document.querySelector(sf.selector);
    if (el) el.onchange = () => applyFilter(search.value);
  });
  applyFilter(initialQuery ?? "");
}
export function showAddForm({ title, fields, onSubmit }) {
  const backdrop = document.createElement("div");
  backdrop.className = "modal-backdrop";
  const renderOptions = (field, selectedValue = "") => {
    const dependencyValue = field.dependsOn
      ? backdrop.querySelector(`[name="${field.dependsOn}"]`)?.value
      : null;
    const options = (field.options || []).filter(option =>
      !field.dependsOn || String(option.categoryId) === String(dependencyValue)
    );
    return `${field.placeholder ? `<option value="">${escapeHtml(field.placeholder)}</option>` : ""}
      ${options.map(option => `<option value="${escapeHtml(option.value)}" ${String(option.value) === String(selectedValue) ? "selected" : ""}>${escapeHtml(option.label)}</option>`).join("")}`;
  };
  backdrop.innerHTML = `<form class="modal">
    <h2>${title}</h2>
    ${fields.map(field => `<div class="form-row"><label>${field.label}</label>${
      field.options
        ? `<select name="${escapeHtml(field.name)}" ${field.dependsOn ? `data-depends-on="${escapeHtml(field.dependsOn)}"` : ""} ${field.required === false ? "" : "required"}>${renderOptions(field)}</select>`
        : field.type === "textarea"
        ? `<textarea name="${escapeHtml(field.name)}" ${field.required === false ? "" : "required"} ${field.placeholder ? `placeholder="${escapeHtml(field.placeholder)}"` : ""}></textarea>`
        : field.type === "file"
          ? `<input name="${escapeHtml(field.name)}" type="file" ${field.required === false ? "" : "required"} ${field.accept ? `accept="${escapeHtml(field.accept)}"` : 'accept="image/*"'}>`
          : `<input name="${escapeHtml(field.name)}" type="${escapeHtml(field.type || "text")}" ${field.required === false ? "" : "required"} ${field.placeholder ? `placeholder="${escapeHtml(field.placeholder)}"` : ""}>`
    }</div>`).join("")}
    <div class="modal-actions"><button type="button" class="btn alt" data-cancel>Hủy</button><button class="btn" type="submit">Lưu dữ liệu</button></div>
  </form>`;
  document.body.append(backdrop);
  const form = backdrop.querySelector("form");
  form.querySelectorAll("[data-depends-on]").forEach(select => {
    const dependency = form.querySelector(`[name="${select.dataset.dependsOn}"]`);
    const field = fields.find(item => item.name === select.name);
    const updateOptions = () => {
      select.innerHTML = renderOptions(field);
      select.value = "";
    };
    dependency?.addEventListener("change", updateOptions);
    updateOptions();
  });
  const close = () => backdrop.remove();
  backdrop.querySelector("[data-cancel]").onclick = close;
  backdrop.onclick = event => { if (event.target === backdrop) close(); };
  form.onsubmit = async event => {
    event.preventDefault();
    const submit = form.querySelector("button[type=submit]");
    submit.disabled = true;
    try {
      await onSubmit(Object.fromEntries(new FormData(form)));
      close();
      document.dispatchEvent(new CustomEvent("data-added"));
      showAlertModal("Đã thêm dữ liệu thành công.", "success");
    } catch (error) {
      submit.disabled = false;
      console.error("Không thể thêm dữ liệu:", error);
      showAlertModal(`Không thể thêm dữ liệu: ${error.message}`, "error");
    }
  };
}
export function showConfirmModal(message) {
  return new Promise(resolve => {
    const backdrop = document.createElement("div");
    backdrop.className = "alert-backdrop";
    const modal = document.createElement("section");
    modal.className = "alert-modal alert-info";
    modal.innerHTML = `<div class="alert-modal-icon">${materialIcon("help")}</div>
      <p>${escapeHtml(message)}</p>
      <div style="display:flex;gap:8px;justify-content:center;">
        <button type="button" class="btn alt" data-confirm-cancel>Hủy</button>
        <button type="button" class="btn" data-confirm-ok>Xác nhận</button>
      </div>`;
    backdrop.append(modal);
    document.body.append(backdrop);
    const close = result => { backdrop.remove(); resolve(result); };
    modal.querySelector("[data-confirm-ok]").onclick = () => close(true);
    modal.querySelector("[data-confirm-cancel]").onclick = () => close(false);
    backdrop.onclick = event => { if (event.target === backdrop) close(false); };
  });
}

export function showEditForm({ title, fields, initialValues = {}, onSubmit, successMessage = "Đã cập nhật dữ liệu thành công." }) {
  const backdrop = document.createElement("div");
  backdrop.className = "modal-backdrop";
  const renderOptions = (field, selectedValue = "") => {
    const dependencyValue = field.dependsOn
      ? backdrop.querySelector(`[name="${field.dependsOn}"]`)?.value
      : null;
    const options = (field.options || []).filter(option =>
      !field.dependsOn || String(option.categoryId) === String(dependencyValue)
    );
    return `${field.placeholder ? `<option value="">${escapeHtml(field.placeholder)}</option>` : ""}
      ${options.map(option => `<option value="${escapeHtml(option.value)}" ${String(option.value) === String(selectedValue) ? "selected" : ""}>${escapeHtml(option.label)}</option>`).join("")}`;
  };
  backdrop.innerHTML = `<form class="modal">
    <h2>${title}</h2>
    ${fields.map(field => `<div class="form-row"><label>${field.label}</label>${field.options
      ? `<select name="${escapeHtml(field.name)}" ${field.dependsOn ? `data-depends-on="${escapeHtml(field.dependsOn)}"` : ""} ${field.required === false ? "" : "required"}>${renderOptions(field, initialValues[field.name] ?? "")}</select>`
      : field.type === "textarea"
      ? `<textarea name="${escapeHtml(field.name)}" ${field.required === false ? "" : "required"} ${field.placeholder ? `placeholder="${escapeHtml(field.placeholder)}"` : ""}>${escapeHtml(initialValues[field.name] ?? "")}</textarea>`
      : field.type === "file"
        ? `<input name="${escapeHtml(field.name)}" type="file" ${field.required === false ? "" : ""} ${field.accept ? `accept="${escapeHtml(field.accept)}"` : 'accept="image/*"'}>`
        : `<input name="${escapeHtml(field.name)}" type="${escapeHtml(field.type || "text")}" ${field.required === false ? "" : "required"} ${field.placeholder ? `placeholder="${escapeHtml(field.placeholder)}"` : ""} value="${escapeHtml(initialValues[field.name] ?? "")}">`
    }</div>`).join("")}
    <div class="modal-actions"><button type="button" class="btn alt" data-cancel>Hủy</button><button class="btn" type="submit">Lưu dữ liệu</button></div>
  </form>`;
  document.body.append(backdrop);
  const form = backdrop.querySelector("form");
  form.querySelectorAll("[data-depends-on]").forEach(select => {
    const dependency = form.querySelector(`[name="${select.dataset.dependsOn}"]`);
    const field = fields.find(item => item.name === select.name);
    const updateOptions = (selectedValue) => {
      const current = selectedValue ?? select.value;
      select.innerHTML = renderOptions(field, current);
      if (![...select.options].some(option => option.value === String(current))) select.value = "";
      else select.value = current;
    };
    dependency?.addEventListener("change", () => updateOptions());
  updateOptions(initialValues[field.name]);
  });
  const close = () => backdrop.remove();
  backdrop.querySelector("[data-cancel]").onclick = close;
  backdrop.onclick = event => { if (event.target === backdrop) close(); };
  form.onsubmit = async event => {
    event.preventDefault();
    const submit = form.querySelector("button[type=submit]");
    submit.disabled = true;
    try {
      const result = await onSubmit(Object.fromEntries(new FormData(form)));
      if (result === false) { submit.disabled = false; return; }
      close();
      document.dispatchEvent(new CustomEvent("data-updated"));
      showAlertModal(successMessage, "success");
    } catch (error) {
      submit.disabled = false;
      console.error("Không thể cập nhật dữ liệu:", error);
      showAlertModal(`Không thể cập nhật dữ liệu: ${error.message}`, "error");
    }
  };
}


