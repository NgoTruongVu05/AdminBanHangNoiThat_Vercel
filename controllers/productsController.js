import { bindDomSearch, money, rowActions, escapeHtml, showAddForm, showEditForm, showConfirmModal, showAlertModal } from "./shared.js";
import { getProducts, createProduct, updateProduct, updateProductStatus } from "../models/productsModel.js";
import { getProductCategoryOptions } from "../models/categoriesModel.js";
import { getWoodOptions } from "../models/woodsModel.js";
import { getStyleOptions } from "../models/stylesModel.js";

export async function openAddProduct() {
  const [categories, woods, styles] = await Promise.all([getProductCategoryOptions(), getWoodOptions(), getStyleOptions()]);
  showAddForm({
    title: "Thêm sản phẩm nội thất",
    fields: [
      { name: "tenSanPham", label: "Tên sản phẩm" },
      { name: "id_loaiSP", label: "Loại sản phẩm", options: categories, placeholder: "Chọn loại sản phẩm" },
      { name: "id_kieuDang", label: "Kiểu dáng", options: styles, dependsOn: "id_loaiSP", placeholder: "Chọn kiểu dáng" },
      { name: "id_maGo", label: "Loại gỗ", options: woods },
      { name: "donGia", label: "Đơn giá", type: "text", placeholder: "Nhập đơn giá, ví dụ: 1250000" },
      { name: "soLuong", label: "Tồn kho", type: "text", placeholder: "0" }
    ],
    onSubmit: data => {
      const price = Number(data.donGia);
      if (!Number.isFinite(price) || price <= 0) {
        throw new Error("Đơn giá phải là số và lớn hơn 0.");
      }
      const stock = Number(data.soLuong || 0);
      if (!Number.isFinite(stock) || stock < 0) {
        throw new Error("Tồn kho phải là số không âm.");
      }
      return createProduct({
        tenSanPham: data.tenSanPham, id_kieuDang: Number(data.id_kieuDang), id_maGo: Number(data.id_maGo),
        donGia: price, soLuong: stock, trangThai: 1
      });
    }
  });
}

export async function openEditProduct(product) {
  const [categories, woods, styles] = await Promise.all([getProductCategoryOptions(), getWoodOptions(), getStyleOptions()]);
  showEditForm({
    title: "Cập nhật sản phẩm nội thất",
    fields: [
      { name: "tenSanPham", label: "Tên sản phẩm" },
      { name: "id_loaiSP", label: "Loại sản phẩm", options: categories, placeholder: "Chọn loại sản phẩm" },
      { name: "id_kieuDang", label: "Kiểu dáng", options: styles, dependsOn: "id_loaiSP", placeholder: "Chọn kiểu dáng" },
      { name: "id_maGo", label: "Loại gỗ", options: woods },
      { name: "donGia", label: "Đơn giá", type: "text" },
      { name: "soLuong", label: "Tồn kho", type: "text" }
    ],
    initialValues: {
      tenSanPham: product.name,
      id_loaiSP: product.categoryId,
      id_kieuDang: product.styleId,
      id_maGo: product.woodId,
      donGia: product.price,
      soLuong: product.stock
    },
    onSubmit: async data => {
      const price = Number(data.donGia);
      if (!Number.isFinite(price) || price <= 0) throw new Error("Đơn giá phải là số và lớn hơn 0.");
      const stock = Number(data.soLuong);
      if (!Number.isFinite(stock) || stock < 0) throw new Error("Tồn kho phải là số không âm.");
      return updateProduct(product.rawId, {
        tenSanPham: data.tenSanPham,
        id_kieuDang: Number(data.id_kieuDang),
        id_maGo: Number(data.id_maGo),
        donGia: price,
        soLuong: stock
      });
    }
  });
}

export async function initProducts(query, onQueryChange) {
  const products = await getProducts();
  const rows = products.map((product, index) => `<tr data-row-index="${index}" data-search="${escapeHtml(`${product.id} ${product.name}`.toLowerCase())}">
    <td class="code">${product.id}</td>
    <td><b>${product.name}</b><div class="sub">${product.detail}</div></td>
    <td>${product.category}</td><td>${product.style}</td><td>${product.wood}</td>
    <td class="money">${money(product.price)}</td>
    <td><span class="tag ${product.stock <= 3 ? "warn" : ""}">${product.stock}</span></td>
    <td><span class="tag ${product.trangThai === 0 ? "locked" : "green"}">${product.status}</span></td>
    <td class="actions">${rowActions(true, `data-delete="${product.id}"`, `data-edit="${product.rawId}"`, true, `data-lock="${product.rawId}"`, product.trangThai === 0)}</td>
  </tr>`).join("");
  document.querySelector("#products-body").innerHTML = rows;
  const productFields = { category: "Phân loại", style: "Kiểu dáng", wood: "Loại gỗ", status: "Trạng thái", stock: "Tồn kho", price: "Đơn giá" };
  const productData = products.map(product => ({ code: product.id, name: product.name, category: product.category, style: product.style, wood: product.wood, status: product.status, stock: product.stock, price: product.price }));
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
  document.querySelectorAll("[data-edit]").forEach(button => {
    button.onclick = () => {
      const id = Number(button.dataset.edit);
      const product = products.find(item => item.rawId === id);
      if (product) openEditProduct(product).catch(error => showAlertModal(`Không thể mở biểu mẫu: ${error.message}`, "error"));
    };
  });
  document.querySelectorAll("[data-lock]").forEach(button => {
    button.onclick = async () => {
      const id = Number(button.dataset.lock);
      const product = products.find(item => item.rawId === id);
      if (!product) return;
      const locked = product.trangThai === 0;
      const ok = await showConfirmModal(locked ? "Mở khóa sản phẩm này?" : "Khóa sản phẩm này?");
      if (!ok) return;
      try {
        await updateProductStatus(id, locked ? 1 : 0);
        document.dispatchEvent(new CustomEvent("data-updated"));
        showAlertModal(locked ? "Đã mở khóa sản phẩm." : "Đã khóa sản phẩm.", "success");
      } catch (error) {
        showAlertModal(`Không thể cập nhật trạng thái: ${error.message}`, "error");
      }
    };
  });
}
