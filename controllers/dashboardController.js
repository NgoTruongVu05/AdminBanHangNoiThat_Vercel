import { getDashboardData } from "../models/dashboardModel.js";
import { money } from "./shared.js";

const dateKey = value => String(value || "").slice(0, 10);
const formatDate = value => value ? new Date(`${value}T00:00:00`).toLocaleDateString("vi-VN") : "";

function renderEmployeeFinancialTable(data) {
  const period = document.querySelector("#employee-period").value;
  const year = Number(document.querySelector("#employee-year-select").value);
  const quarter = Number(document.querySelector("#employee-quarter-select").value);
  const isQuarter = period === "quarter";
  const orderRows = data.financialOrders.map(item => ({ ...item, date: dateKey(item.date) }));
  const getQuarter = date => Math.floor(new Date(`${date}T00:00:00`).getMonth() / 3) + 1;
  document.querySelector("#employee-financial-period").textContent =
    isQuarter ? `Quý ${quarter}/${year}` : `Năm ${year}`;

  if (!isQuarter) {
    const employeeMap = new Map(data.employees.map(employee => [String(employee.id), {
      name: employee.name,
      quarters: [0, 0, 0, 0]
    }]));
    orderRows
      .filter(item => new Date(`${item.date}T00:00:00`).getFullYear() === year)
      .forEach(item => {
        const key = String(item.employeeId ?? "");
        if (!employeeMap.has(key)) {
          employeeMap.set(key, { name: "Chưa xác định", quarters: [0, 0, 0, 0] });
        }
        employeeMap.get(key).quarters[getQuarter(item.date) - 1] += item.amount;
      });
    const rows = [...employeeMap.values()]
      .map(employee => ({ ...employee, total: employee.quarters.reduce((sum, value) => sum + value, 0) }))
      .filter(employee => employee.total > 0)
      .sort((a, b) => b.total - a.total);
    const totals = rows.reduce((result, employee) => {
      employee.quarters.forEach((value, index) => { result[index] += value; });
      return result;
    }, [0, 0, 0, 0]);
    document.querySelector("#employee-financial-head").innerHTML =
      "<tr><th>Nhân viên</th><th>Quý 1</th><th>Quý 2</th><th>Quý 3</th><th>Quý 4</th><th>Tổng cộng</th></tr>";
    document.querySelector("#employee-financial-body").innerHTML = rows.length
      ? rows.map(employee => `<tr><td><b>${employee.name}</b></td>${employee.quarters.map(value => `<td>${money(value)}</td>`).join("")}<td><b>${money(employee.total)}</b></td></tr>`).join("")
      : '<tr><td colspan="6" class="empty-state">Chưa có hóa đơn hoàn thành trong năm này.</td></tr>';
    document.querySelector("#employee-financial-foot").innerHTML = rows.length
      ? `<tr><th>TỔNG CỘNG</th>${totals.map(value => `<th>${money(value)}</th>`).join("")}<th>${money(totals.reduce((sum, value) => sum + value, 0))}</th></tr>`
      : "";
    return;
  }

  const match = date => {
    const current = new Date(`${date}T00:00:00`);
    return current.getFullYear() === year &&
      (!isQuarter || Math.floor(current.getMonth() / 3) + 1 === quarter);
  };
  const employeeMap = new Map(data.employees.map(employee => [String(employee.id), {
    name: employee.name,
    count: 0,
    total: 0
  }]));
  orderRows
    .filter(item => match(item.date))
    .forEach(item => {
      const key = String(item.employeeId ?? "");
      if (!employeeMap.has(key)) {
        employeeMap.set(key, { name: "Chưa xác định", count: 0, total: 0 });
      }
      const employee = employeeMap.get(key);
      employee.count += 1;
      employee.total += item.amount;
    });
  const rows = [...employeeMap.values()]
    .filter(employee => employee.count > 0)
    .sort((a, b) => b.total - a.total);
  const total = rows.reduce((sum, employee) => sum + employee.total, 0);
  document.querySelector("#employee-financial-head").innerHTML =
    "<tr><th>Nhân viên</th><th>Số hóa đơn</th><th>Tổng tiền hóa đơn</th></tr>";
  document.querySelector("#employee-financial-body").innerHTML = rows.length
    ? rows.map(employee => `<tr><td><b>${employee.name}</b></td><td>${employee.count}</td><td>${money(employee.total)}</td></tr>`).join("")
    : '<tr><td colspan="3" class="empty-state">Chưa có hóa đơn hoàn thành trong kỳ này.</td></tr>';
  document.querySelector("#employee-financial-foot").innerHTML = rows.length
    ? `<tr><th>TỔNG CỘNG</th><th>${rows.reduce((sum, employee) => sum + employee.count, 0)}</th><th>${money(total)}</th></tr>`
    : "";
}

