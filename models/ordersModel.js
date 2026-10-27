import { fetchTables, updateRecord } from "./apiClient.js";
import { cached, date, field, moneyText, invalidate } from "./modelUtils.js";

export async function getOrders() {
  return cached("orders", async () => {
    const raw = await fetchTables(["HOADON", "KHACHHANG"]);
    const customers = raw.KHACHHANG || [];
    return (raw.HOADON || []).map(item => {
      const customer = customers.find(entry =>
        String(field(entry, "id_khachHang")) === String(field(item, "id_khachHang"))
      );
      const trangThai = Number(field(item, "trangThai") ?? 1);
      const statusText =
        trangThai === 0 ? "Đã hủy" : trangThai === 2 ? "Đã hoàn thành" : "Đang duyệt";
      return [
        `HD${field(item, "id_hoaDon")}`,
        field(customer || {}, "hoTen") || "Khách hàng",
        date(field(item, "ngayDat")),
        moneyText(field(item, "tongTien")),
        statusText,
        field(item, "id_hoaDon"),
        trangThai
      ];
    });
  });
}

export async function getOrderById(orderId) {
  const raw = await fetchTables(["HOADON", "KHACHHANG", "NHANVIEN"]);
  const orders = raw.HOADON || [];
  const customers = raw.KHACHHANG || [];
  const staff = raw.NHANVIEN || [];
  const item = orders.find(entry => String(field(entry, "id_hoaDon")) === String(orderId));
  if (!item) return null;
  const customer = customers.find(entry =>
    String(field(entry, "id_khachHang")) === String(field(item, "id_khachHang"))
  );
  const employee = staff.find(entry =>
    String(field(entry, "cccd")) === String(field(item, "cccd_nhanVien"))
  );
  const trangThai = Number(field(item, "trangThai") ?? 1);
  const statusText =
    trangThai === 0 ? "Đã hủy" : trangThai === 2 ? "Đã hoàn thành" : "Đang duyệt";
  return {
    rawId: field(item, "id_hoaDon"),
    id: `HD${field(item, "id_hoaDon")}`,
    date: date(field(item, "ngayDat")),
    deliveryDate: date(field(item, "ngayGiao")),
    address: field(item, "diChiGiaoHang") || "",
    customerName: field(customer || {}, "hoTen") || "Khách hàng",
    employeeName: field(employee || {}, "hoTen") || "",
    total: Number(field(item, "tongTien") || 0),
    statusText,
    trangThai
  };
}

export async function getOrderDetails(orderId) {
  const raw = await fetchTables(["CHITIETHOADON", "SANPHAM"]);
  const details = raw.CHITIETHOADON || [];
  const products = raw.SANPHAM || [];
  return details
    .filter(detail => String(field(detail, "id_hoaDon")) === String(orderId))
    .map(detail => {
      const product = products.find(entry =>
        String(field(entry, "id_sanPham")) === String(field(detail, "id_sanPham"))
      );
      return {
        ID_sanPham: field(detail, "id_sanPham"),
        productName: field(product || {}, "tenSanPham") || "",
        soLuong: Number(field(detail, "soLuong") || 0),
        donGia: Number(field(detail, "donGia") || 0),
        thanhTien: Number(field(detail, "thanhTien") || 0)
      };
    });
}

export async function cancelOrder(orderId) {
  const raw = await fetchTables(["HOADON"]);
  const orders = raw.HOADON || [];
  const item = orders.find(entry => String(field(entry, "id_hoaDon")) === String(orderId));
  if (!item) throw new Error("Không tìm thấy hóa đơn.");
  const trangThai = Number(field(item, "trangThai") ?? 1);
  if (trangThai !== 1) throw new Error("Chỉ được hủy hóa đơn đang duyệt.");

  await updateRecord("HOADON", { id_hoaDon: orderId }, { trangThai: 0 });

  invalidate("orders");
  invalidate("customers");
}

export async function approveOrder(orderId) {
  const raw = await fetchTables(["HOADON"]);
  const orders = raw.HOADON || [];
  const item = orders.find(entry => String(field(entry, "id_hoaDon")) === String(orderId));
  if (!item) throw new Error("Không tìm thấy hóa đơn.");
  const trangThai = Number(field(item, "trangThai") ?? 1);
  if (trangThai !== 1) throw new Error("Chỉ được duyệt hóa đơn đang duyệt.");

  await updateRecord("HOADON", { id_hoaDon: orderId }, { trangThai: 2 });

  invalidate("orders");
  invalidate("customers");
  return true;
}