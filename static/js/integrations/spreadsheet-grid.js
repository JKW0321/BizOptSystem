const GRID_CDN = {
  tabulatorCss: "https://unpkg.com/tabulator-tables@6.3.1/dist/css/tabulator_simple.min.css",
  tabulatorJs: "https://unpkg.com/tabulator-tables@6.3.1/dist/js/tabulator.min.js",
};

function loadCssOnce(href) {
  if ([...document.styleSheets].some((sheet) => sheet.href === href)) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = href;
    link.onload = resolve;
    link.onerror = reject;
    document.head.appendChild(link);
  });
}

function loadScriptOnce(src, globalName) {
  if (globalName && window[globalName]) return Promise.resolve(window[globalName]);
  if ([...document.scripts].some((script) => script.src === src)) {
    return Promise.resolve(window[globalName]);
  }
  return new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = src;
    script.onload = () => resolve(globalName ? window[globalName] : undefined);
    script.onerror = reject;
    document.head.appendChild(script);
  });
}

export async function createSpreadsheetGrid(container, options) {
  await loadCssOnce(GRID_CDN.tabulatorCss);
  await loadScriptOnce(GRID_CDN.tabulatorJs, "Tabulator");
  const Tabulator = window.Tabulator;
  if (!Tabulator) {
    throw new Error("Tabulator 未加载，无法创建类 Excel 表格。");
  }
  return new Tabulator(container, {
    height: options.height || "560px",
    layout: "fitColumns",
    reactiveData: true,
    clipboard: true,
    clipboardPasteAction: "replace",
    history: true,
    movableColumns: true,
    data: options.data || [],
    columns: options.columns || [],
    cellEdited: options.onCellEdited || undefined,
  });
}

export function timesheetGridColumns() {
  return [
    { title: "周期", field: "period_label", editor: "input", width: 120 },
    { title: "项目", field: "project_name", editor: "list", editorParams: { valuesLookup: true }, minWidth: 220 },
    { title: "人员", field: "person_name", editor: "list", editorParams: { valuesLookup: true }, minWidth: 160 },
    { title: "方式", field: "entry_mode", editor: "list", editorParams: { values: ["比例", "小时"] }, width: 100 },
    { title: "比例", field: "allocation_ratio", editor: "number", width: 100 },
    { title: "小时", field: "work_hours", editor: "number", width: 100 },
    { title: "工作内容", field: "work_content", editor: "textarea", minWidth: 260 },
    { title: "预警", field: "warning", width: 140 },
    { title: "状态", field: "status", editor: "list", editorParams: { values: ["草稿", "已提交", "已确认"] }, width: 110 },
  ];
}

