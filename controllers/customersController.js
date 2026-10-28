import { initRemoteTable } from "./remoteTableController.js";
import { getCustomers, createCustomerWithAccount, updateCustomer, updateCustomerStatus } from "../models/customersModel.js";
import { createCustomerAddress, getCustomerAddresses, deactivateDefaultAddresses, updateCustomerAddress } from "../models/addressesModel.js";
import { getProvinces, loadAllWards } from "../models/vietnamAddressModel.js";
import { field } from "../models/modelUtils.js";
import { isValidEmail, isValidPhone, showAddForm, showEditForm, showConfirmModal, showAlertModal, escapeHtml } from "./shared.js";

export function initCustomers(query, rerender) {
  return initRemoteTable("customers", query, rerender, getCustomers, {
    onEdit: row => openEditCustomer(row),
    onLock: row => toggleCustomerLock(row),
    isLocked: row => row.trangThai === 0
  });
}

export async function openAddCustomer() {
  const [provinces, wards] = await Promise.all([getProvinces(), loadAllWards()]);
  const provinceOptions = provinces.map(item => ({ value: String(item.code), label: item.name }));
  const wardOptions = wards.map(item => ({ value: String(item.code), label: item.name, categoryId: String(item.province_code) }));
  const provinceName = new Map(provinces.map(item => [String(item.code), item.name]));
  const wardName = new Map(wards.map(item => [String(item.code), item.name]));

  const addresses = [];

  const backdrop = document.createElement("div");
  backdrop.className = "modal-backdrop";
  backdrop.innerHTML = `
    <form class="modal" style="max-width:760px;">
      <h2>Thêm khách hàng</h2>
      <div class="form-row"><label>Tên đăng nhập</label><input name="tenDangNhap" required></div>
      <div class="form-row"><label>Mật khẩu</label><input name="matKhau" type="password" required></div>
      <div class="form-row"><label>Họ và tên</label><input name="hoTen" required></div>
      <div class="form-row"><label>Số điện thoại</label><input name="SDT" required></div>
      <div class="form-row"><label>Email</label><input name="email" type="email"></div>
      <h3 style="margin:12px 0 8px;">Địa chỉ</h3>
      <div id="address-list"></div>
      <button type="button" class="btn alt" id="add-address-btn">Thêm địa chỉ</button>
      <div class="modal-actions">
        <button type="button" class="btn alt" data-cancel>Hủy</button>
        <button class="btn" type="submit">Lưu dữ liệu</button>
      </div>
    </form>
  `;
  document.body.append(backdrop);
  const form = backdrop.querySelector("form");
  const addressList = backdrop.querySelector("#address-list");

  const renderAddresses = () => {
    addressList.innerHTML = addresses.map((addr, index) => `
      <div style="display:flex;align-items:center;gap:8px;padding:8px;border:1px solid #e2e8f0;border-radius:8px;margin-bottom:8px;">
        <input type="radio" name="default-address" ${Number(addr.macDinh) === 1 ? "checked" : ""} data-default-index="${index}" title="Đặt làm mặc định">
        <div style="flex:1;">
          <div>${escapeHtml(provinceName.get(String(addr.tinhThanh)) || addr.tinhThanh)}</div>
          <div style="font-size:12px;color:#64748b;">${escapeHtml(wardName.get(String(addr.phuongXa)) || addr.phuongXa)} - ${escapeHtml(addr.duong)}</div>
        </div>
        <button type="button" class="btn alt" data-edit-index="${index}">Sửa</button>
      </div>
    `).join("");

    addressList.querySelectorAll('input[name="default-address"]').forEach(input => {
      input.onchange = () => {
        const idx = Number(input.dataset.defaultIndex);
        addresses.forEach((a, i) => { a.macDinh = i === idx ? 1 : 0; });
        renderAddresses();
      };
    });
    addressList.querySelectorAll("[data-edit-index]").forEach(btn => {
      const idx = Number(btn.dataset.editIndex);
      btn.onclick = () => {
        showEditForm({
          title: "Sửa địa chỉ",
          fields: [
            { name: "tinhThanh", label: "Tỉnh/Thành phố", options: provinceOptions },
            { name: "phuongXa", label: "Phường/Xã", options: wardOptions, dependsOn: "tinhThanh", placeholder: "Chọn phường/xã" },
            { name: "duong", label: "Số nhà, tên đường" }
          ],
          initialValues: {
            tinhThanh: String(addresses[idx].tinhThanh),
            phuongXa: String(addresses[idx].phuongXa),
            duong: addresses[idx].duong || ""
          },
          onSubmit: data => {
            if (!data.tinhThanh || !data.phuongXa || !data.duong) throw new Error("Vui lòng nhập đầy đủ địa chỉ.");
            addresses[idx].tinhThanh = data.tinhThanh;
            addresses[idx].phuongXa = data.phuongXa;
            addresses[idx].duong = data.duong;
            renderAddresses();
          }
        });
      };
    });
  };

  renderAddresses();

  backdrop.querySelector("#add-address-btn").onclick = () => {
    showAddForm({
      title: "Thêm địa chỉ",
      fields: [
        { name: "tinhThanh", label: "Tỉnh/Thành phố", options: provinceOptions },
        { name: "phuongXa", label: "Phường/Xã", options: wardOptions, dependsOn: "tinhThanh", placeholder: "Chọn phường/xã" },
        { name: "duong", label: "Số nhà, tên đường" }
      ],
      onSubmit: data => {
        if (!data.tinhThanh || !data.phuongXa || !data.duong) throw new Error("Vui lòng nhập đầy đủ địa chỉ.");
        const isDefault = addresses.length === 0;
        addresses.push({ tinhThanh: data.tinhThanh, phuongXa: data.phuongXa, duong: data.duong, macDinh: isDefault ? 1 : 0 });
        renderAddresses();
      }
    });
  };

  const close = () => backdrop.remove();
  backdrop.querySelector("[data-cancel]").onclick = close;
  backdrop.onclick = event => { if (event.target === backdrop) close(); };

  form.onsubmit = async event => {
    event.preventDefault();
    const submit = form.querySelector('button[type="submit"]');
    submit.disabled = true;
    try {
      const data = Object.fromEntries(new FormData(form));
      if (!isValidPhone(data.SDT)) throw new Error("Số điện thoại không hợp lệ.");
      if (data.email && !isValidEmail(data.email)) throw new Error("Email không hợp lệ.");
      if (addresses.length === 0) throw new Error("Vui lòng thêm ít nhất một địa chỉ.");
      if (!addresses.some(a => Number(a.macDinh) === 1)) addresses[0].macDinh = 1;

      const createdCustomer = await createCustomerWithAccount(
        { hoTen: data.hoTen, SDT: data.SDT, email: data.email },
        { tenDangNhap: data.tenDangNhap, matKhau: data.matKhau, loaiTaiKhoan: "KHACHHANG", trangThai: 1 }
      );
      const customerRecord = Array.isArray(createdCustomer) ? createdCustomer[0] : createdCustomer;
      const customerId = customerRecord ? field(customerRecord, "id_khachHang") : null;
      if (customerId) {
        for (const addr of addresses) {
          await createCustomerAddress(customerId, {
            tinhThanh: addr.tinhThanh,
            phuongXa: addr.phuongXa,
            duong: addr.duong,
            macDinh: addr.macDinh
          });
        }
      }
      close();
      document.dispatchEvent(new CustomEvent("data-updated"));
      showAlertModal("Đã thêm dữ liệu thành công.", "success");
    } catch (error) {
      submit.disabled = false;
      console.error("Không thể thêm khách hàng:", error);
      showAlertModal(`Không thể thêm dữ liệu: ${error.message}`, "error");
    }
  };
}
export async function openEditCustomer(customer) {
  const [provinces, wards] = await Promise.all([getProvinces(), loadAllWards()]);
  const provinceOptions = provinces.map(item => ({ value: String(item.code), label: item.name }));
  const wardOptions = wards.map(item => ({ value: String(item.code), label: item.name, categoryId: String(item.province_code) }));
  const provinceName = new Map(provinces.map(item => [String(item.code), item.name]));
  const wardName = new Map(wards.map(item => [String(item.code), item.name]));

  const rawAddresses = await getCustomerAddresses(customer.rawId);
  const addresses = rawAddresses.map(a => ({
    id: field(a, "id_diaChi"),
    tinhThanh: field(a, "tinhThanh"),
    phuongXa: field(a, "phuongXa"),
    duong: field(a, "duong"),
    macDinh: Number(field(a, "macDinh") ?? 0)
  }));

  const backdrop = document.createElement("div");
  backdrop.className = "modal-backdrop";
  backdrop.innerHTML = `
    <form class="modal" style="max-width:760px;">
      <h2>Cập nhật khách hàng</h2>
      <div class="form-row"><label>Họ và tên</label><input name="hoTen" value="${escapeHtml(customer.name)}" required></div>
      <div class="form-row"><label>Số điện thoại</label><input name="SDT" value="${escapeHtml(customer.phone)}" required></div>
      <div class="form-row"><label>Email</label><input name="email" type="email" value="${escapeHtml(customer.email)}"></div>
      <h3 style="margin:12px 0 8px;">Địa chỉ</h3>
      <div id="address-list"></div>
      <button type="button" class="btn alt" id="add-address-btn">Thêm địa chỉ</button>
      <div class="modal-actions">
        <button type="button" class="btn alt" data-cancel>Hủy</button>
        <button class="btn" type="submit">Lưu dữ liệu</button>
      </div>
    </form>
  `;
  document.body.append(backdrop);
  const form = backdrop.querySelector("form");
  const addressList = backdrop.querySelector("#address-list");

  const renderAddresses = () => {
    addressList.innerHTML = addresses.map((addr, index) => `
      <div style="display:flex;align-items:center;gap:8px;padding:8px;border:1px solid #e2e8f0;border-radius:8px;margin-bottom:8px;">
        <input type="radio" name="default-address" ${Number(addr.macDinh) === 1 ? "checked" : ""} data-default-index="${index}" title="Đặt làm mặc định">
        <div style="flex:1;">
          <div>${escapeHtml(provinceName.get(String(addr.tinhThanh)) || addr.tinhThanh)}</div>
          <div style="font-size:12px;color:#64748b;">${escapeHtml(wardName.get(String(addr.phuongXa)) || addr.phuongXa)} - ${escapeHtml(addr.duong)}</div>
        </div>
        <button type="button" class="btn alt" data-edit-index="${index}">Sửa</button>
      </div>
    `).join("");

    addressList.querySelectorAll('input[name="default-address"]').forEach(input => {
      input.onchange = () => {
        const idx = Number(input.dataset.defaultIndex);
        addresses.forEach((a, i) => { a.macDinh = i === idx ? 1 : 0; });
        renderAddresses();
      };
    });
    addressList.querySelectorAll("[data-edit-index]").forEach(btn => {
      const idx = Number(btn.dataset.editIndex);
      btn.onclick = () => {
        showEditForm({
          title: "Sửa địa chỉ",
          fields: [
            { name: "tinhThanh", label: "Tỉnh/Thành phố", options: provinceOptions },
            { name: "phuongXa", label: "Phường/Xã", options: wardOptions, dependsOn: "tinhThanh", placeholder: "Chọn phường/xã" },
            { name: "duong", label: "Số nhà, tên đường" }
          ],
          initialValues: {
            tinhThanh: String(addresses[idx].tinhThanh),
            phuongXa: String(addresses[idx].phuongXa),
            duong: addresses[idx].duong || ""
          },
          onSubmit: data => {
            if (!data.tinhThanh || !data.phuongXa || !data.duong) throw new Error("Vui lòng nhập đầy đủ địa chỉ.");
            addresses[idx].tinhThanh = data.tinhThanh;
            addresses[idx].phuongXa = data.phuongXa;
            addresses[idx].duong = data.duong;
            renderAddresses();
          }
        });
      };
    });
  };

  renderAddresses();
  backdrop.querySelector("#add-address-btn").onclick = () => {
    showAddForm({
      title: "Thêm địa chỉ",
      fields: [
        { name: "tinhThanh", label: "Tỉnh/Thành phố", options: provinceOptions },
        { name: "phuongXa", label: "Phường/Xã", options: wardOptions, dependsOn: "tinhThanh", placeholder: "Chọn phường/xã" },
        { name: "duong", label: "Số nhà, tên đường" }
      ],
      onSubmit: data => {
        if (!data.tinhThanh || !data.phuongXa || !data.duong) throw new Error("Vui lòng nhập đầy đủ địa chỉ.");
        const hasDefault = addresses.some(a => Number(a.macDinh) === 1);
        addresses.push({
          id: null,
          tinhThanh: data.tinhThanh,
          phuongXa: data.phuongXa,
          duong: data.duong,
          macDinh: hasDefault ? 0 : 1
        });
        renderAddresses();
      }
    });
  };

  const close = () => backdrop.remove();
  backdrop.querySelector("[data-cancel]").onclick = close;
  backdrop.onclick = event => { if (event.target === backdrop) close(); };

  form.onsubmit = async event => {
    event.preventDefault();
    const submit = form.querySelector('button[type="submit"]');
    submit.disabled = true;
    try {
      const data = Object.fromEntries(new FormData(form));
      if (!isValidPhone(data.SDT)) throw new Error("Số điện thoại không hợp lệ.");
      if (data.email && !isValidEmail(data.email)) throw new Error("Email không hợp lệ.");
      await updateCustomer(customer.rawId, { hoTen: data.hoTen, SDT: data.SDT, email: data.email });
      if (addresses.length === 0) throw new Error("Vui lòng thêm ít nhất một địa chỉ.");
      if (!addresses.some(a => Number(a.macDinh) === 1)) addresses[0].macDinh = 1;

      await deactivateDefaultAddresses(customer.rawId);
      for (const addr of addresses) {
        if (addr.id) {
          await updateCustomerAddress(addr.id, {
            tinhThanh: addr.tinhThanh,
            phuongXa: addr.phuongXa,
            duong: addr.duong,
            macDinh: addr.macDinh
          });
        } else {
          await createCustomerAddress(customer.rawId, {
            tinhThanh: addr.tinhThanh,
            phuongXa: addr.phuongXa,
            duong: addr.duong,
            macDinh: addr.macDinh
          });
        }
      }


      close();
      document.dispatchEvent(new CustomEvent("data-updated"));
      showAlertModal("Đã cập nhật dữ liệu thành công.", "success");
    } catch (error) {
      submit.disabled = false;
      console.error("Không thể cập nhật khách hàng:", error);
      showAlertModal(`Không thể cập nhật dữ liệu: ${error.message}`, "error");
    }
  };
}

export async function toggleCustomerLock(customer) {
  const locked = customer.trangThai === 0;
  const ok = await showConfirmModal(locked ? "Mở khóa khách hàng này?" : "Khóa khách hàng này?");
  if (!ok) return;
  try {
    await updateCustomerStatus(customer.rawId, locked ? 1 : 0);
    document.dispatchEvent(new CustomEvent("data-updated"));
    showAlertModal(locked ? "Đã mở khóa khách hàng." : "Đã khóa khách hàng.", "success");
  } catch (error) {
    showAlertModal(`Không thể cập nhật trạng thái: ${error.message}`, "error");
  }
}


