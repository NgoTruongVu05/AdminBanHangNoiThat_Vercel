import { getDashboardData } from "../models/dashboardModel.js";
import { money } from "./shared.js";

const dateKey = value => String(value || "").slice(0, 10);
const formatDate = value => value ? new Date(`${value}T00:00:00`).toLocaleDateString("vi-VN") : "";

function showProfitModal(revenue, importCost, year) {
  const profit = revenue - importCost;
  const margin = revenue ? (profit / revenue * 100).toFixed(1) : "0.0";
  const backdrop = document.createElement("div");
  backdrop.className = "modal-backdrop profit-modal-backdrop";
  backdrop.innerHTML = `
    <section class="profit-modal" role="dialog" aria-modal="true" aria-labelledby="profit-modal-title">
      <header class="profit-modal-header">
        <div class="profit-modal-icon">▣</div>
        <div>
          <h2 id="profit-modal-title">Công thức Tính Lợi Nhuận Ròng & Biên Lợi Nhuận</h2>
          <p>Áp dụng chuẩn kế toán cho kỳ: <b>Toàn bộ năm ${year}</b></p>
        </div>
        <button class="profit-modal-close" type="button" aria-label="Đóng">×</button>
      </header>
      <div class="profit-formula">
        <div class="profit-formula-title"><b>1. LỢI NHUẬN RÒNG (NET PROFIT)</b><span>Đơn vị: VNĐ</span></div>
        <div class="profit-equation"><span>Lợi Nhuận Ròng</span><b>=</b><span>Tổng Doanh Thu</span><b>-</b><span>Tổng Chi Phí Xưởng</span></div>
        <p>Phép tính cụ thể: <strong>${money(revenue)} - ${money(importCost)} = <em>${money(profit)}</em></strong></p>
      </div>
      <div class="profit-formula">
        <div class="profit-formula-title"><b>2. BIÊN LỢI NHUẬN (NET PROFIT MARGIN)</b><span>Đơn vị: Tỷ lệ %</span></div>
        <div class="profit-equation"><span>Biên Lợi Nhuận (%)</span><b>=</b><span>( Lợi Nhuận Ròng&nbsp; / &nbsp;Tổng Doanh Thu ) × 100%</span></div>
        <p>Phép tính cụ thể: <strong>(${money(profit)} / ${money(revenue)}) × 100% = <em>${margin}%</em></strong></p>
      </div>
    </section>`;
  document.body.append(backdrop);
  const close = () => {
    document.removeEventListener("keydown", onKeyDown);
    backdrop.remove();
  };
  const onKeyDown = event => { if (event.key === "Escape") close(); };
  backdrop.querySelector(".profit-modal-close").onclick = close;
  backdrop.onclick = event => { if (event.target === backdrop) close(); };
  document.addEventListener("keydown", onKeyDown);
  backdrop.querySelector(".profit-modal-close").focus();
}

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

