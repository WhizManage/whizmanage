// src/utils/mediaUtils.js
const lookupMedia = (id) => {
  const found = window?.mediaIndex?.[id];
  if (!found) return null;
  const src = found.src || found.url || found.source_url;
  return src ? { id, src } : { id };
};

export const ensureMedia = (item) => {
  if (!item) return null;

  if (typeof item === "string") {
    // URL מלא
    if (/^https?:/i.test(item)) return { id: undefined, src: item };
    // id מחרוזת/מספר
    const id = Number(item);
    return Number.isNaN(id) ? null : lookupMedia(id) || { id };
  }

  if (typeof item === "number") return lookupMedia(item) || { id: item };

  if (typeof item === "object") {
    const id =
      item.id ?? item.attachment_id ?? (typeof item.value === "number" ? item.value : undefined);
    const src = item.src || item.url || item.source_url;
    if (src) return { ...(id != null ? { id } : {}), src };
    return id != null ? lookupMedia(id) || { id } : null;
  }

  return null;
};

export const ensureMediaArray = (raw) =>
  (Array.isArray(raw) ? raw : (raw ? [raw] : []))
    .map(ensureMedia)
    .filter(Boolean);

export const getSrc = (val) => {
  // מקבל string | number | {id,src|url|source_url} ומשיב תמיד URL או "".
  const one = Array.isArray(val) ? val[0] : val;
  const o = ensureMedia(one);
  return o?.src || "";
};

export const serializeMetaValue = (val) => {
  if (Array.isArray(val)) {
    return val.map((v) => (typeof v === "object" ? (v.id ?? JSON.stringify(v)) : v));
  }
  if (val && typeof val === "object") return val.id ?? JSON.stringify(val);
  return val;
};
