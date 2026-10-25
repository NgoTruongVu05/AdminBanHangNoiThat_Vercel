import { fetchTables, insertRecord, updateRecord } from "./apiClient.js";
import { cached, field, invalidate } from "./modelUtils.js";

export async function createProduct(record) {
  const result = await insertRecord("SANPHAM", record);
  invalidate("products");
  return result;
}

export async function updateProduct(id, record) {
  const result = await updateRecord("SANPHAM", { id_sanPham: id }, record);
  invalidate("products");
  return result;
}

export async function updateProductStatus(id, trangThai) {
  return updateProduct(id, { trangThai });
}

export async function getProducts() {
  return cached("products", async () => {
    const raw = await fetchTables(["SANPHAM", "LOAISP", "KIEUDANG", "LOAIGO"]);
    const categories = raw.LOAISP || [];
    const styles = raw.KIEUDANG || [];
    const woods = raw.LOAIGO || [];

    return (raw.SANPHAM || []).map(item => ({
      rawId: field(item, "id_sanPham"),
      id: `SP${String(field(item, "id_sanPham")).padStart(3, "0")}`,
      name: field(item, "tenSanPham") || "",
      detail: field(item, "moTa") || "",
      description: field(item, "moTa") || "",
      moTa: field(item, "moTa") || "",
      image: field(item, "hinhAnh") || "",
      hinhAnh: field(item, "hinhAnh") || "",
      style: field(styles.find(style => field(style, "id_kieuDang") === field(item, "id_kieuDang")) || {}, "tenKieuDang") || "",
      styleId: field(item, "id_kieuDang"),
      categoryId: field(styles.find(style => field(style, "id_kieuDang") === field(item, "id_kieuDang")) || {}, "id_loaiSP"),
      woodId: field(item, "id_maGo"),
      category: field(categories.find(category =>
        field(category, "id_loaiSP") === field(styles.find(style => field(style, "id_kieuDang") === field(item, "id_kieuDang")) || {}, "id_loaiSP")
      ) || {}, "tenLoai") || "",
      wood: field(woods.find(wood => field(wood, "id_maGo") === field(item, "id_maGo")) || {}, "tenGo") || "",
      price: Number(field(item, "donGia") || 0),
      stock: Number(field(item, "soLuong") || 0),
      status: field(item, "trangThai") === 0 ? "Đã khóa" : "Đang sử dụng",
      trangThai: Number(field(item, "trangThai") ?? 1)
    }));
  });
}
