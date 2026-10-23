import { getMenu } from "../models/menu.js";
import { initDashboard } from "./dashboardController.js";
import { initProducts, openAddProduct } from "./productsController.js";
import { initCategories, openAddCategory } from "./categoriesController.js";
import { initWoods, openAddWood } from "./woodsController.js";
import { initOrders } from "./ordersController.js";
import { initImports, openAddImport } from "./importsController.js";
import { initSuppliers, openAddSupplier } from "./suppliersController.js";
import { initCustomers, openAddCustomer } from "./customersController.js";
import { initPromotions } from "./promotionsController.js";
import { initStaff, openAddStaff } from "./staffController.js";
import { initAccounts } from "./accountsController.js";
import { initStyles, openAddStyle } from "./stylesController.js";
import { clearRemoteTableCache } from "./remoteTableController.js";
import { getCategories } from "../models/categoriesModel.js";
import { getImports } from "../models/importsModel.js";
import { getSuppliers } from "../models/suppliersModel.js";
import { getCustomers } from "../models/customersModel.js";
import { getPromotions } from "../models/promotionsModel.js";
import { getStaff } from "../models/staffModel.js";
import { getAccounts } from "../models/accountsModel.js";
import { getStyles } from "../models/stylesModel.js";
import { materialIcon, showAlertModal } from "./shared.js";

const restoredState = sessionStorage.getItem("woodcraft-page-state");
const state = restoredState ? JSON.parse(restoredState) : { page: "dashboard", query: "" };
sessionStorage.removeItem("woodcraft-page-state");
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
const addActions = { products: openAddProduct, categories: openAddCategory, woods: openAddWood, styles: openAddStyle, imports: openAddImport, suppliers: openAddSupplier, customers: openAddCustomer, staff: openAddStaff };
const refreshAfterAdd = () => {
  clearRemoteTableCache();
  return render();
};
const preloaders = [getCategories, getImports, getSuppliers, getCustomers, getPromotions, getStaff, getAccounts, getStyles];

function preloadData() {
  Promise.allSettled(preloaders.map(load => load())).then(results => {
    results.filter(result => result.status === "rejected").forEach(result => {
      console.warn("Không thể preload một số dữ liệu:", result.reason);
    });
  });
}

function login() {
  document.querySelector("#app").innerHTML = `<main class="login-page"><section class="login-panel"><div class="login-brand"><div class="brand-mark">WC</div><div><strong>WOODCRAFT ADMIN</strong><small>ERP RELATIONAL PORTAL</small></div></div><div class="login-copy"><div class="eyebrow">SECURE ACCESS / 2026</div><h1>Chào mừng trở lại</h1><p>Đăng nhập để quản lý hệ thống bán hàng nội thất Woodcraft.</p></div><form class="login-form"><label>TÊN ĐĂNG NHẬP<input name="username" placeholder="Nhập tên đăng nhập" required></label><label>MẬT KHẨU<input name="password" type="password" placeholder="Nhập mật khẩu" required></label><div class="login-options"><label class="remember"><input type="checkbox" checked> Ghi nhớ đăng nhập</label><a href="#" id="forgot-password">Quên mật khẩu?</a></div><button class="btn login-btn">Đăng nhập hệ thống <span>→</span></button><p class="login-hint">Tài khoản demo: <b>admin.woodcraft</b> / <b>123456</b></p></form><footer>WOODCRAFT ERP · GIAO DIỆN DEMO, CHƯA KẾT NỐI CƠ SỞ DỮ LIỆU</footer></section><aside class="login-art"><div class="art-content"><span class="tag">INTERIOR MANAGEMENT</span><h2>Quản trị tinh hoa<br><em>từ bên trong.</em></h2><p>Không gian quản lý được thiết kế cho những sản phẩm nội thất có giá trị.</p></div></aside></main>`;
  document.querySelector(".login-form").onsubmit = event => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    if (form.get("username") === "admin.woodcraft" && form.get("password") === "123456") {
      sessionStorage.setItem("woodcraft-authenticated", "true");
      render().catch(error => {
        console.error("Ứng dụng không thể khởi tạo:", error);
        document.querySelector("#app").innerHTML = `<main class="login-page"><section class="login-panel"><div class="eyebrow">APPLICATION ERROR</div><h1>Không thể khởi tạo ứng dụng</h1><p>${error.message}</p><button class="btn" id="reload-app">Tải lại trang</button></section></main>`;
        document.querySelector("#reload-app").onclick = () => window.location.reload();
      });
      return;
    }
    const error = document.createElement("p");
    error.className = "login-error";
    error.textContent = "Tên đăng nhập hoặc mật khẩu chưa đúng.";
    event.currentTarget.querySelector(".login-btn").before(error);
  };
  document.querySelector("#forgot-password").onclick = event => {
    event.preventDefault();
    showAlertModal("Chức năng khôi phục mật khẩu sẽ được kết nối sau khi có backend.", "info");
  };
}

