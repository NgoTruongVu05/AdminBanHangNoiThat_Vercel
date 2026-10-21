export const products = [
  { id: "SP001", name: "Bàn ăn tròn mâm xoay Gỗ Đỏ 8 ghế", detail: "Kích thước: D160cm x C78cm", category: "Bàn ăn & Bàn trà", wood: "Gỗ Gõ Đỏ Pachy", price: 38500000, stock: 12, status: "Đang kinh doanh" },
  { id: "SP002", name: "Sofa góc Chân Thuyền Gỗ Óc Chó Bắc Mỹ", detail: "Kích thước: 320cm x 210cm", category: "Sofa gỗ nguyên khối", wood: "Gỗ Óc Chó Bắc Mỹ (Walnut)", price: 86000000, stock: 6, status: "Đang kinh doanh" },
  { id: "SP003", name: "Giường ngủ Hoàng Gia Hương Đá 1m8x2m", detail: "Kích thước: 180cm x 200cm", category: "Giường ngủ master", wood: "Gỗ Hương Đá Gia Lai", price: 52000000, stock: 8, status: "Đang kinh doanh" },
  { id: "SP004", name: "Tủ quần áo 4 cánh panno Gỗ Sồi Nga", detail: "Kích thước: 220cm x 240cm x 60cm", category: "Tủ áo & Tủ trang trí", wood: "Gỗ Sồi Nga (Oak)", price: 24500000, stock: 15, status: "Đang kinh doanh" },
  { id: "SP005", name: "Kệ tivi phòng khách chân tiện Gỗ Đỏ", detail: "Kích thước: 240cm x 45cm x 65cm", category: "Kệ Tivi & Bàn thờ", wood: "Gỗ Gõ Đỏ Pachy", price: 18000000, stock: 18, status: "Đang kinh doanh" },
  { id: "SP006", name: "Bàn trà đôi sofa mặt đá khung Óc Chó", detail: "Kích thước: D80cm x D60cm", category: "Bàn ăn & Bàn trà", wood: "Gỗ Óc Chó Bắc Mỹ (Walnut)", price: 14200000, stock: 3, status: "Đang kinh doanh" },
  { id: "SP007", name: "Bộ bàn ghế ăn Concorde Gỗ Tần Bì 6 ghế", detail: "Kích thước: 180cm x 90cm", category: "Bàn ăn & Bàn trà", wood: "Gỗ Tần Bì (Ash)", price: 21500000, stock: 20, status: "Đang kinh doanh" },
  { id: "SP008", name: "Ghế thư giãn bập bênh gỗ Hương Đá kèm đôn", detail: "Kích thước: 90cm x 85cm x 105cm", category: "Ghế phòng khách & Ăn", wood: "Gỗ Hương Đá Gia Lai", price: 9800000, stock: 2, status: "Tạm hết hàng" }
];

export const categories = [
  { id: "LSP01", name: "Bàn ăn & Bàn trà", description: "Các mẫu bàn tròn, bàn chữ nhật, bàn trà phòng khách", count: 3, styles: 2 },
  { id: "LSP02", name: "Ghế phòng khách & Ăn", description: "Ghế đơn, ghế bành, ghế tựa lưng gỗ cao cấp", count: 1, styles: 1 },
  { id: "LSP03", name: "Giường ngủ master", description: "Giường phản, giường hộp, giường vòm gỗ nguyên khối", count: 1, styles: 1 },
  { id: "LSP04", name: "Tủ áo & Tủ trang trí", description: "Tủ 3 cánh, 4 cánh, tủ kịch trần, tủ rượu gỗ", count: 1, styles: 1 },
  { id: "LSP05", name: "Sofa gỗ nguyên khối", description: "Bộ sofa gỗ chữ L, bộ đôi tay pháo, nệm da cao cấp", count: 1, styles: 1 },
  { id: "LSP06", name: "Kệ Tivi & Bàn thờ", description: "Kệ trang trí đa năng, tủ thờ gia tiên chạm khắc", count: 1, styles: 0 }
];

export const woods = [
  ["LG01", "Gỗ Gõ Đỏ Pachy", "Vân gỗ cuộn sóng đẹp, tom gỗ mịn, chịu lực và đập cực tốt", 2],
  ["LG02", "Gỗ Hương Đá Gia Lai", "Màu đỏ nâu sang trọng, mùi thơm dịu tự nhiên, chất gỗ đanh chắc", 2],
  ["LG03", "Gỗ Óc Chó Bắc Mỹ (Walnut)", "Màu socola trầm ấm, vân xoáy tinh tế, phong cách hiện đại đẳng cao", 2],
  ["LG04", "Gỗ Sồi Nga (Oak)", "Màu sáng vân sọc tự nhiên, kháng nước, dễ kết hợp không gian tối giản", 1],
  ["LG05", "Gỗ Tần Bì (Ash)", "Độ đàn hồi dẻo dai, vân elip đồng tâm mềm mại, giá thành hợp lý", 1]
];

export const orders = [
  ["HD2026-081", "Trần Đình Quang", "2026-03-15", "114.750.000 ₫", "Đã hoàn tất"],
  ["HD2026-082", "Nguyễn Thị Minh Hằng", "2026-03-28", "75.680.000 ₫", "Đã hoàn tất"],
  ["HD2026-083", "Lê Thu Trang", "2026-04-10", "52.000.000 ₫", "Đang giao hàng"],
  ["HD2026-084", "Vũ Quốc Toàn", "2026-04-15", "38.500.000 ₫", "Chờ xác nhận"]
];

export const menu = [
  { section: "TỔNG QUAN", items: [["dashboard", "▦", "Báo cáo & Thống kê"]] },
  { section: "QUẢN LÝ SẢN PHẨM & DANH MỤC", items: [["products", "◇", "Sản phẩm nội thất", "8"], ["categories", "▱", "Loại sản phẩm"], ["woods", "♧", "Loại gỗ (Chất liệu)"], ["styles", "♧", "Kiểu dáng nội thất"]] },
  { section: "KHO & ĐỐI TÁC", items: [["imports", "▣", "Nhập kho nội thất", "1"], ["suppliers", "♧", "Nhà cung cấp"]] },
  { section: "BÁN HÀNG & KHÁCH HÀNG", items: [["orders", "▤", "Hóa đơn bán hàng", "1"], ["customers", "♙", "Hồ sơ khách hàng", "5"], ["promotions", "◇", "Chương trình khuyến mãi"]] },
  { section: "HỆ THỐNG & NHÂN SỰ", items: [["staff", "♙", "Quản lý nhân viên"], ["accounts", "♢", "Quản lý tài khoản"]] }
];
