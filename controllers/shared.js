export const money = value => new Intl.NumberFormat("vi-VN").format(value) + " ₫";

export const materialIcon = name => `<span class="material-symbols-outlined" aria-hidden="true">${name}</span>`;

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
