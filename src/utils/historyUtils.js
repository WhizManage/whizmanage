// --- הגדרות ---
const EXCLUDED_KEYS = new Set([
  "date_modified",
  "date_created",
  "date_modified_gmt",
  "date_created_gmt",
]);

const HTML_FIELDS = new Set(["description", "short_description"]);

// רמזים לשמות מפתח של תמונה בודדת
const IMAGE_KEY_HINTS = [
  "image",
  "thumbnail",
  "featured_image",
  "og:image",
  "opengraph-image",
  "yoast_wpseo_opengraph-image",
];

// רמזים לשמות מפתח של גלריה / מערך תמונות
const IMAGE_ARRAY_KEY_HINTS = [
  "images",
  "gallery",
  "product_gallery",
  "image_gallery",
  "product_images",
];

// שדות שבהם "" / null / "0" / 0 נחשבים אותו דבר
const EMPTY_EQ_ZERO_KEYS = new Set([
  "usage_limit",
  "usage_limit_per_user",
  "limit_usage_to_x_items",
]);

// שדות שבהם ""/null/undefined שקולים
const EMPTY_EQ_PATHS = new Set([
  "billing.email",
  // הוסף כאן עוד נתיבים אם צריך: "shipping.phone", ...
]);

// --------------------
// פונקציות עזר כלליות
// --------------------

function sanitizeArrayByPath(path, arr) {
  if (!Array.isArray(arr)) return arr;

  if (path === "line_items") {
    return arr.map((it) => {
      const x = { ...it };

      // מחיקה של price (שדה אפמרלי)
      delete x.price;

      // אם image ריק (null / {} / []), מחק אותו
      const img = x.image;
      const imageEmpty =
        img == null ||
        (Array.isArray(img) && img.length === 0) ||
        (typeof img === "object" && !Array.isArray(img) && Object.keys(img).length === 0);
      if (imageEmpty) delete x.image;

      return x;
    });
  }

  return arr;
}

function normalizeForCompareByPath(path, val) {
  // ""↔null↔undefined שקולים בשדה הזה
  if (EMPTY_EQ_PATHS.has(path)) {
    return val === "" || val === null || val === undefined ? null : val;
  }

  // אל תחשב price של פריטי שורה בכלל (שדה אפמרלי)
  if (/^line_items\.\d+\.price$/.test(path)) {
    return undefined;
  }

  // אם image ריק (null/{}/[]) – התעלם ממנו כדי שלא ייחשב שינוי
  if (/^line_items\.\d+\.image$/.test(path)) {
    const isEmpty =
      val == null ||
      (Array.isArray(val) && val.length === 0) ||
      (typeof val === "object" && !Array.isArray(val) && Object.keys(val).length === 0);
    return isEmpty ? undefined : val;
  }

  return val;
}

function normalizeForCompareByKey(key, val) {
  // for these keys: treat "", null, undefined, "0" as 0
  if (EMPTY_EQ_ZERO_KEYS.has(key)) {
    if (val === "" || val === null || val === undefined) return 0;
    if (val === "0") return 0;
  }
  return val;
}

function deepEqual(a, b) {
  if (a === b) return true;

  // ריק-לעומק: null/undefined/""/[], וגם [[[]]], וגם אובייקטים שריקים בכל העומק
  const isEmptyDeep = (val) => {
    if (val === null || val === undefined || val === "") return true;
    if (Array.isArray(val)) return val.every((x) => isEmptyDeep(x));
    if (typeof val === "object") {
      const keys = Object.keys(val || {});
      if (keys.length === 0) return true;
      return keys.every((k) => isEmptyDeep(val[k]));
    }
    return false;
  };

  if (isEmptyDeep(a) && isEmptyDeep(b)) return true;

  if (typeof a !== "object" || typeof b !== "object") return a === b;

  if (Array.isArray(a) && Array.isArray(b)) {
    // נרמול: הסר פריטים ריקים-לעומק לפני ההשוואה
    const aa = a.filter((x) => !isEmptyDeep(x));
    const bb = b.filter((x) => !isEmptyDeep(x));
    if (aa.length !== bb.length) return false;
    for (let i = 0; i < aa.length; i++) {
      if (!deepEqual(aa[i], bb[i])) return false;
    }
    return true;
  }

  if (Array.isArray(a) !== Array.isArray(b)) return false;

  try {
    return JSON.stringify(a) === JSON.stringify(b);
  } catch {
    return false;
  }
}

