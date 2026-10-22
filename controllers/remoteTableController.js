import { bindSearch, money, rowActions } from "./shared.js";

const escape = value => String(value ?? "").replace(/[&<>"']/g, character => ({
  "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;"
}[character]));

const dataPromises = {};

export async function initRemoteTable(type, query, rerender, loadData) {
  dataPromises[type] ??= loadData();
  const data = await dataPromises[type];
  const config = {
    suppliers: { rows: data.suppliers, body: "suppliers-body", search: row => `${row.id} ${row.name} ${row.phone}`, render: row => `<tr><td class="code">${escape(row.id)}</td><td><b>${escape(row.name)}</b></td><td>${escape(row.address)}</td><td class="mono">${escape(row.phone)}</td><td><span class="tag green">${escape(row.status)}</span></td><td class="actions">${rowActions()}</td></tr>` },
    customers: { rows: data.customers, body: "customers-body", search: row => `${row.id} ${row.name} ${row.phone} ${row.email}`, render: row => `<tr><td class="code">${escape(row.id)}</td><td><b>${escape(row.name)}</b></td><td class="mono">${escape(row.phone)}<div class="sub">${escape(row.email)}</div></td><td><span class="tag">${row.orders} đơn</span></td><td class="money">${money(row.spending)}</td><td class="actions">${rowActions()}</td></tr>` },
    imports: { rows: data.imports, body: "imports-body", search: row => `${row.id} ${row.date} ${row.supplier}`, render: row => `<tr><td class="code">${escape(row.id)}</td><td class="mono">${escape(row.date)}</td><td>${escape(row.supplier)}</td><td><span class="tag">${row.count} dòng SP</span></td><td><span class="tag green">${escape(row.status)}</span></td><td class="actions">${rowActions()}</td></tr>` },
    promotions: { rows: data.promotions, body: "promotions-body", search: row => `${row.id} ${row.name}`, render: row => `<tr><td class="code">${escape(row.id)}</td><td><b>${escape(row.name)}</b></td><td><span class="tag">${escape(row.type)}</span></td><td class="mono">${escape(row.period)}</td><td><span class="tag green">${escape(row.status)}</span></td><td class="actions">${rowActions()}</td></tr>` },
    staff: { rows: data.staff, body: "staff-body", search: row => `${row.id} ${row.name} ${row.role}`, render: row => `<tr><td class="code">${escape(row.id)}</td><td><b>${escape(row.name)}</b></td><td><span class="tag blue">${escape(row.role)}</span></td><td class="mono">${escape(row.phone)}</td><td><span class="tag green">${escape(row.status)}</span></td><td class="actions">${rowActions()}</td></tr>` },
    accounts: { rows: data.accounts, body: "accounts-body", search: row => `${row.id} ${row.username} ${row.name}`, render: row => `<tr><td class="code">${escape(row.id)}</td><td><b>${escape(row.username)}</b></td><td>${escape(row.name)}</td><td><span class="tag">${escape(row.role)}</span></td><td><span class="tag green">${escape(row.status)}</span></td><td class="actions">${rowActions()}</td></tr>` },
    styles: { rows: data.styles, body: "styles-body", search: row => `${row.id} ${row.name} ${row.category}`, render: row => `<tr><td class="code">${escape(row.id)}</td><td><b>${escape(row.name)}</b></td><td>${escape(row.category)}</td><td><span class="tag green">${escape(row.status)}</span></td><td class="actions">${rowActions()}</td></tr>` }
  }[type];
  if (!config) return;
  const rows = (Array.isArray(data) ? data : config.rows || [])
    .filter(row => config.search(row).toLowerCase().includes(query.toLowerCase()));
  document.querySelector(`#${config.body}`).innerHTML = rows.map(config.render).join("");
  bindSearch(rerender, query);
}
