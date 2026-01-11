// src/components/table/entities/coupons/components/AllowedEmailsCell.jsx
import Button from "@components/ui/button";
import { Input } from "@components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@components/ui/popover";
import { Chip } from "@heroui/react";
import { Portal } from "@radix-ui/react-portal";
import { Plus, RefreshCcw } from "lucide-react";
import { useCallback, useMemo, useState } from "react";
 import { __ } from "@wordpress/i18n";

const normalize = (arr) =>
  Array.isArray(arr)
    ? arr.map((e) => String(e).trim()).filter((e) => e.length > 0)
    : [];

const rowIdFrom = (row) => row?.original?.id ?? row?.original?._id ?? row?.id;

const AllowedEmailsCell = ({ row, table, onUpdate }) => {
   
  const saving = table?.options?.meta?.store?.saveState === "saving";

  // what is shown in the cell (always single-line)
  const displayEmails = useMemo(
    () => normalize(row?.original?.email_restrictions),
    [row?.original?.email_restrictions]
  );

  // edit state inside the popover
  const [open, setOpen] = useState(false);
  const [emails, setEmails] = useState(displayEmails);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);

  const handleOpenChange = (next) => {
    setOpen(next);
    if (next) {
      setEmails(normalize(row?.original?.email_restrictions));
      setInput("");
    }
  };

  const commit = useCallback(
    async (next) => {
      const rowId = rowIdFrom(row);
      // optimistic local row update so table rerenders immediately
      row.original.email_restrictions = next;
      await onUpdate(rowId, "email_restrictions", next, row.original);
    },
    [row, onUpdate]
  );

  const addFromInput = () => {
    const parts = input
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    if (!parts.length) return;
    const unique = Array.from(new Set([...emails, ...parts]));
    setEmails(unique);
    setInput("");
  };

  const removeEmail = (toRemove) => {
    setEmails((prev) => prev.filter((e) => e !== toRemove));
  };

  const onKeyDownAdd = (e) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      addFromInput();
    }
  };

  const onSave = async () => {
    try {
      setBusy(true);
      await commit(emails);
      setOpen(false);
    } finally {
      setBusy(false);
    }
  };

  // keyboard open from the cell
  const onCellKey = (e) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      setOpen(true);
    }
  };

  // single-line, ellipsis, whole cell clickable
  const summary =
    displayEmails.length > 0
      ? displayEmails.join(", ")
      : <span className="text-muted-foreground">{__("No email restrictions", "whizmanage")}</span>;

  return (
    <div className="flex items-center w-full">
      <Popover open={open} onOpenChange={handleOpenChange}>
        <PopoverTrigger asChild>
          <div
            role="button"
            tabIndex={0}
            onKeyDown={onCellKey}
            onClick={() => setOpen(true)}
            title={summary}
            className="
              w-full h-8 flex items-center
              cursor-pointer select-none
              overflow-hidden whitespace-nowrap text-ellipsis
              px-1
            "
          >
            {summary}
          </div>
        </PopoverTrigger>
        <Portal>
          <PopoverContent className="w-[400px] p-4">
            <div className="flex flex-col gap-4">
              <div className="flex flex-wrap gap-2 items-center min-h-10 rounded-lg px-1 py-1">
                {emails.length ? (
                  emails.map((item, idx) => (
                    <Chip
                      key={`${item}-${idx}`}
                      onClose={() => removeEmail(item)}
                      variant="flat"
                      classNames={{
                        base: "bg-gradient-to-br from-fuchsia-50 dark:from-slate-700 to-fuchsia-200 dark:to-slate-600",
                        content: "text-fuchsia-600 dark:text-slate-300",
                        closeButton: "text-fuchsia-600 dark:text-slate-300",
                      }}
                    >
                      {item}
                    </Chip>
                  ))
                ) : (
                  <div className="font-extralight text-base text-muted-foreground px-1">
                    {__("No email restrictions", "whizmanage")}
                  </div>
                )}
              </div>

              <div className="w-full flex gap-1.5">
                <Input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={onKeyDownAdd}
                  aria-label={__("Allowed emails", "whizmanage")}
                  className="h-10"
                />
                <Button
                  variant="outline"
                  onClick={(e) => {
                    e.preventDefault();
                    addFromInput();
                  }}
                  disabled={busy}
                  className="h-10"
                >
                  <Plus className="size-4 mr-1" />
                  {__("Add", "whizmanage")}
                </Button>
              </div>

              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  onClick={() => setOpen(false)}
                  disabled={busy}
                >
                  {__("Cancel", "whizmanage")}
                </Button>
                <Button onClick={onSave} disabled={busy} className="min-w-24">
                  {busy ? __("Saving...", "whizmanage") : __("Save", "whizmanage")}
                  {busy && <RefreshCcw className="ml-2 size-4 animate-spin" />}
                </Button>
              </div>
            </div>
          </PopoverContent>
        </Portal>
      </Popover>
    </div>
  );
};

export default AllowedEmailsCell;
