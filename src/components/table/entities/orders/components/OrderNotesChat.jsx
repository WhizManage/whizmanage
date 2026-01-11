import Button from "@components/ui/button";
import { Input } from "@components/ui/input";
import CustomTooltip from "@components/ui/nextUI/Tooltip.jsx";
import {
  Modal, ModalBody, ModalContent, ModalHeader, useDisclosure,
} from "@heroui/react";
import { MessageCircle, Send, Trash2, Lock, User, Users } from "lucide-react";
import { useEffect, useRef, useState } from "react";
 import { __ } from "@wordpress/i18n";
import { postApi } from "../../../../../services/services";

const OrderNotesChat = ({ row }) => {
   
  const { isOpen, onOpen, onOpenChange } = useDisclosure();

  const [mode, setMode] = useState(null);
  const [text, setText] = useState("");
  const [notes, setNotes] = useState(Array.isArray(row.order_notes) ? row.order_notes : []);
  const [loading, setLoading] = useState(false);
  const endRef = useRef(null);

  const normDate = (d) => (typeof d === "string" ? d.replace(" ", "T") : d);
  const normalize = (arr) =>
    (Array.isArray(arr) ? arr : [])
      .map((n) => ({ ...n, date: normDate(n.date) }))
      .sort((a, b) => new Date(a.date) - new Date(b.date));

  const keyOf = (n) =>
    n?.id != null && n.id !== ""
      ? `id:${n.id}`
      : `k:${n.added_by}|${n.customer_note ? 1 : 0}|${String(n.content || "")}|${String(n.date || "")}`;

  const mergeNotes = (base, extra) => {
    const map = new Map();
    (base || []).forEach((n) => map.set(keyOf(n), n));
    (extra || []).forEach((n) => {
      const k = keyOf(n);
      if (!map.has(k)) map.set(k, n);
    });
    return normalize(Array.from(map.values()));
  };

  useEffect(() => {
    if (!isOpen) return;

    const fromRow = Array.isArray(row?.order_notes) ? row.order_notes : [];
    if (fromRow.length) {
      setNotes(normalize(fromRow));
    } else if (row?.customer_note) {
      setNotes(normalize([{
        id: "customer_note",
        content: row.customer_note,
        date: row.date_created_gmt || new Date().toISOString(),
        added_by: "Customer",
        customer_note: true,
      }]));
    } else {
      setNotes([]);
    }

    (async () => {
      try {
        const res = await postApi(`${window.siteUrl}/wp-json/wm/v1/order_note`, {
          orders: [{ order_id: row.id }],
          include_notes: true,
        });
        const item = res?.data?.results?.find((r) => Number(r.order_id) === Number(row.id));
        const server = Array.isArray(item?.notes) ? normalize(item.notes) : [];
        if (server.length > 0) {
          setNotes((prev) => mergeNotes(prev, server));
        }
      } catch (e) {
        console.error("load notes failed", e);
      }
    })();
  }, [isOpen, row]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [notes]);

  const addNote = async () => {
    if (!text.trim() || !mode) return;
    setLoading(true);
    try {
      const payload = {
        order_id: row.id,
        ...(mode === "customer" ? { customer_note: text } : { private_note: text }),
      };
      const res = await postApi(`${window.siteUrl}/wp-json/wm/v1/order_note`, {
        orders: [payload],
        include_notes: true,
      });
      const item = res?.data?.results?.find((r) => Number(r.order_id) === Number(row.id));
      const server = Array.isArray(item?.notes) ? normalize(item.notes) : [];
      if (server.length > 0) {
        setNotes((prev) => mergeNotes(prev, server));
      }
      setText("");
      setMode(null);
    } catch (e) {
      console.error(e);
      alert(__("Failed to save note", "whizmanage"));
    } finally {
      setLoading(false);
    }
  };

  const delNote = async (noteId) => {
    if (!confirm(__("Are you sure you want to delete this note?", "whizmanage"))) return;
    try {
      const url = `${window.siteUrl}/wp-json/wm/v1/order_note/${noteId}`;
      const res = await fetch(url, {
        method: "DELETE",
        headers: { "X-WP-Nonce": window.rest, "Content-Type": "application/json" },
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setNotes((prev) => prev.filter((n) => n.id !== noteId));
      } else {
        alert(data.message || __("Failed to delete note", "whizmanage"));
      }
    } catch (e) {
      console.error(e);
      alert(__("An error occurred while deleting the note", "whizmanage"));
    }
  };

  const labelFor = (n) =>
    n.added_by === "Customer" ? __("Customer", "whizmanage") : n.customer_note ? __("To Customer", "whizmanage") : __("Internal Note", "whizmanage");

  const iconFor = (n) =>
    n.added_by === "Customer" ? <User className="size-4" /> : n.customer_note ? <Users className="size-4" /> : <Lock className="size-4" />;

  const stylesFor = (n) => {
    const isFromCustomer = n.added_by === "Customer";
    const isToCustomer = n.customer_note === true && !isFromCustomer;
    if (isFromCustomer) {
      return {
        container: "self-end",
        bubble: "bg-white dark:bg-slate-700 border-slate-300 dark:border-slate-600 shadow-md",
        label: "text-slate-700 dark:text-slate-300",
        text: "text-slate-700 dark:text-slate-100",
      };
    }
    if (isToCustomer) {
      return {
        container: "self-start",
        bubble: "bg-fuchsia-600/10 border-fuchsia-600/20 shadow-lg",
        label: "text-slate-700 dark:text-fuchsia-100",
        text: "text-slate-700 dark:text-slate-300",
      };
    }
    return {
      container: "self-start",
      bubble: "bg-pink-500/10 border-pink-500/20 shadow-lg",
      label: "text-slate-700 dark:text-pink-100",
      text: "text-slate-700 dark:text-pink-50",
    };
  };

  return (
    <>
      <Button
        onClick={onOpen}
        variant="outline"
        size="sm"
        className="mr-2 rtl:ml-2 rtl:mr-0 !h-8 flex items-center gap-2 transition-all duration-200"
      >
        <MessageCircle className="size-4" />
        {__("Order Notes", "whizmanage")}
      </Button>
      <Modal
        isOpen={isOpen}
        onOpenChange={onOpenChange}
        isDismissable
        scrollBehavior="inside"
        size="2xl"
        backdrop="opaque"
        placement="center"
        classNames={{
          backdrop: "bg-gradient-to-t from-pink-500/10 to-fuchsia-600/10 backdrop-opacity-20",
          base: "dark:bg-slate-800 !overflow-hidden",
          header: "border-b dark:border-slate-700",
          footer: "border-t dark:border-slate-700",
          closeButton: "hover:bg-slate-100 dark:hover:bg-slate-800 active:bg-slate-200 dark:active:bg-slate-700 rounded-lg",
        }}
        motionProps={{
          variants: {
            enter: { y: 0, opacity: 1, transition: { duration: 0.3, ease: "easeOut" } },
            exit: { y: -20, opacity: 0, transition: { duration: 0.2, ease: "easeIn" } },
          },
        }}
      >
        <ModalContent className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border border-white/20 dark:border-slate-700/50 shadow-2xl">
          <ModalHeader className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700">
            <div className="flex items-center gap-3 py-2">
              <div className="p-2 bg-slate-100 dark:bg-slate-800 rounded-lg">
                <MessageCircle className="size-5 text-slate-600 dark:text-slate-300" />
              </div>
              <h2 className="text-xl font-semibold text-slate-900 dark:text-white">{__("Order Notes", "whizmanage")}</h2>
            </div>
          </ModalHeader>

          <ModalBody className="p-0">
            <div className="flex flex-col h-[70vh]">
              <div className="flex-1 overflow-y-auto scrollbar-whiz p-6 space-y-4 bg-gradient-to-b from-slate-50 to-white dark:from-slate-900 dark:to-slate-800 flex flex-col">
                {notes.length > 0 ? (
                  notes.map((n, idx) => {
                    const S = stylesFor(n);
                    return (
                      <div key={n.id || idx} className={`flex max-w-[80%] mb-2 ${S.container}`}>
                        <div className={`relative group rounded-2xl border p-4 transition-all duration-200 ${S.bubble}`}>
                          <div className={`flex items-center gap-2 mb-3 ${S.label}`}>
                            {iconFor(n)}
                            <span className="font-semibold text-sm">{labelFor(n)}</span>
                          </div>
                          <div className={`whitespace-pre-wrap leading-relaxed text-sm ${S.text}`}>
                            {n.content}
                          </div>
                          <div className="flex items-center justify-between mt-4 pt-3 border-t border-black/10 dark:border-white/10">
                            <span className="text-xs opacity-70">{new Date(n.date).toLocaleString()}</span>
                            <CustomTooltip title={__("Delete", "whizmanage")} instantClose>
                              <button
                                onClick={() => delNote(n.id)}
                                className="mx-2 w-6 h-6 rounded-md bg-slate-200/40 hover:bg-slate-500/30 dark:bg-slate-900/30 dark:hover:bg-slate-500/30 text-slate-500 hover:text-slate-600 dark:text-slate-300 dark:hover:text-slate-300 opacity-0 group-hover:opacity-100 transition-all duration-200 flex items-center justify-center"
                              >
                                <Trash2 className="size-3" />
                              </button>
                            </CustomTooltip>
                          </div>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="flex flex-col items-center justify-center h-full text-slate-400 dark:text-slate-500">
                    <MessageCircle className="size-16 mb-4 opacity-50" />
                    <p className="text-lg font-medium">{__("No notes yet", "whizmanage")}</p>
                    <p className="text-sm">{__("Start a conversation...", "whizmanage")}</p>
                  </div>
                )}
                <div ref={endRef} />
              </div>

              <div className="border-t border-slate-200 dark:border-slate-700 bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm p-4">
                {mode ? (
                  <div className="space-y-4">
                    <div className="relative">
                      <Input
                        placeholder={mode === "customer" ? __("Write a note to the customer...", "whizmanage") : __("Write an internal note...", "whizmanage")}
                        value={text}
                        onChange={(e) => setText(e.target.value)}
                        className="pr-12 rtl:pl-12 rtl:pr-4 bg-white dark:bg-slate-700 border-slate-300 dark:border-slate-600 focus:border-fuchsia-500 focus:ring-fuchsia-500/20 rounded-xl min-h-[44px] text-sm"
                        onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && addNote()}
                      />
                      <CustomTooltip title={__("Send", "whizmanage")} instantClose>
                        <button
                          onClick={addNote}
                          disabled={loading || !text.trim()}
                          className={`absolute right-2 rtl:left-2 rtl:right-auto top-1/2 -translate-y-1/2 w-8 h-8 rounded-lg ${
                            mode === "customer" ? "bg-fuchsia-500 hover:bg-fuchsia-600" : "bg-pink-500 hover:bg-pink-600"
                          } disabled:bg-slate-300 disabled:cursor-not-allowed text-white flex items-center justify-center transition-colors shadow-md`}
                        >
                          <Send className="size-4" />
                        </button>
                      </CustomTooltip>
                    </div>

                    <div className="flex justify-end gap-2">
                      <Button variant="ghost" onClick={() => setMode(null)} className="hover:bg-slate-200 dark:hover:bg-slate-700 text-xs">
                        {__("Cancel", "whizmanage")}
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="flex gap-3 justify-center">
                    <Button
                      variant="outline"
                      onClick={() => setMode("private")}
                      className="flex items-center gap-2"
                    >
                      <Lock className="size-4" />
                      {__("Add Private Note", "whizmanage")}
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => setMode("customer")}
                      className="flex items-center gap-2"
                    >
                      <Users className="size-4" />
                      {__("Add Customer Note", "whizmanage")}
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </ModalBody>
        </ModalContent>
      </Modal>
    </>
  );
};

export default OrderNotesChat;