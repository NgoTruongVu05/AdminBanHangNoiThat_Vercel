import { bindSearch, money } from "./shared.js";

export function initProducts(query, rerender, data) {
  const products = data.products;
  const rows = products.filter(product => `${product.id} ${product.name} ${product.wood}`.toLowerCase().includes(query.toLowerCase()));
  document.querySelector("#products-body").innerHTML = rows.map(product => `
    <tr>
      <td class="code">${product.id}</td>
      <td><b>${product.name}</b><div class="sub">${product.detail}</div></td>
      <td>${product.category}</td><td>${product.wood}</td>
      <td class="money">${money(product.price)}</td>
      <td class="${product.stock <= 3 ? "tag warn" : ""}">${product.stock}</td>
      <td><span class="tag ${product.status.includes("Tạm") ? "warn" : ""}">${product.status}</span></td>
      <td class="actions"><button>♢</button><button data-delete="${product.id}">♧</button></td>
    </tr>`).join("");
  document.querySelector("#products-count").textContent = `${rows.length} / ${products.length}`;
  bindSearch(rerender, query);
  document.querySelectorAll("[data-delete]").forEach(button => button.onclick = () => {
    if (confirm("Xóa sản phẩm này khỏi danh sách tạm?")) button.closest("tr").remove();
  });
}
