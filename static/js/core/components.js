export function actionButton(label, action, variant = "ghost") {
  return `<button class="btn btn-${variant}" data-action="${action}">${label}</button>`;
}

export function statusPill(status) {
  return `<span class="status-pill">${status || "-"}</span>`;
}

