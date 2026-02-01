// src/components/settings/tabs/shipping/ShippingZoneCard.jsx

import { useState } from "react";
import { __ } from "@wordpress/i18n";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { restrictToVerticalAxis } from "@dnd-kit/modifiers";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import {
  MapPin,
  ChevronDown,
  ChevronUp,
  Plus,
  Pencil,
  Trash2,
  Truck,
  Gift,
  Store,
} from "lucide-react";
import ShippingMethodRow from "./ShippingMethodRow";
import MethodDialog from "./MethodDialog";

const METHOD_ICONS = {
  flat_rate: Truck,
  free_shipping: Gift,
  local_pickup: Store,
};

export default function ShippingZoneCard({
  zone,
  isDefault = false,
  availableLocations,
  availableMethods = [],
  onEdit,
  onDelete,
  onAddMethod,
  onUpdateMethod,
  onDeleteMethod,
  onToggleMethod,
  onReorderMethods,
  isSaving,
}) {
  const [isOpen, setIsOpen] = useState(true);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [methodDialogOpen, setMethodDialogOpen] = useState(false);
  const [editingMethod, setEditingMethod] = useState(null);
  const isRtl = window?.document?.documentElement?.dir === "rtl";

  // DnD sensors
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = zone.methods.findIndex(
        (m) => m.instance_id === active.id
      );
      const newIndex = zone.methods.findIndex(
        (m) => m.instance_id === over.id
      );

      if (oldIndex !== -1 && newIndex !== -1) {
        onReorderMethods(oldIndex, newIndex);
      }
    }
  };

  const handleAddMethod = async (methodId) => {
    await onAddMethod(methodId);
  };

  const handleEditMethod = (method) => {
    setEditingMethod(method);
    setMethodDialogOpen(true);
  };

  const handleSaveMethod = async (data) => {
    await onUpdateMethod(editingMethod.instance_id, data);
    setMethodDialogOpen(false);
    setEditingMethod(null);
  };

  const handleCloseMethodDialog = () => {
    setMethodDialogOpen(false);
    setEditingMethod(null);
  };

  // For default zone, render just the methods section
  if (isDefault) {
    return (
      <>
        <CardContent className="space-y-4">
          {zone.methods.length === 0 ? (
            <p className="text-sm text-slate-500 dark:text-slate-400 py-4 text-center">
              {__("No shipping methods configured for this zone.", "whizmanage")}
            </p>
          ) : (
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
              modifiers={[restrictToVerticalAxis]}
            >
              <SortableContext
                items={zone.methods.map((m) => m.instance_id)}
                strategy={verticalListSortingStrategy}
              >
                <div className="space-y-2">
                  {zone.methods.map((method) => (
                    <ShippingMethodRow
                      key={method.instance_id}
                      method={method}
                      onEdit={() => handleEditMethod(method)}
                      onDelete={() => onDeleteMethod(method.instance_id)}
                      onToggle={(enabled) =>
                        onToggleMethod(method.instance_id, enabled)
                      }
                      isSaving={isSaving}
                      isDraggable={zone.methods.length > 1}
                    />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          )}

          {/* Add Method Dropdown */}
          <DropdownMenu dir={isRtl ? "rtl" : "ltr"}>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="dark:bg-slate-700 dark:border-slate-600"
                disabled={isSaving}
              >
                <Plus className="w-4 h-4 me-2" />
                {__("Add Shipping Method", "whizmanage")}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align={isRtl ? "end" : "start"}>
              {availableMethods.map((method) => {
                const Icon = METHOD_ICONS[method.id] || Truck;
                return (
                  <DropdownMenuItem
                    key={method.id}
                    onClick={() => handleAddMethod(method.id)}
                  >
                    <Icon className="w-4 h-4 me-2" />
                    {method.title}
                  </DropdownMenuItem>
                );
              })}
            </DropdownMenuContent>
          </DropdownMenu>
        </CardContent>

        {/* Method Edit Dialog */}
        <MethodDialog
          open={methodDialogOpen}
          onOpenChange={handleCloseMethodDialog}
          method={editingMethod}
          onSave={handleSaveMethod}
          isSaving={isSaving}
        />
      </>
    );
  }

  // Regular zone card with collapsible
  return (
    <>
      <Card className="bg-white dark:bg-slate-700/50 border-slate-200 dark:border-slate-600">
        <Collapsible open={isOpen} onOpenChange={setIsOpen}>
          {/* Zone Header */}
          <div className="p-4 sm:p-6 border-b border-slate-200 dark:border-slate-600">
            <div className="flex items-center justify-between gap-3">
              <CollapsibleTrigger asChild>
                <button className="flex items-center gap-3 flex-1 text-start hover:opacity-80 transition-opacity">
                  <div className="p-2 rounded-lg bg-fuchsia-100 dark:bg-fuchsia-900/30">
                    <MapPin className="w-5 h-5 text-fuchsia-600 dark:text-fuchsia-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-slate-800 dark:text-slate-200 truncate">
                      {zone.name}
                    </h3>
                    <p className="text-sm text-slate-500 dark:text-slate-400 truncate">
                      {zone.formatted_location ||
                        __("No locations", "whizmanage")}
                    </p>
                  </div>
                  {isOpen ? (
                    <ChevronUp className="w-5 h-5 text-slate-400 shrink-0" />
                  ) : (
                    <ChevronDown className="w-5 h-5 text-slate-400 shrink-0" />
                  )}
                </button>
              </CollapsibleTrigger>

              {/* Zone Actions */}
              <div className="flex items-center gap-1 shrink-0">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={onEdit}
                  disabled={isSaving}
                  className="h-8 w-8"
                >
                  <Pencil className="w-4 h-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setDeleteDialogOpen(true)}
                  disabled={isSaving}
                  className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-100 dark:hover:bg-red-900/30"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>

          {/* Collapsible Methods Section */}
          <CollapsibleContent>
            <CardContent className="space-y-4 pt-4">
              {zone.methods.length === 0 ? (
                <p className="text-sm text-slate-500 dark:text-slate-400 py-4 text-center">
                  {__(
                    "No shipping methods configured for this zone.",
                    "whizmanage"
                  )}
                </p>
              ) : (
                <DndContext
                  sensors={sensors}
                  collisionDetection={closestCenter}
                  onDragEnd={handleDragEnd}
                  modifiers={[restrictToVerticalAxis]}
                >
                  <SortableContext
                    items={zone.methods.map((m) => m.instance_id)}
                    strategy={verticalListSortingStrategy}
                  >
                    <div className="space-y-2">
                      {zone.methods.map((method) => (
                        <ShippingMethodRow
                          key={method.instance_id}
                          method={method}
                          onEdit={() => handleEditMethod(method)}
                          onDelete={() => onDeleteMethod(method.instance_id)}
                          onToggle={(enabled) =>
                            onToggleMethod(method.instance_id, enabled)
                          }
                          isSaving={isSaving}
                          isDraggable={zone.methods.length > 1}
                        />
                      ))}
                    </div>
                  </SortableContext>
                </DndContext>
              )}

              {/* Add Method Dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className="dark:bg-slate-700 dark:border-slate-600"
                    disabled={isSaving}
                  >
                    <Plus className="w-4 h-4 me-2" />
                    {__("Add Shipping Method", "whizmanage")}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start">
                  {availableMethods.map((method) => {
                    const Icon = METHOD_ICONS[method.id] || Truck;
                    return (
                      <DropdownMenuItem
                        key={method.id}
                        onClick={() => handleAddMethod(method.id)}
                      >
                        <Icon className="w-4 h-4 me-2" />
                        {method.title}
                      </DropdownMenuItem>
                    );
                  })}
                </DropdownMenuContent>
              </DropdownMenu>
            </CardContent>
          </CollapsibleContent>
        </Collapsible>
      </Card>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen} dir={isRtl ? "rtl" : "ltr"}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {__("Delete Shipping Zone", "whizmanage")}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {__(
                "Are you sure you want to delete this shipping zone? This action cannot be undone.",
                "whizmanage"
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{__("Cancel", "whizmanage")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={onDelete}
              className="bg-red-600 hover:bg-red-700"
            >
              {__("Delete", "whizmanage")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Method Edit Dialog */}
      <MethodDialog
        open={methodDialogOpen}
        onOpenChange={handleCloseMethodDialog}
        method={editingMethod}
        onSave={handleSaveMethod}
        isSaving={isSaving}
      />
    </>
  );
}
