import { bindDomSearch, rowActions, escapeHtml, showAddForm, showEditForm, showConfirmModal, showAlertModal } from "./shared.js";
import { getWoods, createWood, updateWood, updateWoodStatus } from "../models/woodsModel.js";

export function openAddWood() {
  showAddForm({
    title: "Thêm loại gỗ",
    fields: [{ name: "tenGo", label: "Tên loại gỗ" }],
    onSubmit: data => createWood({ tenGo: data.tenGo, trangThai: 1 })
  });
}

export async function openEditWood(wood) {
  showEditForm({
    title: "Cập nhật loại gỗ",
    fields: [{ name: "tenGo", label: "Tên loại gỗ" }],
    initialValues: { tenGo: wood.name },
    onSubmit: data => {
      if (!String(data.tenGo || "").trim()) throw new Error("Tên loại gỗ không được để trống.");
      return updateWood(wood.rawId, { tenGo: data.tenGo });
    }
  });
}

export async function initWoods(query, onQueryChange) {
  const woods = await getWoods();
  const woodData = woods.map(item => ({ code: item.id, name: item.name, count: item.count, status: item.status, trangThai: item.trangThai }));
  const woodFields = { count: "Số sản phẩm" };
  document.querySelector("#woods-body").innerHTML = woods.map((item, index) => `<tr data-row-index="${index}" data-search="${escapeHtml(`${item.id} ${item.name}`.toLowerCase())}"><td class="code">${item.id}</td><td><b>${item.name}</b></td>
    <td><span class="tag">${item.count} sản phẩm</span></td>
    <td><span class="tag ${item.trangThai === 0 ? "locked" : "green"}">${escapeHtml(item.status)}</span></td>
    <td class="actions">${rowActions(false, "", `data-edit="${item.rawId}"`, true, `data-lock="${item.rawId}"`, item.trangThai === 0)}</td></tr>`).join("");
  const woodFilter = document.querySelector("#wood-filter");
if (woodFilter) {
  const current = woodFilter.value;
  const values = ["Đã khóa", "Đang sử dụng"];
  woodFilter.innerHTML = `<option value="">Tất cả trạng thái</option>` + values.map(value => `<option value="${escapeHtml(value)}">${escapeHtml(value)}</option>`).join("");
  if ([...woodFilter.options].some(option => option.value === current)) woodFilter.value = current;
  else woodFilter.value = "";
}
bindDomSearch({ initialQuery: query, rowSelector: "#woods-body tr", onQueryChange, fields: woodFields, defaultKeys: ["code", "name"], getFieldValue: (index, field) => woodData[index]?.[field], sideFilters: [{ selector: "#wood-filter", getValue: (row, rowIndex) => woodData[rowIndex]?.status }] });

  document.querySelectorAll("[data-edit]").forEach(button => {
    button.onclick = () => {
      const id = button.dataset.edit;
      const wood = woods.find(item => String(item.rawId) === String(id));
      if (wood) openEditWood(wood).catch(error => showAlertModal(`Không thể mở biểu mẫu: ${error.message}`, "error"));
    };
  });
  document.querySelectorAll("[data-lock]").forEach(button => {
    button.onclick = async () => {
      const id = Number(button.dataset.lock);
      const wood = woods.find(item => Number(item.rawId) === id);
      if (!wood) return;
      const locked = wood.trangThai === 0;
      const ok = await showConfirmModal(locked ? "Mở khóa loại gỗ này?" : "Khóa loại gỗ này?");
      if (!ok) return;
      try {
        await updateWoodStatus(id, locked ? 1 : 0);
        document.dispatchEvent(new CustomEvent("data-updated"));
        showAlertModal(locked ? "Đã mở khóa loại gỗ." : "Đã khóa loại gỗ.", "success");
      } catch (error) {
        showAlertModal(`Không thể cập nhật trạng thái: ${error.message}`, "error");
      }
    };
  });
}
