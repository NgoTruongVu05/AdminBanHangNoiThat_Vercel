import { fetchTables } from "./apiClient.js";
import { cached, date, field } from "./modelUtils.js";

export async function getPromotions() {
  return cached("promotions", async () => {
    const raw = await fetchTables(["CHUONGTRINHKHUYENMAI"]);
    return (raw.CHUONGTRINHKHUYENMAI || []).map(item => ({
      id: field(item, "id_maCTKM"),
      name: field(item, "tenCTKM") || "",
      type: "Theo sản phẩm",
      period: `${date(field(item, "ngayBD"))} → ${date(field(item, "ngayKT"))}`,
      status: field(item, "trangThai") === 0 ? "Đã tắt" : "Đang áp dụng",
      trangThai: Number(field(item, "trangThai") ?? 1)
    }));
  });
}
