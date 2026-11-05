import { cached, invalidate } from "./modelUtils.js";

const tableCacheKeys = new Map();

export async function fetchTables(tableNames, options = {}) {
  const normalizedTables = [...new Set(tableNames.map(name => String(name).toUpperCase()))].sort();
  const accountType = options.accountType ? String(options.accountType).toUpperCase() : "";
  const cacheKey = `tables:${normalizedTables.join(",")}:${accountType}`;
  tableCacheKeys.set(cacheKey, normalizedTables);
  return cached(cacheKey, async () => {
    const query = encodeURIComponent(normalizedTables.join(","));
    const accountQuery = accountType ? `&accountType=${encodeURIComponent(accountType)}` : "";
    const response = await fetch(`/api/data?tables=${query}${accountQuery}`);
    if (!response.ok) throw new Error(`API trả về ${response.status}`);

    const payload = await response.json();
    if (payload.failures?.length) {
      console.warn("Một số bảng Supabase không tải được:", payload.failures);
    }
    return payload.data || payload;
  });
}

export function clearTableCache(changedTables = null) {
  const changed = changedTables && new Set(changedTables.map(name => String(name).toUpperCase()));
  tableCacheKeys.forEach((tables, cacheKey) => {
    if (!changed || tables.some(table => changed.has(table))) invalidate(cacheKey);
  });
}

function invalidateChangedTable(table) {
  clearTableCache([table]);
}

export async function insertRecord(table, record) {
  const databaseRecord = Object.fromEntries(
    Object.entries(record).map(([name, value]) => [name.toLowerCase(), value])
  );
  const response = await fetch("/api/data", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ table, record: databaseRecord })
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.detail ? `${payload.error || `API trả về ${response.status}`} (${payload.detail})` : (payload.error || `API trả về ${response.status}`));
  invalidateChangedTable(table);
  return payload.data;
}

export async function updateRecord(table, match, record) {
  const databaseRecord = Object.fromEntries(
    Object.entries(record).map(([name, value]) => [name.toLowerCase(), value])
  );
  const databaseMatch = Object.fromEntries(
    Object.entries(match || {}).map(([name, value]) => [name.toLowerCase(), value])
  );
  const response = await fetch("/api/data", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ table, record: databaseRecord, match: databaseMatch })
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.detail ? `${payload.error || `API trả về ${response.status}`} (${payload.detail})` : (payload.error || `API trả về ${response.status}`));
  invalidateChangedTable(table);
  return payload.data;
}

export async function deleteRecord(table, match) {
  const databaseMatch = Object.fromEntries(
    Object.entries(match || {}).map(([name, value]) => [name.toLowerCase(), value])
  );
  const response = await fetch("/api/data", {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ table, match: databaseMatch })
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.detail ? `${payload.error || `API trả về ${response.status}`} (${payload.detail})` : (payload.error || `API trả về ${response.status}`));
  invalidateChangedTable(table);
  return payload.data;
}
