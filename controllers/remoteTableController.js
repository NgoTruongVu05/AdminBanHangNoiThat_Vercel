import { bindDomSearch, money, rowActions, materialIcon } from "./shared.js";

const escape = value => String(value ?? "").replace(/[&<>\"']/g, character => ({
  "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;"
}[character]));

const dataPromises = {};

export function clearRemoteTableCache() {
  Object.keys(dataPromises).forEach(type => delete dataPromises[type]);
}

export async function initRemoteTable(type, query, onQueryChange, loadData, options = {}) {
  if (!dataPromises[type]) {
    dataPromises[type] = Promise.resolve()
      .then(loadData)
      .catch(error => {
        delete dataPromises[type];
        throw error;
      });
  }
  const actionCell = (row, index) => rowActions(
    false,
    "",
    options.onEdit ? `data-edit-index="${index}"` : "",
    !!options.onLock,
    options.onLock ? `data-lock-index="${index}"` : "",
    options.isLocked ? options.isLocked(row) : false
  );
  const data = await dataPromises[type];
  const config = {
    suppliers: {
      rows: data.suppliers,
      body: "suppliers-body",
      defaultKeys: ["id", "name"],
      fields: { address: "Địa chỉ", phone: "Liên hệ" },
      sideFilter: { selector: "#supplier-filter", getValue: row => row.status, allLabel: "Tất cả trạng thái", options: ["Đã khóa", "Đang hợp tác"] },
      search: row => `${row.id} ${row.name}`,
      render: (row, index) => `<tr data-row-index="${index}"><td class="code">${escape(row.id)}</td><td><b>${escape(row.name)}</b></td><td>${escape(row.address)}</td><td class="mono">${escape(row.phone)}</td><td><span class="tag ${row.trangThai === 0 ? "locked" : "green"}">${escape(row.status)}</span></td><td class="actions">${actionCell(row, index)}</td></tr>`
    },
    customers: {
      rows: data.customers,
      body: "customers-body",
      defaultKeys: ["id", "name"],
      fields: { phone: "Số điện thoại", email: "Email", orders: "Đơn hàng" },
      sideFilter: { selector: "#customer-filter", getValue: row => row.status, allLabel: "Tất cả trạng thái", options: ["Bị khóa", "Đang hoạt động"] },
      search: row => `${row.id} ${row.name}`,
      render: (row, index) => `<tr data-row-index="${index}"><td class="code">${escape(row.id)}</td><td><b>${escape(row.name)}</b></td><td class="mono">${escape(row.phone)}<div class="sub">${escape(row.email)}</div></td><td><span class="tag">${row.orders} đơn</span></td><td><span class="tag ${row.status === "Bị khóa" ? "locked" : "green"}">${escape(row.status)}</span></td><td class="actions">${actionCell(row, index)}</td></tr>`
    },
    imports: {
      rows: data.imports,
      body: "imports-body",
      rowSelector: ".master-card",
      defaultKeys: ["id", "supplier"],
      fields: { date: "Ngày nhập", count: "Số dòng SP" },
      sideFilter: { selector: "#import-filter", getValue: row => row.status, allLabel: "Tất cả trạng thái", options: ["Đang nhập", "Đã hoàn tất"] },
      search: row => `${row.id} ${row.supplier}`,
      render: (row, index) => `<article class="master-card" data-row-index="${index}" data-row-id="${escape(row.rawId)}"><div class="master-card-top"><span class="master-card-code">${escape(row.id)}</span><span class="tag ${row.status === "Đã hoàn tất" ? "green" : "import-status-pending"}">${escape(row.status)}</span></div><div class="master-card-title">${row.count} mặt hàng</div><div class="master-card-meta"><span class="material-symbols-outlined">calendar_month</span>${escape(row.date)}<span>•</span>${escape(row.supplier)}</div></article>`
    },
    promotions: {
      rows: data.promotions,
      body: "promotions-body",
      defaultKeys: ["id", "name"],
      fields: { type: "Loại", period: "Thời gian" },
      sideFilter: { selector: "#promotion-filter", getValue: row => row.status, allLabel: "Tất cả trạng thái", options: ["Đã khóa", "Đang áp dụng"] },
      search: row => `${row.id} ${row.name}`,
      render: (row, index) => `<tr data-row-index="${index}"><td class="code">${escape(row.id)}</td><td><b>${escape(row.name)}</b></td><td><span class="tag">${escape(row.type)}</span></td><td class="mono">${escape(row.period)}</td><td><span class="tag green">${escape(row.status)}</span></td><td class="actions">${rowActions()}</td></tr>`
    },
    staff: {
      rows: data.staff,
      body: "staff-body",
      defaultKeys: ["id", "name"],
      fields: { role: "Bộ phận", phone: "Số điện thoại" },
      sideFilter: { selector: "#staff-filter", getValue: row => row.status, allLabel: "Tất cả trạng thái", options: ["Bị khóa", "Đang hoạt động"] },
      search: row => `${row.id} ${row.name} ${row.role}`,
      render: (row, index) => `<tr data-row-index="${index}"><td class="code">${escape(row.id)}</td><td><b>${escape(row.name)}</b></td><td><span class="tag blue">${escape(row.role)}</span></td><td class="mono">${escape(row.phone)}</td><td><span class="tag ${row.trangThai === 0 ? "locked" : "green"}">${escape(row.status)}</span></td><td class="actions">${actionCell(row, index)}</td></tr>`
    },
    accounts: {
      rows: data.accounts,
      body: "accounts-body",
      defaultKeys: ["username", "name"],
      fields: { email: "Email", role: "Vai trò" },
      sideFilter: { selector: "#account-filter", getValue: row => row.status, allLabel: "Tất cả trạng thái", options: ["Bị khóa", "Đang hoạt động"] },
      search: row => `${row.username} ${row.name} ${row.email}`,
      render: (row, index) => `<tr data-row-index="${index}"><td><b>${escape(row.username)}</b></td><td>${escape(row.name)}<div class="sub">${escape(row.email)}</div></td><td><span class="tag">${escape(row.role)}</span></td><td><span class="tag ${row.trangThai === 0 ? "locked" : "green"}">${escape(row.status)}</span></td><td class="actions">${actionCell(row, index)}</td></tr>`
    },
    styles: {
      rows: data.styles,
      body: "styles-body",
      defaultKeys: ["id", "name"],
      fields: { category: "Loại sản phẩm" },
      sideFilter: { selector: "#style-filter", getValue: row => row.status, allLabel: "Tất cả trạng thái", options: ["Đã khóa", "Đang sử dụng"] },
      search: row => `${row.id} ${row.name} ${row.category}`,
      render: (row, index) => `<tr data-row-index="${index}"><td class="code">${escape(row.id)}</td><td><b>${escape(row.name)}</b></td><td>${escape(row.category)}</td><td><span class="tag ${row.trangThai === 0 ? "locked" : "green"}">${escape(row.status)}</span></td><td class="actions">${actionCell(row, index)}</td></tr>`
    }
  }[type];
  if (!config) return;
  const allRows = Array.isArray(data) ? data : config.rows || [];
  document.querySelector(`#${config.body}`).innerHTML = allRows.map((row, index) => config.render(row, index)).join("");
  document.querySelectorAll(`#${config.body} ${config.rowSelector || "tr"}`).forEach((row, index) => {
    row.dataset.search = String(config.search(allRows[index]) || "").toLowerCase();
  });
  const sideFilters = [];
  if (config.sideFilter) {
    const sf = config.sideFilter;
    const select = document.querySelector(sf.selector);
    if (select) {
      const current = select.value;
      const sourceValues = sf.options ? sf.options : allRows.map(row => sf.getValue(row));
      const unique = [...new Set(sourceValues.map(value => String(value ?? "")))].filter(value => value !== "");
      select.innerHTML = `<option value="">${escape(sf.allLabel)}</option>` + unique.map(value => `<option value="${escape(value)}">${escape(value)}</option>`).join("");
      if ([...select.options].some(option => option.value === current)) select.value = current;
      else select.value = "";
    }
    sideFilters.push({ selector: sf.selector, getValue: (row, rowIndex) => sf.getValue(allRows[rowIndex]) });
  }
  bindDomSearch({
    initialQuery: query,
    rowSelector: `#${config.body} ${config.rowSelector || "tr"}`,
    onQueryChange,
    fields: config.fields,
    defaultKeys: config.defaultKeys,
    defaultLabel: type === "imports" ? "Mã và NCC" : type === "accounts" ? "Tên đăng nhập và họ tên" : "Mã và tên",
    getFieldValue: (index, field) => allRows[index]?.[field],
    sideFilters
  });

  if (options.onEdit) {
    document.querySelectorAll(`#${config.body} [data-edit-index]`).forEach(button => {
      const index = Number(button.dataset.editIndex);
      button.onclick = () => options.onEdit(allRows[index]);
    });
  }
  if (options.onLock) {
    document.querySelectorAll(`#${config.body} [data-lock-index]`).forEach(button => {
      const index = Number(button.dataset.lockIndex);
      button.onclick = () => options.onLock(allRows[index]);
    });
  }
  if (options.onApprove) {
    document.querySelectorAll(`#${config.body} [data-approve-index]`).forEach(button => {
      const index = Number(button.dataset.approveIndex);
      button.onclick = () => options.onApprove(allRows[index]);
    });
  }
  if (options.onView) {
    document.querySelectorAll(`#${config.body} ${config.rowSelector || "tr"}`).forEach(row => {
      const index = Number(row.dataset.rowIndex);
      row.onclick = event => {
        if (event.target.closest("button")) return;
        options.onView(allRows[index]);
      };
    });
  }
}