function renderCustomerFinancialTable(data) {
  const orderRows = data.financialOrders.map(item => ({ ...item, date: dateKey(item.date) }));
  const years = [...new Set(orderRows
    .map(item => item.date.slice(0, 4))
    .filter(Boolean))].sort();
  const customers = new Map(data.customers.map(customer => [String(customer.id), {
    name: customer.name,
    amounts: Object.fromEntries(years.map(year => [year, 0]))
  }]));
  orderRows.forEach(item => {
    const key = String(item.customerId ?? "");
    if (!customers.has(key)) {
      customers.set(key, {
        name: "Chưa xác định",
        amounts: Object.fromEntries(years.map(year => [year, 0]))
      });
    }
    const year = item.date.slice(0, 4);
    if (years.includes(year)) customers.get(key).amounts[year] += item.amount;
  });
  const rows = [...customers.values()]
    .map(customer => ({
      ...customer,
      total: years.reduce((sum, year) => sum + customer.amounts[year], 0)
    }))
    .filter(customer => customer.total > 0)
    .sort((a, b) => b.total - a.total);
  const totals = years.map(year => rows.reduce((sum, customer) => sum + customer.amounts[year], 0));
  document.querySelector("#customer-financial-period").textContent = "Tất cả các năm";
  document.querySelector("#customer-financial-head").innerHTML =
    `<tr><th>Khách hàng</th>${years.map(year => `<th>${year}</th>`).join("")}<th>Tổng cộng</th></tr>`;
  document.querySelector("#customer-financial-body").innerHTML = rows.length
    ? rows.map(customer => `<tr><td><b>${customer.name}</b></td>${years.map(year => `<td>${money(customer.amounts[year])}</td>`).join("")}<td><b>${money(customer.total)}</b></td></tr>`).join("")
    : `<tr><td colspan="${years.length + 2}" class="empty-state">Chưa có hóa đơn hoàn thành.</td></tr>`;
  document.querySelector("#customer-financial-foot").innerHTML = rows.length
    ? `<tr><th>TỔNG CỘNG</th>${totals.map(value => `<th>${money(value)}</th>`).join("")}<th>${money(totals.reduce((sum, value) => sum + value, 0))}</th></tr>`
    : "";
}

function renderProductFinancialTable(data) {
  const selectedYear = document.querySelector("#product-year-select").value;
  const products = new Map();
  data.productFinancialOrders.forEach(item => {
    if (item.year !== selectedYear) return;
    if (!products.has(String(item.productId))) {
      products.set(String(item.productId), {
        name: item.productName,
        quarters: [0, 0, 0, 0]
      });
    }
    const quarter = Math.floor(new Date(`${item.date}T00:00:00`).getMonth() / 3);
    products.get(String(item.productId)).quarters[quarter] += item.amount;
  });
  const rows = [...products.values()].map(product => ({
    ...product,
    total: product.quarters.reduce((sum, value) => sum + value, 0)
  })).sort((a, b) => b.total - a.total);
  const totals = [0, 1, 2, 3].map(index =>
    rows.reduce((sum, product) => sum + product.quarters[index], 0)
  );
  document.querySelector("#product-financial-head").innerHTML =
    "<tr><th>Sản phẩm</th><th>Quý 1</th><th>Quý 2</th><th>Quý 3</th><th>Quý 4</th><th>Tổng cộng</th></tr>";
  document.querySelector("#product-financial-body").innerHTML = rows.length
    ? rows.map(product => `<tr><td><b>${product.name}</b></td>${product.quarters.map(value => `<td>${money(value)}</td>`).join("")}<td><b>${money(product.total)}</b></td></tr>`).join("")
    : '<tr><td colspan="6" class="empty-state">Chưa có dữ liệu hóa đơn theo sản phẩm.</td></tr>';
  document.querySelector("#product-financial-foot").innerHTML = rows.length
    ? `<tr><th>TỔNG CỘNG</th>${totals.map(value => `<th>${money(value)}</th>`).join("")}<th>${money(totals.reduce((sum, value) => sum + value, 0))}</th></tr>`
    : "";
}

