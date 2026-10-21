export const money = value => new Intl.NumberFormat("vi-VN").format(value) + " ₫";

export const toolbar = (placeholder, button = "Thêm mới", filters = "") => `
  <div class="toolbar">
    <input class="search" id="search" placeholder="${placeholder}">
    ${filters}
    <div class="spacer"></div>
    <button class="btn" id="add-btn">＋ ${button}</button>
  </div>`;

export const bindSearch = (callback, value) => {
  const search = document.querySelector("#search");
  if (!search) return;
  search.value = value;
  search.oninput = event => callback(event.target.value);
};
