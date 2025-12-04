import { Button } from "@components/ui/button";
import { Input } from "@components/ui/input";
import { Label } from "@components/ui/label";
import {
  Modal,
  ModalBody,
  ModalContent,
  ModalFooter,
  ModalHeader,
  Switch,
  cn,
} from "@heroui/react";
import { Check } from "lucide-react";
import { useEffect, useState } from "react";
import { __ } from '@wordpress/i18n';
import { useTheme } from "../../ThemeProvider";
import { rgbToHex } from "./utils/colorUtils";

const TableEditorDialog = ({
  isOpen,
  onOpenChange,
  selectedTable,
  onContentChange,
  editorRef, // ← כדי לשדר reset
}) => {
   
  const { theme } = useTheme();
  const [width, setWidth] = useState(100);
  const [widthUnit, setWidthUnit] = useState("%");
  const [borderWidth, setBorderWidth] = useState(1);
  const [borderColor, setBorderColor] = useState("#ddd");
  const [borderStyle, setBorderStyle] = useState("solid");
  const [cellPadding, setCellPadding] = useState(8);
  const [hasHeader, setHasHeader] = useState(false);
  const [zebra, setZebra] = useState(false);
  const [zebraColor, setZebraColor] = useState("#f9f9f9");
  const [tableStructure, setTableStructure] = useState({ rows: 4, cols: 3, headerStyle: {} });

  useEffect(() => {
    if (selectedTable && isOpen) {
      const tableWidth = selectedTable.style.width || "";
      if (tableWidth.endsWith("%")) {
        setWidth(parseInt(tableWidth) || 100);
        setWidthUnit("%");
      } else if (tableWidth.endsWith("px")) {
        setWidth(parseInt(tableWidth) || 500);
        setWidthUnit("px");
      } else {
        setWidth(100);
        setWidthUnit("%");
      }

      const firstCell = selectedTable.querySelector("td, th");
      if (firstCell) {
        const borderValue = firstCell.style.border || "";
        const wMatch = borderValue.match(/(\d+)px/);
        setBorderWidth(wMatch ? parseInt(wMatch[1]) : 1);
        const sMatch = borderValue.match(/\d+px\s+(\w+)/);
        setBorderStyle(sMatch ? sMatch[1] : "solid");
        const cMatch = borderValue.match(/\d+px\s+\w+\s+([^;]+)/);
        setBorderColor(cMatch ? (cMatch[1].trim().startsWith("rgb") ? rgbToHex(cMatch[1].trim()) : cMatch[1].trim()) : "#ddd");
        const pad = parseInt(firstCell.style.padding);
        setCellPadding(isNaN(pad) ? 8 : pad);
      }

      const hasHeaderRow = !!selectedTable.querySelector("thead");
      setHasHeader(hasHeaderRow);

      let maxCols = 0;
      const rows = selectedTable.rows;
      for (let i = 0; i < rows.length; i++) maxCols = Math.max(maxCols, rows[i].cells.length);

      let headerStyle = {};
      if (hasHeaderRow) {
        const th = selectedTable.querySelector("th");
        if (th) {
          headerStyle = {
            backgroundColor: th.style.backgroundColor || "#f5f5f5",
            textAlign: th.style.textAlign || "center",
            fontWeight: th.style.fontWeight || "bold",
          };
        }
      }

      setTableStructure({ rows: rows.length, cols: maxCols, headerStyle });

      const hasZebraClass = selectedTable.classList.contains("zebra");
      setZebra(hasZebraClass);
      if (hasZebraClass) {
        const z = window.getComputedStyle(selectedTable).getPropertyValue("--zebra-color");
        setZebraColor(z && z !== "" ? rgbToHex(z) : theme === "dark" ? "#1e293b" : "#f9f9f9");
      }
    }
  }, [selectedTable, isOpen, theme]);

  const applyChanges = () => {
    if (!selectedTable) return;

    selectedTable.style.width = `${width}${widthUnit}`;
    selectedTable.style.borderCollapse = "collapse";

    const cellStyle = { border: `${borderWidth}px ${borderStyle} ${borderColor}`, padding: `${cellPadding}px` };
    selectedTable.querySelectorAll("td, th").forEach((cell) => {
      Object.entries(cellStyle).forEach(([k, v]) => (cell.style[k] = v));
      if (cell.tagName === "TH" && hasHeader) {
        cell.style.backgroundColor = tableStructure.headerStyle.backgroundColor || "#f5f5f5";
        cell.style.textAlign = tableStructure.headerStyle.textAlign || "center";
        cell.style.fontWeight = tableStructure.headerStyle.fontWeight || "bold";
      }
    });

    const existingHeader = selectedTable.querySelector("thead");
    const firstRow = selectedTable.rows[0];
    if (hasHeader && !existingHeader && firstRow) {
      const thead = document.createElement("thead");
      const tbody = document.createElement("tbody");

      const headerRow = firstRow.cloneNode(true);
      headerRow.querySelectorAll("td").forEach((cell) => {
        const th = document.createElement("th");
        th.innerHTML = cell.innerHTML;
        th.setAttribute("style", cell.getAttribute("style"));
        th.style.backgroundColor = tableStructure.headerStyle.backgroundColor || "#f5f5f5";
        th.style.textAlign = tableStructure.headerStyle.textAlign || "center";
        th.style.fontWeight = tableStructure.headerStyle.fontWeight || "bold";
        cell.parentNode.replaceChild(th, cell);
      });

      thead.appendChild(headerRow);
      for (let i = 1; i < selectedTable.rows.length; i++) tbody.appendChild(selectedTable.rows[i].cloneNode(true));

      while (selectedTable.firstChild) selectedTable.removeChild(selectedTable.firstChild);
      selectedTable.appendChild(thead);
      selectedTable.appendChild(tbody);
    } else if (!hasHeader && existingHeader) {
      const tbody = selectedTable.querySelector("tbody") || document.createElement("tbody");
      existingHeader.querySelectorAll("tr").forEach((row) => {
        const newRow = row.cloneNode(true);
        newRow.querySelectorAll("th").forEach((cell) => {
          const td = document.createElement("td");
          td.innerHTML = cell.innerHTML;
          td.setAttribute("style", cell.getAttribute("style"));
          td.style.backgroundColor = "";
          cell.parentNode.replaceChild(td, cell);
        });
        if (tbody.firstChild) tbody.insertBefore(newRow, tbody.firstChild);
        else tbody.appendChild(newRow);
      });

      while (selectedTable.firstChild) selectedTable.removeChild(selectedTable.firstChild);
      selectedTable.appendChild(tbody);
    }

    if (zebra) {
      selectedTable.classList.add("zebra");
      selectedTable.style.setProperty("--zebra-color", zebraColor);
    } else {
      selectedTable.classList.remove("zebra");
      selectedTable.style.removeProperty("--zebra-color");
    }

    onContentChange && onContentChange();

    // איפוס יזום של ה־Universal כדי לפרק resizers אחרי שינוי
    try {
      const doc = editorRef?.current?.contentDocument;
      doc?.dispatchEvent(new CustomEvent("umedia:reset", { bubbles: true, composed: true, detail: { reason: "table-edited" } }));
    } catch {}
  };

  return (
    <Modal
      isOpen={isOpen}
      onOpenChange={onOpenChange}
      size="xl"
      backdrop="opaque"
      placement="center"
      classNames={{
        backdrop: "bg-gradient-to-t from-zinc-900 to-zinc-900/10 backdrop-opacity-20",
        base: "dark:bg-slate-800 border border-slate-200 dark:border-slate-700",
        header: "dark:text-slate-200",
      }}
    >
      <ModalContent>
        {(onClose) => (
          <>
            <ModalHeader>{__("Edit Table", "whizmanage")}</ModalHeader>
            <ModalBody>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* General */}
                <div>
                  <h3 className="text-lg font-medium mb-3 dark:text-slate-200">{__("General", "whizmanage")}</h3>
                  <div className="flex flex-col gap-3">
                    <div>
                      <Label htmlFor="width" className="text-sm dark:text-slate-300">{__("Width", "whizmanage")}</Label>
                      <div className="flex dark:bg-slate-700 gap-0.5 mt-1">
                        <Input id="width" type="number" min="1" value={width}
                               onChange={(e) => setWidth(parseInt(e.target.value) || 100)}
                               className="flex-1 h-8 !rounded-r-none dark:!text-slate-300 dark:bg-slate-700 !border-border dark:!border-none" />
                        <select id="widthUnit" value={widthUnit} onChange={(e) => setWidthUnit(e.target.value)}
                                className="w-16 h-8 !rounded-l-none border-l-0 bg-transparent dark:!bg-slate-700 dark:!text-slate-300 rounded-md border border-input !border-border dark:border-none text-sm">
                          <option value="%">%</option>
                          <option value="px">px</option>
                        </select>
                      </div>
                    </div>

                    <div className="flex items-center gap-4 mt-2">
                      <Switch isSelected={hasHeader} onValueChange={setHasHeader} size="sm" />
                      <Label htmlFor="hasHeader" className="text-sm dark:text-slate-300">{__("Header row", "whizmanage")}</Label>
                    </div>
                  </div>

                  <h3 className="text-lg font-medium mt-6 mb-3 dark:text-slate-200">{__("Appearance", "whizmanage")}</h3>
                  <div className="flex flex-col gap-3">
                    <div className="flex items-center gap-4 mt-2">
                      <Switch isSelected={zebra} onValueChange={setZebra} size="sm" />
                      <Label className="text-sm dark:text-slate-300">{__("Zebra rows", "whizmanage")}</Label>
                    </div>

                    {zebra && (
                      <div>
                        <Label htmlFor="zebraColor" className="text-sm dark:text-slate-300">{__("Alternate row color", "whizmanage")}</Label>
                        <div className="flex items-center gap-2 mt-1">
                          <input type="color" id="zebraColor" value={zebraColor} onChange={(e) => setZebraColor(e.target.value)}
                                 className={cn("w-8 h-8 p-0 border-0 rounded", `!bg-[${zebraColor}]`)} />
                          <Input type="text" value={zebraColor} onChange={(e) => setZebraColor(e.target.value)}
                                 className="flex-1 h-8 dark:!text-slate-300 dark:bg-slate-700 !border-border dark:!border-none" />
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Borders */}
                <div>
                  <h3 className="text-lg font-medium mb-3 dark:text-slate-200">{__("Borders", "whizmanage")}</h3>
                  <div className="flex flex-col gap-3">
                    <div>
                      <Label htmlFor="borderWidth" className="text-sm dark:text-slate-300">{__("Border width", "whizmanage")}</Label>
                      <div className="flex mt-1">
                        <Input id="borderWidth" type="number" min="0" max="10" value={borderWidth}
                               onChange={(e) => setBorderWidth(parseInt(e.target.value) || 0)}
                               className="flex-1 h-8 !rounded-r-none dark:!text-slate-300 border dark:bg-slate-700 !border-border dark:!border-none" />
                        <div className="flex items-center justify-center w-8 h-8 text-sm text-gray-500 dark:text-slate-400 border border-l-0 dark:border-none rounded-r-md dark:bg-slate-700">px</div>
                      </div>
                    </div>

                    <div>
                      <Label htmlFor="borderStyle" className="text-sm dark:text-slate-300">{__("Border style", "whizmanage")}</Label>
                      <select id="borderStyle" value={borderStyle} onChange={(e) => setBorderStyle(e.target.value)}
                              className="w-full h-8 mt-1 px-3 py-1 bg-transparent dark:!bg-slate-700 dark:!text-slate-300 rounded-md border border-input !border-border dark:border-none text-sm">
                        <option value="solid">{__("Solid", "whizmanage")}</option>
                        <option value="dashed">{__("Dashed", "whizmanage")}</option>
                        <option value="dotted">{__("Dotted", "whizmanage")}</option>
                        <option value="double">{__("Double", "whizmanage")}</option>
                        <option value="none">{__("None", "whizmanage")}</option>
                      </select>
                    </div>

                    <div>
                      <Label htmlFor="borderColor" className="text-sm dark:text-slate-300">{__("Border color", "whizmanage")}</Label>
                      <div className="flex items-center gap-2 mt-1">
                        <input type="color" id="borderColor" value={borderColor} onChange={(e) => setBorderColor(e.target.value)}
                               className={cn("w-8 h-8 p-0 border-0 rounded", `!bg-[${borderColor}]`)} />
                        <Input type="text" value={borderColor} onChange={(e) => setBorderColor(e.target.value)}
                               className="flex-1 h-8 dark:!text-slate-300 dark:bg-slate-700 !border-border dark:!border-none" />
                      </div>
                    </div>

                    <div>
                      <Label htmlFor="cellPadding" className="text-sm dark:text-slate-300">{__("Cell padding", "whizmanage")}</Label>
                      <div className="flex mt-1">
                        <Input id="cellPadding" type="number" min="0" max="20" value={cellPadding}
                               onChange={(e) => setCellPadding(parseInt(e.target.value) || 0)}
                               className="flex-1 h-8 !rounded-r-none dark:!text-slate-300 dark:bg-slate-700 !border-border dark:!border-none" />
                        <div className="flex items-center justify-center w-8 h-8 text-sm text-gray-500 dark:text-slate-400 border border-l-0 dark:border-none rounded-r-md dark:bg-slate-700">px</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Preview */}
              <div className="border rounded p-3 mt-4 dark:border-slate-600">
                <h3 className="text-sm font-medium mb-2 dark:text-slate-300 text-center">{__("Preview", "whizmanage")}</h3>
                <div className="overflow-auto max-h-40 flex justify-center">
                  <table style={{ width: `${width}${widthUnit}`, borderCollapse: "collapse" }} className={zebra ? "zebra" : ""}>
                    {hasHeader && tableStructure.rows > 0 && (
                      <thead>
                        <tr>
                          {Array.from({ length: tableStructure.cols }).map((_, j) => (
                            <th key={j}
                                style={{
                                  border: `${borderWidth}px ${borderStyle} ${borderColor}`,
                                  padding: `${cellPadding}px`,
                                  backgroundColor: tableStructure.headerStyle.backgroundColor || (theme === "dark" ? "#334155" : "#f5f5f5"),
                                  textAlign: tableStructure.headerStyle.textAlign || "center",
                                  fontWeight: tableStructure.headerStyle.fontWeight || "bold",
                                }}>
                              {__("Header", "whizmanage")} {j + 1}
                            </th>
                          ))}
                        </tr>
                      </thead>
                    )}
                    <tbody>
                      {Array.from({ length: hasHeader ? tableStructure.rows - 1 : tableStructure.rows }).map((_, i) => (
                        <tr key={i} style={zebra && i % 2 === 1 ? { backgroundColor: zebraColor } : {}}>
                          {Array.from({ length: tableStructure.cols }).map((_, j) => (
                            <td key={j}
                                style={{ border: `${borderWidth}px ${borderStyle} ${borderColor}`, padding: `${cellPadding}px`, textAlign: "center" }}>
                              {__("Cell", "whizmanage")} {i + 1}.{j + 1}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </ModalBody>

            <ModalFooter>
              <Button variant="outline" onClick={onClose}>{__("Cancel", "whizmanage")}</Button>
              <Button onClick={() => { applyChanges(); onClose(); }} className="flex gap-2 items-center">
                <Check className="size-4" /> {__("Apply", "whizmanage")}
              </Button>
            </ModalFooter>
          </>
        )}
      </ModalContent>
    </Modal>
  );
};

export default TableEditorDialog;
