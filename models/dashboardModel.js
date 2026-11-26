import { fetchTables } from "./apiClient.js";
import { field } from "./modelUtils.js";

export async function getDashboardData() {
  const raw = await fetchTables([
    "HOADON",
    "CHITIETHOADON",
    "PHIEUNHAP",
    "CHITIETPHIEUNHAP",
    "SANPHAM",
    "KHACHHANG",
    "NHANVIEN"
  ]);
  const orders = raw.HOADON || [];
  const imports = raw.PHIEUNHAP || [];
  const importDetails = raw.CHITIETPHIEUNHAP || [];
  const orderDetails = raw.CHITIETHOADON || [];
  const products = raw.SANPHAM || [];
  const completedOrders = orders.filter(item => Number(field(item, "trangThai") ?? 1) === 3);
  const completedImports = imports.filter(item => Number(field(item, "trangThai") ?? 0) === 1);
  const revenue = completedOrders.reduce((sum, item) => sum + Number(field(item, "tongTien") || 0), 0);
  const importCost = completedImports.reduce((sum, item) => {
    const detailsTotal = importDetails
      .filter(detail => String(field(detail, "id_phieuNhap")) === String(field(item, "id_phieuNhap")))
      .reduce((detailSum, detail) => detailSum + Number(field(detail, "thanhTien") || 0), 0);
    return sum + (detailsTotal || Number(field(item, "tongTien") || 0));
  }, 0);
  const financialOrders = completedOrders.map(item => ({
    orderId: field(item, "id_hoaDon"),
    date: field(item, "ngayDat"),
    amount: Number(field(item, "tongTien") || 0),
    employeeId: field(item, "cccd_nhanVien"),
    customerId: field(item, "id_khachHang")
  }));
  const employees = (raw.NHANVIEN || []).map(item => ({
    id: field(item, "CCCD") ?? field(item, "cccd"),
    name: field(item, "hoTen") || "Chưa xác định"
  }));
  const customers = (raw.KHACHHANG || []).map(item => ({
    id: field(item, "id_khachHang"),
    name: field(item, "hoTen") || "Chưa xác định"
  }));
  const productNames = new Map(products.map(item => [
    String(field(item, "id_sanPham")),
    field(item, "tenSanPham") || "Chưa xác định"
  ]));
  const productFinancialOrders = completedOrders.flatMap(order => {
    const year = String(field(order, "ngayDat") || "").slice(0, 4);
    return orderDetails
      .filter(detail => String(field(detail, "id_hoaDon")) === String(field(order, "id_hoaDon")))
      .map(detail => ({
        orderId: field(order, "id_hoaDon"),
        date: field(order, "ngayDat"),
        year,
        productId: field(detail, "id_sanPham"),
        productName: productNames.get(String(field(detail, "id_sanPham"))) || "Chưa xác định",
        amount: Number(field(detail, "thanhTien") || 0)
      }));
  }).filter(item => item.year);
  const financialImports = completedImports.map(item => {
    const detailsTotal = importDetails
      .filter(detail => String(field(detail, "id_phieuNhap")) === String(field(item, "id_phieuNhap")))
      .reduce((sum, detail) => sum + Number(field(detail, "thanhTien") || 0), 0);
    return {
      date: field(item, "ngayNhap"),
      amount: detailsTotal || Number(field(item, "tongTien") || 0)
    };
  });
  const stock = products
    .filter(item => Number(field(item, "trangThai") ?? 1) !== 0)
    .reduce((sum, item) => sum + Number(field(item, "soLuong") || 0), 0);

  return {
    revenue,
    completedOrderCount: completedOrders.length,
    importCost,
    completedImportCount: completedImports.length,
    stock,
    productCount: products.filter(item => Number(field(item, "trangThai") ?? 1) !== 0).length,
    customerCount: (raw.KHACHHANG || []).length,
    financialOrders,
    financialImports,
    employees,
    customers,
    productFinancialOrders
  };
}
