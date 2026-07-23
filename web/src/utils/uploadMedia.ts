// Vendor/admin formlarından media (şəkil/video) yükləməsi üçün ortaq helper.
// Fayllar base64 kimi DB-yə yazılMIR — POST /api/upload endpoint-inə göndərilir
// (server onları S3-uyğun storage-a və ya dev-də public/uploads/ diskinə yazır)
// və formda yalnız qaytarılan URL saxlanılır.

// Brauzer API ilə HƏMİŞƏ nisbi /api/* URL-ləri üzərindən danışır — Next-in rewrite-i
// (next.config.ts) onları Express origin-inə ötürür (clientFetch ilə eyni konvensiya).
// NEXT_PUBLIC_API_BASE_URL burada istifadə OLUNMUR: brauzerdən birbaşa Express-ə
// cross-origin POST CORS preflight-a düşür və Express-də CORS olmadığı üçün yükləmə
// ERR_FAILED ilə sınırdı (vendor formada "şəkil əlavə olunmur" bagı).

// /api/upload authenticateUser tələb edir. Token AuthProvider-in persist etdiyi sessiya
// açarlarından oxunur (VENDOR_SESSION_KEY / ADMIN_SESSION_KEY ilə eyni format) —
// upload edən komponentlərin heç biri tokeni prop kimi almır, ona görə buradan oxuyuruq.
function getOperatorToken(): string | null {
  for (const key of ['gotabiat_vendor_session', 'gotabiat_admin_session']) {
    try {
      const raw = window.localStorage.getItem(key);
      if (!raw) continue;
      const parsed = JSON.parse(raw);
      if (parsed?.token) return parsed.token as string;
    } catch {
      // pozulmuş sessiya girişi — növbəti açarı yoxla
    }
  }
  return null;
}

export interface UploadedMedia {
  urls: string[];
  images: string[];
  videos: string[];
}

// Faylları yükləyir; xəta halında istifadəçiyə göstərilə bilən mesajla throw edir.
export async function uploadMediaFiles(files: File[] | FileList): Promise<UploadedMedia> {
  const list = Array.from(files);
  if (list.length === 0) return { urls: [], images: [], videos: [] };

  const formData = new FormData();
  list.forEach(file => formData.append('files', file));

  const token = getOperatorToken();
  const res = await fetch('/api/upload', {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    body: formData,
  });

  let data: any = null;
  try { data = await res.json(); } catch { /* HTML error page və s. */ }

  if (!res.ok || !data?.success) {
    throw new Error(data?.error || `Fayl yüklənmədi (HTTP ${res.status}).`);
  }
  return {
    urls: data.urls || [],
    images: data.images || [],
    videos: data.videos || [],
  };
}

// Tək şəkil yükləyən qısayol (profil loqosu, bələdçi avatarı, gün-plan şəkli və s.).
export async function uploadSingleImage(file: File): Promise<string> {
  const { images } = await uploadMediaFiles([file]);
  if (!images[0]) throw new Error('Şəkil yüklənmədi.');
  return images[0];
}
