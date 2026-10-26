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

    const mapped = [];

    // Mỗi chương trình được định danh bằng id_maCTKM.
    const programGroups = new Map();
    for (const item of programs) {
      const id = field(item, "id_maCTKM");
      if (!programGroups.has(id)) programGroups.set(id, []);
      programGroups.get(id).push(item);
    }

    for (const [id, groupRows] of programGroups) {
      const primary = groupRows[0];
      const name = field(primary, "tenCTKM") || "";

      const idSet = new Set(groupRows.map(row => field(row, "id_maCTKM")));
      const ngayBD = date(field(primary, "ngayBD"));
      const ngayKT = date(field(primary, "ngayKT"));
      const trangThai = Number(field(primary, "trangThai") ?? 1);
      const isDeleted = Number(field(primary, "isDeleted") ?? 0);
      const status = trangThai === 0 ? "Đã khóa" : "Đang áp dụng";
      const ghiChu = field(primary, "ghiChu") || "";

      const productRows = kmProducts.filter(row => idSet.has(field(row, "id_maCTKM")));
      const invoiceRows = kmInvoices.filter(row => idSet.has(field(row, "id_maCTKM")));
      const voucherRows = kmVouchers.filter(row => idSet.has(field(row, "id_maCTKM")));

      const base = {
        name,
        period: `${ngayBD} → ${ngayKT}`,
        ngayBD,
        ngayKT,
        status,
        trangThai,
        ghiChu,
        isDeleted,
        note: parseDetail(ghiChu),
        programId: id
      };

      if (productRows.length) {
        const productDetails = productRows.map(row => {
          const product = products.find(productItem => field(productItem, "id_sanPham") === field(row, "id_sanPham"));
          const productName = product ? (field(product, "tenSanPham") || field(row, "id_sanPham")) : field(row, "id_sanPham");
          return { productName, phanTram: field(row, "phanTram"), id_sanPham: field(row, "id_sanPham") };
        });
        mapped.push({
          ...base,
          id,
          type: "Theo sản phẩm",
          detail: productDetails.map(p => `Sản phẩm: ${p.productName}; Mức giảm: ${p.phanTram}%`).join("; "),
          sanPham: productDetails.map(p => p.productName).join(", "),
          sanPhamId: productDetails.map(p => p.id_sanPham).join(", "),
          mucGiam: productDetails.map(p => `${p.phanTram}%`).join(", "),
          phanTram: productDetails.map(p => p.phanTram).join(", "),
          minTotal: "",
          maVoucher: "",
          soLuong: ""
        });
      }
      if (invoiceRows.length) {
        for (const invoiceRow of invoiceRows) {
          const invoiceId = field(invoiceRow, "ID_KM_HD");
          const phanTram = field(invoiceRow, "phanTram");
          const minTotal = field(invoiceRow, "mucTienKM");
          mapped.push({
            ...base,
            id: invoiceId,
            type: "Theo hóa đơn",
            detail: `Tổng tối thiểu: ${minTotal}; Mức giảm: ${phanTram}%`,
            sanPham: "",
            sanPhamId: "",
            mucGiam: `${phanTram}%`,
            phanTram,
            minTotal,
            maVoucher: "",
            soLuong: ""
          });
        }
      }
      if (voucherRows.length) {
        const voucherDetails = voucherRows.map(row => ({
          maVoucher: field(row, "id_voucher"),
          phanTram: field(row, "phanTram"),
          soLuong: field(row, "soLuong")
        }));
        mapped.push({
          ...base,
          id,
          type: "Theo voucher",
          detail: voucherDetails.map(v => `Mã voucher: ${v.maVoucher}; Mức giảm: ${v.phanTram}% ; Số lượng: ${v.soLuong}`).join("; "),
          sanPham: "",
          sanPhamId: "",
          mucGiam: voucherDetails.map(v => `${v.phanTram}%`).join(", "),
          phanTram: voucherDetails.map(v => v.phanTram).join(", "),
          minTotal: "",
          maVoucher: voucherDetails.map(v => v.maVoucher).join(", "),
          soLuong: voucherDetails.map(v => v.soLuong).join(", ")
        });
      }
      if (!productRows.length && !invoiceRows.length && !voucherRows.length) {
        let type = parseType(ghiChu);
        if (isDeleted === 1) type = "(Chưa có CTKM)";
        const detail = parseDetail(ghiChu);
        mapped.push({
          ...base,
          id,
          type,
          detail,
          sanPham: "",
          sanPhamId: "",
          mucGiam: "",
          phanTram: "",
          minTotal: "",
          maVoucher: "",
          soLuong: ""
        });
      }
    }

    return mapped.filter(item => Number(item.isDeleted ?? 0) !== 1 || item.type === "(Chưa có CTKM)");
  });
}

