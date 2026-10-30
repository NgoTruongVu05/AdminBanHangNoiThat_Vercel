import { getMenu } from "../models/menu.js";
import { initDashboard } from "./dashboardController.js";
import { initProducts, openAddProduct } from "./productsController.js";
import { initCategories, openAddCategory } from "./categoriesController.js";
import { initWoods, openAddWood } from "./woodsController.js";
import { initOrders } from "./ordersController.js";
import { initImports, openAddImport } from "./importsController.js";
import { initSuppliers, openAddSupplier } from "./suppliersController.js";
import { initCustomers, openAddCustomer } from "./customersController.js";
import { initPromotions, openAddPromotion } from "./promotionsController.js";
import { initStaff, openAddStaff } from "./staffController.js";
import { initAccounts } from "./accountsController.js";
import { initStyles, openAddStyle } from "./stylesController.js";
import { clearRemoteTableCache } from "./remoteTableController.js";
import { materialIcon, showAlertModal } from "./shared.js";
import { getAuthenticatedAccount, logout, renderLogin } from "./authController.js";

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
const addActions = { products: openAddProduct, categories: openAddCategory, woods: openAddWood, styles: openAddStyle, imports: openAddImport, suppliers: openAddSupplier, customers: openAddCustomer, staff: openAddStaff, promotions: openAddPromotion };
const refreshAfterAdd = () => {
  clearRemoteTableCache();
  return render();
};
const restrictedPages = new Set(["promotions", "staff", "accounts"]);
const viewCache = new Map();
let renderVersion = 0;

function loadView(viewName) {
  if (!viewCache.has(viewName)) {
    viewCache.set(viewName, fetch(`views/${viewName}.html`).then(response => {
      if (!response.ok) throw new Error(`Không thể tải view ${viewName}`);
      return response.text();
    }).catch(error => {
      viewCache.delete(viewName);
      throw error;
    }));
  }
  return viewCache.get(viewName);
}

function bindAppActions() {
  document.querySelectorAll("[data-page]").forEach(item => {
    item.onclick = () => {
      state.page = item.dataset.page;
      state.query = "";
      render();
    };
  });
  document.querySelector(".logout").onclick = () => {
    logout();
    render();
  };
}

function sidebar() {
  const account = getAuthenticatedAccount();
  return `<aside class="sidebar"><div class="brand"><div class="brand-mark">WC</div><div><strong>WOODCRAFT ADMIN</strong></div></div><nav class="nav">${getMenu(account?.role === "QUANTRIVIEN").map(group => `<div class="nav-section">${group.section}</div>${group.items.map(([id, icon, text, badge]) => `<div class="nav-item ${state.page === id ? "active" : ""}" data-page="${id}"><span class="nav-icon">${materialIcon(icon)}</span><span>${text}</span>${badge ? `<span class="nav-badge">${badge}</span>` : ""}</div>`).join("")}`).join("")}</nav></aside>`;
}

function header() {
  const account = getAuthenticatedAccount();
  return `<header class="topbar"><div class="crumb"><span>WOODCRAFT</span>${titles[state.page]}</div><div class="top-actions"><div class="profile"><div class="avatar">AD</div><div><b>${account?.username || "Quản trị viên"}</b><small>${account?.role || "ADMIN"}</small></div></div><button class="logout">${materialIcon("logout")}<span>Đăng xuất</span></button></div></header>`;
}

async function render() {
  const currentRender = ++renderVersion;
  if (!getAuthenticatedAccount()) return renderLogin(render);
  const account = getAuthenticatedAccount();
  if (account.role !== "QUANTRIVIEN" && restrictedPages.has(state.page)) {
    state.page = "dashboard";
    state.query = "";
  }
  const viewName = views[state.page];
  const view = await loadView(viewName);
  if (currentRender !== renderVersion) return;
  document.querySelector("#app").innerHTML = `<div class="app">${sidebar()}<main class="main">${header()}<div class="content"><div class="page-title"><div><h1>${titles[state.page]}</h1></div></div>${view}</div></main></div>`;
  bindAppActions();
  try {
    await controllers[state.page]?.(state.query, query => { state.query = query; });
  } catch (error) {
    if (currentRender !== renderVersion) return;
    console.error(`Không thể tải dữ liệu trang ${state.page}:`, error);
    document.querySelector(".content").innerHTML = `<main class="login-page"><section class="login-card"><div class="eyebrow">DATABASE CONNECTION ERROR</div><h1>Không thể tải dữ liệu</h1><p>${error.message}</p><button class="btn" id="retry-data">Thử lại</button></section></main>`;
    document.querySelector("#retry-data").onclick = () => render();
    return;
  }
  if (currentRender !== renderVersion) return;
  const addAction = addActions[state.page];
  document.querySelector("#add-btn")?.addEventListener("click", () => {
    Promise.resolve(addAction?.()).catch(error => {
      console.error("Không thể mở biểu mẫu thêm dữ liệu:", error);
      showAlertModal(`Không thể tải dữ liệu lựa chọn: ${error.message}`, "error");
    });
  });
  document.removeEventListener("data-added", refreshAfterAdd);
  document.removeEventListener("data-updated", refreshAfterAdd);
  document.addEventListener("data-added", refreshAfterAdd);
  document.addEventListener("data-updated", refreshAfterAdd);
}

render();
