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
