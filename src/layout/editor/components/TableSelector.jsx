// ================================
// File: components/TableSelector.jsx
// ================================
import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
  import { __ } from '@wordpress/i18n';
import { Button } from '@components/ui/button';
import { Trash2, Settings, ChevronDown, PlusCircle } from 'lucide-react';
import TableEditorDialog from './TableEditorDialog';
import { useTheme } from '../../ThemeProvider';

/* ===== helper: שינוי רוחב באחוזים (אופציונלי) ===== */
export function setTableWidthPct(table, pct) {
  table.style.width = `${pct}%`;
  table.style.maxWidth = '100%';
  table.style.display = 'table';
  table.style.float = 'none';
  table.style.margin = '0 auto';
}

const TableSelector = ({ editorRef, execCommand, onContentChange }) => {
   
  const { theme } = useTheme();

  const [selectedTable, setSelectedTable] = useState(null);
  const [selectedCell, setSelectedCell] = useState(null);
  const [showToolbar, setShowToolbar] = useState(false);
  const [toolbarPosition, setToolbarPosition] = useState({ top: 0, left: 0, width: 0 });
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [showRowOptions, setShowRowOptions] = useState(false);
  const [showColumnOptions, setShowColumnOptions] = useState(false);

  const toolbarRef = useRef(null);
  const placeAboveRef = useRef(null);

  // rAF follow
  const followRAF = useRef(null);
  const lastRectRef = useRef({ top: 0, left: 0, width: 0 });

  /* ===== מיקום הטולבר ===== */
  const positionToolbar = (tableEl) => {
    if (!tableEl || !editorRef?.current) return;
    if (!tableEl.isConnected) return;

    try {
      const rect = tableEl.getBoundingClientRect();
      const iframeRect = editorRef.current.getBoundingClientRect();

      if (rect.width === 0 || rect.height === 0) {
        requestAnimationFrame(() => positionToolbar(tableEl));
        return;
      }

      const approxH = toolbarRef.current?.offsetHeight ?? 36;
      const margin = 8;

      // lock side during interaction to avoid flicker
      let placeAbove = placeAboveRef.current;
      if (placeAbove == null) {
        placeAbove = (rect.top + iframeRect.top - approxH - margin) >= margin;
        placeAboveRef.current = placeAbove;
      }

      const top = placeAbove
        ? rect.top + iframeRect.top - approxH - margin
        : rect.bottom + iframeRect.top + margin;

      const left = rect.left + iframeRect.left;

      const maxLeft = Math.max(0, window.innerWidth - 200); // רוחב משוער של הטולבר
      const finalLeft = Math.max(0, Math.min(left, maxLeft));
      const finalTop = Math.max(0, top);

      setToolbarPosition({ top: finalTop, left: finalLeft, width: rect.width });

      lastRectRef.current = {
        top: rect.top,
        left: rect.left,
        width: rect.width,
        iframeTop: iframeRect.top,
        iframeLeft: iframeRect.left
      };
    } catch (error) {
      console.error('Error positioning toolbar:', error);
    }
  };

  const startFollow = () => {
    if (followRAF.current || !selectedTable || isDialogOpen) return;
    const tick = () => {
      if (!showToolbar || !selectedTable || isDialogOpen) {
        followRAF.current = null;
        return;
      }

      // אם ה-node נותק, נסה למצוא מחדש
      if (selectedTable && !selectedTable.isConnected) {
        const doc = editorRef?.current?.contentDocument;
        const reSel =
          doc?.querySelector('table.selected, table.umedia-selected') ||
          doc?.querySelector('table');
        if (reSel) {
          setSelectedTable(reSel);
          positionToolbar(reSel);
        } else {
          setShowToolbar(false);
          followRAF.current = null;
          return;
        }
      }

      const rect = selectedTable.getBoundingClientRect();
      const iframeRect = editorRef?.current?.getBoundingClientRect?.() || { top: 0, left: 0 };
      const last = lastRectRef.current;
      if (
        Math.abs(rect.top - last.top) > 0.5 ||
        Math.abs(rect.left - last.left) > 0.5 ||
        Math.abs(rect.width - last.width) > 0.5 ||
        Math.abs(iframeRect.top - (last.iframeTop || 0)) > 0.5 ||
        Math.abs(iframeRect.left - (last.iframeLeft || 0)) > 0.5
      ) {
        positionToolbar(selectedTable);
      }
      followRAF.current = requestAnimationFrame(tick);
    };
    positionToolbar(selectedTable);
    followRAF.current = requestAnimationFrame(tick);
  };

  const stopFollow = () => {
    if (followRAF.current) {
      cancelAnimationFrame(followRAF.current);
      followRAF.current = null;
    }
  };

  /* ===== איפוס/סנכרון ה־Universal Resizer אחרי שינויים ===== */
  const resetUniversalOverlay = (reason = 'table-structure-changed') => {
    const win = editorRef?.current?.contentWindow;
    const doc = editorRef?.current?.contentDocument;
    try {
      doc?.dispatchEvent(
        new CustomEvent('umedia:reset', {
          bubbles: true,
          composed: true,
          detail: { reason },
        })
      );
      requestAnimationFrame(() => {
        win?.dispatchEvent(new Event('resize'));
        doc?.dispatchEvent(new Event('scroll'));
      });
    } catch {}
  };

  /* ===== הבטחת רפרנסים “חיים” לפני כל פעולה ===== */
  const getActiveRefs = () => {
    const doc = editorRef?.current?.contentDocument;
    let table = selectedTable?.isConnected ? selectedTable : (
      doc?.querySelector('table.selected, table.umedia-selected') || doc?.querySelector('table')
    );
    if (table !== selectedTable) setSelectedTable(table || null);

    let cell = selectedCell?.isConnected ? selectedCell : (
      doc?.querySelector('td.selected, th.selected') || table?.querySelector('td, th')
    );
    if (cell && !cell.classList.contains('selected')) {
      try { _cell.classList.add('selected'); } catch {}
    }
    if (cell !== selectedCell) setSelectedCell(cell || null);

    return { table, cell, doc };
  };

  // בזמן ריסייז, לעדכן מיקום הטולבר
  useEffect(() => {
    const doc = editorRef?.current?.contentDocument;
    if (!doc) return;
    const onStart = () => { if (selectedTable && showToolbar) positionToolbar(selectedTable); };
    const onEnd = () => { if (selectedTable && showToolbar) { positionToolbar(selectedTable); startFollow(); } };
    const onAny = () => { if (selectedTable && showToolbar) positionToolbar(selectedTable); };

    const onTablePosChanged = (e) => {
  const t = e?.detail?.table || selectedTable;
  if (t) {
    setSelectedTable(t);
    // Ensure a cell is selected so row/column actions are available
    let cell = t.querySelector('td.selected, th.selected') || t.querySelector('td, th');
    if (cell && !cell.classList.contains('selected')) {
      try { _cell.classList.add('selected'); } catch {}
    }
    setSelectedCell(cell || null);

    placeAboveRef.current = null;
    positionToolbar(t);
    startFollow();
  }
};

    doc.addEventListener('umedia:resize:start', onStart);
    doc.addEventListener('umedia:resize:end', onEnd);
    doc.addEventListener('scroll', onAny, { passive: true });
    window.addEventListener('scroll', onAny, { passive: true });
    doc.addEventListener('table-position-changed', onTablePosChanged);

    return () => {
      doc.removeEventListener('umedia:resize:start', onStart);
      doc.removeEventListener('umedia:resize:end', onEnd);
      doc.removeEventListener('scroll', onAny);
      window.removeEventListener('scroll', onAny);
      doc.removeEventListener('table-position-changed', onTablePosChanged);
    };
  }, [editorRef, selectedTable, showToolbar]);

  useEffect(() => {
    if (showToolbar && selectedTable && !isDialogOpen) startFollow();
    else stopFollow();
  }, [showToolbar, selectedTable, isDialogOpen]);

  
  /* ===== Ensure a cell is selected (for row/column actions) ===== */
  const ensureCellSelected = (table) => {
    const t = table || selectedTable;
    if (!t) return null;
    let cell = t.querySelector('td.selected, th.selected') || t.querySelector('td, th');
    if (cell && !cell.classList.contains('selected')) {
      try { _cell.classList.add('selected'); } catch {}
    }
    if (cell !== selectedCell) setSelectedCell(cell || null);
    return cell || null;
  };
/* ===== Utilities ===== */
  const hasHeader = () => selectedTable && selectedTable.querySelector('thead') !== null;

  const getHeaderStyle = () => {
    const headerCell = selectedTable && selectedTable.querySelector('thead th');
    if (headerCell) {
      return {
        backgroundColor: headerCell.style.backgroundColor || '#f5f5f5',
        textAlign: headerCell.style.textAlign || 'center',
        fontWeight: headerCell.style.fontWeight || 'bold',
      };
    }
    return { backgroundColor: '#f5f5f5', textAlign: 'center', fontWeight: 'bold' };
  };

  const updateContent = () => {
    if (editorRef?.current) {
      const html = editorRef.current.contentDocument?.body?.innerHTML;
      onContentChange && onContentChange(html);
    }
    // אחרי עדכון התוכן: מציאת הטבלה מחדש אם צריך, ריהיידר לתא אם נותק, ואז reset
    requestAnimationFrame(() => {
      const { table, cell, doc } = getActiveRefs();
      if (table) positionToolbar(table);
      // אם אין תא מסומן חי — ננסה לבחור תא ראשון בטבלה הנוכחית
      if (!cell && table) {
        const first = table.querySelector('td, th');
        if (first) {
          try { first.classList.add('selected'); } catch {}
          setSelectedCell(first);
        }
      }
      resetUniversalOverlay('table-mutated');
    });
  };

  /* ===== פעולות שורה/עמודה ===== */
  const insertRowAbove = () => {
    const { table, cell } = getActiveRefs();
    if (!cell || !table) return;
    const row = cell.parentNode;
    if (!row || !row.parentNode) return;

    const newRow = row.cloneNode(true);
    Array.from(newRow.cells).forEach(c => { c.innerHTML = '&nbsp;'; c.classList.remove('selected'); });
    Array.from(newRow.querySelectorAll('[id]')).forEach(el => el.removeAttribute('id'));

    row.parentNode.insertBefore(newRow, row);
    setShowRowOptions(false);
    resetUniversalOverlay('row-inserted');
    updateContent();
  };

  const insertRowBelow = () => {
    const { table, cell } = getActiveRefs();
    if (!cell || !table) return;
    const row = cell.parentNode;
    if (!row || !row.parentNode) return;

    const newRow = row.cloneNode(true);
    Array.from(newRow.cells).forEach(c => { c.innerHTML = '&nbsp;'; c.classList.remove('selected'); });
    Array.from(newRow.querySelectorAll('[id]')).forEach(el => el.removeAttribute('id'));

    if (row.nextSibling) row.parentNode.insertBefore(newRow, row.nextSibling);
    else row.parentNode.appendChild(newRow);

    setShowRowOptions(false);
    resetUniversalOverlay('row-inserted');
    updateContent();
  };

  const insertColumnLeft = () => {
    const { table, cell } = getActiveRefs();
    if (!cell || !table) return;

    const cellIndex = cell.cellIndex;
    const isHdr = hasHeader();
    const headerStyle = getHeaderStyle();
    Array.from(table.rows).forEach((row, rowIndex) => {
      const newCell = row.insertCell(cellIndex);
      newCell.innerHTML = '&nbsp;';
      const baseStyle = (cell?.getAttribute?.('style') || '') + '; padding:8px; min-width:80px; min-height:30px;';
      newCell.setAttribute('style', baseStyle);
      const isInThead = row.parentNode.tagName === 'THEAD';
      // THEAD מחיל סטייל גם אם זו TD (דפדפנים מחזירים TD ב-insertCell)
      if (isInThead || (isHdr && rowIndex === 0)) {
        newCell.style.backgroundColor = headerStyle.backgroundColor;
        newCell.style.textAlign = headerStyle.textAlign;
        newCell.style.fontWeight = headerStyle.fontWeight;
      }
    });
    setShowColumnOptions(false);
    resetUniversalOverlay('col-inserted');
    updateContent();
  };

  const insertColumnRight = () => {
    const { table, cell } = getActiveRefs();
    if (!cell || !table) return;

    const cellIndex = cell.cellIndex;
    const isHdr = hasHeader();
    const headerStyle = getHeaderStyle();
    Array.from(table.rows).forEach((row, rowIndex) => {
      const newCell = row.insertCell(cellIndex + 1);
      newCell.innerHTML = '&nbsp;';
      const baseStyle = (cell?.getAttribute?.('style') || '') + '; padding:8px; min-width:80px; min-height:30px;';
      newCell.setAttribute('style', baseStyle);
      const isInThead = row.parentNode.tagName === 'THEAD';
      if (isInThead || (isHdr && rowIndex === 0)) {
        newCell.style.backgroundColor = headerStyle.backgroundColor;
        newCell.style.textAlign = headerStyle.textAlign;
        newCell.style.fontWeight = headerStyle.fontWeight;
      }
    });
    setShowColumnOptions(false);
    resetUniversalOverlay('col-inserted');
    updateContent();
  };

  const deleteRow = () => {
    const { table, cell } = getActiveRefs();
    if (!cell || !table) return;
    const row = cell.parentNode;
    if (!row || !row.parentNode) return;

    if (table && table.rows.length > 1) {
      row.parentNode.removeChild(row);
      setShowRowOptions(false);
      resetUniversalOverlay('row-deleted');
      updateContent();
    } else {
      alert(t('Cannot delete the last row'));
    }
  };

  const deleteColumn = () => {
    const { table, cell } = getActiveRefs();
    if (!cell || !table) return;

    const cellIndex = cell.cellIndex;
    if (table.rows[0] && table.rows[0].cells.length > 1) {
      Array.from(table.rows).forEach(r => { if (r.cells[cellIndex]) r.deleteCell(cellIndex); });
      setShowColumnOptions(false);
      resetUniversalOverlay('col-deleted');
      updateContent();
    } else {
      alert(t('Cannot delete the last column'));
    }
  };

  /* ===== מחיקה/הגדרות ===== */
  const deleteTable = () => {
    const { table } = getActiveRefs();
    if (!table) return;

    // אם הטבלה עטופה ע"י ה-Universal – נמחק את כל העטיפה כדי שלא יישארו handles
    const wrap = table._um_wrap;
    if (wrap && wrap.parentNode) {
      wrap.parentNode.removeChild(wrap);
    } else if (table.parentNode) {
      table.parentNode.removeChild(table);
    }

    // איפוס מיידי לניקוי סטייט פנימי/בחירה כדי למנוע כפילות
    resetUniversalOverlay('table-deleted');

    setSelectedTable(null);
    setSelectedCell(null);
    setShowToolbar(false);
    stopFollow();

    updateContent(); // יעשה גם reset נוסף אחרי ההתייצבות
  };

  const openTableSettings = () => {
    setIsDialogOpen(true);
    setShowToolbar(false);
    stopFollow();
  };

  /* ===== טולבר ===== */
  const renderToolbar = () => {
    if (!showToolbar || !selectedTable || isDialogOpen) return null;

    const isDarkMode = theme === 'dark';
    const style = {
      position: 'fixed',
      top: `${toolbarPosition.top}px`,
      left: `${toolbarPosition.left}px`,
      zIndex: 1000,
      display: 'flex',
      flexDirection: 'row',
      alignItems: 'center',
      gap: '4px',
      background: isDarkMode ? '#1e293b' : 'white',
      borderRadius: '6px',
      boxShadow: '0 2px 8px rgba(0,0,0,0.12)',
      padding: '4px 8px',
      pointerEvents: 'auto',
      border: `1px solid ${isDarkMode ? '#334155' : '#e2e8f0'}`,
    };

    return createPortal(
      <div
        ref={toolbarRef}
        className="table-toolbar dark:bg-slate-800 border dark:border-slate-700"
        style={style}
        onClick={(e) => e.stopPropagation()}
      >
        <Button size="xs" variant="ghost" className="h-7 w-7 p-0 rounded-md" onClick={openTableSettings} title={__('Table settings', "whizmanage")}>
          <Settings className="size-4" />
        </Button>
        <Button size="xs" variant="ghost" className="h-7 w-7 p-0 rounded-md" onClick={deleteTable} title={__('Delete table', "whizmanage")}>
          <Trash2 className="size-4" />
        </Button>

        {selectedCell && (
          <>
            <div className="h-4 w-px bg-slate-300 dark:bg-slate-600 mx-1" />
            <div className="relative">
              <Button
                size="xs"
                variant="ghost"
                className="h-7 px-2 py-0 rounded-md text-xs flex items-center gap-1"
                onClick={(e) => { e.stopPropagation(); setShowRowOptions(v => !v); setShowColumnOptions(false); }}
                title={__('Row operations', "whizmanage")}
              >
                {__('Row', "whizmanage")} <ChevronDown className="size-3" />
              </Button>
              {showRowOptions && (
                <div className="absolute top-full left-0 mt-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md shadow-lg z-10 min-w-32">
                  <Button size="xs" variant="ghost" className="w-full justify-start px-3 py-1.5 text-xs rounded-none" onClick={insertRowAbove}>
                    <PlusCircle className="size-3 mr-2" /> {__('Insert above', "whizmanage")}
                  </Button>
                  <Button size="xs" variant="ghost" className="w-full justify-start px-3 py-1.5 text-xs rounded-none" onClick={insertRowBelow}>
                    <PlusCircle className="size-3 mr-2" /> {__('Insert below', "whizmanage")}
                  </Button>
                  <hr className="border-t border-slate-200 dark:border-slate-700 my-1" />
                  <Button size="xs" variant="ghost" className="w-full justify-start px-3 py-1.5 text-xs rounded-none text-red-500" onClick={deleteRow}>
                    <Trash2 className="size-3 mr-2" /> {__('Delete row', "whizmanage")}
                  </Button>
                </div>
              )}
            </div>

            <div className="relative">
              <Button
                size="xs"
                variant="ghost"
                className="h-7 px-2 py-0 rounded-md text-xs flex items-center gap-1"
                onClick={(e) => { e.stopPropagation(); setShowColumnOptions(v => !v); setShowRowOptions(false); }}
                title={__('Column operations', "whizmanage")}
              >
                {__('Column', "whizmanage")} <ChevronDown className="size-3" />
              </Button>
              {showColumnOptions && (
                <div className="absolute top-full left-0 mt-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md shadow-lg z-10 min-w-32">
                  <Button size="xs" variant="ghost" className="w-full justify-start px-3 py-1.5 text-xs rounded-none" onClick={insertColumnLeft}>
                    <PlusCircle className="size-3 mr-2" /> {__('Insert left', "whizmanage")}
                  </Button>
                  <Button size="xs" variant="ghost" className="w-full justify-start px-3 py-1.5 text-xs rounded-none" onClick={insertColumnRight}>
                    <PlusCircle className="size-3 mr-2" /> {__('Insert right', "whizmanage")}
                  </Button>
                  <hr className="border-t border-slate-200 dark:border-slate-700 my-1" />
                  <Button size="xs" variant="ghost" className="w-full justify-start px-3 py-1.5 text-xs rounded-none text-red-500" onClick={deleteColumn}>
                    <Trash2 className="size-3 mr-2" /> {__('Delete column', "whizmanage")}
                  </Button>
                </div>
              )}
            </div>
          </>
        )}
      </div>,
      document.body
    );
  };

  /* ===== מאזינים ל־click/scroll/resize + הזרקת סגנונות ===== */
  useEffect(() => {
    const iframe = editorRef?.current;
    const doc = iframe?.contentDocument;
    if (!doc) return;

    // עיצוב נקי
    const style = doc.createElement('style');
    style.id = 'table-selector-styles';
    style.textContent = `
      table:not(.umedia-selected){ border-collapse: collapse; }
      table.selected:not(.umedia-selected){ outline: 2px solid #3b82f6; }
      table.umedia-selected{ outline: 2px solid #3b82f6 !important; }
      table td.selected, table th.selected{ background-color: rgba(59,130,246,.08); }
      table:not(.umedia-selected):hover{ outline: 1px dashed rgba(59,130,246,.6); }
      table td:hover, table th:hover{ background-color: rgba(59,130,246,.04); }
      table.zebra tr:nth-child(even){ background-color: var(--zebra-color,#f9f9f9); }
      .dark table.zebra tr:nth-child(even){ background-color: var(--zebra-color,#1e293b); }
      .table-toolbar-table { pointer-events: none; }
    `;

    const existingStyle = doc.getElementById('table-selector-styles');
    if (existingStyle) existingStyle.remove();
    doc.head.appendChild(style);

    const handleClick = (e) => {
      setShowRowOptions(false);
      setShowColumnOptions(false);
      if (isDialogOpen) return;

      const table = e.target.closest?.('table');
      const cell = e.target.closest?.('td, th');
      let _cell = cell;
      if (!_cell && table) { _cell = table.querySelector('td, th'); }

      // קליקים על טולברים אחרים – להתעלם
      if (e.target.closest?.('.umedia-toolbar') || e.target.closest?.('.table-toolbar')) return;

      // נקה בחירות קודמות
      doc.querySelectorAll('table.selected').forEach(t => { if (t !== table) t.classList.remove('selected'); });
      doc.querySelectorAll('td.selected, th.selected').forEach(c => c.classList.remove('selected'));

      if (table) {
        table.classList.add('selected');
        setSelectedTable(table);
        placeAboveRef.current = null;

        // רוחב התחלתי 100% לטבלה “חדשה”
        ensureInitialWidth(table);

        if (_cell) {
          _cell.classList.add('selected');
          setSelectedCell(_cell);
          setShowToolbar(true);
          try {
            const sel = doc.getSelection();
            const range = doc.createRange();
            range.selectNodeContents(_cell);
            range.collapse(true);
            sel.removeAllRanges();
            sel.addRange(range);
          } catch {}
        } else {
          setSelectedCell(null);
          try {
            const sel = doc.getSelection();
            const range = doc.createRange();
            range.selectNode(table);
            range.collapse(true);
            sel.removeAllRanges();
            sel.addRange(range);
          } catch {}
        }

        setShowToolbar(true);
        positionToolbar(table);
        try { requestAnimationFrame(() => positionToolbar(table)); } catch {}
        try { editorRef?.current?.contentWindow?.focus(); } catch {}
        startFollow();
      } else if (!e.target.closest?.('.table-toolbar')) {
        setSelectedTable(null);
        setSelectedCell(null);
        setShowToolbar(false);
        placeAboveRef.current = null;
        stopFollow();
      }
    };

    const onScroll = () => { if (selectedTable && !isDialogOpen) positionToolbar(selectedTable); };
    const onWinResize = () => { if (selectedTable) positionToolbar(selectedTable); };
    const onOuterScroll = () => { if (selectedTable) positionToolbar(selectedTable); };

    // find nearest scrollable ancestor outside the iframe
    let outerScrollEl = null;
    try {
      const candidate = iframe?.parentElement;
      const isScrollable = (el) => {
        if (!el) return false;
        const cs = window.getComputedStyle(el);
        return /(auto|scroll|overlay)/.test(cs.overflow + cs.overflowY + cs.overflowX);
      };
      let el = candidate;
      while (el && el !== document.body && el !== document.documentElement) {
        if (isScrollable(el)) { outerScrollEl = el; break; }
        el = el.parentElement;
      }
    } catch {}

    doc.addEventListener('click', handleClick);
    doc.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onWinResize);
    window.addEventListener('scroll', onOuterScroll, { passive: true });
    if (outerScrollEl) outerScrollEl.addEventListener('scroll', onOuterScroll, { passive: true });

    return () => {
      doc.removeEventListener('click', handleClick);
      doc.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onWinResize);
      window.removeEventListener('scroll', onOuterScroll);
      if (outerScrollEl) outerScrollEl.removeEventListener('scroll', onOuterScroll);
      if (style.parentNode) try { style.parentNode.removeChild(style); } catch {}
      stopFollow();
    };
  }, [editorRef, isDialogOpen, selectedTable, showToolbar]);

  const ensureInitialWidth = (table) => {
    // קובע 100% פעם אחת כשאין רוחב מפורש
    if (table.dataset.umInitWidthApplied === "1") return;
    const hasExplicitWidth =
      table.getAttribute('width') ||
      table.style.width ||
      /^\d+(\.\d+)?%$/.test(getComputedStyle(table).width) ||
      false;

    if (!hasExplicitWidth) {
      setTableWidthPct(table, 100);
      table.dataset.umInitWidthApplied = "1";
      // לפרק resizers קיימים כי המידות השתנו
      try {
        const doc = editorRef?.current?.contentDocument;
        doc?.dispatchEvent(new CustomEvent("umedia:reset", { bubbles: true, composed: true, detail: { reason: "table-auto-100" } }));
      } catch {}
      updateContent();
    }
  };

  return (
    <>
      {renderToolbar()}
      <TableEditorDialog
        isOpen={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        selectedTable={selectedTable}
        onContentChange={updateContent}
        editorRef={editorRef}
      />
    </>
  );
};

export default TableSelector;
