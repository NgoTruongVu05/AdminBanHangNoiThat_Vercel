import { fetchTables, insertRecord, updateRecord } from "./apiClient.js";
import { cached, date, field, invalidate } from "./modelUtils.js";

function toNumber(value) {
  if (value == null) return 0;
  const cleaned = String(value).replace(/[^0-9.-]/g, "");
  const num = Number(cleaned);
  return Number.isFinite(num) ? num : 0;
}

function parseType(note) {
  if (!note || !note.startsWith("Loại:")) return "Theo sản phẩm";
  return note.split("|")[0].replace("Loại:", "").trim() || "Theo sản phẩm";
}

function parseDetail(note) {
  if (!note || !note.includes("|")) return "";
  return note.split("|").slice(1).join("|").trim();
}

export async function getPromotions() {
  return cached("promotions", async () => {
    const raw = await fetchTables(["CHUONGTRINHKHUYENMAI", "KMTHEOSANPHAM", "KMTHEOHD", "KMTHEOVOUCHER", "SANPHAM"]);
    const programs = raw.CHUONGTRINHKHUYENMAI || [];
    const kmProducts = raw.KMTHEOSANPHAM || [];
    const kmInvoices = raw.KMTHEOHD || [];
    const kmVouchers = raw.KMTHEOVOUCHER || [];
    const products = raw.SANPHAM || [];

    return programs
      .filter(item => Number(field(item, "isDeleted") ?? 0) !== 1)
      .map(item => {
        const id = field(item, "id_maCTKM");
        const name = field(item, "tenCTKM") || "";
        const ngayBD = date(field(item, "ngayBD"));
        const ngayKT = date(field(item, "ngayKT"));
        const trangThai = Number(field(item, "trangThai") ?? 1);
        const status = trangThai === 0 ? "Đã tắt" : "Đang áp dụng";
        const ghiChu = field(item, "ghiChu") || "";

        const productRows = kmProducts.filter(row => field(row, "id_maCTKM") === id);
        const invoiceRow = kmInvoices.find(row => field(row, "id_maCTKM") === id);
        const voucherRows = kmVouchers.filter(row => field(row, "id_maCTKM") === id);

        let type = "Theo sản phẩm";
        let detail = "";
        let sanPham = "";
        let mucGiam = "";
        let minTotal = "";
        let maVoucher = "";
        let soLuong = "";

        if (productRows.length) {
          type = "Theo sản phẩm";
          const productDetails = productRows.map(row => {
            const product = products.find(productItem => field(productItem, "id_sanPham") === field(row, "id_sanPham"));
            const productName = product ? (field(product, "tenSanPham") || field(row, "id_sanPham")) : field(row, "id_sanPham");
            return { productName, phanTram: field(row, "phanTram") };
          });
          sanPham = productDetails.map(item => item.productName).join(", ");
          mucGiam = productDetails.map(item => `${item.phanTram}%`).join(", ");
          detail = productDetails.map(item => `Sản phẩm: ${item.productName}; Mức giảm: ${item.phanTram}%`).join("; ");
        } else if (invoiceRow) {
          type = "Theo hóa đơn";
          minTotal = field(invoiceRow, "mucTienKM");
          mucGiam = `${field(invoiceRow, "phanTram")}%`;
          detail = `Tổng tối thiểu: ${minTotal}; Mức giảm: ${mucGiam}`;
        } else if (voucherRows.length) {
          type = "Theo voucher";
          const voucherDetails = voucherRows.map(row => ({
            maVoucher: field(row, "id_voucher"),
            phanTram: field(row, "phanTram"),
            soLuong: field(row, "soLuong")
          }));
          maVoucher = voucherDetails.map(item => item.maVoucher).join(", ");
          mucGiam = voucherDetails.map(item => `${item.phanTram}%`).join(", ");
          soLuong = voucherDetails.map(item => item.soLuong).join(", ");
          detail = voucherDetails.map(item => `Mã voucher: ${item.maVoucher}; Mức giảm: ${item.phanTram}% ; Số lượng: ${item.soLuong}`).join("; ");
        } else {
          type = parseType(ghiChu);
          detail = parseDetail(ghiChu);
        }

        return {
          id,
          name,
          type,
          detail,
          sanPham,
          mucGiam,
          minTotal,
          maVoucher,
          soLuong,
          period: `${ngayBD} → ${ngayKT}`,
          ngayBD,
          ngayKT,
          status,
          trangThai,
          ghiChu
        };
      });
  });
}

export async function getPrograms() {
  const promotions = await getPromotions();
  const map = new Map();
  promotions.forEach(item => {
    if (!map.has(item.name)) {
      map.set(item.name, {
        name: item.name,
        period: item.period,
        ngayBD: item.ngayBD,
        ngayKT: item.ngayKT,
        status: item.status,
        trangThai: item.trangThai,
        count: 0
      });
    }
    map.get(item.name).count += 1;
  });
  return [...map.values()];
}

export async function getPromotionsByType(type, programName = "") {
  const promotions = await getPromotions();
  return promotions.filter(item => {
    if (item.type !== type) return false;
    if (programName && item.name !== programName) return false;
    return true;
  });
}

export async function createPromotionsBulk(program, rules) {
  const rawPrograms = await fetchTables(["CHUONGTRINHKHUYENMAI"]);
  const existingIds = (rawPrograms.CHUONGTRINHKHUYENMAI || []).map(item => field(item, "id_maCTKM"));
  let counter = existingIds.reduce((max, id) => {
    const match = String(id || "").match(/KM(\d+)/i);
    return match ? Math.max(max, Number(match[1])) : max;
  }, 0) + 1;

  const results = [];
  for (const rule of rules) {
    let id = `KM${String(counter++).padStart(2, "0")}`;
    while (existingIds.includes(id)) {
      id = `KM${Date.now()}${counter++}`;
    }
    existingIds.push(id);

    const inserted = await insertRecord("CHUONGTRINHKHUYENMAI", {
      id_maCTKM: id,
      tenCTKM: program.name,
      ngayBD: program.ngayBD,
      ngayKT: program.ngayKT,
      ghiChu: `Loại: ${rule.type}`,
      trangThai: program.trangThai ?? 1,
      isDeleted: 0
    });

    const phanTram = toNumber(rule.phanTram);
    if (rule.type === "Theo sản phẩm") {
      await insertRecord("KMTHEOSANPHAM", {
        id_maCTKM: id,
        phanTram,
        id_sanPham: toNumber(rule.id_sanPham) || null
      });
    } else if (rule.type === "Theo hóa đơn") {
      await insertRecord("KMTHEOHD", {
        id_maCTKM: id,
        mucTienKM: toNumber(rule.minTotal),
        phanTram
      });
    } else {
      await insertRecord("KMTHEOVOUCHER", {
        id_voucher: rule.maVoucher || `VC${id}`,
        id_maCTKM: id,
        phanTram,
        soLuong: toNumber(rule.soLuong)
      });
    }

    results.push(inserted);
  }

  invalidate("promotions");
  return results;
}

export async function updatePromotionStatus(id, trangThai) {
  const result = await updateRecord("CHUONGTRINHKHUYENMAI", { id_maCTKM: id }, { trangThai });
  invalidate("promotions");
  return result;
}