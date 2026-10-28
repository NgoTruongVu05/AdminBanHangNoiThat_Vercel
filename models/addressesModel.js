import { fetchTables, insertRecord, updateRecord } from './apiClient.js';
import { field, invalidate } from './modelUtils.js';

export async function createCustomerAddress(customerId, address) {
  const result = await insertRecord('DIACHIGIAOHANG', {
    ID_khachHang: customerId,
    tinhThanh: Number(address.tinhThanh),
    phuongXa: Number(address.phuongXa),
    duong: address.duong,
    macDinh: address.macDinh != null ? Number(address.macDinh) : 1
  });
  invalidate('customers');
  return result;
}

export async function deactivateDefaultAddresses(customerId) {
  const result = await updateRecord('DIACHIGIAOHANG', { id_khachHang: customerId, macDinh: 1 }, { macDinh: 0 });
  invalidate('customers');
  return result;
}

export async function getCustomerAddresses(customerId) {
  const raw = await fetchTables(['DIACHIGIAOHANG']);
  return (raw.DIACHIGIAOHANG || []).filter(item =>
    String(field(item, 'id_khachHang')) === String(customerId)
  );
}

export async function setDefaultCustomerAddress(customerId, addressId) {
  await deactivateDefaultAddresses(customerId);
  const result = await updateRecord('DIACHIGIAOHANG', { id_diaChi: addressId }, { macDinh: 1 });
  invalidate('customers');
  return result;
}

export async function updateCustomerAddress(addressId, address) {
  const record = {
    tinhThanh: Number(address.tinhThanh),
    phuongXa: Number(address.phuongXa),
    duong: address.duong
  };
  if (address.macDinh != null) record.macDinh = Number(address.macDinh);
  const result = await updateRecord('DIACHIGIAOHANG', { id_diaChi: addressId }, record);
  invalidate('customers');
  return result;
}
