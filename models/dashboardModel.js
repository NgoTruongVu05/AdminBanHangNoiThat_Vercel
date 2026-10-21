import { getOrders } from "./ordersModel.js";
import { getProducts } from "./productsModel.js";
import { getWoods } from "./woodsModel.js";

export async function getDashboardData() {
  const [products, woods, orders] = await Promise.all([
    getProducts(),
    getWoods(),
    getOrders()
  ]);
  return { products, woods, orders };
}
