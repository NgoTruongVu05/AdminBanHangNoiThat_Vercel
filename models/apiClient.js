export async function fetchTables(tableNames, options = {}) {
  const query = encodeURIComponent(tableNames.join(","));
  const accountType = options.accountType ? `&accountType=${encodeURIComponent(options.accountType)}` : "";
  const response = await fetch(`/api/data?tables=${query}${accountType}`);
  if (!response.ok) throw new Error(`API trả về ${response.status}`);

  const payload = await response.json();
  if (payload.failures?.length) {
    console.warn("Một số bảng Supabase không tải được:", payload.failures);
  }
  return payload.data || payload;
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
  return payload.data;
}
