import { bindDomSearch, money, rowActions, escapeHtml } from "./shared.js";
import { getProducts, createProduct } from "../models/productsModel.js";
import { getProductCategoryOptions } from "../models/categoriesModel.js";
import { getWoodOptions } from "../models/woodsModel.js";
import { getStyleOptions } from "../models/stylesModel.js";
import { showAddForm } from "./shared.js";

export async function openAddProduct() {
  const [categories, woods, styles] = await Promise.all([getProductCategoryOptions(), getWoodOptions(), getStyleOptions()]);
  showAddForm({
    title: "Thêm sản phẩm nội thất",
    fields: [
      { name: "tenSanPham", label: "Tên sản phẩm" },
      { name: "id_loaiSP", label: "Loại sản phẩm", options: categories, placeholder: "Chọn loại sản phẩm" },
      { name: "id_kieuDang", label: "Kiểu dáng", options: styles, dependsOn: "id_loaiSP", placeholder: "Chọn kiểu dáng" },
      { name: "id_maGo", label: "Loại gỗ", options: woods },
      { name: "donGia", label: "Đơn giá", type: "text", placeholder: "Nhập đơn giá, ví dụ: 1250000" }
    ],
    onSubmit: data => {
      const price = Number(data.donGia);
      if (!Number.isFinite(price) || price <= 0) {
        throw new Error("Đơn giá phải là số và lớn hơn 0.");
      }
      return createProduct({
        tenSanPham: data.tenSanPham, id_kieuDang: Number(data.id_kieuDang), id_maGo: Number(data.id_maGo),
        donGia: price, soLuong: 0, trangThai: 1
      });
    }
  });
}

export async function initProducts(query, onQueryChange) {
  const products = await getProducts();
  const rows = products.map((product, index) => `<tr data-row-index="${index}" data-search="${escapeHtml(`${product.id} ${product.name}`.toLowerCase())}">
    <td class="code">${product.id}</td>
    <td><b>${product.name}</b><div class="sub">${product.detail}</div></td>
    <td>${product.category}</td><td>${product.wood}</td>
    <td class="money">${money(product.price)}</td>
    <td class="${product.stock <= 3 ? "tag warn" : ""}">${product.stock}</td>
    <td><span class="tag ${product.status.includes("Tạm") ? "warn" : ""}">${product.status}</span></td>
    <td class="actions">${rowActions(true, `data-delete="${product.id}"`)}</td>
  </tr>`).join("");
  document.querySelector("#products-body").innerHTML = rows;
  const productFields = { category: "Phân loại", wood: "Loại gỗ", status: "Trạng thái", stock: "Tồn kho", price: "Đơn giá" };
  const productData = products.map(product => ({ code: product.id, name: product.name, category: product.category, wood: product.wood, status: product.status, stock: product.stock, price: product.price }));
  document.querySelector("#products-count").textContent = `${products.length} / ${products.length}`;
  bindDomSearch({
    initialQuery: query,
    rowSelector: "#products-body tr",
    onQueryChange,
    onFilter: (currentQuery, visible, total) => {
      const count = document.querySelector("#products-count");
      if (count) count.textContent = `${visible} / ${total}`;
    },
    fields: productFields,
    defaultKeys: ["code", "name"],
    getFieldValue: (index, field) => productData[index]?.[field]
  });
  document.querySelectorAll("[data-delete]").forEach(button => button.onclick = () => {
    if (confirm("Xóa sản phẩm này khỏi danh sách tạm?")) button.closest("tr").remove();
  });
}