export function formatLabel(key = "") {
  if (!key) return "";
  const specials = {
    regular_price: "Regular Price",
    sale_price: "Sale Price",
    meta_data: "Meta Data",
    description: "Description",
    short_description: "Short Description",
    permalink: "Permalink",
    stock_status: "Stock Status",
  };
  if (specials[key]) return specials[key];

  const spaced = key
    .replace(/_/g, " ")
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .toLowerCase();

  return spaced.replace(/\b\w/g, (c) => c.toUpperCase());
}

export function formatScalar(val) {
  if (val === null || val === undefined) return "";
  if (typeof val === "string" || typeof val === "number" || typeof val === "boolean") {
    return String(val);
  }
  try {
    return JSON.stringify(val, null, 2);
  } catch {
    return String(val);
  }
}

// ---------- נרמול כתובות תמונה ----------
function normalizeImageUrl(url) {
  if (!url || typeof url !== "string") return null;
  let u = url.trim();
  try {
    // אם יחסי → הפוך למוחלט לפי siteUrl/Origin
    if (!/^https?:\/\//i.test(u) && !/^\/\//.test(u)) {
      const base = window.siteUrl || window.location.origin;
      u = new URL(u, base).href;
    } else {
      const parsed = new URL(u, window.location.href);

      // localhost/127.0.0.1 → החלף ל-host של האתר אם יש siteUrl
      const isLocalHost = ["localhost", "127.0.0.1"].includes(parsed.hostname);
      if (isLocalHost && window.siteUrl) {
        const base = new URL(window.siteUrl);
        parsed.protocol = base.protocol;
        parsed.host = base.host;
        u = parsed.href;
      }

      // מניעת mixed content: אם האתר ב-https והתמונה ב-http על אותו host → שדרג
      const pageHttps = window.location.protocol === "https:";
      if (pageHttps && parsed.protocol === "http:") {
        const sameHost =
          parsed.host === window.location.host ||
          (window.siteUrl && parsed.host === new URL(window.siteUrl).host);
        if (sameHost) {
          parsed.protocol = "https:";
          u = parsed.href;
        }
      }
    }
  } catch {
    // השאר כמו שהוא אם נכשל
  }
  return u;
}

// ---------- עזרי תמונה ----------
function isLikelyImageUrl(val) {
  if (!val || typeof val !== "string") return false;
  const str = val.trim().toLowerCase();
  return /\.(png|jpe?g|gif|webp|bmp|svg|avif)(\?.*)?$/.test(str);
}

function extractImageUrl(v) {
  if (!v) return null;
  if (typeof v === "string") return v;
  if (typeof v === "object") {
    return v.src || v.url || v.source_url || v.guid || null;
  }
  return null;
}

function keyHintsImage(key = "") {
  const k = String(key || "").toLowerCase();
  return IMAGE_KEY_HINTS.some((h) => k.includes(h));
}

function extractImageList(v) {
  let arr = Array.isArray(v) ? v : Array.isArray(v?.images) ? v.images : null;
  if (!arr) return [];
  const urls = [];
  for (const item of arr) {
    const url = extractImageUrl(item);
    if (url) urls.push(url);
  }
  return urls;
}

function keyHintsImageList(key = "") {
  const k = String(key || "").toLowerCase();
  return IMAGE_ARRAY_KEY_HINTS.some((h) => k.includes(h));
}

