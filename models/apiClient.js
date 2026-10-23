export async function fetchTables(tableNames) {
  const query = encodeURIComponent(tableNames.join(","));
  const response = await fetch(`/api/data?tables=${query}`);
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
  if (!response.ok) throw new Error(payload.error || `API trả về ${response.status}`);
  return payload.data;
}
