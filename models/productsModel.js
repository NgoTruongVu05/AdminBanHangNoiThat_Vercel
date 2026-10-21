import { fetchTables } from "./apiClient.js";
import { field } from "./modelUtils.js";

export async function getProducts() {
  const raw = await fetchTables(["SANPHAM", "LOAISP", "LOAIGO"]);
  const categories = (raw.LOAISP || []).filter(item => field(item, "trangThai") !== 0);
  const woods = (raw.LOAIGO || []).filter(item => field(item, "trangThai") !== 0);

  return (raw.SANPHAM || []).filter(item => field(item, "trangThai") !== 0).map(item => ({
    id: `SP${String(field(item, "id_sanPham")).padStart(3, "0")}`,
    name: field(item, "tenSanPham") || "",
    detail: "",
    category: field(categories.find(category => field(category, "id_loaiSP") === field(item, "id_loaiSP")) || {}, "tenLoai") || "",
    wood: field(woods.find(wood => field(wood, "id_maGo") === field(item, "id_maGo")) || {}, "tenGo") || "",
    price: Number(field(item, "donGia") || 0),
    stock: Number(field(item, "soLuong") || 0),
    status: "Đang kinh doanh"
  }));
}
