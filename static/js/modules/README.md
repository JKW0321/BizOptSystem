# Frontend Module Boundary

Business pages should move here gradually as ES modules. The current MVP still loads
`static/app.js` for compatibility, while shared primitives live under `static/js/core`.

Suggested module split:

- `business/`: customers, opportunities, projects, funds, timesheets.
- `resource/`: HR, suppliers, contracts.
- `performance/`: KPI library, performance plans, organization targets, dashboards.
- `system/`: users, roles, permissions, menus.

