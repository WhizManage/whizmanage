// src/components/table/store/useUserRolesStore.js
import { create } from "zustand";
import { getApi } from "@/services/services";

/**
 * Store לשמירת תפקידי משתמש עם תרגומים
 * נטען פעם אחת ומשמש בכל הקומפוננטות
 */
export const useUserRolesStore = create((set, get) => ({
    // Promise guard למניעת טעינות כפולות
    _bootPromise: null,

    // State
    isLoaded: false,
    isLoading: false,
    roles: [], // [{id: 'administrator', name: 'מנהל'}, ...]

    /**
     * טעינת תפקידי משתמש פעם אחת
     * מחזיר Promise שמסתיים כשהנתונים נטענו
     */
    loadRolesOnce: async () => {
        const state = get();
        if (state.isLoaded) return;
        if (state._bootPromise) return state._bootPromise;

        const boot = (async () => {
            set({ isLoading: true });

            try {
                const siteUrl = window.siteUrl || "";
                const res = await getApi(`${siteUrl}/wp-json/whizmanage/v1/user-roles`);
                const roles = Array.isArray(res?.data) ? res.data : [];

                set({
                    roles,
                    isLoaded: true,
                    isLoading: false,
                });
            } catch (error) {
                console.error("❌ Failed to load user roles:", error);
                // Fallback לרשימה בסיסית במקרה של שגיאה
                set({
                    roles: [
                        { id: "administrator", name: "Administrator" },
                        { id: "shop_manager", name: "Shop Manager" },
                        { id: "whizmanage_user", name: "WhizManage User" },
                        { id: "customer", name: "Customer" },
                        { id: "subscriber", name: "Subscriber" },
                        { id: "editor", name: "Editor" },
                        { id: "author", name: "Author" },
                        { id: "contributor", name: "Contributor" },
                    ],
                    isLoaded: true,
                    isLoading: false,
                });
            }
        })().finally(() => set({ _bootPromise: null }));

        set({ _bootPromise: boot });
        return boot;
    },

    /**
     * קבלת שם מתורגם של תפקיד לפי slug
     * @param {string} slug - ה-ID של התפקיד (למשל 'administrator')
     * @returns {string} - השם המתורגם או ה-slug אם לא נמצא
     */
    getRoleName: (slug) => {
        const { roles } = get();
        const found = roles.find((r) => r.id === slug);
        return found?.name || slug;
    },

    /**
     * קבלת תפקיד מלא לפי slug
     * @param {string} slug - ה-ID של התפקיד
     * @returns {object|null} - אובייקט התפקיד או null
     */
    getRole: (slug) => {
        const { roles } = get();
        return roles.find((r) => r.id === slug) || null;
    },

    /**
     * טעינה מחדש של התפקידים
     */
    reload: async () => {
        set({
            _bootPromise: null,
            isLoaded: false,
            isLoading: false,
            roles: [],
        });
        await get().loadRolesOnce();
    },
}));

export default useUserRolesStore;
