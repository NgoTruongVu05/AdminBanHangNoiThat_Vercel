import { fetchTables, insertRecord, updateRecord, deleteRecord } from "./apiClient.js";
import { cached, date, field, invalidate } from "./modelUtils.js";

function toNumber(value) {
  if (value == null) return 0;
  const cleaned = String(value).replace(/[^0-9.-]/g, "");
  const num = Number(cleaned);
  return Number.isFinite(num) ? num : 0;
}

function parseType(note) {
  if (!note) return "Theo sản phẩm";
  if (note.startsWith("Loại:")) return note.split("|")[0].replace("Loại:", "").trim() || "Theo sản phẩm";
  if (note.startsWith("(Chưa có CTKM)")) return "(Chưa có CTKM)";
  return "Theo sản phẩm";
}

function parseDetail(note) {
  if (!note) return "";
  if (note.startsWith("Loại:") && note.includes("|")) return note.split("|").slice(1).join("|").trim();
  if (note.startsWith("(Chưa có CTKM)") && note.includes("|")) return note.split("|").slice(1).join("|").trim();
  if (!note.startsWith("Loại:") && !note.startsWith("(Chưa có CTKM)")) return note.trim();
  return "";
}

export async function getPromotions() {
  return cached("promotions", async () => {
    const raw = await fetchTables(["CHUONGTRINHKHUYENMAI", "KMTHEOSANPHAM", "KMTHEOHD", "KMTHEOVOUCHER", "SANPHAM"]);
    const programs = raw.CHUONGTRINHKHUYENMAI || [];
    const kmProducts = raw.KMTHEOSANPHAM || [];
    const kmInvoices = raw.KMTHEOHD || [];
    const kmVouchers = raw.KMTHEOVOUCHER || [];
    const products = raw.SANPHAM || [];

    const mapped = programs
      .map(item => {
        const id = field(item, "id_maCTKM");
        const name = field(item, "tenCTKM") || "";
        const ngayBD = date(field(item, "ngayBD"));
        const ngayKT = date(field(item, "ngayKT"));
        const trangThai = Number(field(item, "trangThai") ?? 1);
        const isDeleted = Number(field(item, "isDeleted") ?? 0);
        const status = trangThai === 0 ? "Đã khóa" : "Đang áp dụng";
        const ghiChu = field(item, "ghiChu") || "";

        const productRows = kmProducts.filter(row => field(row, "id_maCTKM") === id);
        const invoiceRow = kmInvoices.find(row => field(row, "id_maCTKM") === id);
        const voucherRows = kmVouchers.filter(row => field(row, "id_maCTKM") === id);

        let type = parseType(ghiChu);
        let detail = "";
        let sanPham = "";
        let sanPhamId = "";
        let mucGiam = "";
        let phanTram = "";
        let minTotal = "";
        let maVoucher = "";
        let soLuong = "";

        if (productRows.length) {
          type = "Theo sản phẩm";
          const productDetails = productRows.map(row => {
            const product = products.find(productItem => field(productItem, "id_sanPham") === field(row, "id_sanPham"));
            const productName = product ? (field(product, "tenSanPham") || field(row, "id_sanPham")) : field(row, "id_sanPham");
            return { productName, phanTram: field(row, "phanTram"), id_sanPham: field(row, "id_sanPham") };
          });
          sanPham = productDetails.map(item => item.productName).join(", ");
          sanPhamId = productDetails.map(item => item.id_sanPham).join(", ");
          mucGiam = productDetails.map(item => `${item.phanTram}%`).join(", ");
          phanTram = productDetails.map(item => item.phanTram).join(", ");
          detail = productDetails.map(item => `Sản phẩm: ${item.productName}; Mức giảm: ${item.phanTram}%`).join("; ");
        } else if (invoiceRow) {
          type = "Theo hóa đơn";
          minTotal = field(invoiceRow, "mucTienKM");
          mucGiam = `${field(invoiceRow, "phanTram")}%`;
          phanTram = field(invoiceRow, "phanTram");
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
          phanTram = voucherDetails.map(item => item.phanTram).join(", ");
          soLuong = voucherDetails.map(item => item.soLuong).join(", ");
          detail = voucherDetails.map(item => `Mã voucher: ${item.maVoucher}; Mức giảm: ${item.phanTram}% ; Số lượng: ${item.soLuong}`).join("; ");
        } else {
          if (isDeleted === 1 && !productRows.length && !invoiceRow && !voucherRows.length) {
            type = "(Chưa có CTKM)";
          } else {
            type = parseType(ghiChu);
          }
          detail = parseDetail(ghiChu);
        }

        return {
          id,
          name,
          type,
          detail,
          sanPham,
          sanPhamId,
          mucGiam,
          phanTram,
          minTotal,
          maVoucher,
          soLuong,
          period: `${ngayBD} → ${ngayKT}`,
          ngayBD,
          ngayKT,
          status,
          trangThai,
          ghiChu,
          isDeleted,
          note: parseDetail(ghiChu)
        };
      });
    return mapped.filter(item => Number(item.isDeleted ?? 0) !== 1 || item.type === "(Chưa có CTKM)");
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
        count: 0,
        note: item.note || ""
      });
    }
    if (item.type !== "(Chưa có CTKM)") {
      map.get(item.name).count += 1;
    }
    if (item.note) {
      map.get(item.name).note = item.note;
    }
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

  function nextId() {
    let id = `KM${String(counter++).padStart(2, "0")}`;
    while (existingIds.includes(id)) {
      id = `KM${Date.now()}${counter++}`;
    }
    existingIds.push(id);
    return id;
  }

  // Remove placeholder rows when real rules are added
  if (rules && rules.length) {
    const placeholders = (rawPrograms.CHUONGTRINHKHUYENMAI || []).filter(item =>
      field(item, "tenCTKM") === program.name &&
      Number(field(item, "isDeleted") ?? 0) === 1
    );
    for (const item of placeholders) {
      await deleteRecord("CHUONGTRINHKHUYENMAI", { id_maCTKM: field(item, "id_maCTKM") });
    }
  }

  const results = [];

  if (!rules || !rules.length) {
    const id = nextId();
    const inserted = await insertRecord("CHUONGTRINHKHUYENMAI", {
      id_maCTKM: id,
      tenCTKM: program.name,
      ngayBD: program.ngayBD,
      ngayKT: program.ngayKT,
      ghiChu: program.note || "",
      trangThai: program.trangThai ?? 1,
      isDeleted: 1
    });
    results.push(inserted);
    invalidate("promotions");
    return results;
  }

  for (const rule of rules) {
    const id = nextId();

    const inserted = await insertRecord("CHUONGTRINHKHUYENMAI", {
      id_maCTKM: id,
      tenCTKM: program.name,
      ngayBD: program.ngayBD,
      ngayKT: program.ngayKT,
      ghiChu: program.note || "",
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

export async function updateProgram(programName, data) {
  const promotions = await getPromotions();
  const targets = promotions.filter(item => item.name === programName);
  for (const item of targets) {
    const ghiChu = data.note || "";
    await updateRecord("CHUONGTRINHKHUYENMAI", { id_maCTKM: item.id }, {
      tenCTKM: data.name,
      ngayBD: data.ngayBD,
      ngayKT: data.ngayKT,
      trangThai: item.trangThai,
      ghiChu
    });
  }
  invalidate("promotions");
  return targets.length;
}

export async function updatePromotionStatus(id, trangThai) {
  const result = await updateRecord("CHUONGTRINHKHUYENMAI", { id_maCTKM: id }, { trangThai });
  invalidate("promotions");
  return result;
}
export async function updatePromotionRule(id, type, data) {
  const payload = {};
  if (data.trangThai !== undefined) payload.trangThai = data.trangThai;
  if (Object.keys(payload).length) {
    await updateRecord("CHUONGTRINHKHUYENMAI", { id_maCTKM: id }, payload);
  }

  if (type === "Theo sản phẩm") {
    const payload = {};
    if (data.phanTram !== undefined) payload.phanTram = data.phanTram;
    if (Object.keys(payload).length) await updateRecord("KMTHEOSANPHAM", { id_maCTKM: id }, payload);
  } else if (type === "Theo hóa đơn") {
    const payload = {};
    if (data.phanTram !== undefined) payload.phanTram = data.phanTram;
    if (Object.keys(payload).length) await updateRecord("KMTHEOHD", { id_maCTKM: id }, payload);
  } else {
    const payload = {};
    if (data.phanTram !== undefined) payload.phanTram = data.phanTram;
    if (data.soLuong !== undefined) payload.soLuong = data.soLuong;
    if (Object.keys(payload).length) await updateRecord("KMTHEOVOUCHER", { id_maCTKM: id }, payload);
  }

  invalidate("promotions");
  return true;
}