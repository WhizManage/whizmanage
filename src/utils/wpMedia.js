// ============================
// File: src/utils/wpMedia.js (unchanged functionality)
// ============================
import { postApi } from '@/services/services';

export async function uploadWpMedia(file) {
  const formData = new FormData();
  formData.append('file', file);
  const res = await postApi(`${window.siteUrl}/wp-json/wp/v2/media`, formData);
  if (!res?.data?.source_url) {
    throw new Error('Upload failed - no source_url returned');
  }
  return res.data; // { id, source_url, mime_type, ... }
}

