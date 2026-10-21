const menu = [
  { section: "TỔNG QUAN", items: [["dashboard", "▦", "Báo cáo & Thống kê"]] },
  {
    section: "QUẢN LÝ SẢN PHẨM & DANH MỤC",
    items: [
      ["products", "◇", "Sản phẩm nội thất"],
      ["categories", "▱", "Loại sản phẩm"],
      ["woods", "♧", "Loại gỗ (Chất liệu)"],
      ["styles", "♧", "Kiểu dáng nội thất"]
    ]
  },
  {
    section: "KHO & ĐỐI TÁC",
    items: [
      ["imports", "▣", "Nhập kho nội thất"],
      ["suppliers", "♧", "Nhà cung cấp"]
    ]
  },
  {
    section: "BÁN HÀNG & KHÁCH HÀNG",
    items: [
      ["orders", "▤", "Hóa đơn bán hàng"],
      ["customers", "♙", "Hồ sơ khách hàng"],
      ["promotions", "◇", "Chương trình khuyến mãi"]
    ]
  },
  {
    section: "HỆ THỐNG & NHÂN SỰ",
    items: [
      ["staff", "♙", "Quản lý nhân viên"],
      ["accounts", "♢", "Quản lý tài khoản"]
    ]
  }
];

export const getMenu = () => menu;
