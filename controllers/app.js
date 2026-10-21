import { getMenu } from "../models/menu.js";
import { initDashboard } from "./dashboardController.js";
import { initProducts } from "./productsController.js";
import { initCategories } from "./categoriesController.js";
import { initWoods } from "./woodsController.js";
import { initOrders } from "./ordersController.js";
import { initImports } from "./importsController.js";
import { initSuppliers } from "./suppliersController.js";
import { initCustomers } from "./customersController.js";
import { initPromotions } from "./promotionsController.js";
import { initStaff } from "./staffController.js";
import { initAccounts } from "./accountsController.js";
import { initStyles } from "./stylesController.js";
import { toolbar } from "./shared.js";

const state = { page: "dashboard", query: "" };
const titles = {
  dashboard: "Báo cáo & Thống kê", products: "Quản lý thông tin sản phẩm nội thất",
  categories: "Danh mục loại sản phẩm nội thất", woods: "Danh mục loại gỗ & chất liệu",
  styles: "Danh mục kiểu dáng nội thất", imports: "Quản lý nhập kho nội thất",
  suppliers: "Quản lý danh sách nhà cung cấp", orders: "Quản lý hóa đơn bán hàng & giao vận",
  customers: "Quản lý hồ sơ & sổ địa chỉ khách hàng", promotions: "Quản lý chương trình khuyến mãi",
  staff: "Quản lý nhân sự & phân quyền kinh doanh", accounts: "Quản lý tài khoản quản trị hệ thống"
};
const views = { dashboard: "dashboard", products: "products", categories: "categories", woods: "woods", styles: "styles", imports: "imports", suppliers: "suppliers", orders: "orders", customers: "customers", promotions: "promotions", staff: "staff", accounts: "accounts" };
const controllers = { dashboard: initDashboard, products: initProducts, categories: initCategories, woods: initWoods, styles: initStyles, imports: initImports, suppliers: initSuppliers, orders: initOrders, customers: initCustomers, promotions: initPromotions, staff: initStaff, accounts: initAccounts };

function login() {
  document.querySelector("#app").innerHTML = `<main class="login-page"><section class="login-panel"><div class="login-brand"><div class="brand-mark">WC</div><div><strong>WOODCRAFT ADMIN</strong><small>ERP RELATIONAL PORTAL</small></div></div><div class="login-copy"><div class="eyebrow">SECURE ACCESS / 2026</div><h1>Chào mừng trở lại</h1><p>Đăng nhập để quản lý hệ thống bán hàng nội thất Woodcraft.</p></div><form class="login-form"><label>TÊN ĐĂNG NHẬP<input name="username" placeholder="Nhập tên đăng nhập" required></label><label>MẬT KHẨU<input name="password" type="password" placeholder="Nhập mật khẩu" required></label><div class="login-options"><label class="remember"><input type="checkbox" checked> Ghi nhớ đăng nhập</label><a href="#" id="forgot-password">Quên mật khẩu?</a></div><button class="btn login-btn">Đăng nhập hệ thống <span>→</span></button><p class="login-hint">Tài khoản demo: <b>admin.woodcraft</b> / <b>123456</b></p></form><footer>WOODCRAFT ERP · GIAO DIỆN DEMO, CHƯA KẾT NỐI CƠ SỞ DỮ LIỆU</footer></section><aside class="login-art"><div class="art-content"><span class="tag">INTERIOR MANAGEMENT</span><h2>Quản trị tinh hoa<br><em>từ bên trong.</em></h2><p>Không gian quản lý được thiết kế cho những sản phẩm nội thất có giá trị.</p></div></aside></main>`;
  document.querySelector(".login-form").onsubmit = event => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    if (form.get("username") === "admin.woodcraft" && form.get("password") === "123456") {
      sessionStorage.setItem("woodcraft-authenticated", "true");
      render();
      return;
    }
    const error = document.createElement("p");
    error.className = "login-error";
    error.textContent = "Tên đăng nhập hoặc mật khẩu chưa đúng.";
    event.currentTarget.querySelector(".login-btn").before(error);
  };
  document.querySelector("#forgot-password").onclick = event => { event.preventDefault(); alert("Chức năng khôi phục mật khẩu sẽ được kết nối sau khi có backend."); };
}

function sidebar() {
  return `<aside class="sidebar"><div class="brand"><div class="brand-mark">WC</div><div><strong>WOODCRAFT ADMIN</strong><small>ERP RELATIONAL PORTAL</small></div></div><nav class="nav">${getMenu().map(group => `<div class="nav-section">${group.section}</div>${group.items.map(([id, icon, text, badge]) => `<div class="nav-item ${state.page === id ? "active" : ""}" data-page="${id}"><span class="nav-icon">${icon}</span><span>${text}</span>${badge ? `<span class="nav-badge">${badge}</span>` : ""}</div>`).join("")}`).join("")}</nav></aside>`;
}

function header() {
  return `<header class="topbar"><div class="crumb"><span>WOODCRAFT</span>${titles[state.page]}</div><div class="top-actions"><span>◷ 2026 ACTIVE</span><div class="profile"><div class="avatar">AD</div><div><b>Nguyễn Văn Hùng (Quản trị)</b><small>ADMIN</small></div></div><button class="logout">⇥ Đăng xuất</button></div></header>`;
}

function toolbarFor(page) {
  const options = {
    products: ["Tìm theo mã hoặc tên sản phẩm...", "Thêm sản phẩm", "<select><option>Tất cả loại SP</option></select>"],
    categories: ["Tìm theo mã hoặc tên loại sản phẩm...", "Thêm loại sản phẩm", ""],
    woods: ["Tìm theo mã hoặc tên loại gỗ...", "Thêm loại gỗ", ""],
    orders: ["Tìm theo mã hóa đơn, tên khách hàng hoặc CCCD...", "Tạo hóa đơn bán hàng", "<select><option>Tất cả trạng thái</option></select>"]
  };
  const config = options[page] || ["Tìm kiếm dữ liệu...", "Thêm mới", ""];
  return toolbar(...config);
}

async function render() {
  if (sessionStorage.getItem("woodcraft-authenticated") !== "true") return login();
  const viewName = views[state.page];
  const response = await fetch(`views/${viewName}.html`);
  if (!response.ok) throw new Error(`Không thể tải view ${viewName}`);
  const view = await response.text();
  document.querySelector("#app").innerHTML = `<div class="app">${sidebar()}<main class="main">${header()}<div class="content"><div class="page-title"><div><div class="eyebrow">WOODCRAFT /</div><h1>${titles[state.page]}</h1></div></div>${state.page === "dashboard" ? "" : toolbarFor(state.page)}${view}</div></main></div>`;
  controllers[state.page]?.(state.query, query => { state.query = query; render(); });
  document.querySelectorAll("[data-page]").forEach(item => item.onclick = () => { state.page = item.dataset.page; state.query = ""; render(); });
  document.querySelector(".logout").onclick = () => { sessionStorage.removeItem("woodcraft-authenticated"); render(); };
  document.querySelector("#add-btn")?.addEventListener("click", () => alert("Form này sẽ được kết nối model và API ở bước backend."));
}

render();
