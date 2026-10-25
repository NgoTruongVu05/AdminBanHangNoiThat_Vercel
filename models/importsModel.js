import { fetchTables, insertRecord } from "./apiClient.js";
import { cached, date, field, invalidate } from "./modelUtils.js";
import { updateProduct } from "./productsModel.js";

export async function createImport(record) {
  const header = {
    ngayNhap: record.ngayNhap,
    trangThai: record.trangThai,
    tongTien: record.tongTien,
    ID_nhaCungCap: record.ID_nhaCungCap || null
  };
  const inserted = await insertRecord("PHIEUNHAP", header);
  const row = Array.isArray(inserted) ? inserted[0] : inserted;
  const importId = field(row, "id_phieuNhap");
  if (importId == null) throw new Error("Không lấy được mã phiếu nhập.");

  const items = record.items || [];
  for (const item of items) {
    await insertRecord("CHITIETPHIEUNHAP", {
      ID_phieuNhap: importId,
      ID_sanPham: item.ID_sanPham,
      soLuong: item.soLuong,
      donGia: item.donGia,
      thanhTien: item.thanhTien
    });
  }

  if (Number(record.trangThai) === 1) {
    const raw = await fetchTables(["SANPHAM"]);
    const products = raw.SANPHAM || [];
    for (const item of items) {
      const product = products.find(entry =>
        String(field(entry, "id_sanPham")) === String(item.ID_sanPham)
      );
      const currentStock = Number(field(product || {}, "soLuong") || 0);
      await updateProduct(item.ID_sanPham, { soLuong: currentStock + item.soLuong });
    }
  }

  invalidate("imports");
  return inserted;
}

export async function getImports() {
  return cached("imports", async () => {
    const raw = await fetchTables(["PHIEUNHAP", "NHACUNGCAP", "CHITIETPHIEUNHAP"]);
    const suppliers = raw.NHACUNGCAP || [];
    const details = raw.CHITIETPHIEUNHAP || [];
    return (raw.PHIEUNHAP || []).map(item => {
      const supplier = suppliers.find(entry =>
        String(field(entry, "id_nhaCungCap")) === String(field(item, "id_nhaCungCap"))
      );
      const itemDetails = details.filter(detail =>
        String(field(detail, "id_phieuNhap")) === String(field(item, "id_phieuNhap"))
      );
      const total = itemDetails.reduce((sum, detail) =>
        sum + Number(field(detail, "thanhTien") || 0), 0
      );
      return {
        id: `PN${field(item, "id_phieuNhap")}`,
        rawId: field(item, "id_phieuNhap"),
        date: date(field(item, "ngayNhap")),
        supplier: field(supplier || {}, "tenNhaCungCap") || "",
        count: itemDetails.length,
        status: Number(field(item, "trangThai")) === 1 ? "Đã hoàn tất" : "Đang nhập",
        total
      };
    });
  });
}
