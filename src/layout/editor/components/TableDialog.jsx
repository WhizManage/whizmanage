import { useState, useEffect } from 'react';
import { Modal, ModalContent, ModalHeader, ModalBody, ModalFooter } from '@heroui/react';
import { Button } from '@components/ui/button';
import { Input } from '@components/ui/input';
import { Label } from '@components/ui/label';
  import { __ } from '@wordpress/i18n';
const TableDialog = ({ isOpen, onClose, onInsert, row, currency = '' }) => {
   
  const [rows, setRows] = useState(3);
  const [cols, setCols] = useState(3);
  const [hasBorder, setHasBorder] = useState(true);
  const [hasHeader, setHasHeader] = useState(true);
  const [width, setWidth] = useState(100);
  const [borderColor, setBorderColor] = useState('#ddd');
  const [tablePreview, setTablePreview] = useState([]);
  const [headerLabels, setHeaderLabels] = useState([]);
  const [tableData, setTableData] = useState([]);


  useEffect(() => {
    generateTablePreview();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows, cols, hasBorder, hasHeader]);

  const generateTablePreview = () => {
    const preview = [];
    for (let i = 0; i < Math.min(rows, 5); i++) {
      const rowArr = [];
      for (let j = 0; j < Math.min(cols, 5); j++) {
        rowArr.push('\u00A0');
      }
      preview.push(rowArr);
    }
    setTablePreview(preview);
  };

  const handleInsert = () => {
    const cellStyle = `${hasBorder ? `border: 1px solid ${borderColor};` : ''}padding: 8px;`;
    let tableHtml = `<table style="width:${width}%; border-collapse: collapse; margin-left:auto; margin-right:auto;">`;

    if (hasHeader) {
      tableHtml += '<thead><tr>';
      const headers = headerLabels.length ? headerLabels : Array.from({ length: cols }, (_, j) => `${__('Header', "whizmanage")} ${j + 1}`);
      headers.forEach((label) => {
        tableHtml += `<th style="${cellStyle}">${label}</th>`;
      });
      tableHtml += '</tr></thead>';
    }

    tableHtml += '<tbody>';
    const data = tableData.length ? tableData : Array.from({ length: rows }, () => Array.from({ length: cols }, () => '&nbsp;'));
    data.forEach((rowArr) => {
      tableHtml += '<tr>';
      rowArr.forEach((cell) => {
        tableHtml += `<td style="${cellStyle}">${cell}</td>`;
      });
      tableHtml += '</tr>';
    });
    tableHtml += '</tbody></table>';

    onInsert(tableHtml);
    onClose();
  };

  const generateTableVariations = () => {
    const attrsRaw = row?.attributes ?? [];
    const attributes = Array.isArray(attrsRaw)
      ? attrsRaw
      : (() => { try { return JSON.parse(attrsRaw); } catch { return []; } })();

    if (!attributes.length || !Array.isArray(row?.subRows)) return;

    const headers = attributes.map(a => (a?.name ?? '').replace(/^./, c => c.toUpperCase()));
    headers.push(t('Price'));
    setHeaderLabels(headers);
    setCols(headers.length);

    const rowsWithPrice = row.subRows.map((sub) => [
      ...((sub?.attributes ?? []).map(att => att?.option ?? '')),
      `${sub?.price ?? ''}${currency}`
    ]);

    if (!rowsWithPrice.length) return;

    setTableData(rowsWithPrice);
    setTablePreview(rowsWithPrice);
    setRows(rowsWithPrice.length);
  };

  return (
    <Modal
      isOpen={isOpen}
      onOpenChange={onClose}
      size="lg"
      backdrop="opaque"
      placement="center"
      classNames={{
        backdrop: 'bg-gradient-to-t from-zinc-900 to-zinc-900/10 backdrop-opacity-20',
        base: 'dark:bg-slate-800 border border-slate-200 dark:border-slate-700',
      }}
    >
      <ModalContent>
        {(onCloseFunc) => (
          <>
            <ModalHeader>{__('Insert Table', "whizmanage")}</ModalHeader>
            <Button variant="outline" size="sm" onClick={generateTableVariations} className="flex mx-7 items-center">
              {__('Generate Variations Table', "whizmanage")}
            </Button>
            <ModalBody>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="flex flex-col gap-4">
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="rows">{__('Rows', "whizmanage")}</Label>
                    <Input id="rows" type="number" min="1" max="20" value={rows}
                      onChange={(e) => setRows(parseInt(e.target.value, 10) || 1)} />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="cols">{__('Columns', "whizmanage")}</Label>
                    <Input id="cols" type="number" min="1" max="20" value={cols}
                      onChange={(e) => setCols(parseInt(e.target.value, 10) || 1)} />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="width">{__('Width', "whizmanage")}</Label>
                    <div className="flex items-center">
                      <Input id="width" type="number" min="1" max="100" value={width}
                        onChange={(e) => setWidth(parseInt(e.target.value, 10) || 100)} className="flex-1" />
                      <span className="ml-2">%</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <input type="checkbox" id="hasBorder" checked={hasBorder}
                      onChange={(e) => setHasBorder(e.target.checked)} />
                    <Label htmlFor="hasBorder">{__('Add border', "whizmanage")}</Label>
                  </div>

                  <div className="flex items-center gap-2">
                    <input type="checkbox" id="hasHeader" checked={hasHeader}
                      onChange={(e) => setHasHeader(e.target.checked)} />
                    <Label htmlFor="hasHeader">{__('Add header row', "whizmanage")}</Label>
                  </div>

                  {hasBorder && (
                    <div className="flex flex-col gap-1.5">
                      <Label htmlFor="borderColor">{__('Border color', "whizmanage")}</Label>
                      <div className="flex items-center">
                        <input type="color" id="borderColor" value={borderColor}
                          onChange={(e) => setBorderColor(e.target.value)} className="w-10 h-10 p-0 border-0 rounded" />
                        <Input type="text" value={borderColor}
                          onChange={(e) => setBorderColor(e.target.value)} className="flex-1 ml-2" />
                      </div>
                    </div>
                  )}
                </div>

                <div className="overflow-auto border rounded p-2 dark:border-slate-600">
                  <h3 className="text-sm mb-2">{__('Preview', "whizmanage")}</h3>
                  <table style={{ width: `${width}%`, borderCollapse: 'collapse' }}>
                    {hasHeader && (
                      <thead>
                        <tr>
                          {(headerLabels.length > 0 ? headerLabels.slice(0, 5)
                            : Array.from({ length: Math.min(cols, 5) }).map((_, j) => `${__('H', "whizmanage")}${j + 1}`))
                            .map((label, j) => (
                              <th key={`header-${j}`} className="px-2 py-1 text-center text-xs"
                                  style={{ border: hasBorder ? `1px solid ${borderColor}` : 'none' }}>
                                {label}
                              </th>
                            ))}
                        </tr>
                      </thead>
                    )}
                    <tbody>
                      {(tableData.length > 0 ? tableData.slice(0, 5) : tablePreview).map((rowArr, i) => (
                        <tr key={`row-${i}`}>
                          {rowArr.slice(0, 5).map((cell, j) => (
                            <td key={`cell-${i}-${j}`} className="px-2 py-1 text-center text-xs"
                                style={{ border: hasBorder ? `1px solid ${borderColor}` : 'none' }}>
                              {cell}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {(rows > 5 || cols > 5) && (
                    <div className="text-xs mt-2 text-center text-slate-500">
                      {__('Preview shows up to 5 rows/columns', "whizmanage")}
                    </div>
                  )}
                </div>
              </div>
            </ModalBody>
            <ModalFooter>
              <Button variant="outline" onClick={onCloseFunc} aria-label={__('Cancel', "whizmanage")}>{__('Cancel', "whizmanage")}</Button>
              <Button onClick={handleInsert} aria-label={__('Insert Table', "whizmanage")}>{__('Insert Table', "whizmanage")}</Button>
            </ModalFooter>
          </>
        )}
      </ModalContent>
    </Modal>
  );
};

export default TableDialog;
