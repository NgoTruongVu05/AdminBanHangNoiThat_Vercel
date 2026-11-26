import { fetchTables, updateRecord } from "./apiClient.js";
import { cached, date, field, moneyText, invalidate } from "./modelUtils.js";

export async function getOrders() {
  return cached("orders", async () => {
    const raw = await fetchTables(["HOADON", "KHACHHANG", "NHANVIEN"]);
    const customers = raw.KHACHHANG || [];
    const staff = raw.NHANVIEN || [];
    return (raw.HOADON || []).map(item => {
      const customer = customers.find(entry =>
        String(field(entry, "id_khachHang")) === String(field(item, "id_khachHang"))
      );
      const trangThai = Number(field(item, "trangThai") ?? 1);
      const employee = staff.find(entry =>
        String(field(entry, "cccd")) === String(field(item, "cccd_nhanVien"))
      );
      const statusText = orderStatusText(trangThai);
      return [
        `HD${field(item, "id_hoaDon")}`,
        field(customer || {}, "hoTen") || "Khách hàng",
        date(field(item, "ngayDat")),
        moneyText(field(item, "tongTien")),
        moneyText(field(item, "thanhTien") ?? field(item, "tongTien")),
        statusText,
        field(item, "id_hoaDon"),
        trangThai,
        field(employee || {}, "hoTen") || "Chưa phân công",
        date(field(item, "ngayGiao"))
      ];
    });
  });
}

export async function getOrderById(orderId) {
  const raw = await fetchTables([
    "HOADON", "KHACHHANG", "NHANVIEN", "DIACHIGIAOHANG",
    "CHUONGTRINHKHUYENMAI", "KMTHEOHD", "KMTHEOVOUCHER"
  ]);
  const orders = raw.HOADON || [];
  const customers = raw.KHACHHANG || [];
  const staff = raw.NHANVIEN || [];
  const addresses = raw.DIACHIGIAOHANG || [];
  const programs = raw.CHUONGTRINHKHUYENMAI || [];
  const invoicePromotions = raw.KMTHEOHD || [];
  const voucherPromotions = raw.KMTHEOVOUCHER || [];
  const item = orders.find(entry => String(field(entry, "id_hoaDon")) === String(orderId));
  if (!item) return null;
  const customer = customers.find(entry =>
    String(field(entry, "id_khachHang")) === String(field(item, "id_khachHang"))
  );
  const employee = staff.find(entry =>
    String(field(entry, "cccd")) === String(field(item, "cccd_nhanVien"))
  );
  const address = addresses.find(entry =>
    String(field(entry, "id_diaChi")) === String(field(item, "id_diaChiGiaoHang"))
  );
  const trangThai = Number(field(item, "trangThai") ?? 1);
  const statusText = orderStatusText(trangThai);
  const programId = field(item, "id_maCTKM");
  const voucherId = field(item, "id_voucher");
  const invoicePromotion = invoicePromotions.find(entry =>
    String(field(entry, "id_maCTKM")) === String(programId)
  );
  const voucherPromotion = voucherPromotions.find(entry =>
    String(field(entry, "id_voucher")) === String(voucherId)
  );
  const program = programs.find(entry =>
    String(field(entry, "id_maCTKM")) === String(programId)
  );
  const promotionLabels = [];
  if (invoicePromotion) {
    promotionLabels.push(`CTKM hóa đơn: ${field(program || {}, "tenCTKM") || programId} (-${field(invoicePromotion, "phanTram") || 0}%)`);
  }
  if (voucherPromotion) {
    promotionLabels.push(`Voucher: ${voucherId} (-${field(voucherPromotion, "phanTram") || 0}%)`);
  }
  const total = Number(field(item, "tongTien") || 0);
  const payableTotal = Number(field(item, "thanhTien") ?? total);
  return {
    rawId: field(item, "id_hoaDon"),
    id: `HD${field(item, "id_hoaDon")}`,
    date: date(field(item, "ngayDat")),
    deliveryDate: date(field(item, "ngayGiao")),
    address: address ? [field(address, "duong")].filter(Boolean).join(", ") : "",
    customerName: field(customer || {}, "hoTen") || "Khách hàng",
    employeeName: field(employee || {}, "hoTen") || "",
    total,
    payableTotal,
    promotionAmount: Math.max(0, total - payableTotal),
    promotionLabels,
    statusText,
    trangThai
  };
}

