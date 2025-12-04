import { useState } from "react";
import { AccordionItem } from "@heroui/react";
import { __ } from "@wordpress/i18n";

export function HistoryItem({ item, isRTL, onRestore, onDelete, t }) {
  const [isOpen, setIsOpen] = useState(false);

  const getActionVerb = (action) => {
    switch (action) {
      case "add": return __("Added", "whizmanage");
      case "put": return __("Updated", "whizmanage");
      case "delete": return __("Deleted", "whizmanage");
      case "duplicate": return __("Duplicated", "whizmanage");
      default: return __("Performed", "whizmanage");
    }
  };

  const formatTitle = () => {
    const verb = getActionVerb(item.action);
    const location = item.location || __("items", "whizmanage");
    const count = Array.isArray(item.items) ? item.items.length : 0;
    return `${verb} ${count} ${location}`;
  };

  // יוצא מנקודת הנחה שהשינויים נמצאים ב item.items[].old מול הפריטים הנוכחיים (item.items[])
  // ניצור טבלה שמראה את השינויים רק למקרים שבהם action === "put"
  const renderChangesTable = () => {
    if (item.action !== "put") return null;

    // נניח שכל פריט ב items מכיל שדות עם old: {...}
    return (
      <table className="w-full text-sm border-collapse border border-gray-300">
        <thead>
          <tr className="bg-gray-100">
            <th className="border border-gray-300 px-2 py-1">{__("Field", "whizmanage")}</th>
            <th className="border border-gray-300 px-2 py-1">{__("Old Value", "whizmanage")}</th>
            <th className="border border-gray-300 px-2 py-1">{__("New Value", "whizmanage")}</th>
          </tr>
        </thead>
        <tbody>
          {item.items.map((itemChange, idx) => {
            // מוציאים את כל המפתחות ששונו - השוואה בין old לחדש
            const changes = Object.keys(itemChange.old || {}).filter(
              (key) => itemChange.old[key] !== itemChange[key]
            );

            return changes.map((field) => (
              <tr key={`${idx}-${field}`} className={idx % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                <td className="border border-gray-300 px-2 py-1">{field}</td>
                <td className="border border-gray-300 px-2 py-1">{String(itemChange.old[field])}</td>
                <td className="border border-gray-300 px-2 py-1">{String(itemChange[field])}</td>
              </tr>
            ));
          })}
        </tbody>
      </table>
    );
  };

  return (
    <AccordionItem
      key={item.id}
      aria-label={`Accordion - ${item.id}`}
      className={`border border-default-200 rounded-lg px-5 py-4 bg-background flex flex-col gap-2
        ${isOpen ? "bg-blue-50" : ""}
      `}
      onClick={() => setIsOpen(!isOpen)}
    >
      <div className={`flex justify-between items-center ${isRTL ? "text-right" : "text-left"}`}>
        <div className="flex flex-col flex-1">
          <div className="text-base font-medium text-foreground">{formatTitle()}</div>
          <div className="text-sm text-muted-foreground">
            {__("By", "whizmanage")}: {item.user} • {__("At", "whizmanage")}: {item.date}
          </div>
        </div>

        <div className={`flex gap-2 ${isRTL ? "order-first" : "order-last"}`}>
          <button
            className="btn btn-sm btn-outline"
            onClick={(e) => {
              e.stopPropagation();
              onRestore(item);
            }}
            aria-label={__("Restore", "whizmanage")}
            title={__("Restore", "whizmanage")}
          >
            <Undo2 className="w-4 h-4" />
          </button>
          <button
            className="btn btn-sm btn-outline"
            onClick={(e) => {
              e.stopPropagation();
              onDelete(item.id);
            }}
            aria-label={__("Delete", "whizmanage")}
            title={__("Delete", "whizmanage")}
          >
            <Trash className="w-4 h-4" />
          </button>
        </div>
      </div>
      {isOpen && (
        <div className="mt-3">
          {renderChangesTable()}
          {/* אם תרצה להוסיף עוד מידע פתוח כאן */}
        </div>
      )}
    </AccordionItem>
  );
}
