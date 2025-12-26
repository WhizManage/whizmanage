// src/components/ui/custom/exportToExcel.jsx

import {
  Button,
  Modal,
  ModalBody,
  ModalContent,
  ModalFooter,
  RadioGroup,
  useDisclosure,
} from "@heroui/react";
import { Download } from "lucide-react";
import { useState } from "react";
import { AiOutlineWarning } from "react-icons/ai";
import * as XLSX from "xlsx";
import { Alert, AlertDescription, AlertTitle } from "../alert";
import { Label } from "../label";
import { CustomRadio } from "../nextUI/Radio";
import CustomTooltip from "./nextUI/Tooltip";

export default function ExportToExcel({
  selectedRows,
  setSelectedRows,
  ColumnsVisible,
}) {
  const { isOpen, onOpen, onOpenChange } = useDisclosure();
  const [selectedOption, setSelectedOption] = useState("all");

  const updateExport = () => {
    if (selectedOption === "all") {
      const allColumnsData = selectedRows.map(({ original }) => ({
        ...original,
        categories: original.categories
          ? original.categories.map((category) => category.name).join(", ")
          : "",
        tags: original.tags
          ? original.tags.map((tag) => tag.name).join(", ")
          : "",
      }));
      exportToExcel(allColumnsData);
    } else if (selectedOption === "table") {
      const updateSelectRow = selectedRows.map(({ original }) => {
        const newRow = ColumnsVisible.reduce((acc, { id }) => {
          acc[id] = original[id];
          return acc;
        }, {});
        if ("categories" in newRow) {
          newRow.categories = original.categories
            ? original.categories.map((category) => category.name).join(", ")
            : "";
        }

        if ("tags" in newRow) {
          newRow.tags = original.tags
            ? original.tags.map((tag) => tag.name).join(", ")
            : "";
        }
        return newRow;
      });

      exportToExcel(updateSelectRow);
    }
  };

  const exportToExcel = (data) => {
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Sheet1");
    const excelBuffer = XLSX.write(wb, { bookType: "xlsx", type: "array" });
    const blob = new Blob([excelBuffer], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;charset=UTF-8",
    });
    const fileName = "product table.xlsx";
    saveAs(blob, fileName);
  };

  const saveAs = (blob, fileName) => {
    const link = document.createElement( "a");
    link.href = window.URL.createObjectURL(blob);
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleAgree = (onClose) => {
    updateExport();
    setSelectedRows({});
    onClose();
  };

  return (
    <>
      <CustomTooltip title="Export to excel">
        <div
          className="flex flex-col w-full items-center justify-center gap-2 p-5 border-r hover:bg-fuchsia-50 dark:hover:bg-slate-800/50 hover:cursor-pointer transition-colors duration-200"
          onClick={onOpen}
        >
          <Download className="text-fuchsia-600 dark:text-fuchsia-400" />
          {/* <p>Export</p> */}
        </div>
      </CustomTooltip>

      <Modal
        size="xl"
        backdrop="blur"
        placement="top-center"
        isOpen={isOpen}
        onOpenChange={onOpenChange}
        isDismissable={true}
        classNames={{
          backdrop: "bg-black/50 backdrop-blur-sm",
          base: "border border-slate-200 dark:border-slate-700",
          body: "p-0",
          closeButton: "hover:bg-slate-100 dark:hover:bg-slate-800 active:bg-slate-200 dark:active:bg-slate-700 rounded-lg",
        }}
        motionProps={{
          variants: {
            enter: {
              y: 0,
              opacity: 1,
              transition: {
                duration: 0.3,
                ease: "easeOut",
              },
            },
            exit: {
              y: -20,
              opacity: 0,
              transition: {
                duration: 0.2,
                ease: "easeIn",
              },
            },
          },
        }}
      >
        <ModalContent className="bg-white dark:bg-slate-900 shadow-xl">
          {(onClose) => (
            <>
              <ModalBody className="p-6">
                <div className="mb-4">
                  <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-2">
                    Export to Excel
                  </h2>
                  <p className="text-slate-600 dark:text-slate-300 text-sm">
                    Export your data to an Excel file for further analysis
                  </p>
                </div>

                <Alert variant="warning" className="mb-6">
                  <AiOutlineWarning className="h-4 w-4" />
                  <AlertTitle>Warning</AlertTitle>
                  <AlertDescription>
                    Please be aware that updating products by importing a
                    modified Excel file may lead to unexpected issues. Use this
                    feature with caution as the system cannot be held
                    responsible for any resulting problems.
                  </AlertDescription>
                </Alert>

                <div className="w-full space-y-3">
                  <Label className="text-slate-900 dark:text-white font-medium">
                    Columns to export:
                  </Label>
                  <RadioGroup
                    value={selectedOption}
                    onValueChange={(value) => {
                      setSelectedOption(value);
                    }}
                    className="space-y-2"
                  >
                    <CustomRadio value="all">
                      <div className="flex flex-col">
                        <span className="font-medium">All columns</span>
                        <span className="text-sm text-slate-500 dark:text-slate-300">
                          Export all available data fields
                        </span>
                      </div>
                    </CustomRadio>
                    <CustomRadio value="table">
                      <div className="flex flex-col">
                        <span className="font-medium">Table columns only</span>
                        <span className="text-sm text-slate-500 dark:text-slate-300">
                          Export only the columns currently visible in the table
                        </span>
                      </div>
                    </CustomRadio>
                  </RadioGroup>
                </div>
              </ModalBody>

              <ModalFooter className="p-6 pt-0 border-t border-slate-200 dark:border-slate-700">
                <Button
                  color="default"
                  variant="bordered"
                  onPress={onClose}
                  className="border-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                >
                  Cancel
                </Button>
                <Button
                  color="primary"
                  className="bg-fuchsia-600 hover:bg-fuchsia-700 text-white transition-colors"
                  isDisabled={!selectedOption}
                  onPress={() => handleAgree(onClose)}
                >
                  <Download className="size-4 mr-2" />
                  Export Excel
                </Button>
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>
    </>
  );
}
