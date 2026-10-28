const API_BASE = 'https://provinces.open-api.vn/api/v2';
let provinceCache = null;
const wardCache = new Map();
let allWardsCache = null;

export async function getProvinces() {
  if (!provinceCache) {
    const response = await fetch(API_BASE + '/p/');
    if (!response.ok) throw new Error('Khong the tai danh sach tinh/thanh pho.');
    provinceCache = await response.json();
  }
  return provinceCache;
}

export async function getWards(provinceCode) {
  const key = String(provinceCode);
  if (!wardCache.has(key)) {
    const response = await fetch(API_BASE + '/p/' + key + '?depth=2');
    if (!response.ok) throw new Error('Khong the tai danh sach phuong/xa.');
    const data = await response.json();
    wardCache.set(key, data.wards || []);
  }
  return wardCache.get(key);
}

export async function loadAllWards() {
  if (allWardsCache) return allWardsCache;
  const provinces = await getProvinces();
  const groups = await Promise.all(provinces.map(async (province) => {
    const wards = await getWards(province.code);
    return wards.map((ward) => ({ ...ward, province_code: province.code }));
  }));
  allWardsCache = groups.flat();
  return allWardsCache;
}
