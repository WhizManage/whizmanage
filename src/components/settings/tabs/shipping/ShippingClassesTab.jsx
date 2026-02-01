// src/components/settings/tabs/shipping/ShippingClassesTab.jsx

import { useState, useEffect } from "react";
import { __ } from "@wordpress/i18n";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Tag, Plus, Pencil, Trash2, Loader2, Package } from "lucide-react";
import { addToast } from "@heroui/react";
import SettingsCardHeader from "../../SettingsCardHeader";
import {
  getShippingClasses,
  createShippingClass,
  updateShippingClass,
  deleteShippingClass,
} from "@/services/shippingService";

export default function ShippingClassesTab() {
  const [classes, setClasses] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingClass, setEditingClass] = useState(null);
  const [formData, setFormData] = useState({
    name: "",
    slug: "",
    description: "",
  });

  // Delete confirmation state
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [classToDelete, setClassToDelete] = useState(null);

  useEffect(() => {
    loadClasses();
  }, []);

  const loadClasses = async () => {
    setIsLoading(true);
    try {
      const data = await getShippingClasses();
      setClasses(data);
    } catch (error) {
      addToast({
        title: __("Error", "whizmanage"),
        description: __("Failed to load shipping classes", "whizmanage"),
        color: "danger",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenDialog = (shippingClass = null) => {
    if (shippingClass) {
      setEditingClass(shippingClass);
      setFormData({
        name: shippingClass.name,
        slug: decodeURIComponent(shippingClass.slug),
        description: shippingClass.description || "",
      });
    } else {
      setEditingClass(null);
      setFormData({
        name: "",
        slug: "",
        description: "",
      });
    }
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setEditingClass(null);
    setFormData({
      name: "",
      slug: "",
      description: "",
    });
  };

  const handleSave = async () => {
    if (!formData.name.trim()) {
      addToast({
        title: __("Error", "whizmanage"),
        description: __("Name is required", "whizmanage"),
        color: "danger",
      });
      return;
    }

    setIsSaving(true);
    try {
      if (editingClass) {
        const response = await updateShippingClass(editingClass.term_id, formData);
        if (response.success) {
          setClasses((prev) =>
            prev.map((c) =>
              c.term_id === editingClass.term_id ? response.class : c
            )
          );
          addToast({
            title: __("Success", "whizmanage"),
            description: __("Shipping class updated", "whizmanage"),
            color: "success",
          });
        } else {
          throw new Error(response.error || "Failed to update");
        }
      } else {
        const response = await createShippingClass(formData);
        if (response.success) {
          setClasses((prev) => [...prev, response.class]);
          addToast({
            title: __("Success", "whizmanage"),
            description: __("Shipping class created", "whizmanage"),
            color: "success",
          });
        } else {
          throw new Error(response.error || "Failed to create");
        }
      }
      handleCloseDialog();
    } catch (error) {
      addToast({
        title: __("Error", "whizmanage"),
        description: error.message || __("Failed to save shipping class", "whizmanage"),
        color: "danger",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteClick = (shippingClass) => {
    setClassToDelete(shippingClass);
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!classToDelete) return;

    setIsSaving(true);
    try {
      const response = await deleteShippingClass(classToDelete.term_id);
      if (response.success) {
        setClasses((prev) => prev.filter((c) => c.term_id !== classToDelete.term_id));
        addToast({
          title: __("Success", "whizmanage"),
          description: __("Shipping class deleted", "whizmanage"),
          color: "success",
        });
      } else {
        throw new Error(response.error || "Failed to delete");
      }
    } catch (error) {
      addToast({
        title: __("Error", "whizmanage"),
        description: error.message || __("Failed to delete shipping class", "whizmanage"),
        color: "danger",
      });
    } finally {
      setIsSaving(false);
      setDeleteDialogOpen(false);
      setClassToDelete(null);
    }
  };

  const generateSlug = (name) => {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, "")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-")
      .trim();
  };

  const isRtl = window?.document?.documentElement?.dir === "rtl";

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full min-h-[300px]">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-fuchsia-600" />
          <span className="text-sm text-slate-500 dark:text-slate-400">
            {__("Loading shipping classes...", "whizmanage")}
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6" dir={isRtl ? "rtl" : "ltr"}>
      {/* Header Card */}
      <Card className="bg-white dark:bg-slate-700/50 border-slate-200 dark:border-slate-600">
        <SettingsCardHeader
          icon={Tag}
          title={__("Shipping Classes", "whizmanage")}
          description={__(
            "Shipping classes can be used to group products of similar type and used by some shipping methods to provide different rates to different classes of product.",
            "whizmanage"
          )}
        />
        <CardContent>
          <Button
            onClick={() => handleOpenDialog()}
            className="bg-fuchsia-600 hover:bg-fuchsia-700"
          >
            <Plus className="w-4 h-4 me-2" />
            {__("Add Shipping Class", "whizmanage")}
          </Button>
        </CardContent>
      </Card>

      {/* Classes List */}
      {classes.length > 0 ? (
        <div className="space-y-3">
          {classes.map((shippingClass) => (
            <Card
              key={shippingClass.term_id}
              className="bg-white dark:bg-slate-700/50 border-slate-200 dark:border-slate-600 hover:border-fuchsia-300 dark:hover:border-fuchsia-700 transition-colors"
            >
              <CardContent className="p-4">
                <div className="flex items-start gap-4">
                  {/* Icon */}
                  <div className="p-2.5 rounded-xl bg-gradient-to-br from-fuchsia-100 to-purple-100 dark:from-fuchsia-900/30 dark:to-purple-900/30 shrink-0">
                    <Tag className="w-5 h-5 text-fuchsia-600 dark:text-fuchsia-400" />
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0">
                        <h3 className="font-semibold text-slate-800 dark:text-slate-200">
                          {shippingClass.name}
                        </h3>
                        <div className="flex items-center gap-2 mt-1">
                          <code className="text-xs px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-600 text-slate-600 dark:text-slate-300 font-mono">
                            {decodeURIComponent(shippingClass.slug)}
                          </code>
                          <span className="inline-flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-600 px-2 py-0.5 rounded">
                            <Package className="w-3 h-3" />
                            {shippingClass.count} {shippingClass.count === 1 ? __("product", "whizmanage") : __("products", "whizmanage")}
                          </span>
                        </div>
                        {shippingClass.description && (
                          <p className="text-sm text-slate-500 dark:text-slate-400 mt-2 line-clamp-2">
                            {shippingClass.description}
                          </p>
                        )}
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-1 shrink-0">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleOpenDialog(shippingClass)}
                          className="h-9 w-9 text-slate-500 hover:text-fuchsia-600 hover:bg-fuchsia-50 dark:hover:bg-fuchsia-900/30"
                        >
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDeleteClick(shippingClass)}
                          className="h-9 w-9 text-slate-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card className="bg-white dark:bg-slate-700/50 border-slate-200 dark:border-slate-600">
          <CardContent className="py-12">
            <div className="text-center">
              <Tag className="w-12 h-12 mx-auto text-slate-300 dark:text-slate-600 mb-4" />
              <h3 className="text-lg font-medium text-slate-900 dark:text-slate-100 mb-2">
                {__("No shipping classes yet", "whizmanage")}
              </h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
                {__(
                  "Shipping classes allow you to group similar products and apply different shipping rates.",
                  "whizmanage"
                )}
              </p>
              <Button
                onClick={() => handleOpenDialog()}
                className="bg-fuchsia-600 hover:bg-fuchsia-700"
              >
                <Plus className="w-4 h-4 me-2" />
                {__("Add Your First Class", "whizmanage")}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen} dir={isRtl ? "rtl" : "ltr"}>
        <DialogContent className="sm:max-w-[450px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Tag className="w-5 h-5 text-fuchsia-600" />
              {editingClass
                ? __("Edit Shipping Class", "whizmanage")
                : __("Add Shipping Class", "whizmanage")}
            </DialogTitle>
            <DialogDescription>
              {__(
                "Shipping classes are used to group products for shipping rate calculation.",
                "whizmanage"
              )}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="class-name">
                {__("Shipping Class Name", "whizmanage")}
              </Label>
              <Input
                id="class-name"
                value={formData.name}
                onChange={(e) => {
                  const name = e.target.value;
                  setFormData((prev) => ({
                    ...prev,
                    name,
                    // Auto-generate slug if creating new and slug is empty or was auto-generated
                    slug:
                      !editingClass && (!prev.slug || prev.slug === generateSlug(prev.name))
                        ? generateSlug(name)
                        : prev.slug,
                  }));
                }}
                placeholder={__("e.g., Heavy Items", "whizmanage")}
                className="dark:bg-slate-700"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="class-slug">{__("Slug", "whizmanage")}</Label>
              <Input
                id="class-slug"
                value={formData.slug}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, slug: e.target.value }))
                }
                placeholder={__("e.g., heavy-items", "whizmanage")}
                className="dark:bg-slate-700 font-mono text-sm"
              />
              <p className="text-sm text-muted-foreground">
                {__(
                  "The slug is a unique identifier used in URLs and code.",
                  "whizmanage"
                )}
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="class-description">
                {__("Description", "whizmanage")}
              </Label>
              <Textarea
                id="class-description"
                value={formData.description}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, description: e.target.value }))
                }
                placeholder={__(
                  "Describe what this shipping class is for...",
                  "whizmanage"
                )}
                className="dark:bg-slate-700 min-h-[80px]"
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={handleCloseDialog}
              disabled={isSaving}
            >
              {__("Cancel", "whizmanage")}
            </Button>
            <Button
              onClick={handleSave}
              disabled={!formData.name.trim() || isSaving}
              className="bg-fuchsia-600 hover:bg-fuchsia-700"
            >
              {isSaving ? (
                <>
                  <Loader2 className="w-4 h-4 me-2 animate-spin" />
                  {__("Saving...", "whizmanage")}
                </>
              ) : editingClass ? (
                __("Update Class", "whizmanage")
              ) : (
                __("Create Class", "whizmanage")
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen} dir={isRtl ? "rtl" : "ltr"}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {__("Delete Shipping Class", "whizmanage")}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {__(
                "Are you sure you want to delete this shipping class? Products using this class will no longer have it assigned.",
                "whizmanage"
              )}
              {classToDelete?.count > 0 && (
                <span className="block mt-2 text-amber-600 dark:text-amber-400">
                  {__("Warning:", "whizmanage")}{" "}
                  {classToDelete.count}{" "}
                  {classToDelete.count === 1
                    ? __("product is", "whizmanage")
                    : __("products are", "whizmanage")}{" "}
                  {__("currently using this class.", "whizmanage")}
                </span>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isSaving}>
              {__("Cancel", "whizmanage")}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              disabled={isSaving}
              className="bg-red-600 hover:bg-red-700"
            >
              {isSaving ? (
                <>
                  <Loader2 className="w-4 h-4 me-2 animate-spin" />
                  {__("Deleting...", "whizmanage")}
                </>
              ) : (
                __("Delete", "whizmanage")
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
