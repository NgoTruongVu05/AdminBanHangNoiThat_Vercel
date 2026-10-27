export async function uploadImage(file, bucket = "NoiThatGo_hinhAnh") {
  if (!(file instanceof File) || file.size === 0) return null;

  if (file.type && !file.type.startsWith("image/")) {
    throw new Error("Tệp được chọn không phải là hình ảnh.");
  }

  const MAX_IMAGE_SIZE = 1 * 1024 * 1024;
  if (file.size > MAX_IMAGE_SIZE) {
    throw new Error("Ảnh vượt quá 1MB. Vui lòng chọn ảnh nhỏ hơn.");
  }

  if (!file.name || !String(file.name).trim()) {
    throw new Error("Tên tệp ảnh không hợp lệ. Vui lòng đổi tên file và thử lại.");
  }

  const base64 = await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = String(reader.result || "");
      const comma = result.indexOf(",");
      resolve(comma >= 0 ? result.slice(comma + 1) : result);
    };
    reader.onerror = () => reject(reader.error || new Error("Không thể đọc tệp ảnh."));
    reader.readAsDataURL(file);
  });

  const response = await fetch("/api/upload", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      bucket,
      fileName: file.name,
      contentType: file.type || "application/octet-stream",
      data: base64
    })
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const detail = payload.detail ? ` (${payload.detail})` : "";
    throw new Error((payload.error || `Upload ảnh thất bại (${response.status}).`) + detail);
  }
  return payload.url || null;
}
export async function deleteImage(imageUrlOrPath, bucket = "NoiThatGo_hinhAnh") {
  const value = String(imageUrlOrPath || "").trim();
  if (!value) return false;

  const response = await fetch("/api/delete", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ bucket, url: value })
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(payload.error || `Xóa ảnh thất bại (${response.status}).`);
  }
  return true;
}
