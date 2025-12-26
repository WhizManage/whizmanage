// src/utils/historyLogger.js
import { postApi } from "@/services/services";

// מיפוי פעולה פנימית → payload לשרת
function toHistoryPayload(action, ctx = {}) {
    // ctx: { location }
    const location = ctx.location || "table";

    // ברירת־מחדל לפעולה
    let actionType = "put";

    // אפשר להרחיב אם תוסיף add/delete/duplicate ל-addToHistory שלך
    if (action.type === "update") actionType = "put";
    if (action.type === "config") actionType = "put";

    // נבנה items עם old/new כמצופה ב־UI שלך
    if (action.type === "update") {
        return {
            location,
            action: actionType,
            items: [
                {
                    id: action.id,
                    old: action.previousValues || {},
                    new: action.newValues || {},
                    name: action.rowData?.name ?? undefined,
                    __meta: {
                        kind: "row-update",
                        field: action.field,
                        ts: action.timestamp || Date.now(),
                    },
                },
            ],
        };
    }

    if (action.type === "config") {
        return {
            location,
            action: actionType,
            items: [
                {
                    id: `config:${action.field}`,
                    old: action.previousValues || {},
                    new: action.newValues || {},
                    name: `Config change: ${action.field}`,
                    __meta: {
                        kind: "config",
                        field: action.field,
                        ts: action.timestamp || Date.now(),
                    },
                },
            ],
        };
    }

    // פולבק — עדיין יתועד כהחלפה
    return {
        location,
        action: actionType,
        items: [
            {
                id: "unknown",
                old: {},
                new: {},
                __meta: { kind: "unknown", ts: Date.now() },
            },
        ],
    };
}

export async function logHistoryImmediate(action, ctx = {}) {
    // שולח פריט יחיד ומחזיר מזהה היסטוריה מהשרת (id)
    const payload = toHistoryPayload(action, ctx);
    const res = await postApi(`${window.siteUrl}/wp-json/whizmanage/v1/history`, payload);
    return res?.id ?? res?.data?.id ?? null;
}

export async function deleteHistory(ids = []) {
    if (!ids?.length) return;
    const payload = { ids: ids.map(n => Number(n)).filter(Boolean) };
    try {
        const res = await postApi(`${window.siteUrl}/wp-json/whizmanage/v1/history/delete`, payload);
        return res;
    } catch (e) {
        console.error("deleteHistory request failed", e, "payload:", payload);
        throw e;
    }
}