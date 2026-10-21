const field = (row, name) => row[name] ?? row[name.toLowerCase()];
const date = value => value ? String(value).slice(0, 10) : "";
const moneyText = value => value == null ? "" : new Intl.NumberFormat("vi-VN").format(value) + " ₫";

export async function loadRemoteData() {
  try {
    const response = await fetch("/api/data");
    if (!response.ok) throw new Error(`API trả về ${response.status}`);
    const payload = await response.json();
    if (payload.failures?.length) {
      console.warn("Một số bảng Supabase không tải được:", payload.failures);
    }
    return normalize(payload.data || payload);
  } catch (error) {
    console.error("Không tải được dữ liệu Supabase:", error);
    throw new Error("Không thể tải dữ liệu từ Supabase. Kiểm tra biến môi trường, RLS policy và kết nối API.");
  }
}

function normalize(raw) {
  const categories = (raw.LOAISP || []).filter(item => field(item, "trangThai") !== 0).map(item => ({
    id: `LSP${String(field(item, "id_loaiSP")).padStart(2, "0")}`, name: field(item, "tenLoai") || "",
    description: "", count: 0, styles: (raw.KIEUDANG || []).filter(style => field(style, "id_loaiSP") === field(item, "id_loaiSP")).length
  }));
  const woods = (raw.LOAIGO || []).filter(item => field(item, "trangThai") !== 0).map(item => [
    `LG${String(field(item, "id_maGo")).padStart(2, "0")}`, field(item, "tenGo") || "", "", 0
  ]);
  const products = (raw.SANPHAM || []).filter(item => field(item, "trangThai") !== 0).map(item => ({
    id: `SP${String(field(item, "id_sanPham")).padStart(3, "0")}`, name: field(item, "tenSanPham") || "",
    detail: "", category: categories.find(category => category.id.endsWith(String(field(item, "id_loaiSP")).padStart(2, "0")))?.name || "",
    wood: woods.find(wood => wood[0].endsWith(String(field(item, "id_maGo")).padStart(2, "0")))?.[1] || "",
    price: Number(field(item, "donGia") || 0), stock: Number(field(item, "soLuong") || 0), status: "Đang kinh doanh"
  }));
  categories.forEach(category => { category.count = products.filter(product => product.category === category.name).length; });
  woods.forEach(wood => { wood[3] = products.filter(product => product.wood === wood[1]).length; });
  const customers = (raw.KHACHHANG || []).map(item => ({
    id: String(field(item, "id_khachHang")), name: field(item, "hoTen") || "", phone: field(item, "SDT") || field(item, "sdt") || "", email: field(item, "email") || "",
    orders: 0, spending: 0, status: field(item, "trangThai") === 0 ? "Bị khóa" : "Bình thường"
  }));
  const staff = (raw.NHANVIEN || []).map(item => ({
    id: field(item, "CCCD"), name: field(item, "hoTen") || "", role: field(item, "vaiTro") === 1 ? "Quản trị viên" : "Nhân viên",
    phone: field(item, "sdt") || "", status: field(item, "trangThai") === 0 ? "Bị khóa" : "Đang hoạt động"
  }));
  return {
    products, categories, woods,
    orders: (raw.HOADON || []).map(item => {
      const customer = customers.find(entry => String(entry.id) === String(field(item, "id_khachHang")));
      return [`HD${field(item, "id_hoaDon")}`, customer?.name || "Khách hàng", date(field(item, "ngayDat")), moneyText(field(item, "tongTien")), field(item, "ngayGiao") ? "Đã hoàn tất" : "Chờ xác nhận"];
    }),
    suppliers: (raw.NHACUNGCAP || []).filter(item => field(item, "trangThai") !== 0).map(item => ({
      id: `NCC${field(item, "id_nhaCungCap")}`, name: field(item, "tenNhaCungCap") || "", address: field(item, "diachi") || "", phone: field(item, "sdt") || "", status: "Đang hợp tác"
    })),
    customers,
    imports: (raw.PHIEUNHAP || []).map(item => ({
      id: `PN${field(item, "id_phieuNhap")}`, date: date(field(item, "ngayNhap")), supplier: "", count: 0, status: field(item, "trangThai") || ""
    })),
    promotions: (raw.CHUONGTRINHKHUYENMAI || []).map(item => ({
      id: field(item, "id_maCTKM"), name: field(item, "tenCTKM") || "", type: "Theo sản phẩm",
      period: `${date(field(item, "ngayBD"))} → ${date(field(item, "ngayKT"))}`, status: field(item, "trangThai") === 0 ? "Đã tắt" : "Đang áp dụng"
    })),
    staff,
    accounts: (raw.DANGNHAP || []).map(item => ({
      id: `TK${field(item, "id_taiKhoan")}`, username: field(item, "tenDangNhap"), name: staff.find(entry => entry.id === field(item, "cccd_nhanVien"))?.name || "",
      role: field(item, "loaiTaiKhoan"), status: field(item, "trangThai") === 0 ? "Bị khóa" : "Hoạt động"
    })),
    styles: (raw.KIEUDANG || []).map(item => ({
      id: `KD${field(item, "id_kieuDang")}`, name: field(item, "tenKieuDang") || "",
      category: categories.find(entry => entry.id.endsWith(String(field(item, "id_loaiSP")).padStart(2, "0")) )?.name || "",
      status: field(item, "trangThai") === 0 ? "Đã ẩn" : "Đang sử dụng"
    }))
  };
}