// --------------------
// שלב 1: איתור שינויים
// --------------------
export function getChangedFields(oldData, newData) {
  if (!oldData || !newData) return [];

  function compareNestedObject(oldObj = {}, newObj = {}, basePath = "") {
    const keys = new Set([...Object.keys(oldObj || {}), ...Object.keys(newObj || {})]);
    const oldPart = {};
    const newPart = {};

    for (const key of keys) {
      const path = basePath ? `${basePath}.${key}` : key;

      const ovRaw = oldObj?.[key];
      const nvRaw = newObj?.[key];

      const ov = normalizeForCompareByPath(path, normalizeForCompareByKey(key, ovRaw));
      const nv = normalizeForCompareByPath(path, normalizeForCompareByKey(key, nvRaw));

      // מערכים – לפני השוואה נעביר דרך sanitizeArrayByPath
      if (Array.isArray(ov) || Array.isArray(nv)) {
        const sov = sanitizeArrayByPath(path, Array.isArray(ov) ? ov : []);
        const snv = sanitizeArrayByPath(path, Array.isArray(nv) ? nv : []);
        if (!deepEqual(sov, snv)) {
          oldPart[key] = ovRaw;
          newPart[key] = nvRaw;
        }
        continue;
      }

      // אובייקטים – רקורסיה
      const ovIsObj = ov && typeof ov === "object" && !Array.isArray(ov);
      const nvIsObj = nv && typeof nv === "object" && !Array.isArray(nv);
      if (ovIsObj || nvIsObj) {
        const nested = compareNestedObject(ovIsObj ? ov : {}, nvIsObj ? nv : {}, path);
        if (nested) {
          const nestedOld = {};
          const nestedNew = {};
          for (const k of Object.keys(nested.new)) {
            nestedOld[k] = ovRaw?.[k];
            nestedNew[k] = nvRaw?.[k];
          }
          oldPart[key] = nestedOld;
          newPart[key] = nestedNew;
        }
        continue;
      }

      if (!deepEqual(ov, nv)) {
        oldPart[key] = ovRaw;
        newPart[key] = nvRaw;
      }
    }

    if (Object.keys(newPart).length === 0) return null;
    return { old: oldPart, new: newPart };
  }

  function compareObjects(oldObj = {}, newObj = {}) {
    const diffTop = compareNestedObject(oldObj, newObj, "");
    if (!diffTop) return null;

    return {
      id: newObj?.id ?? oldObj?.id,
      name: newObj?.name ?? oldObj?.name ?? null,
      old: diffTop.old,
      new: diffTop.new,
    };
  }

  if (Array.isArray(oldData) && Array.isArray(newData)) {
    const results = [];
    const map = new Map((newData || []).filter(i => i?.id != null).map(i => [i.id, i]));
    for (const oldItem of oldData || []) {
      if (oldItem?.id == null) continue;
      const changes = compareObjects(oldItem, map.get(oldItem.id) || {});
      if (changes) results.push(changes);
    }
    return results;
  }

  const changes = compareObjects(oldData, newData);
  return changes ? [changes] : [];
}

