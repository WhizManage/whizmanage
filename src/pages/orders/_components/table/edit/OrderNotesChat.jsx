import Button from "@components/ui/button";
import { Input } from "@components/ui/input";
import {
  Modal,
  ModalBody,
  ModalContent,
  ModalHeader,
  useDisclosure,
} from "@heroui/react";
import {
  AlertCircle,
  CheckCircle2,
  Loader2,
  Lock,
  MessageCircle,
  Send,
  Trash2,
  User,
  Users,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { __ } from '@wordpress/i18n';
import { postApi } from "../../../../../services/services";

const OrderNotesChat = ({ row }) => {
   
  const { isOpen, onOpen, onOpenChange } = useDisclosure();
  const [showNoteBox, setShowNoteBox] = useState(null);
  const [noteText, setNoteText] = useState("");
  const [notes, setNotes] = useState(row.order_notes || []);
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef(null);

  // סנכרון: אם ההורה שינה את order_notes (ברפרנס חדש) – נעדכן את ה-state המקומי
  useEffect(() => {
    setNotes(row.order_notes || []);
  }, [row.order_notes]);

  // גלילה למטה בעת שינוי ההודעות
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [notes]);

  const normalizeDate = (d) =>
    typeof d === "string" ? d.replace(" ", "T") : d;

  // אל תמיין state in-place בזמן רנדר
  const sortedNotes = useMemo(() => {
    return [...(notes || [])].sort((a, b) => {
      const da = new Date(normalizeDate(a?.date));
      const db = new Date(normalizeDate(b?.date));
      return da - db;
    });
  }, [notes]);

  const handleAddNote = async () => {
    if (!noteText.trim()) return;

    if (!OrderNotesChat._localIdRef) {
      OrderNotesChat._localIdRef = { current: 0 };
    }
    const tmpId = `local-${OrderNotesChat._localIdRef.current++}`;

    const isCustomer = showNoteBox === "customer";
    const optimisticNote = {
      id: tmpId,
      content: noteText,
      date: new Date().toISOString(),
      added_by: "You",
      customer_note: isCustomer,
      status: "sending",
    };

    setNotes((prev) => [...prev, optimisticNote]);
    setLoading(true);

    try {
      const payloadOrder = {
        order_id: row.id,
        ...(isCustomer
          ? { customer_note: noteText }
          : { private_note: noteText }),
      };

      const res = await postApi(
        `${window.siteUrl}/wp-json/wm/v1/order_note`,
        {
          orders: [payloadOrder],
          include_notes: true,
        }
      );

      const data = res?.data;
      const ok = data?.success === true && Array.isArray(data?.results);
      if (!ok) throw new Error("Bad response");

      const item = data.results.find(
        (r) => Number(r.order_id) === Number(row.id)
      );

      if (item?.success && Array.isArray(item?.notes)) {
        const normalized = item.notes.map((n) => ({
          ...n,
          date: normalizeDate(n.date),
          status: "sent",
        }));
        // מעדכן מקומית; אם ההורה גם מחליף רפרנס ל-order_notes, זה יסתנכרן אוטומטית דרך ה-useEffect
        setNotes(normalized);
      } else {
        throw new Error(item?.error || "Failed to save");
      }

      setNoteText("");
      setShowNoteBox(null);
    } catch (err) {
      console.error("Sending note failed:", err);
      setNotes((prev) =>
        prev.map((n) => (n.id === tmpId ? { ...n, status: "error" } : n))
      );
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteNote = async (noteId) => {
    if (!confirm(__("Are you sure you want to delete this note?", "whizmanage"))) return;

    try {
      const url = `${window.siteUrl}/wp-json/wm/v1/order_note/${noteId}`;
      const res = await fetch(url, {
        method: "DELETE",
        headers: {
          "X-WP-Nonce": window.rest,
          "Content-Type": "application/json",
        },
      });

      const data = await res.json();

      if (res.ok && data.success) {
        setNotes((prev) => prev.filter((n) => n.id !== noteId));
      } else {
        alert(data.message || __("Failed to delete note", "whizmanage"));
      }
    } catch (err) {
      console.error("Error deleting note:", err);
      alert(__("An error occurred while deleting the note", "whizmanage"));
    }
  };

  const getNoteIcon = (note) => {
    const isFromCustomer = note.added_by === "Customer";
    const isToCustomer = note.customer_note === true && !isFromCustomer;

    if (isFromCustomer) return <User className="w-4 h-4" />;
    if (isToCustomer) return <Users className="w-4 h-4" />;
    return <Lock className="w-4 h-4" />;
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case "sending":
        return <Loader2 className="w-3 h-3 animate-spin text-amber-500" />;
      case "sent":
        return <CheckCircle2 className="w-3 h-3 text-emerald-500" />;
      case "error":
        return <AlertCircle className="w-3 h-3 text-red-500" />;
      default:
        return null;
    }
  };

  const getNoteStyles = (note) => {
    const isFromCustomer = note.added_by === "Customer";
    const isToCustomer = note.customer_note === true && !isFromCustomer;

    if (isFromCustomer) {
      return {
        container: "self-end",
        bubble:
          "bg-white dark:bg-slate-700 border-slate-300 dark:border-slate-600 shadow-md",
        label: "text-slate-700 dark:text-slate-300",
        text: "text-slate-700 dark:text-slate-100",
      };
    } else if (isToCustomer) {
      return {
        container: "self-start",
        bubble: "bg-fuchsia-600/10 border-fuchsia-600/20 shadow-lg",
        label: "text-slate-700 dark:text-fuchsia-100",
        text: "text-slate-700 dark:text-slate-300",
      };
    } else {
      return {
        container: "self-start",
        bubble: "bg-pink-500/10 border-pink-500/20 shadow-lg",
        label: "text-slate-700 dark:text-pink-100",
        text: "text-slate-700 dark:text-pink-50",
      };
    }
  };

  return (
    <>
      <Button
        onClick={onOpen}
        variant="outline"
        size="sm"
        className="mr-2 rtl:ml-2 rtl:mr-0 !h-8 flex gap-2 hover:bg-fuchsia-50 dark:hover:bg-fuchsia-900/20 transition-all duration-200"
      >
        <MessageCircle className="w-4 h-4 mr-2 rtl:ml-2 rtl:mr-0" />
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
          backdrop:
            "bg-gradient-to-t from-pink-500/10 to-fuchsia-600/10 backdrop-opacity-20",
          base: "dark:bg-slate-800 !overflow-hidden",
          header: "border-b dark:border-slate-700",
          footer: "border-t dark:border-slate-700",
        }}
        motionProps={{
          variants: {
            enter: {
              y: 0,
              opacity: 1,
              transition: { duration: 0.3, ease: "easeOut" },
            },
            exit: {
              y: -20,
              opacity: 0,
              transition: { duration: 0.2, ease: "easeIn" },
            },
          },
        }}
      >
        <ModalContent className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border border-white/20 dark:border-slate-700/50 shadow-2xl">
          <ModalHeader className="bg-gradient-to-r from-fuchsia-600 to-pink-500 text-white text-center py-6 rounded-t-lg">
            <div className="flex items-center justify-center gap-3">
              <MessageCircle className="w-6 h-6" />
              <h2 className="text-2xl font-bold text-white">
                {__("Order Notes", "whizmanage")}
              </h2>
            </div>
          </ModalHeader>

          <ModalBody className="p-0">
            <div className="flex flex-col h-[70vh]">
              {/* Messages Area */}
              <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-gradient-to-b from-slate-50 to-white dark:from-slate-900 dark:to-slate-800 flex flex-col">
                {sortedNotes.length > 0 ? (
                  sortedNotes.map((note, idx) => {
                    const styles = getNoteStyles(note);
                    const isFromCustomer = note.added_by === "Customer";
                    const isToCustomer =
                      note.customer_note === true && !isFromCustomer;

                    const label = isFromCustomer
                      ? __("Customer", "whizmanage")
                      : isToCustomer
                      ? __("To Customer", "whizmanage")
                      : __("Internal Note", "whizmanage");

                    return (
                      <div
                        key={note.id || idx}
                        className={`flex max-w-[75%] mb-2 ${styles.container}`}
                      >
                        <div
                          className={`relative group rounded-2xl border p-4 shadow-sm hover:shadow-md transition-all duration-200 ${styles.bubble}`}
                        >
                          {/* Note Header */}
                          <div
                            className={`flex items-center gap-2 mb-3 ${styles.label}`}
                          >
                            {getNoteIcon(note)}
                            <span className="font-semibold text-sm">
                              {label}
                            </span>
                          </div>

                          {/* Note Content */}
                          <div
                            className={`whitespace-pre-wrap leading-relaxed text-sm ${styles.text}`}
                          >
                            {note.content}
                          </div>

                          {/* Note Footer */}
                          <div className="flex items-center justify-between mt-4 pt-3 border-t border-black/10 dark:border-white/10">
                            <span className="text-xs opacity-70">
                              {new Date(normalizeDate(note.date)).toLocaleString()}
                            </span>
                            <div className="flex items-center gap-2">
                              <div className="flex items-center gap-1">
                                {getStatusIcon(note.status)}
                                {!isFromCustomer && note.status === "sent" && (
                                  <div className="flex -space-x-1">
                                    <CheckCircle2 className="w-3 h-3 text-blue-400" />
                                    <CheckCircle2 className="w-3 h-3 text-blue-500" />
                                  </div>
                                )}
                              </div>
                              <button
                                onClick={() => handleDeleteNote(note.id)}
                                className="w-6 h-6 rounded-md bg-slate-200/80 hover:bg-slate-300/80 dark:bg-slate-600/80 dark:hover:bg-slate-500/80 text-slate-500 hover:text-slate-600 dark:text-slate-400 dark:hover:text-slate-300 opacity-0 group-hover:opacity-100 transition-all duration-200 flex items-center justify-center"
                                title={__("Delete", "whizmanage")}
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="flex flex-col items-center justify-center h-full text-slate-400 dark:text-slate-500">
                    <MessageCircle className="w-16 h-16 mb-4 opacity-50" />
                    <p className="text-lg font-medium">{__("No notes yet", "whizmanage")}</p>
                    <p className="text-sm">{__("Start a conversation...", "whizmanage")}</p>
                  </div>
                )}

                {/* Auto-scroll to bottom when new message is added */}
                <div ref={messagesEndRef} />
              </div>

              {/* Input Area */}
              <div className="border-t border-slate-200 dark:border-slate-700 bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm p-4">
                {showNoteBox ? (
                  <div className="space-y-4">
                    <div className="relative">
                      <Input
                        placeholder={
                          showNoteBox === "customer"
                            ? __("Write a note to the customer...", "whizmanage")
                            : __("Write an internal note...", "whizmanage")
                        }
                        value={noteText}
                        onChange={(e) => setNoteText(e.target.value)}
                        className="pr-12 rtl:pl-12 rtl:pr-4 bg-white dark:bg-slate-700 border-slate-300 dark:border-slate-600 focus:border-fuchsia-500 focus:ring-fuchsia-500/20 rounded-xl min-h-[44px] text-sm"
                        onKeyDown={(e) =>
                          e.key === "Enter" && !e.shiftKey && handleAddNote()
                        }
                      />
                      <button
                        onClick={handleAddNote}
                        disabled={loading || !noteText.trim()}
                        className={`absolute right-2 rtl:left-2 rtl:right-auto top-1/2 -translate-y-1/2 w-8 h-8 rounded-lg ${
                          showNoteBox === "customer"
                            ? "bg-fuchsia-500 hover:bg-fuchsia-600"
                            : "bg-pink-500 hover:bg-pink-600"
                        } disabled:bg-slate-300 disabled:cursor-not-allowed text-white flex items-center justify-center transition-colors shadow-md`}
                      >
                        {loading ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Send className="w-4 h-4" />
                        )}
                      </button>
                    </div>

                    <div className="flex justify-end gap-2">
                      <Button
                        variant="ghost"
                        onClick={() => setShowNoteBox(null)}
                        className="hover:bg-slate-200 dark:hover:bg-slate-700 text-xs"
                      >
                        {__("Cancel", "whizmanage")}
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="flex gap-3 justify-center">
                    <Button
                      variant="outline"
                      onClick={() => setShowNoteBox("private")}
                      className="flex items-center gap-2 border-pink-500 hover:bg-pink-50 dark:hover:bg-pink-900/20 text-pink-500 dark:text-pink-300 transition-colors"
                    >
                      <Lock className="w-4 h-4" />
                      {__("Add Private Note", "whizmanage")}
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => setShowNoteBox("customer")}
                      className="flex items-center gap-2 border-fuchsia-500 hover:bg-fuchsia-50 dark:hover:bg-fuchsia-900/20 text-fuchsia-600 dark:text-fuchsia-300 transition-colors"
                    >
                      <Users className="w-4 h-4" />
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