function orderStatusText(status) {
  return ({ 0: "Đã hủy", 1: "Chờ duyệt", 2: "Đã duyệt", 3: "Hoàn thành" })[status] || "Không xác định";
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
  if (![1, 2].includes(trangThai)) {
    throw new Error("Chỉ được hủy hóa đơn đang chờ duyệt hoặc đã duyệt; hóa đơn hoàn thành không thể hủy.");
  }

  // Mark first with a status guard so repeated requests cannot restore stock twice.
  const canceled = await updateRecord("HOADON", { id_hoaDon: orderId, trangThai }, { trangThai: 0 });
  if (!Array.isArray(canceled) || canceled.length === 0) {
    throw new Error("Hóa đơn đã được cập nhật. Tải lại danh sách rồi thử lại.");
  }

  invalidate("orders");
  invalidate("customers");
  try {
    const detailRaw = await fetchTables(["CHITIETHOADON", "SANPHAM"]);
    const details = detailRaw.CHITIETHOADON || [];
    const products = detailRaw.SANPHAM || [];
    const quantitiesByProduct = new Map();
    for (const detail of details.filter(entry => String(field(entry, "id_hoaDon")) === String(orderId))) {
      const productId = String(field(detail, "id_sanPham"));
      quantitiesByProduct.set(productId, (quantitiesByProduct.get(productId) || 0) + Number(field(detail, "soLuong") || 0));
    }
    for (const [productId, orderedQuantity] of quantitiesByProduct) {
      const product = products.find(entry => String(field(entry, "id_sanPham")) === productId);
      if (!product) continue;
      const currentStock = Number(field(product, "soLuong") || 0);
      await updateRecord("SANPHAM", { id_sanPham: field(product, "id_sanPham") }, {
        soLuong: currentStock + orderedQuantity
      });
    }
  } catch (error) {
    throw new Error(`Hóa đơn đã được hủy nhưng có lỗi khi hoàn kho: ${error.message}`);
  } finally {
    invalidate("orders");
    invalidate("customers");
    invalidate("products");
  }
}

export async function approveOrder(orderId, employeeId) {
  if (employeeId === null || employeeId === undefined || String(employeeId).trim() === "") {
    throw new Error("Không xác định được nhân viên đang đăng nhập.");
  }
  const raw = await fetchTables(["HOADON"]);
  const orders = raw.HOADON || [];
  const item = orders.find(entry => String(field(entry, "id_hoaDon")) === String(orderId));
  if (!item) throw new Error("Không tìm thấy hóa đơn.");
  const trangThai = Number(field(item, "trangThai") ?? 1);
  if (trangThai !== 1) throw new Error("Chỉ được duyệt hóa đơn đang chờ duyệt.");

  const updated = await updateRecord("HOADON", { id_hoaDon: orderId, trangThai: 1 }, {
    trangThai: 2,
    cccd_nhanVien: employeeId
  });
  if (!Array.isArray(updated) || updated.length === 0) {
    throw new Error("Hóa đơn đã được cập nhật. Tải lại danh sách rồi thử lại.");
  }

  invalidate("orders");
  invalidate("customers");
  return true;
}

export async function updateOrderDeliveryDate(orderId, deliveryDate) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(deliveryDate || ""))) {
    throw new Error("Vui lòng chọn ngày giao hợp lệ.");
  }
  const [year, month, day] = deliveryDate.split("-").map(Number);
  const parsed = new Date(Date.UTC(year, month - 1, day));
  if (Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== deliveryDate) {
    throw new Error("Ngày giao không hợp lệ.");
  }
  const today = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Bangkok",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).format(new Date());
  if (deliveryDate < today) {
    throw new Error("Ngày giao phải từ hôm nay trở đi.");
  }
  const raw = await fetchTables(["HOADON"]);
  const item = (raw.HOADON || []).find(entry => String(field(entry, "id_hoaDon")) === String(orderId));
  if (!item) throw new Error("Không tìm thấy hóa đơn.");
  if (Number(field(item, "trangThai") ?? 1) !== 2) {
    throw new Error("Chỉ có thể cập nhật ngày giao cho hóa đơn đã duyệt.");
  }
  const updated = await updateRecord("HOADON", { id_hoaDon: orderId, trangThai: 2 }, {
    ngayGiao: deliveryDate,
    trangThai: 3
  });
  if (!Array.isArray(updated) || updated.length === 0) {
    throw new Error("Hóa đơn đã được cập nhật. Tải lại danh sách rồi thử lại.");
  }
  invalidate("orders");
  invalidate("customers");
  return true;
}
