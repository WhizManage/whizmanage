import { useEffect, useState } from "react";
import { Accordion, AccordionItem, Tooltip } from "@heroui/react";
import { Trash, Undo2 } from "lucide-react";
import { __ } from '@wordpress/i18n';
import { getApi, postApi, putApi } from "../../services/services";
import {
  Modal,
  ModalBody,
  ModalContent,
  ModalFooter,
  ModalHeader,
} from "@heroui/react";
import Button from "../../components/ui/button";
import { preprocessHistoryItems, formatScalar } from "../../utils/historyUtils";
// אופציונלי: npm i dompurify  ואז להפעיל בסניטציה
// import DOMPurify from "dompurify";

export function History({ isOpen, setIsOpen }) {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const isRTL = document.documentElement.dir === 'rtl';

  const fetchHistory = async () => {
    setLoading(true);
    try {
      const response = await getApi(
        `${window.siteUrl}/wp-json/whizmanage/v1/history`
      );
      setHistory(response.data.data || []);
    } catch (err) {
      console.error("Error fetching history", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) fetchHistory();
  }, [isOpen]);

  const restoreItem = async (obj) => {
    // עוזר: זיהוי וריאציה גם אם type לא נשלח
    const isVariation = (it) =>
      it?.type === "variation" || (typeof it?.parent_id === "number" && it.parent_id > 0);

    try {
      // optimistic UI
      setHistory((prev) => prev.filter((h) => h.id !== obj.id));

      const base = `${window.siteUrl}/wp-json/wc/v3`;

      if (obj.location === "products") {
        // 1) פיצול לפי סוג
        const productItems = [];
        const variationsByParent = new Map(); // parent_id -> items[]

        (obj.items || []).forEach((it) => {
          if (isVariation(it)) {
            const pid = Number(it.parent_id);
            if (!variationsByParent.has(pid)) variationsByParent.set(pid, []);
            variationsByParent.get(pid).push(it);
          } else {
            productItems.push(it);
          }
        });

        const jobs = [];

        // 2) מוצרים (simple/variable/…)
        if (productItems.length) {
          const url = `${base}/products/batch`;
          if (obj.action === "add" || obj.action === "duplicate") {
            jobs.push(postApi(url, { delete: productItems.map((i) => i.id) }));
          } else if (obj.action === "put") {
            jobs.push(
              putApi(url, {
                update: productItems.map((item) => ({ id: item.id, ...(item.old || {}) })),
              })
            );
          }
          // לשחזור "delete" (יצירה מחדש) – צריך payload ל-create מההיסטוריה
        }

        // 3) וריאציות לפי הורה
        variationsByParent.forEach((items, parentId) => {
          const vurl = `${base}/products/${parentId}/variations/batch`;
          if (obj.action === "add" || obj.action === "duplicate") {
            jobs.push(postApi(vurl, { delete: items.map((i) => i.id) }));
          } else if (obj.action === "put") {
            jobs.push(
              putApi(vurl, {
                update: items.map((item) => ({ id: item.id, ...(item.old || {}) })),
              })
            );
          }
        });

        if (jobs.length) await Promise.all(jobs);
      } else {
        // ברירת מחדל: כל שאר ה־locations עובדים כמו שהיה
        const url = `${base}/${obj.location}/batch`;
        if (obj.action === "add" || obj.action === "duplicate") {
          await postApi(url, { delete: obj.items.map((i) => i.id) });
        } else if (obj.action === "put") {
          await putApi(url, {
            update: obj.items.map((item) => ({ id: item.id, ...(item.old || {}) })),
          });
        }
      }

      // מחיקת רשומת ההיסטוריה אחרי הצלחה
      await postApi(`${window.siteUrl}/wp-json/whizmanage/v1/history/delete`, {
        ids: [obj.id],
      });
    } catch (err) {
      console.error("Error restoring obj", err);
      // החזרה ל־UI במקרה כשל (אופציונלי)
      setHistory((prev) => [...prev, obj]);
    }
  };


  const deleteItem = async (id) => {
    try {
      setHistory((prev) => prev.filter((h) => h.id !== id));
      await postApi(`${window.siteUrl}/wp-json/whizmanage/v1/history/delete`, {
        ids: [id],
      });
    } catch (err) {
      console.error("Error deleting item", err);
    }
  };

  const actionKeyMap = { add: 'added', put: 'updated', delete: 'deleted', duplicate: 'duplicated' };

  const formatItemText = (item, t) => {
    const count = Array.isArray(item.items) ? item.items.length : 0;
    const actionKey = actionKeyMap[item.action] || 'updated';
    const location = item.location || 'items'; // "products" | "orders" | "items"
    return __(`history.${actionKey}.${location}`, { ns: "translation", count });
  };

  // תמונה בודדת
  const ImageCell = ({ url, alt }) => {
    if (!url) return null;
    return (
      <a href={url} target="_blank" rel="noopener noreferrer">
        <img
          src={url}
          alt={alt || "image"}
          style={{
            maxWidth: 140,
            maxHeight: 140,
            display: "block",
            objectFit: "cover",
            borderRadius: 8,
          }}
        />
      </a>
    );
  };

  // גלריה
  const ImageGrid = ({ urls = [], highlight = {} }) => {
    const added = new Set(highlight.added || []);
    const removed = new Set(highlight.removed || []);
    return (
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(90px, 1fr))",
          gap: 8,
        }}
      >
        {urls.map((u, idx) => {
          const isAdded = added.has(u);
          const isRemoved = removed.has(u);
          const border = isAdded
            ? "2px solid #16a34a"
            : isRemoved
              ? "2px solid #dc2626"
              : "1px solid #e5e7eb";
          return (
            <a
              key={`${u}-${idx}`}
              href={u}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: "block",
                border,
                borderRadius: 8,
                overflow: "hidden",
              }}
            >
              <img
                src={u}
                alt={`img-${idx}`}
                style={{
                  width: "100%",
                  height: 90,
                  objectFit: "cover",
                  display: "block",
                }}
              />
            </a>
          );
        })}
      </div>
    );
  };

  // הבדלי גלריות (לצורך הדגשה)
  const diffLists = (oldList = [], newList = []) => {
    const oldSet = new Set(oldList);
    const newSet = new Set(newList);
    const added = newList.filter((u) => !oldSet.has(u));
    const removed = oldList.filter((u) => !newSet.has(u));
    return { added, removed };
  };

  const makeCell = (val, type, extra = {}) => {
    if (type === "image") {
      return <ImageCell url={extra?.url} alt="preview" />;
    }
    if (type === "image-list") {
      const { list = [], highlight } = extra;
      return <ImageGrid urls={list} highlight={highlight} />;
    }
    if (type === "html") {
      return (
        <div
          // Production: שקול לסנן HTML עם DOMPurify
          // dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(String(val || "")) }}
          dangerouslySetInnerHTML={{ __html: String(val || "") }}
        />
      );
    }
    return (
      <pre style={{ whiteSpace: "pre-wrap", margin: 0 }}>
        {formatScalar(val)}
      </pre>
    );
  };

  return (
    <Modal
      isOpen={isOpen}
      onOpenChange={(open) => setIsOpen(Boolean(open))}
      size="2xl"
      placement="center"
    >
      <ModalContent>
        <ModalHeader className="text-xl font-semibold text-foreground px-6 pt-6 pb-3">
          {__("History", "whizmanage")}
        </ModalHeader>

        <ModalBody className="px-6 py-4 space-y-4 max-h-[60vh] overflow-auto">
          {loading ? (
            <div className="text-center text-muted-foreground py-4">
              {__("Loading...", "whizmanage")}
            </div>
          ) : history.length > 0 ? (
            <Accordion selectionMode="single" type="single" collapsible>
              {history.map((item) => (
                <AccordionItem
                  aria-label={`accordion - ${item.id}`}
                  key={item.id}
                  value={item.id}
                  title={
                    <div
                      className={`flex flex-col ${isRTL ? "text-right" : "text-left"
                        } w-full`}
                    >
                      <div className="flex justify-between items-center">
                        <div className="text-base font-medium text-foreground">
                          {formatItemText(item)}
                        </div>
                        <div className="flex gap-2">
                          <Tooltip content={__("Restore", "whizmanage")} placement="top">
                            <Button
                              size="sm"
                              isIconOnly
                              variant="bordered"
                              onClick={(e) => {
                                e.stopPropagation();
                                restoreItem(item);
                              }}
                              aria-label={__("Restore", "whizmanage")}
                            >
                              <Undo2 className="w-4 h-4 text-foreground" />
                            </Button>
                          </Tooltip>

                          <Tooltip content={__("Delete", "whizmanage")} placement="top">
                            <Button
                              size="sm"
                              isIconOnly
                              variant="bordered"
                              onClick={(e) => {
                                e.stopPropagation();
                                deleteItem(item.id);
                              }}
                              aria-label={__("Delete", "whizmanage")}
                            >
                              <Trash className="w-4 h-4 text-foreground" />
                            </Button>
                          </Tooltip>
                        </div>
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {__("By", "whizmanage")}: {item.user} • {__("At", "whizmanage")}: {item.date}
                      </div>
                    </div>
                  }
                >
                  {item.action === "put" && Array.isArray(item.items) && (
                    <table
                      border="1"
                      cellPadding="6"
                      cellSpacing="0"
                      className="w-full border border-default-200"
                      style={{ borderCollapse: "collapse", width: "100%" }}
                    >
                      <thead className="bg-default-100">
                        <tr>
                          <th className="border border-default-200 p-2 text-center">
                            {__("ID", "whizmanage")}
                          </th>
                          <th className="border border-default-200 p-2 text-center">
                            {__("Field", "whizmanage")}
                          </th>
                          <th className="border border-default-200 p-2">
                            {__("Old Value", "whizmanage")}
                          </th>
                          <th className="border border-default-200 p-2">
                            {__("New Value", "whizmanage")}
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {preprocessHistoryItems(item.items).map(
                          (processed, idx) => {
                            let rowIndex = 0;
                            return processed.rows.map((row, i) => {
                              const isFirstRow = rowIndex === 0;
                              const totalRows = processed.rows.length;
                              rowIndex++;

                              // פונקציה קטנה למציאת שם להצגה
                              const findDisplayName = () => {
                                // 1) אם preprocess החזיר name
                                if (processed?.name) return processed.name;
                                // 2) חיפוש בפריטים הגולמיים לפי id תואם
                                const raw =
                                  Array.isArray(item?.items) &&
                                  item.items.find((ch) => ch?.id === processed.id);
                                if (raw?.name) return raw.name;
                                // 3) פולבק: נסיון לדלות שם מתוך old/new של השורה הראשונה
                                const firstRow =
                                  processed?.rows && processed.rows[0];
                                return (
                                  firstRow?.new?.name ||
                                  firstRow?.old?.name ||
                                  null
                                );
                              };

                              const displayName = findDisplayName();

                              if (row.type === "meta") {
                                return (
                                  <tr key={`meta-${idx}-${i}`}>
                                    {/* ID cell - only on first row with rowSpan */}
                                    {isFirstRow && (
                                      <td
                                        className="border border-default-200 p-2 text-center align-middle"
                                        rowSpan={totalRows}
                                        style={{ verticalAlign: "middle" }}
                                      >
                                        <div className="text-center leading-tight">
                                          <div className="font-medium">
                                            {processed.id}
                                          </div>
                                          {displayName && (
                                            <div
                                              className="text-xs text-muted-foreground truncate max-w-[12rem]"
                                              title={displayName}
                                            >
                                              {displayName}
                                            </div>
                                          )}
                                        </div>
                                      </td>
                                    )}
                                    <td className="border border-default-200 p-2 text-center">
                                      {__(row.label, "whizmanage")}
                                    </td>
                                    {/* This cell spans the Old/New columns */}
                                    <td
                                      className="border border-default-200 p-2"
                                      colSpan={2}
                                    >
                                      <table
                                        border="1"
                                        cellPadding="6"
                                        cellSpacing="0"
                                        className="w-full border border-default-300"
                                        style={{
                                          borderCollapse: "collapse",
                                          width: "100%",
                                        }}
                                      >
                                        <thead className="bg-default-50">
                                          <tr>
                                            <th className="border border-default-300 p-2">
                                              {__("Key", "whizmanage")}
                                            </th>
                                            <th className="border border-default-300 p-2">
                                              {__("Old", "whizmanage")}
                                            </th>
                                            <th className="border border-default-300 p-2">
                                              {__("New", "whizmanage")}
                                            </th>
                                          </tr>
                                        </thead>
                                        <tbody>
                                          {row.new.map((m, j) => {
                                            if (m.renderType === "image-list") {
                                              const hl = diffLists(
                                                m.oldList,
                                                m.newList
                                              );
                                              return (
                                                <tr
                                                  key={`meta-row-${idx}-${i}-${j}`}
                                                >
                                                  <td className="border border-default-300 p-2">
                                                    {__(m.label, "whizmanage")}
                                                  </td>
                                                  <td className="border border-default-300 p-2">
                                                    {makeCell(
                                                      null,
                                                      "image-list",
                                                      {
                                                        list: m.oldList,
                                                        highlight: {
                                                          removed: hl.removed,
                                                        },
                                                      }
                                                    )}
                                                  </td>
                                                  <td className="border border-default-300 p-2">
                                                    {makeCell(
                                                      null,
                                                      "image-list",
                                                      {
                                                        list: m.newList,
                                                        highlight: {
                                                          added: hl.added,
                                                        },
                                                      }
                                                    )}
                                                  </td>
                                                </tr>
                                              );
                                            }

                                            return (
                                              <tr
                                                key={`meta-row-${idx}-${i}-${j}`}
                                              >
                                                <td className="border border-default-300 p-2">
                                                  {__(m.label, "whizmanage")}
                                                </td>
                                                <td className="border border-default-300 p-2">
                                                  {m.renderType === "image" ? (
                                                    <ImageCell
                                                      url={m.oldUrl}
                                                      alt="old image"
                                                    />
                                                  ) : (
                                                    <pre
                                                      style={{
                                                        whiteSpace: "pre-wrap",
                                                        margin: 0,
                                                      }}
                                                    >
                                                      {formatScalar(m.old)}
                                                    </pre>
                                                  )}
                                                </td>
                                                <td className="border border-default-300 p-2">
                                                  {m.renderType === "image" ? (
                                                    <ImageCell
                                                      url={m.newUrl}
                                                      alt="new image"
                                                    />
                                                  ) : (
                                                    <pre
                                                      style={{
                                                        whiteSpace: "pre-wrap",
                                                        margin: 0,
                                                      }}
                                                    >
                                                      {formatScalar(m.new)}
                                                    </pre>
                                                  )}
                                                </td>
                                              </tr>
                                            );
                                          })}
                                        </tbody>
                                      </table>
                                    </td>
                                  </tr>
                                );
                              }

                              // שורות רגילות: טקסט / HTML / תמונה / גלריה
                              if (row.type === "image-list") {
                                const hl = diffLists(row.oldList, row.newList);
                                return (
                                  <tr key={`row-${idx}-${i}`}>
                                    {/* ID cell - only on first row with rowSpan */}
                                    {isFirstRow && (
                                      <td
                                        className="border border-default-200 p-2 text-center align-middle"
                                        rowSpan={totalRows}
                                        style={{ verticalAlign: "middle" }}
                                      >
                                        <div className="text-center leading-tight">
                                          <div className="font-medium">
                                            {processed.id}
                                          </div>
                                          {displayName && (
                                            <div
                                              className="text-xs text-muted-foreground truncate max-w-[12rem]"
                                              title={displayName}
                                            >
                                              {displayName}
                                            </div>
                                          )}
                                        </div>
                                      </td>
                                    )}
                                    <td className="border border-default-200 p-2 text-center">
                                      {__(row.label, "whizmanage")}
                                    </td>
                                    <td className="border border-default-200 p-2">
                                      {makeCell(null, "image-list", {
                                        list: row.oldList,
                                        highlight: { removed: hl.removed },
                                      })}
                                    </td>
                                    <td className="border border-default-200 p-2">
                                      {makeCell(null, "image-list", {
                                        list: row.newList,
                                        highlight: { added: hl.added },
                                      })}
                                    </td>
                                  </tr>
                                );
                              }

                              return (
                                <tr key={`row-${idx}-${i}`}>
                                  {/* ID cell - only on first row with rowSpan */}
                                  {isFirstRow && (
                                    <td
                                      className="border border-default-200 p-2 text-center align-middle"
                                      rowSpan={totalRows}
                                      style={{ verticalAlign: "middle" }}
                                    >
                                      <div className="text-center leading-tight">
                                        <div className="font-medium">
                                          {processed.id}
                                        </div>
                                        {displayName && (
                                          <div
                                            className="text-xs text-muted-foreground truncate max-w-[12rem]"
                                            title={displayName}
                                          >
                                            {displayName}
                                          </div>
                                        )}
                                      </div>
                                    </td>
                                  )}
                                  <td className="border border-default-200 p-2 text-center">
                                    {__(row.label, "whizmanage")}
                                  </td>
                                  <td className="border border-default-200 p-2">
                                    {makeCell(row.old, row.type, {
                                      url: row.oldUrl,
                                    })}
                                  </td>
                                  <td className="border border-default-200 p-2">
                                    {makeCell(row.new, row.type, {
                                      url: row.newUrl,
                                    })}
                                  </td>
                                </tr>
                              );
                            });
                          }
                        )}
                      </tbody>
                    </table>
                  )}
                </AccordionItem>
              ))}
            </Accordion>
          ) : (
            <div className="text-center text-muted-foreground py-4">
              {__("No history items to show", "whizmanage")}
            </div>
          )}
        </ModalBody>

        <ModalFooter className="px-6 pb-6 pt-2 border-t border-default-100">
          <Button variant="light" onPress={() => setIsOpen(false)}>
            {__("Close", "whizmanage")}
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}