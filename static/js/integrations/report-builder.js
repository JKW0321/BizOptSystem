const REPORT_CDN = {
  echartsJs: "https://cdn.jsdelivr.net/npm/echarts@5.5.1/dist/echarts.min.js",
  gridstackCss: "https://cdn.jsdelivr.net/npm/gridstack@10.3.1/dist/gridstack.min.css",
  gridstackJs: "https://cdn.jsdelivr.net/npm/gridstack@10.3.1/dist/gridstack-all.js",
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

export async function createChart(container, option) {
  await loadScriptOnce(REPORT_CDN.echartsJs, "echarts");
  const echarts = window.echarts;
  if (!echarts) {
    throw new Error("ECharts 未加载，无法创建图表。");
  }
  const chart = echarts.init(container);
  chart.setOption(option);
  return chart;
}

export async function createDashboardLayout(container, options = {}) {
  await loadCssOnce(REPORT_CDN.gridstackCss);
  await loadScriptOnce(REPORT_CDN.gridstackJs, "GridStack");
  const GridStack = window.GridStack;
  if (!GridStack) {
    throw new Error("GridStack 未加载，无法创建拖拽布局。");
  }
  return GridStack.init(
    {
      cellHeight: options.cellHeight || 96,
      margin: options.margin || 8,
      float: true,
      resizable: { handles: "e,se,s,sw,w" },
    },
    container,
  );
}

export function basicBarOption(title, rows, nameField, valueField) {
  return {
    title: { text: title, left: 0, textStyle: { fontSize: 14, fontWeight: 600 } },
    grid: { left: 40, right: 16, top: 48, bottom: 36 },
    tooltip: { trigger: "axis" },
    xAxis: { type: "category", data: rows.map((row) => row[nameField]) },
    yAxis: { type: "value" },
    series: [{ type: "bar", data: rows.map((row) => row[valueField]) }],
  };
}

