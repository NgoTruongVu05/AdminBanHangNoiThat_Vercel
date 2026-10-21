import { fetchTables } from "./apiClient.js";
import { date, field } from "./modelUtils.js";

export async function getPromotions() {
  const raw = await fetchTables(["CHUONGTRINHKHUYENMAI"]);
  return (raw.CHUONGTRINHKHUYENMAI || []).map(item => ({
    id: field(item, "id_maCTKM"),
    name: field(item, "tenCTKM") || "",
    type: "Theo sản phẩm",
    period: `${date(field(item, "ngayBD"))} → ${date(field(item, "ngayKT"))}`,
    status: field(item, "trangThai") === 0 ? "Đã tắt" : "Đang áp dụng"
  }));
}