function renderFinancialTable(data) {
  const period = document.querySelector("#financial-period").value;
  const from = document.querySelector("#financial-from").value;
  const to = document.querySelector("#financial-to").value;
  const year = document.querySelector("#financial-year-select").value;
  const quarter = Number(document.querySelector("#financial-quarter-select").value);
  const month = document.querySelector("#financial-month-select").value;
  const orderRows = data.financialOrders.map(item => ({ ...item, date: dateKey(item.date) }));
  const importRows = data.financialImports.map(item => ({ ...item, date: dateKey(item.date) }));
  const calculate = match => ({
    revenue: orderRows.filter(item => match(item.date)).reduce((sum, item) => sum + item.amount, 0),
    cost: importRows.filter(item => match(item.date)).reduce((sum, item) => sum + item.amount, 0)
  });
  let groups = [];
  if (period === "range") {
    groups = [{ label: `${formatDate(from)} - ${formatDate(to)}`, match: date => date >= from && date <= to }];
  } else if (period === "month") {
    groups = [{ label: month ? month.split("-").reverse().join("/") : "Chưa chọn tháng", match: date => date.startsWith(`${month}-`) }];
  } else if (period === "quarter") {
    groups = [{
      label: `Quý ${quarter}/${year}`, match: date => {
        const current = new Date(`${date}T00:00:00`);
        return current.getFullYear() === Number(year) && Math.floor(current.getMonth() / 3) + 1 === quarter;
      }
    }];
  } else if (period === "year") {
    const quarterly = [1, 2, 3, 4].map(currentQuarter => calculate(date => {
      const current = new Date(`${date}T00:00:00`);
      return current.getFullYear() === Number(year) &&
        Math.floor(current.getMonth() / 3) + 1 === currentQuarter;
    }));
    document.querySelector("#financial-head").innerHTML =
      `<tr><th>Chỉ tiêu</th>${[1, 2, 3, 4].map(item => `<th>Quý ${item}</th>`).join("")}</tr>`;
    document.querySelector("#financial-body").innerHTML = [
      ["Tổng thu", "revenue", ""],
      ["Tổng chi", "cost", ""],
      ["Lợi nhuận", "profit", "profit"]
    ].map(([label, key, className]) =>
      `<tr><th>${label}</th>${quarterly.map(item => {
        const profit = item.revenue - item.cost;
        const value = key === "profit" ? profit : item[key];
        return `<td class="${className === "profit" ? (value < 0 ? "negative" : "positive") : ""}">${money(value)}</td>`;
      }).join("")}</tr>`
    ).join("");
    document.querySelector("#financial-foot").innerHTML = "";
    return;
  } else {
    groups = [...new Set([...orderRows, ...importRows].map(item => item.date.slice(0, 4)).filter(Boolean))]
      .sort((a, b) => b.localeCompare(a))
      .map(itemYear => ({ label: `Năm ${itemYear}`, match: date => date.startsWith(`${itemYear}-`) }));
  }
  const rows = groups.map(group => {
    const { revenue, cost } = calculate(group.match);
    return { label: group.label, revenue, cost, profit: revenue - cost };
  });
  const total = rows.reduce((result, row) => ({
    revenue: result.revenue + row.revenue, cost: result.cost + row.cost, profit: result.profit + row.profit
  }), { revenue: 0, cost: 0, profit: 0 });
  document.querySelector("#financial-head").innerHTML =
    "<tr><th>Thời gian</th><th>Tổng thu</th><th>Tổng chi</th><th>Lợi nhuận</th></tr>";
  document.querySelector("#financial-body").innerHTML = rows.length
    ? rows.map(row => `<tr><td><b>${row.label}</b></td><td>${money(row.revenue)}</td><td>${money(row.cost)}</td><td class="${row.profit < 0 ? "negative" : "positive"}">${money(row.profit)}</td></tr>`).join("")
    : '<tr><td colspan="4" class="empty-state">Chưa có dữ liệu trong khoảng thời gian này.</td></tr>';
  document.querySelector("#financial-foot").innerHTML = rows.length
    ? `<tr><th>TỔNG CỘNG</th><th>${money(total.revenue)}</th><th>${money(total.cost)}</th><th class="${total.profit < 0 ? "negative" : "positive"}">${money(total.profit)}</th></tr>`
    : "";
}

