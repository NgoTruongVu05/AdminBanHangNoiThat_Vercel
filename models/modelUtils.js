export const field = (row, name) => row[name] ?? row[name.toLowerCase()];
export const date = value => value ? String(value).slice(0, 10) : "";
export const moneyText = value => value == null ? "" : new Intl.NumberFormat("vi-VN").format(value) + " ₫";
