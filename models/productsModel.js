import { fetchTables, insertRecord } from "./apiClient.js";
import { cached, field, invalidate } from "./modelUtils.js";

export async function createProduct(record) {
  const result = await insertRecord("SANPHAM", record);
  invalidate("products");
  return result;
}

export async function getProducts() {
  return cached("products", async () => {
    const raw = await fetchTables(["SANPHAM", "LOAISP", "KIEUDANG", "LOAIGO"]);
    const categories = (raw.LOAISP || []).filter(item => field(item, "trangThai") !== 0);
    const styles = (raw.KIEUDANG || []).filter(item => field(item, "trangThai") !== 0);
    const woods = (raw.LOAIGO || []).filter(item => field(item, "trangThai") !== 0);

    return (raw.SANPHAM || []).filter(item => field(item, "trangThai") !== 0).map(item => ({
      id: `SP${String(field(item, "id_sanPham")).padStart(3, "0")}`,
      name: field(item, "tenSanPham") || "",
      detail: "",
      style: field(styles.find(style => field(style, "id_kieuDang") === field(item, "id_kieuDang")) || {}, "tenKieuDang") || "",
      category: field(categories.find(category =>
        field(category, "id_loaiSP") === field(styles.find(style => field(style, "id_kieuDang") === field(item, "id_kieuDang")) || {}, "id_loaiSP")
      ) || {}, "tenLoai") || "",
      wood: field(woods.find(wood => field(wood, "id_maGo") === field(item, "id_maGo")) || {}, "tenGo") || "",
      price: Number(field(item, "donGia") || 0),
      stock: Number(field(item, "soLuong") || 0),
      status: "Đang kinh doanh"
    }));
  });
}
