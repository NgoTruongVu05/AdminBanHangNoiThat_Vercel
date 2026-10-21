import { fetchTables } from "./apiClient.js";
import { date, field, moneyText } from "./modelUtils.js";

export async function getOrders() {
  const raw = await fetchTables(["HOADON", "KHACHHANG"]);
  const customers = raw.KHACHHANG || [];
  return (raw.HOADON || []).map(item => {
    const customer = customers.find(entry =>
      String(field(entry, "id_khachHang")) === String(field(item, "id_khachHang"))
    );
    return [
      `HD${field(item, "id_hoaDon")}`,
      field(customer || {}, "hoTen") || "Khách hàng",
      date(field(item, "ngayDat")),
      moneyText(field(item, "tongTien")),
      field(item, "ngayGiao") ? "Đã hoàn tất" : "Chờ xác nhận"
    ];
  });
}
