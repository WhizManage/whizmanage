import CategoryTagsEdit from "@/components/table/components/CategoryTagsEdit";
import { chunkBatchPayloads } from "@/utils/networkUtils";
import { postApi } from "@/services/services";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@components/ui/collapsible";
import {
  Button,
  Modal,
  ModalBody,
  ModalContent,
  ModalFooter,
  ModalHeader,
  ScrollShadow,
  useDisclosure,
} from "@heroui/react";
import { toast } from "@/lib/utils";
import { ChevronDown, RefreshCcw, Pencil } from "lucide-react";
import { IconBadge } from "@components/ui/custom/IconBadge";
import { useCallback, useEffect, useMemo, useState } from "react";
 import { __ } from "@wordpress/i18n";
import AddImages from "./AddImages";
import AddLabelsItem from "./AddLabelsItem";
import BulkCustomFields from "./BulkCustomFields";
import BulkEditRow from "./BulkEditRow";
import SelectedRows from "./SelectedRows";
import MultiSelectEdit from "@/components/table/components/MultiSelectEdit";

function BulkEdit({
  useTableStore,
  open,
  onOpenChange,
  setHideToolbar,
  isTableImport,
  setData,
  entity,
  initialRows = [],
}) {
   
  const disc = useDisclosure();
  const isControlled = typeof open === "boolean" && typeof onOpenChange === "function";
  const isOpen = isControlled ? open : disc.isOpen;

  const store = useTableStore?.();

  const getOppositeId = (id) => {
    if (!id) return null;
    if (id.startsWith("excluded_")) return id.replace(/^excluded_/, "");
    return `excluded_${id}`;
  };

  const idOf = (x) => (x && typeof x === "object" ? x.id : x);
  const hasId = (arr, val) => arr?.some((a) => String(idOf(a)) === String(idOf(val)));
  const withoutOverlap = (base = [], toRemove = []) => (base || []).filter((b) => !hasId(toRemove, b));

  const [isLoading, setIsLoading] = useState(false);
  const [rows, setRows] = useState(Array.isArray(initialRows) ? initialRows : []);
  const [bulkMeta, setBulkMeta] = useState([]);

  const isProducts = (entity || "").toLowerCase().startsWith("product");

  useEffect(() => {
    setRows(Array.isArray(initialRows) ? initialRows : []);
  }, [entity, initialRows]);

  const setRowFieldById = useCallback((id, patch) => {
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  }, []);

  const handleRowChange = useCallback(
    (id, field, value) => {
      setRowFieldById(id, { [field]: value });
      if (field === "value") {
        const oppId = getOppositeId(id);
        if (oppId) {
          setRows((prev) =>
            prev.map((r) => {
              if (r.id !== oppId) return r;
              return {
                ...r,
                value: withoutOverlap(r.value || [], value || []),
              };
            })
          );
        }
      }
      // When adding items, remove them from removeValue
      if (field === "value") {
        setRows((prev) =>
          prev.map((r) => {
            if (r.id !== id || !r.removeValue) return r;
            return {
              ...r,
              removeValue: withoutOverlap(r.removeValue, value || []),
            };
          })
        );
      }
      // When removing items, remove them from value
      if (field === "removeValue") {
        setRows((prev) =>
          prev.map((r) => {
            if (r.id !== id || !r.value) return r;
            return {
              ...r,
              value: withoutOverlap(r.value, value || []),
            };
          })
        );
      }
    },
    [setRowFieldById]
  );

  const mergeMetaData = useCallback((original, bulk) => {
    const map = new Map();
    (original || []).forEach((m) => map.set(m.key, m.value));
    (bulk || []).forEach(({ key, value }) => {
      if (value === null) return;
      map.set(key, value);
    });
    return Array.from(map.entries()).map(([key, value]) => ({ key, value }));
  }, []);

  const selectedRows = useMemo(() => {
    if (!store) return [];
    const entries = Object.entries(store.rowSelection || {});
    const selectedIdsSet = new Set(entries.filter(([, v]) => v).map(([k]) => String(k)));

    if (selectedIdsSet.size === 0) return [];

    const findRecursive = (nodes) => {
      let found = [];
      if (!Array.isArray(nodes)) return found;
      for (const node of nodes) {
        if (selectedIdsSet.has(String(node.id))) {
          found.push(node);
        }
        const children = node.subRows || node.variations;
        if (children && children.length > 0) {
          found = found.concat(findRecursive(children));
        }
      }
      return found;
    };

    const items = findRecursive(store.data || []);
    return items.map((it) => ({ id: String(it.id), original: it }));
  }, [store?.rowSelection, store?.data]);

  useEffect(() => {
    setHideToolbar?.(isOpen);
  }, [isOpen, setHideToolbar]);

  const imagesRow = useMemo(() => rows.find((r) => r.id === "images"), [rows]);
  const labelsRows = useMemo(() => rows.filter((r) => r.labels && r.id !== "images"), [rows]);
  const coreLabelRows = useMemo(() => labelsRows.filter((r) => r.id === "categories" || r.id === "tags"), [labelsRows]);
  const extraLabelRows = useMemo(() => labelsRows.filter((r) => r.id !== "categories" && r.id !== "tags"), [labelsRows]);
  const editFieldRows = useMemo(() => rows.filter((r) => !r.labels && r.id !== "images"), [rows]);


  // ✅ שימוש ב-postApi במקום axios
  const sendBatchUpdate = (items) =>
    postApi(`${window.siteUrl}/wp-json/wc/v3/${entity}/batch`, { update: items });

  // ✅ שימוש ב-postApi עבור נקודת הקצה המותאמת אישית
  const sendVariationBatchUpdate = (variations) => {
    const payload = variations.map((v) => {
      const p = { ...v };
      if (Array.isArray(p.images) && p.images[0]?.id) {
        p.image = { id: p.images[0].id };
      }
      delete p.images;
      return p;
    });

    return postApi(`${window.siteUrl}/wp-json/whizmanage/v1/import_variations`, {
      variations_data: payload,
    });
  };

  const onSaveChanges = (onClose) => {
    try {
      setIsLoading(true);

      // 1. סינון שדות - כולל גם שורות עם removeValue
      const fieldsToUpdate = rows.filter((editRow) => {
        const value = editRow.value;
        const removeValue = editRow.removeValue;

        const hasValue = value && value !== "No Change" && (!Array.isArray(value) || value.length > 0);
        const hasRemoveValue = removeValue && Array.isArray(removeValue) && removeValue.length > 0;

        return hasValue || hasRemoveValue;
      });

      if (fieldsToUpdate.length === 0) {
        toast.info(__("No changes to save", "whizmanage"));
        setIsLoading(false);
        onClose?.();
        return;
      }

      // 2. הכנת נתונים
      const itemsChanges = selectedRows.map((row) => {
        const original = row.original;
        const changes = { id: original.id };

        fieldsToUpdate.forEach((editRow) => {
          const field = editRow.id;
          const value = editRow.value;

          if (!isProducts && (editRow.labels || field === "images")) return;

          const isMergeableField =
            editRow.labels ||
            ["product_categories", "excluded_product_categories", "product_ids", "excluded_product_ids"].includes(field);

          if (isMergeableField && field !== "images") {
            const existingValues = Array.isArray(original[field]) ? original[field] : [];
            const existingIds = existingValues
              .map((v) => (typeof v === "object" ? v.id : v))
              .filter((id) => id != null);

            const valuesAsArray = Array.isArray(value) ? value : [];
            const newIdsFromForm = valuesAsArray
              .map((v) => (typeof v === "object" ? v.id : v))
              .filter((id) => id != null);

            // Get IDs to remove
            const removeValue = editRow.removeValue;
            const removeValuesAsArray = Array.isArray(removeValue) ? removeValue : [];
            const idsToRemove = new Set(
              removeValuesAsArray
                .map((v) => (typeof v === "object" ? v.id : v))
                .filter((id) => id != null)
                .map((id) => String(id))
            );

            const conflictMap = {
              product_categories: "excluded_product_categories",
              excluded_product_categories: "product_categories",
              product_ids: "excluded_product_ids",
              excluded_product_ids: "product_ids",
            };

            const opposingField = conflictMap[field];
            let filteredNewIds = newIdsFromForm;

            if (opposingField) {
              const opposingValues = Array.isArray(original[opposingField]) ? original[opposingField] : [];
              const opposingIds = opposingValues.map((v) => (typeof v === "object" ? v.id : v));
              const opposingIdSet = new Set(opposingIds);
              if (opposingIdSet.size > 0) {
                filteredNewIds = newIdsFromForm.filter((id) => !opposingIdSet.has(id));
              }
            }

            // Merge existing + new, then remove items marked for removal
            const mergedIds = [...new Set([...existingIds, ...filteredNewIds])];
            const finalIds = mergedIds.filter((id) => !idsToRemove.has(String(id)));
            changes[field] = finalIds;
            return;
          }

          if (field === "images") {
            // Merge new images with existing ones (avoid duplicates by id)
            const existingImages = original.images || [];
            const newImages = Array.isArray(value) ? value : [];
            const existingIds = new Set(existingImages.map((img) => img.id));
            const uniqueNewImages = newImages.filter((img) => !existingIds.has(img.id));
            changes.images = [...existingImages, ...uniqueNewImages];
            return;
          }

          if (editRow.options && isProducts && ["manage_stock", "featured", "sold_individually"].includes(field)) {
            changes[field] = value === "yes";
            return;
          }

          // המרת שדות בוליאניים לקופונים
          if (editRow.options && !isProducts && ["individual_use", "free_shipping", "exclude_sale_items"].includes(field)) {
            changes[field] = value === "yes";
            return;
          }

          if (editRow.options) {
            changes[field] = value;
            return;
          }

          if (editRow.isChangeTypeEditable) {
            const referenceBase = editRow.referenceBase || field;
            const baseRaw = String(original[referenceBase] || "0").replace(/,/g, "");
            const base = parseFloat(baseRaw) || 0;
            const delta = parseFloat(value);

            if (!isNaN(delta)) {
              let finalValue = base;
              if (editRow.changeType === "Increase") {
                finalValue = isProducts && editRow.valueType === "%" ? base * (1 + delta / 100) : base + delta;
              } else if (editRow.changeType === "Decrease") {
                finalValue = isProducts && editRow.valueType === "%" ? base * (1 - delta / 100) : base - delta;
              } else if (editRow.changeType === "New Value") {
                finalValue = delta;
              }
              changes[field] = String(parseFloat(finalValue.toFixed(2)));
            }
            return;
          }
          changes[field] = value;
        });

        if (original.parent_id && changes.images?.[0]) {
          changes.image = { id: changes.images[0].id, src: changes.images[0].src };
        }
        if (bulkMeta?.length) {
          changes.meta_data = mergeMetaData(original.meta_data, bulkMeta);
        }
        return changes;
      });

      // מיון להורים וילדים
      const itemsToSave = itemsChanges.filter((x) => !selectedRows.find((r) => String(r.original.id) === String(x.id))?.original.parent_id);
      const variationsToSave = itemsChanges.filter((x) => selectedRows.find((r) => String(r.original.id) === String(x.id))?.original.parent_id);

      // ---------------------------------------------------------
      // ✅ עדכון UI אוניברסלי (כולל טיפול בשמות קטגוריות וטקסונומיות מותאמות)
      // ---------------------------------------------------------
      const handleSuccess = () => {
        // 1. מילון שמות (Name Lookup) - לכל הטקסונומיות
        const termNameLookup = new Map();

        if (store?.categoriesMap) Object.entries(store.categoriesMap).forEach(([k, v]) => termNameLookup.set(String(k), v));
        if (store?.tagsMap) Object.entries(store.tagsMap).forEach(([k, v]) => termNameLookup.set(String(k), v));

        // ✅ סריקת כל שדות הטקסונומיות (כולל custom)
        const allTaxonomyFieldIds = labelsRows.map((r) => r.id);

        const scanTerms = (items) => {
          if (!Array.isArray(items)) return;
          items.forEach(item => {
            // סריקה של כל שדות הטקסונומיות
            allTaxonomyFieldIds.forEach(fieldId => {
              if (Array.isArray(item[fieldId])) {
                item[fieldId].forEach(term => {
                  if (term && typeof term === 'object' && term.id && term.name) {
                    termNameLookup.set(String(term.id), term.name);
                  }
                });
              }
            });
            if (item.subRows) scanTerms(item.subRows);
            if (item.variations && typeof item.variations[0] === 'object') scanTerms(item.variations);
          });
        };
        if (store.data) scanTerms(store.data);

        const updatesMap = new Map();

        itemsChanges.forEach((change) => {
          let patch = { ...change };

          // ✅ נורמליזציה של כל שדות הטקסונומיות (לא רק categories/tags)
          allTaxonomyFieldIds.forEach(key => {
            if (Array.isArray(patch[key])) {
              if (patch[key].length > 0) {
                patch[key] = patch[key].map(val => {
                  const id = (typeof val === 'object') ? val.id : val;
                  const idStr = String(id);
                  const name = termNameLookup.get(idStr) || `ID: ${id}`;
                  return { id: Number(id), name: name, slug: '' };
                });
              }
              // Empty array is valid - all items were removed
            }
          });

          if (patch.image && !patch.images) {
            patch.images = [patch.image];
          }
          updatesMap.set(String(change.id), patch);
        });

        const updateRecursive = (nodes) => {
          if (!Array.isArray(nodes)) return nodes;
          return nodes.map((node) => {
            let updatedNode = { ...node };
            const nodeId = String(node.id);

            if (updatesMap.has(nodeId)) {
              updatedNode = { ...updatedNode, ...updatesMap.get(nodeId) };
            }

            if (updatedNode.subRows && Array.isArray(updatedNode.subRows)) {
              updatedNode.subRows = updateRecursive(updatedNode.subRows);
            }
            if (updatedNode.variations && Array.isArray(updatedNode.variations) && typeof updatedNode.variations[0] === 'object') {
              updatedNode.variations = updateRecursive(updatedNode.variations);
            }
            return updatedNode;
          });
        };

        setData?.((prev = []) => updateRecursive(prev));

        toast.success(__("The updates have been saved successfully.", "whizmanage"));
        setIsLoading(false);
        store?.setRowSelection?.({});
        setRows((prev) => prev.map((r) => ({ ...r, value: undefined, removeValue: undefined })));
        onClose?.();
      };

      const handleError = (error) => {
        console.error("Batch Update Error:", error);
        toast.error(error?.response?.data?.message || error.message || __("Unknown error", "whizmanage"));
        setIsLoading(false);
      };

      const promises = [];

      if (itemsToSave.length) {
        // ✅ כל הטקסונומיות (core + custom) נשלחות ב-batch אחד
        // ה-PHP hook (woocommerce_rest_insert_product_object) מטפל בטקסונומיות מותאמות
        const coreTaxonomyFields = ['categories', 'tags'];
        const customTaxonomyFields = extraLabelRows.map((r) => r.id);

        const normalized = itemsToSave.map((it) => {
          const clean = { ...it };
          // נורמליזציה של core taxonomies ל-[{id: Number}]
          coreTaxonomyFields.forEach((k) => {
            if (Array.isArray(clean[k])) clean[k] = clean[k].map((v) => (typeof v === "object" ? { id: Number(v.id) } : { id: Number(v) }));
          });
          // נורמליזציה של custom taxonomies ל-[{id: Number}]
          customTaxonomyFields.forEach((k) => {
            if (Array.isArray(clean[k])) clean[k] = clean[k].map((v) => (typeof v === "object" ? { id: Number(v.id) } : { id: Number(v) }));
          });
          ['upsell_ids', 'cross_sell_ids', 'grouped_products'].forEach((k) => {
            if (Array.isArray(clean[k])) clean[k] = clean[k].map((v) => (typeof v === "object" ? v.id : v));
          });
          delete clean.product_categories;
          delete clean.excluded_product_categories;
          return clean;
        });
        const chunks = chunkBatchPayloads([], normalized, [], 100);
        chunks.forEach((c) => c.update.length && promises.push(sendBatchUpdate(c.update)));
      }

      if (isProducts && variationsToSave.length) {
        const variationsPayload = variationsToSave.map((change) => {
          const originalRow = selectedRows.find((r) => String(r.original.id) === String(change.id))?.original;
          const payload = { ...change, parent_id: originalRow?.parent_id };

          if (Array.isArray(payload.images)) {
            if (payload.images[0]?.id) payload.image = { id: payload.images[0].id };
            else payload.image = null;
          }
          delete payload.images;

          return payload;
        });

        const chunks = chunkBatchPayloads([], variationsPayload, [], 100);
        chunks.forEach((c) => {
          if (c.update.length) {
            promises.push(sendVariationBatchUpdate(c.update));
          }
        });
      }

      if (promises.length === 0) {
        setIsLoading(false);
        return;
      }

      Promise.all(promises).then(handleSuccess).catch(handleError);

    } catch (criticalError) {
      console.error("Critical Error:", criticalError);
      toast.error("System Error: " + criticalError.message);
      setIsLoading(false);
    }
  };

  return (
    <>
      <Modal
        size="5xl"
        scrollBehavior="inside"
        backdrop="opaque"
        classNames={{
          backdrop:
            "bg-gradient-to-t from-zinc-800 to-zinc-800/30 backdrop-opacity-20 !overflow-hidden",
          closeButton: "hover:bg-slate-100 dark:hover:bg-slate-800 active:bg-slate-200 dark:active:bg-slate-700 rounded-lg",
        }}
        isOpen={isOpen}
        onOpenChange={(next) =>
          isControlled ? onOpenChange(next) : disc.onOpenChange(next)
        }
        isDismissable={false}
        motionProps={{
          variants: {
            enter: { y: 0, opacity: 1, transition: { duration: 0.3, ease: "easeOut" } },
            exit: { y: -20, opacity: 0, transition: { duration: 0.2, ease: "easeIn" } },
          },
        }}
      >
        <ModalContent className="dark:bg-slate-900 overflow-visible">
          {(onClose) => (
            <>
              <ModalHeader className="flex gap-3 text-center justify-center items-center">
                <IconBadge icon={Pencil} variant="default" size="default" />
                <h2 className="text-xl font-semibold dark:text-slate-300">
                  {__("Bulk Edit", "whizmanage")}
                </h2>
              </ModalHeader>

              <ModalBody>
                <ScrollShadow
                  size={10}
                  className="w-full h-full scrollbar-whiz pr-2 rtl:pl-2"
                >
                  <div className="w-full flex flex-col gap-4 items-center justify-center">
                    {/* Selected rows chips */}
                    <SelectedRows
                      selectedRows={selectedRows}
                      store={store}
                    />

                    {/* Add images — PRODUCTS ONLY */}
                    {isProducts && imagesRow && (
                      <div className="w-full">
                        <h2 className="w-full text-start text-xl dark:text-slate-300 p-2 font-semibold">
                          {__("Add images", "whizmanage")}
                        </h2>
                        <AddImages
                          images={imagesRow.value || []}
                          updateValue={(_, __, val) =>
                            handleRowChange(imagesRow.id, "value", val)
                          }
                          index={0}
                          title={__("Select Gallery Images", "whizmanage")}
                          maxSelection={100}
                        />
                      </div>
                    )}

                    {/* Add labels — PRODUCTS ONLY */}
                    {isProducts && (
                      <div className="w-full">
                        <h2 className="w-full text-start text-xl dark:text-slate-300 p-2 font-semibold">
                          {__("Add labels", "whizmanage")}
                        </h2>

                        <div className="w-full shadow dark:shadow-xl rounded-lg border border-neutral-200 dark:border-slate-700 overflow-auto scroll-smooth select-none !scrollbar-hide">
                          <table className="table-auto w-full dark:bg-slate-800 min-w-full divide-y divide-slate-200 dark:divide-slate-500">
                            <thead className="border-b sticky top-0 h-8 dark:border-b-slate-700 bg-slate-100 dark:bg-slate-900 z-10">
                              <tr>
                                <th className="!w-32 p-2 text-start text-slate-400 !font-semibold">
                                  {__("Type", "whizmanage")}
                                </th>
                                <th className="p-2 text-start text-slate-400 !font-semibold">
                                  {__("Items to add", "whizmanage")}
                                </th>
                                <th className="p-2 text-start text-slate-400 !font-semibold">
                                  {__("Items to remove", "whizmanage")}
                                </th>
                              </tr>
                            </thead>

                            <tbody className="rounded-b-md overflow-x-hidden">
                              {coreLabelRows.map((row) => (
                                <tr
                                  key={row.id}
                                  className="hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-300 hover:text-slate-600 dark:hover:text-slate-300 transition-all"
                                >
                                  <td className="px-2 h-12 text-base capitalize">
                                    {__(
                                      row.editOptions?.label || row.name || row.id.replace(/_/g, " "),
                                      "whizmanage"
                                    )}
                                  </td>
                                  <td className="px-2 h-12">
                                    <AddLabelsItem
                                      updateValue={(_, __, val) =>
                                        handleRowChange(row.id, "value", val)
                                      }
                                      index={0}
                                      columnName={row.id}
                                      label={row.name}
                                      mode="add"
                                      disabledItems={row.removeValue || []}
                                    />
                                  </td>
                                  <td className="px-2 h-12">
                                    <AddLabelsItem
                                      updateValue={(_, __, val) =>
                                        handleRowChange(row.id, "removeValue", val)
                                      }
                                      index={0}
                                      columnName={row.id}
                                      label={row.name}
                                      mode="remove"
                                      disabledItems={row.value || []}
                                    />
                                  </td>
                                </tr>
                              ))}

                              {extraLabelRows.length > 0 && (
                                <tr>
                                  <td colSpan={3} className="p-0">
                                    <Collapsible>
                                      <CollapsibleTrigger asChild>
                                        <Button
                                          variant="ghost"
                                          className="w-full flex items-center justify-between p-2 h-7 rounded-none border-0 border-t border-t-slate-700 hover:bg-slate-50 dark:hover:!bg-slate-700"
                                        >
                                          <span className="text-sm font-medium text-slate-500 dark:text-slate-300">
                                            {__("Additional Taxonomies", "whizmanage")}
                                          </span>
                                          <ChevronDown className="h-4 w-4 text-slate-500 dark:text-slate-300" />
                                        </Button>
                                      </CollapsibleTrigger>

                                      <CollapsibleContent>
                                        <table className="w-full">
                                          <tbody>
                                            {extraLabelRows.map((row) => (
                                              <tr
                                                key={row.id}
                                                className="hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-300 hover:text-slate-600 dark:hover:text-slate-300 transition-all"
                                              >
                                                <td className="px-2 h-12 text-base capitalize !w-32">
                                                  {__(
                                                    row.editOptions?.label || row.name || row.id.replace(/_/g, " "),
                                                    "whizmanage"
                                                  )}
                                                </td>
                                                <td className="px-2 h-12">
                                                  <AddLabelsItem
                                                    updateValue={(_, __, val) =>
                                                      handleRowChange(
                                                        row.id,
                                                        "value",
                                                        val
                                                      )
                                                    }
                                                    index={0}
                                                    columnName={row.id}
                                                    label={row.name}
                                                    mode="add"
                                                    disabledItems={row.removeValue || []}
                                                  />
                                                </td>
                                                <td className="px-2 h-12">
                                                  <AddLabelsItem
                                                    updateValue={(_, __, val) =>
                                                      handleRowChange(
                                                        row.id,
                                                        "removeValue",
                                                        val
                                                      )
                                                    }
                                                    index={0}
                                                    columnName={row.id}
                                                    label={row.name}
                                                    mode="remove"
                                                    disabledItems={row.value || []}
                                                  />
                                                </td>
                                              </tr>
                                            ))}
                                          </tbody>
                                        </table>
                                      </CollapsibleContent>
                                    </Collapsible>
                                  </td>
                                </tr>
                              )}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}

                    {/* Edit fields + custom fields row */}
                    <div className="w-full">
                      <h2 className="w-full text-start text-xl dark:text-slate-300 p-2 font-semibold">
                        {__("Edit fields", "whizmanage")}
                      </h2>

                      <div className="w-full shadow dark:shadow-xl rounded-lg border border-neutral-200 dark:border-slate-700 overflow-auto scroll-smooth select-none !max-h-96 !scrollbar-hide">
                        <table className="table-auto w-full dark:bg-slate-800 min-w-full divide-y divide-slate-200 dark:divide-slate-500">
                          <thead className="border-b sticky top-0 h-8 dark:border-b-slate-700 bg-slate-100 dark:bg-slate-900 z-10">
                            <tr>
                              <th className="w-32 p-2 text-start text-slate-400 !font-semibold">
                                {__("Field to Edit", "whizmanage")}
                              </th>
                              <th className="w-32 p-2 text-center text-slate-400 !font-semibold">
                                {__("Change Amount", "whizmanage")}
                              </th>
                              <th className="w-32 p-2 text-center text-slate-400 !font-semibold">
                                {__("Change Type", "whizmanage")}
                              </th>
                              <th className="w-32 p-2 text-center text-slate-400 !font-semibold">
                                {__("Value Type", "whizmanage")}
                              </th>
                              <th className="w-32 p-2 text-center text-slate-400 !font-semibold">
                                {__("Reference Base", "whizmanage")}
                              </th>
                            </tr>
                          </thead>

                          <tbody className="rounded-b-md overflow-x-hidden">
                            {editFieldRows.map((row, i) => {
                              const oppositeId = getOppositeId(row.id);
                              const oppositeRow = rows.find(
                                (r) => r.id === oppositeId
                              );
                              const disabledIds = Array.isArray(
                                oppositeRow?.value
                              )
                                ? oppositeRow.value
                                : [];

                              if (row.editor === "products") {
                                return (
                                  <tr
                                    key={row.id}
                                    className="hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-300 transition-all"
                                  >
                                    <td className="px-2 h-12 text-base capitalize">
                                      {__(
                                        row.editOptions?.label || row.name || row.id.replace(/_/g, " "),
                                        "whizmanage"
                                      )}
                                    </td>
                                    <td className="px-2 h-12" colSpan={4}>
                                      <MultiSelectEdit
                                        row={{ original: { [row.id]: Array.isArray(row.value) ? row.value : [] } }}
                                        columnName={row.id}
                                        label={row.editOptions?.label || row.id}
                                        onClose={() => { }}
                                        onValueChange={(next) => handleRowChange(row.id, "value", next)}
                                        autoFocus={false}
                                        editOptions={{
                                          source: "products",
                                          creatable: false,
                                          namesField:
                                            row.id === "excluded_product_ids"
                                              ? "excluded_product_names"
                                              : "product_names",
                                          disabledIds: Array.isArray(oppositeRow?.value) ? oppositeRow.value : [],
                                          oppositeColumn: getOppositeId(row.id),
                                        }}
                                      />
                                    </td>
                                  </tr>
                                );
                              }

                              if (row.editor === "taxonomy") {
                                return (
                                  <tr
                                    key={row.id}
                                    className="hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-300 transition-all"
                                  >
                                    <td className="px-2 h-12 text-base capitalize">
                                      {__(
                                        row.editOptions?.label || row.name || row.id.replace(/_/g, " "),
                                        "whizmanage"
                                      )}
                                    </td>
                                    <td className="px-2 h-12" colSpan={4}>
                                      <CategoryTagsEdit
                                        value={row.value || []}
                                        onChange={(next) =>
                                          handleRowChange(row.id, "value", next)
                                        }
                                        onFinish={() => { }}
                                        editOptions={{
                                          ...row.editOptions,
                                          disabledIds,
                                        }}
                                        row={{ original: {} }}
                                        column={{
                                          id: row.id,
                                          columnDef: {
                                            header:
                                              row.editOptions?.label || row.id,
                                          },
                                        }}
                                      />
                                    </td>
                                  </tr>
                                );
                              }

                              return (
                                <BulkEditRow
                                  key={row.id}
                                  row={row}
                                  handleRowChange={(_, field, val) =>
                                    handleRowChange(row.id, field, val)
                                  }
                                  index={i}
                                />
                              );
                            })}

                            {/* Custom fields */}
                            <tr>
                              <td colSpan={5} className="p-0">
                                <Collapsible>
                                  <CollapsibleTrigger asChild>
                                    <Button
                                      variant="ghost"
                                      className="w-full flex items-center justify-between p-2 h-7 rounded-none border-0 border-t border-t-slate-700 hover:bg-slate-50 dark:hover:!bg-slate-700"
                                    >
                                      <span className="text-sm font-medium text-slate-500 dark:text-slate-300">
                                        {__("Custom fields", "whizmanage")}
                                      </span>
                                      <ChevronDown className="h-4 w-4 text-slate-500 dark:text-slate-300" />
                                    </Button>
                                  </CollapsibleTrigger>

                                  <CollapsibleContent
                                    forceMount
                                    className="data-[state=closed]:hidden"
                                  >
                                    <div className="p-2 text-sm text-slate-600 dark:text-slate-300">
                                      <BulkCustomFields
                                        onChange={setBulkMeta}
                                      />
                                    </div>
                                  </CollapsibleContent>
                                </Collapsible>
                              </td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                </ScrollShadow>
              </ModalBody>

              <ModalFooter>
                <Button
                  color="primary"
                  onClick={() => onSaveChanges(onClose)}
                  className="flex gap-2"
                  disabled={false}
                >
                  {__("Save changes", "whizmanage")}
                  {isLoading && (
                    <RefreshCcw className="text-white w-5 h-5 animate-spin" />
                  )}
                </Button>
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>
    </>
  );
}

export default BulkEdit;