export async function getPrograms() {
  const promotions = await getPromotions();
  const map = new Map();
  promotions.forEach(item => {
    const programId = item.programId || item.id;
    if (!map.has(programId)) {
      map.set(programId, {
        id: programId,
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
      map.get(programId).count += 1;
    }
    if (item.note) {
      map.get(programId).note = item.note;
    }
  });
  return [...map.values()];
}

export async function getPromotionsByType(type, programId = "") {
  const promotions = await getPromotions();
  return promotions.filter(item => {
    if (item.type !== type) return false;
    if (programId && String(item.programId) !== String(programId)) return false;
    return true;
  });
}

export async function createPromotionsBulk(program, rules) {
  const rawPrograms = await fetchTables(["CHUONGTRINHKHUYENMAI"]);
  const allPrograms = rawPrograms.CHUONGTRINHKHUYENMAI || [];
  const existingIds = allPrograms.map(item => field(item, "id_maCTKM"));
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

  let programId = program.id || null;
  if (!programId) {
    programId = nextId();
  }

  const exists = allPrograms.some(item => field(item, "id_maCTKM") === programId);

  if (!rules || !rules.length) {
    if (!exists) {
      await insertRecord("CHUONGTRINHKHUYENMAI", {
        id_maCTKM: programId,
        tenCTKM: program.name,
        ngayBD: program.ngayBD,
        ngayKT: program.ngayKT,
        ghiChu: program.note || "",
        trangThai: program.trangThai ?? 1,
        isDeleted: 1
      });
    } else {
      await updateRecord("CHUONGTRINHKHUYENMAI", { id_maCTKM: programId }, {
        tenCTKM: program.name,
        ngayBD: program.ngayBD,
        ngayKT: program.ngayKT,
        ghiChu: program.note || "",
        trangThai: program.trangThai ?? 1,
        isDeleted: 1
      });
    }
    invalidate("promotions");
    return [{ id_maCTKM: programId }];
  }

  if (!exists) {
    await insertRecord("CHUONGTRINHKHUYENMAI", {
      id_maCTKM: programId,
      tenCTKM: program.name,
      ngayBD: program.ngayBD,
      ngayKT: program.ngayKT,
      ghiChu: program.note || "",
      trangThai: program.trangThai ?? 1,
      isDeleted: 0
    });
  } else {
    await updateRecord("CHUONGTRINHKHUYENMAI", { id_maCTKM: programId }, {
      tenCTKM: program.name,
      ngayBD: program.ngayBD,
      ngayKT: program.ngayKT,
      ghiChu: program.note || "",
      trangThai: program.trangThai ?? 1,
      isDeleted: 0
    });
  }

  for (const rule of rules) {
    const phanTram = toNumber(rule.phanTram);
    if (rule.type === "Theo sản phẩm") {
      await insertRecord("KMTHEOSANPHAM", {
        id_maCTKM: programId,
        phanTram,
        id_sanPham: toNumber(rule.id_sanPham) || null
      });
    } else if (rule.type === "Theo hóa đơn") {
      await insertRecord("KMTHEOHD", {
        id_maCTKM: programId,
        mucTienKM: toNumber(rule.minTotal),
        phanTram
      });
    } else {
      await insertRecord("KMTHEOVOUCHER", {
        id_voucher: rule.maVoucher || `VC${programId}`,
        id_maCTKM: programId,
        phanTram,
        soLuong: toNumber(rule.soLuong)
      });
    }
  }

  invalidate("promotions");
  return [{ id_maCTKM: programId }];
}

export async function updateProgram(programId, data) {
  const payload = {
    tenCTKM: data.name,
    ngayBD: data.ngayBD,
    ngayKT: data.ngayKT,
    ghiChu: data.note || ""
  };
  if (data.trangThai !== undefined) payload.trangThai = data.trangThai;
  await updateRecord("CHUONGTRINHKHUYENMAI", { id_maCTKM: programId }, payload);
  invalidate("promotions");
  return 1;
}

export async function updatePromotionStatus(id, trangThai) {
  const result = await updateRecord("CHUONGTRINHKHUYENMAI", { id_maCTKM: id }, { trangThai });
  invalidate("promotions");
  return result;
}
export async function updatePromotionRule(id, type, data) {
  let programId = id;
  if (type === "Theo hóa đơn") {
    const raw = await fetchTables(["KMTHEOHD"]);
    const invoiceRow = (raw.KMTHEOHD || []).find(row => String(field(row, "ID_KM_HD")) === String(id));
    if (invoiceRow) programId = field(invoiceRow, "id_maCTKM");
  }

  const payload = {};
  if (data.trangThai !== undefined) payload.trangThai = data.trangThai;
  if (Object.keys(payload).length) {
    await updateRecord("CHUONGTRINHKHUYENMAI", { id_maCTKM: programId }, payload);
  }

  if (type === "Theo sản phẩm") {
    const payload = {};
    if (data.phanTram !== undefined) payload.phanTram = data.phanTram;
    if (Object.keys(payload).length) await updateRecord("KMTHEOSANPHAM", { id_maCTKM: id }, payload);
  } else if (type === "Theo hóa đơn") {
    const payload = {};
    if (data.phanTram !== undefined) payload.phanTram = data.phanTram;
    if (data.minTotal !== undefined) payload.mucTienKM = data.minTotal;
    if (Object.keys(payload).length) await updateRecord("KMTHEOHD", { ID_KM_HD: id }, payload);
  } else {
    const payload = {};
    if (data.phanTram !== undefined) payload.phanTram = data.phanTram;
    if (data.soLuong !== undefined) payload.soLuong = data.soLuong;
    if (Object.keys(payload).length) await updateRecord("KMTHEOVOUCHER", { id_maCTKM: id }, payload);
  }

  invalidate("promotions");
  return true;
}