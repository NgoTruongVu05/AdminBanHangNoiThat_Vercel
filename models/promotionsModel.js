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
        productDetails.forEach(detail => {
          mapped.push({
            ...base,
            id: `${id}::${detail.id_sanPham}`,
            programId: id,
            type: "Theo sản phẩm",
            detail: `Sản phẩm: ${detail.productName}`,
            sanPham: detail.productName,
            sanPhamId: detail.id_sanPham,
            mucGiam: `${detail.phanTram}%`,
            phanTram: detail.phanTram,
            minTotal: "",
            maVoucher: "",
            soLuong: ""
          });
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
            detail: `Tổng tối thiểu: ${minTotal}`,
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
        voucherRows.forEach(row => {
          const maVoucher = field(row, "id_voucher");
          mapped.push({
            ...base,
            id: `${id}::${maVoucher}`,
            type: "Theo voucher",
            detail: `Mã voucher: ${maVoucher}; Số lượng: ${field(row, "soLuong")}`,
            sanPham: "",
            sanPhamId: "",
            mucGiam: `${field(row, "phanTram")}%`,
            phanTram: field(row, "phanTram"),
            minTotal: "",
            maVoucher,
            soLuong: field(row, "soLuong")
          });
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

  // Validate rule inputs before writing to avoid partial updates.
  const productRuleIds = rules
    .filter(rule => rule.type === "Theo sản phẩm")
    .map(rule => toNumber(rule.id_sanPham) || null);
  if (productRuleIds.some(id => !id)) throw new Error("Vui lòng chọn sản phẩm.");
  if (productRuleIds.some((id, index) => productRuleIds.indexOf(id) !== index)) {
    throw new Error("Mỗi sản phẩm chỉ được thêm một lần trong cùng chương trình.");
  }
  const voucherRuleIds = rules
    .filter(rule => rule.type !== "Theo sản phẩm" && rule.type !== "Theo hóa đơn")
    .map(rule => String(rule.maVoucher || "").trim());
  if (voucherRuleIds.some(id => !id)) throw new Error("Vui lòng nhập mã voucher.");
  if (voucherRuleIds.some((id, index) => voucherRuleIds.indexOf(id) !== index)) {
    throw new Error("Mỗi mã voucher chỉ được thêm một lần trong cùng chương trình.");
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

  const rawRules = await fetchTables(["KMTHEOSANPHAM", "KMTHEOVOUCHER"]);
  const existingProductRows = (rawRules.KMTHEOSANPHAM || []).filter(row => field(row, "id_maCTKM") === programId);
  const existingVoucherRows = (rawRules.KMTHEOVOUCHER || []).filter(row => field(row, "id_maCTKM") === programId);
  const seenProducts = new Set();
  const seenVouchers = new Set();

  for (const rule of rules) {
    const phanTram = toNumber(rule.phanTram);
    if (rule.type === "Theo sản phẩm") {
      const productId = toNumber(rule.id_sanPham) || null;
      if (!productId) throw new Error("Vui lòng chọn sản phẩm.");
      if (seenProducts.has(productId)) throw new Error("Mỗi sản phẩm chỉ được thêm một lần trong cùng chương trình.");
      seenProducts.add(productId);
      const existingProduct = existingProductRows.find(row => toNumber(field(row, "id_sanPham")) === productId);
      if (existingProduct) {
        await updateRecord("KMTHEOSANPHAM", { id_maCTKM: programId, id_sanPham: productId }, { phanTram });
      } else {
        await insertRecord("KMTHEOSANPHAM", {
          id_maCTKM: programId,
          phanTram,
          id_sanPham: productId
        });
      }
    } else if (rule.type === "Theo hóa đơn") {
      await insertRecord("KMTHEOHD", {
        id_maCTKM: programId,
        mucTienKM: toNumber(rule.minTotal),
        phanTram
      });
    } else {
      const voucherId = String(rule.maVoucher || "").trim();
      if (!voucherId) throw new Error("Vui lòng nhập mã voucher.");
      if (seenVouchers.has(voucherId)) throw new Error("Mỗi mã voucher chỉ được thêm một lần trong cùng chương trình.");
      seenVouchers.add(voucherId);
      const existingVoucher = existingVoucherRows.find(row => String(field(row, "id_voucher")) === voucherId);
      if (existingVoucher) {
        await updateRecord("KMTHEOVOUCHER", { id_maCTKM: programId, id_voucher: voucherId }, {
          phanTram,
          soLuong: toNumber(rule.soLuong)
        });
      } else {
        await insertRecord("KMTHEOVOUCHER", {
          id_voucher: voucherId,
          id_maCTKM: programId,
          phanTram,
          soLuong: toNumber(rule.soLuong)
        });
      }
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
  let productId = null;
  let voucherId = null;
  if (type === "Theo hóa đơn") {
    const raw = await fetchTables(["KMTHEOHD"]);
    const invoiceRow = (raw.KMTHEOHD || []).find(row => String(field(row, "ID_KM_HD")) === String(id));
    if (invoiceRow) programId = field(invoiceRow, "id_maCTKM");
  } else if (type === "Theo sản phẩm" && String(id).includes("::")) {
    const parts = String(id).split("::");
    programId = parts[0];
    productId = parts[1];
  } else if (type === "Theo voucher" && String(id).includes("::")) {
    const parts = String(id).split("::");
    programId = parts[0];
    voucherId = parts.slice(1).join("::");
  }

  const payload = {};
  if (data.trangThai !== undefined) payload.trangThai = data.trangThai;
  if (Object.keys(payload).length) {
    await updateRecord("CHUONGTRINHKHUYENMAI", { id_maCTKM: programId }, payload);
  }

  if (type === "Theo sản phẩm") {
    const payload = {};
    if (data.phanTram !== undefined) payload.phanTram = data.phanTram;
    const match = productId ? { id_maCTKM: programId, id_sanPham: productId } : { id_maCTKM: programId };
    if (Object.keys(payload).length) await updateRecord("KMTHEOSANPHAM", match, payload);
  } else if (type === "Theo hóa đơn") {
    const payload = {};
    if (data.phanTram !== undefined) payload.phanTram = data.phanTram;
    if (data.minTotal !== undefined) payload.mucTienKM = data.minTotal;
    if (Object.keys(payload).length) await updateRecord("KMTHEOHD", { ID_KM_HD: id }, payload);
  } else {
    const payload = {};
    if (data.phanTram !== undefined) payload.phanTram = data.phanTram;
    if (data.soLuong !== undefined) payload.soLuong = data.soLuong;
    if (Object.keys(payload).length) {
      await updateRecord("KMTHEOVOUCHER", { id_maCTKM: programId, id_voucher: voucherId }, payload);
    }
  }

  invalidate("promotions");
  return true;
}