function sidebar() {
  return `<aside class="sidebar"><div class="brand"><div class="brand-mark">WC</div><div><strong>WOODCRAFT ADMIN</strong></div></div><nav class="nav">${getMenu().map(group => `<div class="nav-section">${group.section}</div>${group.items.map(([id, icon, text, badge]) => `<div class="nav-item ${state.page === id ? "active" : ""}" data-page="${id}"><span class="nav-icon">${materialIcon(icon)}</span><span>${text}</span>${badge ? `<span class="nav-badge">${badge}</span>` : ""}</div>`).join("")}`).join("")}</nav></aside>`;
}

function header() {
  return `<header class="topbar"><div class="crumb"><span>WOODCRAFT</span>${titles[state.page]}</div><div class="top-actions"><div class="profile"><div class="avatar">AD</div><div><b>Nguyễn Văn Hùng</b><small>ADMIN</small></div></div><button class="logout">${materialIcon("logout")}<span>Đăng xuất</span></button></div></header>`;
}

async function render() {
  if (sessionStorage.getItem("woodcraft-authenticated") !== "true") return login();
  const viewName = views[state.page];
  const response = await fetch(`views/${viewName}.html`);
  if (!response.ok) throw new Error(`Không thể tải view ${viewName}`);
  const view = await response.text();
  document.querySelector("#app").innerHTML = `<div class="app">${sidebar()}<main class="main">${header()}<div class="content"><div class="page-title"><div><div class="eyebrow">WOODCRAFT /</div><h1>${titles[state.page]}</h1></div></div>${view}</div></main></div>`;
  try {
    await controllers[state.page]?.(state.query, query => { state.query = query; render(); });
  } catch (error) {
    console.error(`Không thể tải dữ liệu trang ${state.page}:`, error);
    document.querySelector(".content").innerHTML = `<main class="login-page"><section class="login-panel"><div class="eyebrow">DATABASE CONNECTION ERROR</div><h1>Không thể tải dữ liệu</h1><p>${error.message}</p><button class="btn" id="retry-data">Thử lại</button></section></main>`;
    document.querySelector("#retry-data").onclick = () => render();
    return;
  }
  document.querySelectorAll("[data-page]").forEach(item => item.onclick = () => { state.page = item.dataset.page; state.query = ""; render(); });
  document.querySelector(".logout").onclick = () => { sessionStorage.removeItem("woodcraft-authenticated"); render(); };
  const addAction = addActions[state.page];
  document.querySelector("#add-btn")?.addEventListener("click", () => {
    Promise.resolve(addAction?.()).catch(error => {
      console.error("Không thể mở biểu mẫu thêm dữ liệu:", error);
      showAlertModal(`Không thể tải dữ liệu lựa chọn: ${error.message}`, "error");
    });
  });
  document.removeEventListener("data-added", refreshAfterAdd);
  document.addEventListener("data-added", refreshAfterAdd);
  if (state.page === "dashboard") setTimeout(preloadData, 0);
}

render();
