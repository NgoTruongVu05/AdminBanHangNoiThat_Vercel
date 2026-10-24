import { fetchTables, insertRecord, updateRecord } from "./apiClient.js";
import { cached, field, invalidate } from "./modelUtils.js";
import { createAccount, ensureAccountAvailable, updateAccountStatus } from "./accountsModel.js";

export async function createCustomer(record) {
  const result = await insertRecord("KHACHHANG", record);
  invalidate("customers");
  return result;
}
export async function createCustomerWithAccount(customer, account) {
  await ensureAccountAvailable(account);
  const createdCustomer = await createCustomer(customer);
  const customerRecord = Array.isArray(createdCustomer) ? createdCustomer[0] : createdCustomer;
  const customerId = field(customerRecord || {}, "id_khachHang");
  await createAccount({ ...account, ID_khachHang: customerId });
  return createdCustomer;
}

export async function updateCustomer(id, record) {
  const result = await updateRecord("KHACHHANG", { id_khachHang: id }, record);
  invalidate("customers");
  return result;
}

export async function updateCustomerStatus(id, trangThai) {
  const result = await updateCustomer(id, { trangThai });
  try {
    await updateAccountStatus({ id_khachHang: id }, trangThai);
  } catch (error) {
    console.warn("Không thể đồng bộ trạng thái DANGNHAP cho khách hàng:", error.message);
  }
  invalidate("customers");
  invalidate("accounts");
  return result;
}

export async function getCustomers() {
  return cached("customers", async () => {
    const raw = await fetchTables(["KHACHHANG"]);
    return (raw.KHACHHANG || []).map(item => ({
      rawId: field(item, "id_khachHang"),
      id: String(field(item, "id_khachHang")),
      name: field(item, "hoTen") || "",
      phone: field(item, "SDT") || field(item, "sdt") || "",
      email: field(item, "email") || "",
      orders: 0,
      spending: 0,
      status: field(item, "trangThai") === 0 ? "Bị khóa" : "Đang hoạt động",
      trangThai: Number(field(item, "trangThai") ?? 1)
    }));
  });
}
