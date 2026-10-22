const menu = [
  { section: "TỔNG QUAN", items: [["dashboard", "dashboard", "Báo cáo & Thống kê"]] },
  {
    section: "QUẢN LÝ SẢN PHẨM & DANH MỤC",
    items: [
      ["products", "chair", "Sản phẩm nội thất"],
      ["categories", "category", "Loại sản phẩm"],
      ["woods", "forest", "Loại gỗ (Chất liệu)"],
      ["styles", "auto_awesome", "Kiểu dáng nội thất"]
    ]
  },
  {
    section: "KHO & ĐỐI TÁC",
    items: [
      ["imports", "inventory_2", "Nhập kho nội thất"],
      ["suppliers", "factory", "Nhà cung cấp"]
    ]
  },
  {
    section: "BÁN HÀNG & KHÁCH HÀNG",
    items: [
      ["orders", "receipt_long", "Hóa đơn bán hàng"],
      ["customers", "groups", "Hồ sơ khách hàng"],
      ["promotions", "campaign", "Chương trình khuyến mãi"]
    ]
  },
  {
    section: "HỆ THỐNG & NHÂN SỰ",
    items: [
      ["staff", "person", "Quản lý nhân viên"],
      ["accounts", "admin_panel_settings", "Quản lý tài khoản"]
    ]
  }
];

export const getMenu = () => menu;