function renderProductFinancialTable(data, selectedProductId = null) {
  const selectedYear = document.querySelector("#product-year-select").value;
  const products = new Map();
  data.productFinancialOrders.forEach(item => {
    if (item.year !== selectedYear) return;
    if (!products.has(String(item.productId))) {
      products.set(String(item.productId), {
        id: item.productId,
        name: item.productName,
        total: 0
      });
    }
    products.get(String(item.productId)).total += item.amount;
  });
  const rows = [...products.values()].sort((a, b) => b.total - a.total);
  const total = rows.reduce((sum, product) => sum + product.total, 0);
  document.querySelector("#product-financial-head").innerHTML =
    "<tr><th>Sản phẩm</th><th>Tổng doanh thu</th></tr>";
  document.querySelector("#product-financial-body").innerHTML = rows.length
    ? rows.map(product => {
      const selected = String(product.id) === String(selectedProductId);
      return `<tr class="product-chart-row${selected ? " selected" : ""}" data-product-id="${encodeURIComponent(String(product.id))}"><td><button class="product-chart-select" type="button" aria-pressed="${selected}">${product.name}</button></td><td><b>${money(product.total)}</b></td></tr>`;
    }).join("")
    : '<tr><td colspan="2" class="empty-state">Chưa có dữ liệu hóa đơn theo sản phẩm.</td></tr>';
  document.querySelector("#product-financial-foot").innerHTML = rows.length
    ? `<tr><th>TỔNG CỘNG</th><th>${money(total)}</th></tr>`
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
  let selectedProductId = null;
  const profit = data.revenue - data.importCost;
  const margin = data.revenue ? `${(profit / data.revenue * 100).toFixed(1)}%` : "0%";
  document.querySelector("#revenue-total").textContent = money(data.revenue);
  document.querySelector("#import-total").textContent = money(data.importCost);
  document.querySelector("#profit-total").textContent = money(profit);
  document.querySelector("#profit-total").classList.toggle("negative", profit < 0);
  document.querySelector("#profit-total").classList.toggle("positive", profit >= 0);
  document.querySelector("#profit-margin").textContent = margin;
  document.querySelector("#profit-stat").onclick = () => {
    const latestYear = dateKey([...data.financialOrders, ...data.financialImports]
      .map(item => item.date).sort().pop()).slice(0, 4) || String(new Date().getFullYear());
    showProfitModal(data.revenue, data.importCost, latestYear);
  };
  document.querySelector("#stock-total").textContent = `${data.stock.toLocaleString("vi-VN")} sản phẩm`;
  document.querySelector("#customer-total").textContent = `${data.customerCount.toLocaleString("vi-VN")} hồ sơ`;
  document.querySelector("#completed-orders").textContent = `${data.completedOrderCount} đơn`;
  document.querySelector("#completed-imports").textContent = `${data.completedImportCount} đợt`;
  document.querySelector("#product-count").textContent = `${data.productCount} mẫu`;
  document.querySelector("#customer-count").textContent = `${data.customerCount} hồ sơ`;
  const chartPeriodMode = document.querySelector("#chart-period-mode");
  const chartMonthControls = document.querySelector("#chart-month-controls");
  const chartRange = document.querySelector("#chart-month-range");
  const customMonthsField = document.querySelector("#chart-custom-months-field");
  const customMonthsInput = document.querySelector("#chart-custom-months");
  const productYearSelect = document.querySelector("#product-year-select");
  const transactionDates = data.financialOrders
    .map(item => new Date(`${dateKey(item.date)}T00:00:00`))
    .filter(date => !Number.isNaN(date.getTime()))
    .sort((a, b) => a - b);
  const latestTransaction = transactionDates[transactionDates.length - 1] || new Date();
  const latestMonthDate = new Date(latestTransaction.getFullYear(), latestTransaction.getMonth(), 1);
  const renderRevenueChart = () => {
    const isQuarterMode = chartPeriodMode.value === "quarter";
    const monthCount = chartRange.value === "custom"
      ? Number(customMonthsInput.value)
      : Number(chartRange.value);
    if (!isQuarterMode && (!Number.isSafeInteger(monthCount) || monthCount < 1)) {
      customMonthsInput.setCustomValidity("Vui lòng nhập số tháng nguyên lớn hơn 0.");
      customMonthsInput.reportValidity();
      return;
    }
    customMonthsInput.setCustomValidity("");
    const selectedYear = Number(productYearSelect.value) || latestTransaction.getFullYear();
    const periods = isQuarterMode
      ? [1, 2, 3, 4].map(quarter => ({
        key: `${selectedYear}-Q${quarter}`,
        label: `Quý ${quarter}`,
        value: 0,
        orderIds: new Set()
      }))
      : Array.from({ length: monthCount }, (_, index) => {
        const monthDate = new Date(
          latestMonthDate.getFullYear(),
          latestMonthDate.getMonth() - monthCount + index + 1,
          1
        );
        const key = `${monthDate.getFullYear()}-${String(monthDate.getMonth() + 1).padStart(2, "0")}`;
        return {
          key,
          label: monthDate.toLocaleDateString("vi-VN", { month: "2-digit", year: "numeric" }),
          value: 0,
          orderIds: new Set()
        };
      });
    const periodsByKey = new Map(periods.map(period => [period.key, period]));
    const revenueEntries = data.productFinancialOrders.filter(item =>
      selectedProductId === null || String(item.productId) === selectedProductId
    );
    revenueEntries.forEach(item => {
      const date = dateKey(item.date);
      let period;
      if (isQuarterMode) {
        const transactionDate = new Date(`${date}T00:00:00`);
        if (Number.isNaN(transactionDate.getTime()) || transactionDate.getFullYear() !== selectedYear) return;
        const quarter = Math.floor(transactionDate.getMonth() / 3) + 1;
        period = periodsByKey.get(`${selectedYear}-Q${quarter}`);
      } else {
        period = periodsByKey.get(date.slice(0, 7));
      }
      if (!period) return;
      period.value += item.amount;
      if (item.orderId !== null && item.orderId !== undefined) {
        period.orderIds.add(String(item.orderId));
      }
    });
    const productName = selectedProductId === null
      ? ""
      : data.productFinancialOrders.find(item => String(item.productId) === selectedProductId)?.productName || "Sản phẩm";
    const periodDescription = isQuarterMode
      ? `theo 4 quý của năm ${selectedYear}`
      : `theo tháng trong ${monthCount} tháng gần nhất`;
    document.querySelector("#revenue-chart-title").textContent = selectedProductId
      ? `Doanh thu ${productName} ${periodDescription}`
      : `Diễn biến doanh thu sản phẩm ${periodDescription}`;
    document.querySelector("#revenue-chart-description").textContent =
      "Đơn vị tính: VNĐ · Doanh thu sản phẩm trong các đơn hàng đã hoàn thành";
    const latestQuarter = isQuarterMode
      ? revenueEntries.reduce((latest, item) => {
        const transactionDate = new Date(`${dateKey(item.date)}T00:00:00`);
        if (Number.isNaN(transactionDate.getTime()) || transactionDate.getFullYear() !== selectedYear) return latest;
        return Math.max(latest, Math.floor(transactionDate.getMonth() / 3) + 1);
      }, 0) || 4
      : null;
    const latestPeriod = isQuarterMode ? periods[latestQuarter - 1] : periods[periods.length - 1];
    document.querySelector("#chart-summary-period").textContent =
      isQuarterMode ? `Quý ${latestQuarter}` : "Tháng gần nhất";
    document.querySelector("#latest-month-summary").textContent = `Doanh thu: ${money(latestPeriod.value)}`;
    document.querySelector("#latest-month-orders").textContent = `${latestPeriod.orderIds.size} đơn`;
    const maxRevenue = Math.max(...periods.map(period => period.value), 1);
    document.querySelector("#revenue-chart").innerHTML = periods.map(period => {
      const height = period.value ? Math.max(period.value / maxRevenue * 100, 4) : 0;
      return `<div class="bar-wrap" title="${money(period.value)}"><div class="bar" style="height:${height}%"></div><span class="bar-label">${period.label}</span></div>`;
    }).join("");
  };
  chartPeriodMode.onchange = () => {
    chartMonthControls.hidden = chartPeriodMode.value !== "month";
    renderRevenueChart();
  };
  chartRange.onchange = () => {
    customMonthsField.hidden = chartRange.value !== "custom";
    renderRevenueChart();
  };
  customMonthsInput.onchange = renderRevenueChart;
  document.querySelector("#product-financial-body").onclick = event => {
    const row = event.target.closest(".product-chart-row");
    if (!row) return;
    selectedProductId = decodeURIComponent(row.dataset.productId);
    renderProductFinancialTable(data, selectedProductId);
    renderRevenueChart();
  };

  const years = [...new Set([...data.financialOrders, ...data.financialImports]
    .map(item => dateKey(item.date).slice(0, 4)).filter(Boolean))].sort((a, b) => b.localeCompare(a));
  const yearSelect = document.querySelector("#financial-year-select");
  yearSelect.innerHTML = years.length ? years.map(year => `<option value="${year}">${year}</option>`).join("") :
    `<option value="${new Date().getFullYear()}">${new Date().getFullYear()}</option>`;
  const latestDate = [...data.financialOrders, ...data.financialImports]
    .map(item => dateKey(item.date)).sort().pop() || new Date().toISOString().slice(0, 10);
  const today = new Date();
  const todayKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
  document.querySelector("#financial-from").value = `${latestDate.slice(0, 4)}-01-01`;
  document.querySelector("#financial-to").value = todayKey;
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
  const productYears = [...new Set(data.financialOrders
    .map(item => dateKey(item.date).slice(0, 4))
    .filter(Boolean))].sort((a, b) => b.localeCompare(a));
  productYearSelect.innerHTML = productYears.length
    ? productYears.map(year => `<option value="${year}">${year}</option>`).join("")
    : `<option value="${new Date().getFullYear()}">${new Date().getFullYear()}</option>`;
  productYearSelect.value = productYears[0] || String(new Date().getFullYear());
  document.querySelector("#product-apply").onclick = () => {
    selectedProductId = null;
    renderProductFinancialTable(data);
    renderRevenueChart();
  };
  renderProductFinancialTable(data, selectedProductId);
  renderRevenueChart();
  renderFinancialTable(data);
}
