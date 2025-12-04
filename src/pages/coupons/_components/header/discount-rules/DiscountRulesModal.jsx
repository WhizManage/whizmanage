// ./discount-rules/DiscountRulesModal.jsx
import { useEffect, useState } from "react";
import { Button } from "@components/ui/button";
import { Input } from "@components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@components/ui/dialog";
import { PlusCircle, Pencil, Trash2, Info } from "lucide-react";
import RuleForm from "./RuleForm";
import { getApi, postApi } from "@/services/services";

export default function DiscountRulesModal({ onClose }) {
    const [rules, setRules] = useState([]);
    const [q, setQ] = useState("");
    const [loading, setLoading] = useState(false);
    const [editingRule, setEditingRule] = useState(null); // null=list, true=create, object=edit

    const fetchRules = async () => {
        setLoading(true);
        try {
            // בעתיד זה יקרא ל-REST; כרגע אפשר להשאיר ריק או דמי
            const res = await getApi?.(`${window.siteUrl}/wp-json/whizmanage/v1/discount-rules?q=${encodeURIComponent(q)}`).catch(() => null);
            setRules(res?.data?.items || []);
        } finally { setLoading(false); }
    };
    useEffect(() => { fetchRules(); }, []);

    const delRule = async (id) => {
        if (!window.confirm("למחוק חוק זה?")) return;
        await postApi?.(`${window.siteUrl}/wp-json/whizmanage/v1/discount-rule/${id}`, {}, "DELETE").catch(() => null);
        fetchRules();
    };

    return (
        <Dialog open onOpenChange={onClose}>
            <DialogContent className="max-w-5xl">
                <DialogHeader>
                    <DialogTitle>חוקי הנחות</DialogTitle>
                    <div className="text-sm text-muted-foreground mt-1 flex items-start gap-2">
                        <Info className="w-4 h-4 mt-0.5" />
                        <p>נהל כאן חוקים: צור חדש, ערוך, מחק. כל חוק מוגדר בסקשנים: כללי, סינון, פרטי הנחה, תנאים, תוקף/עדיפות.</p>
                    </div>
                </DialogHeader>

                {editingRule ? (
                    <RuleForm
                        initial={editingRule === true ? null : editingRule}
                        onCancel={() => setEditingRule(null)}
                        onSaved={() => { setEditingRule(null); fetchRules(); }}
                    />
                ) : (
                    <>
                        <div className="flex gap-2 items-center mb-3">
                            <div className="flex items-center gap-2">
                                <label className="text-sm text-muted-foreground">חיפוש</label>
                                <Input placeholder="שם חוק, סוג חוק…" value={q} onChange={(e) => setQ(e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && fetchRules()} className="w-64" />
                                <Button variant="outline" onClick={fetchRules}>חפש</Button>
                            </div>
                            <Button className="ml-auto flex gap-2" onClick={() => setEditingRule(true)}>
                                <PlusCircle className="size-4" /> חוק חדש
                            </Button>
                        </div>

                        <div className="border rounded-lg overflow-hidden">
                            <table className="w-full text-sm">
                                <thead className="bg-muted">
                                    <tr>
                                        <th className="p-2 text-left">שם חוק</th>
                                        <th className="p-2">סוג</th>
                                        <th className="p-2">פעיל</th>
                                        <th className="p-2">עדיפות</th>
                                        <th className="p-2">תוקף</th>
                                        <th className="p-2">פעולות</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {loading ? (
                                        <tr><td colSpan={6} className="p-4">טוען…</td></tr>
                                    ) : rules.length === 0 ? (
                                        <tr><td colSpan={6} className="p-4">אין חוקים עדיין</td></tr>
                                    ) : rules.map(r => (
                                        <tr key={r.id} className="border-t">
                                            <td className="p-2 text-left">{r.title}</td>
                                            <td className="p-2 text-center">{r.discount_type}</td>
                                            <td className="p-2 text-center">{+r.enabled ? "כן" : "לא"}</td>
                                            <td className="p-2 text-center">{r.priority ?? ""}</td>
                                            <td className="p-2 text-center">
                                                {(r.date_from || r.date_to) ? `${r.date_from || "∞"} → ${r.date_to || "∞"}` : "תמיד"}
                                            </td>
                                            <td className="p-2 flex gap-2 justify-center">
                                                <Button size="sm" variant="outline" onClick={() => setEditingRule(r)} title="עריכה"><Pencil className="size-4" /></Button>
                                                <Button size="sm" variant="outline" onClick={() => delRule(r.id)} title="מחיקה"><Trash2 className="size-4" /></Button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </>
                )}

                {!editingRule && (
                    <DialogFooter><Button variant="outline" onClick={onClose}>סגור</Button></DialogFooter>
                )}
            </DialogContent>
        </Dialog>
    );
}