export async function initDashboard(query, rerender) {
  const data = await getDashboardData();
  const maxRevenue = Math.max(...data.months.map(month => month.value), 1);
  const totalWoodProducts = data.woods.reduce((sum, item) => sum + item.count, 0);
  document.querySelector(".stat strong").textContent = money(data.revenue);
  document.querySelectorAll(".stat strong")[1].textContent = money(data.importCost);
  document.querySelectorAll(".stat strong")[2].textContent = `${data.stock.toLocaleString("vi-VN")} sản phẩm`;
  document.querySelectorAll(".stat strong")[3].textContent = `${data.customerCount.toLocaleString("vi-VN")} hồ sơ`;
  document.querySelector("#completed-orders").textContent = `${data.completedOrderCount} đơn`;
  document.querySelector("#completed-imports").textContent = `${data.completedImportCount} đợt`;
  document.querySelector("#product-count").textContent = `${data.productCount} mẫu`;
  document.querySelector("#customer-count").textContent = `${data.customerCount} hồ sơ`;
  document.querySelector("#revenue-period").textContent =
    `${data.months[0].label} - ${data.months[data.months.length - 1].label}`;
  document.querySelector("#revenue-chart").innerHTML = data.months.map((month, index) => {
    const height = month.value ? Math.max(month.value / maxRevenue * 100, 4) : 0;
    return `<div class="bar-wrap" title="${money(month.value)}"><div class="bar ${index === data.months.length - 1 ? "active" : ""}" style="height:${height}%"></div><span class="bar-label">${month.label}</span></div>`;
  }).join("");
  document.querySelector("#wood-list").innerHTML = data.woods.length
    ? data.woods.map(item => {
      const percentage = totalWoodProducts ? Math.round(item.count / totalWoodProducts * 100) : 0;
      return `<div class="wood-item"><div class="wood-row"><b>${item.name}</b><span>${item.count} mẫu (${percentage}%)</span></div><div class="progress"><i style="width:${percentage}%"></i></div></div>`;
    }).join("")
    : "<p>Chưa có dữ liệu loại gỗ.</p>";

  const years = [...new Set([...data.financialOrders, ...data.financialImports]
    .map(item => dateKey(item.date).slice(0, 4)).filter(Boolean))].sort((a, b) => b.localeCompare(a));
  const yearSelect = document.querySelector("#financial-year-select");
  yearSelect.innerHTML = years.length ? years.map(year => `<option value="${year}">${year}</option>`).join("") :
    `<option value="${new Date().getFullYear()}">${new Date().getFullYear()}</option>`;
  const latestDate = [...data.financialOrders, ...data.financialImports]
    .map(item => dateKey(item.date)).sort().pop() || new Date().toISOString().slice(0, 10);
  document.querySelector("#financial-from").value = `${latestDate.slice(0, 4)}-01-01`;
  document.querySelector("#financial-to").value = latestDate;
  const periodSelect = document.querySelector("#financial-period");
  const toggleFinancialFields = () => {
    const period = periodSelect.value;
    document.querySelectorAll(".financial-range").forEach(element => { element.hidden = period !== "range"; });
    document.querySelector(".financial-month").hidden = period !== "month";
    document.querySelector(".financial-year").hidden = !["quarter", "year"].includes(period);
    document.querySelector(".financial-quarter").hidden = period !== "quarter";
  };
  periodSelect.onchange = toggleFinancialFields;
  document.querySelector("#financial-apply").onclick = () => {
    const from = document.querySelector("#financial-from").value;
    const to = document.querySelector("#financial-to").value;
    if (periodSelect.value === "range" && (!from || !to || from > to)) {
      document.querySelector("#financial-head").innerHTML = "";
      document.querySelector("#financial-body").innerHTML =
        '<tr><td colspan="4" class="empty-state">Vui lòng chọn khoảng ngày hợp lệ.</td></tr>';
      document.querySelector("#financial-foot").innerHTML = "";
      return;
    }
    renderFinancialTable(data);
  };
  toggleFinancialFields();
  document.querySelector("#financial-month-select").value = latestDate.slice(0, 7);
  const employeeYearSelect = document.querySelector("#employee-year-select");
  employeeYearSelect.innerHTML = yearSelect.innerHTML;
  employeeYearSelect.value = latestDate.slice(0, 4);
  const employeePeriod = document.querySelector("#employee-period");
  const employeeQuarter = document.querySelector(".employee-quarter");
  employeePeriod.onchange = () => {
    employeeQuarter.hidden = employeePeriod.value !== "quarter";
  };
  document.querySelector("#employee-apply").onclick = () => renderEmployeeFinancialTable(data);
  employeePeriod.onchange();
  renderEmployeeFinancialTable(data);
  renderCustomerFinancialTable(data);
  const productYears = [...new Set(data.productFinancialOrders.map(item => item.year))].sort((a, b) => b.localeCompare(a));
  const productYearSelect = document.querySelector("#product-year-select");
  productYearSelect.innerHTML = productYears.length
    ? productYears.map(year => `<option value="${year}">${year}</option>`).join("")
    : `<option value="${new Date().getFullYear()}">${new Date().getFullYear()}</option>`;
  productYearSelect.value = productYears[0] || String(new Date().getFullYear());
  document.querySelector("#product-apply").onclick = () => renderProductFinancialTable(data);
  renderProductFinancialTable(data);
  renderFinancialTable(data);
}
