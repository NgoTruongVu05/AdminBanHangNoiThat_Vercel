export const money = value => new Intl.NumberFormat("vi-VN").format(value) + " ₫";

export const materialIcon = name => `<span class="material-symbols-outlined" aria-hidden="true">${name}</span>`;
const escapeHtml = value => String(value ?? "").replace(/[&<>"']/g, character => ({
  "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;"
}[character]));

export const rowActions = (includeDelete = false, deleteAttributes = "") => `
  <button type="button" class="icon-btn" title="Xem" aria-label="Xem">${materialIcon("visibility")}</button>
  <button type="button" class="icon-btn" title="Sửa" aria-label="Sửa">${materialIcon("edit")}</button>
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
