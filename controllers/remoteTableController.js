import { bindDomSearch, money, rowActions } from "./shared.js";

const escape = value => String(value ?? "").replace(/[&<>\"']/g, character => ({
  "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;"
}[character]));

const dataPromises = {};

export function clearRemoteTableCache() {
  Object.keys(dataPromises).forEach(type => delete dataPromises[type]);
}

export async function initRemoteTable(type, query, onQueryChange, loadData) {
  dataPromises[type] ??= loadData();
  const data = await dataPromises[type];
  const config = {
    suppliers: {
      rows: data.suppliers,
      body: "suppliers-body",
      defaultKeys: ["id", "name"],
      fields: { address: "Địa chỉ", phone: "Liên hệ", status: "Trạng thái" },
      search: row => `${row.id} ${row.name}`,
      render: (row, index) => `<tr data-row-index="${index}"><td class="code">${escape(row.id)}</td><td><b>${escape(row.name)}</b></td><td>${escape(row.address)}</td><td class="mono">${escape(row.phone)}</td><td><span class="tag green">${escape(row.status)}</span></td><td class="actions">${rowActions()}</td></tr>`
    },
    customers: {
      rows: data.customers,
      body: "customers-body",
      defaultKeys: ["id", "name"],
      fields: { phone: "Số điện thoại", email: "Email", orders: "Đơn hàng", spending: "Chi tiêu" },
      search: row => `${row.id} ${row.name}`,
      render: (row, index) => `<tr data-row-index="${index}"><td class="code">${escape(row.id)}</td><td><b>${escape(row.name)}</b></td><td class="mono">${escape(row.phone)}<div class="sub">${escape(row.email)}</div></td><td><span class="tag">${row.orders} đơn</span></td><td class="money">${money(row.spending)}</td><td class="actions">${rowActions()}</td></tr>`
    },
    imports: {
      rows: data.imports,
      body: "imports-body",
      defaultKeys: ["id", "supplier"],
      fields: { date: "Ngày nhập", count: "Số dòng SP", status: "Trạng thái" },
      search: row => `${row.id} ${row.supplier}`,
      render: (row, index) => `<tr data-row-index="${index}"><td class="code">${escape(row.id)}</td><td class="mono">${escape(row.date)}</td><td>${escape(row.supplier)}</td><td><span class="tag">${row.count} dòng SP</span></td><td><span class="tag green">${escape(row.status)}</span></td><td class="actions">${rowActions()}</td></tr>`
    },
    promotions: {
      rows: data.promotions,
      body: "promotions-body",
      defaultKeys: ["id", "name"],
      fields: { type: "Loại", period: "Thời gian", status: "Trạng thái" },
      search: row => `${row.id} ${row.name}`,
      render: (row, index) => `<tr data-row-index="${index}"><td class="code">${escape(row.id)}</td><td><b>${escape(row.name)}</b></td><td><span class="tag">${escape(row.type)}</span></td><td class="mono">${escape(row.period)}</td><td><span class="tag green">${escape(row.status)}</span></td><td class="actions">${rowActions()}</td></tr>`
    },
    staff: {
      rows: data.staff,
      body: "staff-body",
      defaultKeys: ["id", "name"],
      fields: { role: "Bộ phận", phone: "Số điện thoại", status: "Trạng thái" },
      search: row => `${row.id} ${row.name} ${row.role}`,
      render: (row, index) => `<tr data-row-index="${index}"><td class="code">${escape(row.id)}</td><td><b>${escape(row.name)}</b></td><td><span class="tag blue">${escape(row.role)}</span></td><td class="mono">${escape(row.phone)}</td><td><span class="tag green">${escape(row.status)}</span></td><td class="actions">${rowActions()}</td></tr>`
    },
    accounts: {
      rows: data.accounts,
      body: "accounts-body",
      defaultKeys: ["username", "name"],
      fields: { email: "Email", role: "Vai trò", status: "Trạng thái" },
      search: row => `${row.username} ${row.name} ${row.email}`,
      render: (row, index) => `<tr data-row-index="${index}"><td><b>${escape(row.username)}</b></td><td>${escape(row.name)}<div class="sub">${escape(row.email)}</div></td><td><span class="tag">${escape(row.role)}</span></td><td><span class="tag green">${escape(row.status)}</span></td><td class="actions">${rowActions()}</td></tr>`
    },
    styles: {
      rows: data.styles,
      body: "styles-body",
      defaultKeys: ["id", "name"],
      fields: { category: "Loại sản phẩm", status: "Trạng thái" },
      search: row => `${row.id} ${row.name} ${row.category}`,
      render: (row, index) => `<tr data-row-index="${index}"><td class="code">${escape(row.id)}</td><td><b>${escape(row.name)}</b></td><td>${escape(row.category)}</td><td><span class="tag green">${escape(row.status)}</span></td><td class="actions">${rowActions()}</td></tr>`
    }
  }[type];
  if (!config) return;
  const allRows = Array.isArray(data) ? data : config.rows || [];
  document.querySelector(`#${config.body}`).innerHTML = allRows.map((row, index) => config.render(row, index)).join("");
  document.querySelectorAll(`#${config.body} tr`).forEach((row, index) => {
    row.dataset.search = String(config.search(allRows[index]) || "").toLowerCase();
  });
  bindDomSearch({
    initialQuery: query,
    rowSelector: `#${config.body} tr`,
    onQueryChange,
    fields: config.fields,
    defaultKeys: config.defaultKeys,
    defaultLabel: type === "imports" ? "Mã và NCC" : type === "accounts" ? "Tên đăng nhập và họ tên" : "Mã và tên",
    getFieldValue: (index, field) => allRows[index]?.[field]
  });
}