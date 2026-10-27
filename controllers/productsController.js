import { bindDomSearch, money, rowActions, escapeHtml, showAddForm, showEditForm, showConfirmModal, showAlertModal } from "./shared.js";
import { getProducts, createProduct, updateProduct, updateProductStatus } from "../models/productsModel.js";
import { getProductCategoryOptions } from "../models/categoriesModel.js";
import { getWoodOptions } from "../models/woodsModel.js";
import { getStyleOptions } from "../models/stylesModel.js";
import { uploadImage, deleteImage } from "../models/storageModel.js";

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
      { name: "moTa", label: "Mô tả", type: "textarea", required: false, placeholder: "Mô tả sản phẩm" },
      { name: "hinhAnh", label: "Hình ảnh", type: "file", required: false, accept: "image/*" }
    ],
    onSubmit: async data => {
      const price = Number(data.donGia);
      if (!Number.isFinite(price) || price <= 0) {
        throw new Error("Đơn giá phải là số và lớn hơn 0.");
      }
      const imageUrl = await uploadImage(data.hinhAnh);
      return createProduct({
        tenSanPham: data.tenSanPham, id_kieuDang: Number(data.id_kieuDang), id_maGo: Number(data.id_maGo),
        donGia: price, moTa: data.moTa || null, hinhAnh: imageUrl, trangThai: 1
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
      { name: "moTa", label: "Mô tả", type: "textarea", required: false, placeholder: "Mô tả sản phẩm" },
      { name: "hinhAnh", label: "Hình ảnh mới", type: "file", required: false, accept: "image/*" }
    ],
    initialValues: {
      tenSanPham: product.name,
      id_loaiSP: product.categoryId,
      id_kieuDang: product.styleId,
      id_maGo: product.woodId,
      donGia: product.price,
      moTa: product.description || ""
    },
    onSubmit: async data => {
      const price = Number(data.donGia);
      if (!Number.isFinite(price) || price <= 0) throw new Error("Đơn giá phải là số và lớn hơn 0.");
      const update = {
        tenSanPham: data.tenSanPham,
        id_kieuDang: Number(data.id_kieuDang),
        id_maGo: Number(data.id_maGo),
        donGia: price,
        moTa: data.moTa || null
      };
      const hasNewImage = data.hinhAnh instanceof File && data.hinhAnh.size > 0;
      const oldImageUrl = product.image;
      if (oldImageUrl && hasNewImage) {
        try {
          await deleteImage(oldImageUrl);
        } catch (deleteError) {
          console.warn("Không thể xóa ảnh cũ:", deleteError);
        }
      }
      const imageUrl = await uploadImage(data.hinhAnh);
      if (imageUrl) {
        update.hinhAnh = imageUrl;
      }
      return updateProduct(product.rawId, update);
    }
  });
}

export async function initProducts(query, onQueryChange) {
  const products = await getProducts();
  const rows = products.map((product, index) => `<tr data-row-index="${index}" data-search="${escapeHtml(`${product.id} ${product.name}`.toLowerCase())}">
    <td class="code">${product.id}</td>
    <td>${product.image ? `<img src="${escapeHtml(product.image)}" alt="${escapeHtml(product.name)}" style="width:48px;height:48px;object-fit:cover;border-radius:6px;">` : ""}</td>
    <td><b>${product.name}</b><div class="sub">${product.detail}</div></td>
    <td>${product.category}</td><td>${product.style}</td><td>${product.wood}</td>
    <td class="money">${money(product.price)}</td>
    <td><span class="tag ${product.stock <= 3 ? "warn" : ""}">${product.stock}</span></td>
    <td><span class="tag ${product.trangThai === 0 ? "locked" : "green"}">${product.status}</span></td>
    <td class="actions">${rowActions(true, `data-delete="${product.id}"`, `data-edit="${product.rawId}"`, true, `data-lock="${product.rawId}"`, product.trangThai === 0)}</td>
  </tr>`).join("");
  document.querySelector("#products-body").innerHTML = rows;
  const productFields = { category: "Phân loại", style: "Kiểu dáng", wood: "Loại gỗ", stock: "Tồn kho", price: "Đơn giá" };
  const productData = products.map(product => ({ code: product.id, name: product.name, category: product.category, style: product.style, wood: product.wood, status: product.status, trangThai: product.trangThai, stock: product.stock, price: product.price }));
  document.querySelector("#products-count").textContent = `${products.length} / ${products.length}`;
  const productFilter = document.querySelector("#product-filter");
  if (productFilter) {
    const current = productFilter.value;
    const values = ["Đã khóa", "Đang sử dụng"];
    productFilter.innerHTML = `<option value="">Tất cả trạng thái</option>` + values.map(value => `<option value="${escapeHtml(value)}">${escapeHtml(value)}</option>`).join("");
    if ([...productFilter.options].some(option => option.value === current)) productFilter.value = current;
    else productFilter.value = "";
  }
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
    getFieldValue: (index, field) => productData[index]?.[field],
    sideFilters: [{ selector: "#product-filter", getValue: (row, rowIndex) => productData[rowIndex]?.status }]
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
