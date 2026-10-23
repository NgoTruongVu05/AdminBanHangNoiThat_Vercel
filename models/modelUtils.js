export const field = (row, name) => row[name] ?? row[name.toLowerCase()];
export const date = value => value ? String(value).slice(0, 10) : "";
export const moneyText = value => value == null ? "" : new Intl.NumberFormat("vi-VN").format(value) + " ₫";

const cache = new Map();

export function cached(key, load) {
  if (!cache.has(key)) {
    const promise = Promise.resolve().then(load);
    cache.set(key, promise.catch(error => {
      cache.delete(key);
      throw error;
    }));
  }
  return cache.get(key);
}

export const invalidate = key => cache.delete(key);