// --------------------
// שלב 2: עיבוד להצגה
// --------------------
export function diffMetaData(oldArr = [], newArr = []) {
  const toMap = (arr) => {
    const map = new Map();
    (arr || []).forEach((m) => {
      if (!m) return;
      const k = (m.key ?? m.id ?? "").toString();
      if (!k) return;
      map.set(k, m);
    });
    return map;
  };

  const oldMap = toMap(oldArr);
  const newMap = toMap(newArr);
  const allKeys = new Set([...oldMap.keys(), ...newMap.keys()]);
  const changes = [];

  const isEmpty = (val) =>
    val === null ||
    val === undefined ||
    val === "" ||
    (Array.isArray(val) && val.length === 0);

  for (const k of allKeys) {
    const o = oldMap.get(k);
    const n = newMap.get(k);

    let oldVal = o?.value;
    let newVal = n?.value;

    // דלג אם old ריק ו-new === 0
    if (isEmpty(oldVal) && (newVal === 0 || newVal === "0")) continue;

    // גלריה במטא
    const oldListRaw = extractImageList(oldVal);
    const newListRaw = extractImageList(newVal);
    const looksLikeImageList =
      keyHintsImageList(k) || (oldListRaw.length + newListRaw.length > 1);

    // תמונה בודדת
    const oldUrlRaw = extractImageUrl(oldVal);
    const newUrlRaw = extractImageUrl(newVal);
    const looksLikeImage =
      keyHintsImage(k) || isLikelyImageUrl(oldUrlRaw || "") || isLikelyImageUrl(newUrlRaw || "");

    if (!deepEqual(oldVal, newVal)) {
      if (looksLikeImageList) {
        const oldList = oldListRaw.map(normalizeImageUrl).filter(Boolean);
        const newList = newListRaw.map(normalizeImageUrl).filter(Boolean);
        if (oldList.length === 0 && newList.length === 0) continue;

        changes.push({
          key: k,
          label: formatLabel(k),
          old: oldVal,
          new: newVal,
          renderType: "image-list",
          oldList,
          newList,
        });
      } else {
        const oldUrl = looksLikeImage ? normalizeImageUrl(oldUrlRaw) : undefined;
        const newUrl = looksLikeImage ? normalizeImageUrl(newUrlRaw) : undefined;
        changes.push({
          key: k,
          label: formatLabel(k),
          old: oldVal,
          new: newVal,
          renderType: looksLikeImage ? "image" : "text",
          oldUrl,
          newUrl,
        });
      }
    }
  }
  return changes;
}

export function preprocessChange(change) {
  const rows = [];
  for (const key of Object.keys(change.new)) {
    if (EXCLUDED_KEYS.has(key)) continue;

    const oldVal = change.old[key];
    const newVal = change.new[key];

    if (key === "meta_data") {
      const metaChanges = diffMetaData(oldVal, newVal);
      if (metaChanges.length > 0) {
        rows.push({
          key,
          label: formatLabel(key),
          type: "meta",
          old: null,
          new: metaChanges, // איבר: text / image / image-list
        });
      }
      continue;
    }

    // גלריה בשדה רגיל
    const oldListRaw = extractImageList(oldVal);
    const newListRaw = extractImageList(newVal);
    const looksLikeImageList =
      keyHintsImageList(key) || (oldListRaw.length + newListRaw.length > 1);

    if (looksLikeImageList) {
      const oldList = oldListRaw.map(normalizeImageUrl).filter(Boolean);
      const newList = newListRaw.map(normalizeImageUrl).filter(Boolean);
      rows.push({
        key,
        label: formatLabel(key),
        type: "image-list",
        old: oldVal,
        new: newVal,
        oldList,
        newList,
      });
      continue;
    }

    // תמונה בודדת
    const oldUrlRaw = extractImageUrl(oldVal);
    const newUrlRaw = extractImageUrl(newVal);
    const looksLikeImage =
      keyHintsImage(key) || isLikelyImageUrl(oldUrlRaw || "") || isLikelyImageUrl(newUrlRaw || "");

    let type = "text";
    if (HTML_FIELDS.has(key)) type = "html";
    if (looksLikeImage) type = "image";

    rows.push({
      key,
      label: formatLabel(key),
      type,
      old: oldVal,
      new: newVal,
      oldUrl: looksLikeImage ? normalizeImageUrl(oldUrlRaw) : undefined,
      newUrl: looksLikeImage ? normalizeImageUrl(newUrlRaw) : undefined,
    });
  }
  return rows;
}

export function preprocessHistoryItems(items = []) {
  return (items || []).map((sub) => ({
    id: sub?.id,
    rows: preprocessChange(sub),
  }));
}
