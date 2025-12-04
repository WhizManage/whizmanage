import { useEffect, useMemo, useState } from "react";
import { Button } from "@components/ui/button";
import { Plus, Trash2, X, Settings2 } from "lucide-react";
import { __ } from '@wordpress/i18n';
import { IconBadge } from "@components/IconBadge";

export default function CustomFieldsInput({
    updateValue,
}) {
    const [keyInput, setKeyInput] = useState("");
    const [valInput, setValInput] = useState("");
    const [rows, setRows] = useState([]);
     

    // עדכון ההורה בכל שינוי
    useEffect(() => {
        updateValue("custom_fields", rows);
    }, [rows]); // eslint-disable-line react-hooks/exhaustive-deps

    const canAdd = useMemo(
        () => keyInput.trim() !== "" && valInput.trim() !== "",
        [keyInput, valInput]
    );

    const addRow = () => {
        if (!canAdd) return;
        setRows((prev) => [...prev, { key: keyInput.trim(), value: valInput }]);
        setKeyInput("");
        setValInput("");
    };

    const removeRow = (idx) =>
        setRows((prev) => prev.filter((_, i) => i !== idx));

    const clearAll = () => setRows([]);

    return (
        <div className="border rounded-2xl p-4 dark:border-slate-700">
            <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-x-2">
                    <IconBadge icon={Settings2} />
                    <h3 className="text-xl dark:text-gray-400">{__("Custom Fields", "whizmanage")}</h3>
                </div>
                {rows.length > 0 && (
                    <Button variant="outline" type="button" onClick={clearAll} className="h-8 gap-2">
                        <X className="w-4 h-4" /> Clear
                    </Button>
                )}
            </div>
            {/* שורת קלט */}
            <div className="grid grid-cols-1 md:[grid-template-columns:5fr_6fr_auto] gap-2 items-end isolate">
                <input
                    className="w-full min-w-0 rounded-md border px-3 py-2 dark:bg-slate-800 dark:border-slate-700"
                    placeholder="Key (e.g. customer_note)"
                    value={keyInput}
                    onChange={(e) => setKeyInput(e.target.value)}
                />

                <input
                    className="w-full min-w-0 rounded-md border px-3 py-2 dark:bg-slate-800 dark:border-slate-700"
                    placeholder="Value"
                    value={valInput}
                    onChange={(e) => setValInput(e.target.value)}
                />

                <div className="justify-self-end shrink-0">
                    <Button
                        type="button"
                        onClick={addRow}
                        disabled={!canAdd}
                        className="h-10 gap-2 w-full md:w-auto whitespace-nowrap relative z-0"
                    >
                        <Plus className="w-4 h-4" />
                        {__("Add", "whizmanage")}
                    </Button>
                </div>
            </div>
            {/* רשימה */}
            {rows.length > 0 && (
                <div className="mt-4">
                    <ul className="divide-y dark:divide-slate-800 rounded-lg border dark:border-slate-800">
                        {rows.map((r, idx) => (
                            <li key={`${r.key}-${idx}`} className="flex items-center justify-between p-3">
                                <div className="min-w-0">
                                    <p className="text-sm font-medium truncate">{r.key}</p>
                                    <p className="text-sm text-gray-600 dark:text-gray-400 break-words">{r.value}</p>
                                </div>
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => removeRow(idx)}
                                    className="h-8"
                                >
                                    <Trash2 className="w-4 h-4" />
                                </Button>
                            </li>
                        ))}
                    </ul>
                </div>
            )}
        </div>
    );
}
