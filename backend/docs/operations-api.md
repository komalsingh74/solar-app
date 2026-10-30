# Project Operations API

All endpoints require the authenticated bearer token and return
`{ success, data }`. Collection responses contain `data.items` and
`data.pagination`; create and update responses contain `data.item`.

| Resource | Collection endpoint | Record endpoint |
| --- | --- | --- |
| Site surveys | `/api/site-surveys` | `/api/site-surveys/:id` |
| Solar projects | `/api/solar-projects` | `/api/solar-projects/:id` |
| Subsidy applications | `/api/subsidy-applications` | `/api/subsidy-applications/:id` |
| Installation teams | `/api/installation-teams` | `/api/installation-teams/:id` |
| Inventory stock | `/api/inventory/stock` | — |
| Stock movements | `/api/inventory/movements` | — |
| Purchase orders | `/api/purchase-orders` | `/api/purchase-orders/:id` |
| Service tickets | `/api/service-tickets` | `/api/service-tickets/:id` |
| AMC contracts | `/api/amcs` | `/api/amcs/:id` |
| Equipment warranties | `/api/warranties` | `/api/warranties/:id` |

Each resource has `GET` and `POST` collection routes. Survey, project,
subsidy-application, team, and purchase-order records support `PATCH` and
`DELETE` as applicable. Option endpoints return active related customers,
users, items, warehouses, projects, and teams for forms.

Collections accept `page` and `limit` (maximum 100). Surveys, projects,
subsidy applications, and purchase orders accept `q`; supported filters also
include survey status/customer/engineer, project stage/customer, subsidy stage,
purchase-order stage, and movement type/item/warehouse.

## Service, AMC, and warranty behavior

- Service ticket options are available at `/api/service-tickets/options`.
  Tickets link an active customer and optionally one of their active projects.
  Active `ServiceEngineer` and `InstallationTeam` users are selectable as
  technicians. Priority determines the UI SLA target: Critical 4h, High 24h,
  Medium 48h, Low 72h.
- Ticket assignment and status changes use
  `PATCH /api/service-tickets/:id/status` with `technicianId` and/or `status`.
  Work can only be started after assignment; resolution requires a resolution
  note. Ticket activity is persisted with the actor and timestamp.
- AMC project options are at `/api/amcs/options`. Contracts support create,
  update, soft-delete, visit logging via `POST /api/amcs/:id/visits`, and
  renewal via `POST /api/amcs/:id/renew`. Each contract records its visit
  allowance, completed visits, term, and annual fee.
- Warranty options are at `/api/warranties/options`. Warranty records link an
  active customer and optionally one of that customer's active projects and
  track equipment, brand, serial number, installation date, and duration.
  Warranty status and expiry are derived from those dates in the UI.

## Status and inventory behavior

- Survey statuses: `Scheduled`, `In Progress`, `Completed`, `Cancelled`, and
  `Rescheduled`. Completion requires roof area, monthly usage, and at least one
  photo. A survey may store up to 12 compressed JPEG/PNG/WebP data-URL photos
  with a combined 10 MB limit.
- Project stages: `Survey approved`, `Material dispatched`, `Structure`,
  `Panels mounted`, `Wiring & inverter`, `Net-meter & inspection`, and
  `Commissioned`.
- Subsidy stages: `Documents`, `Applied`, `Inspection`, `Net meter`,
  `Commissioned`, and `Subsidy received`.
- Team statuses: `Available`, `On site`, and `On leave`. Active users can only
  belong to one active team.
- Purchase-order stages: `Draft`, `Ordered`, `Received`, `Billed`, and `Paid`.
  Receiving an order creates `Received` inventory movements and updates stock
  balances at its selected warehouse. Only draft orders can be edited or
  deleted.
- Movement types are `Received`, `Issued`, `Transfer`, and `Returned`.
  Movements update source and destination stock balances; the source balance
  cannot be reduced below zero.

The existing Customer, Item, Supplier, Warehouse, User, and SiteSurvey models
are reused, so operations records remain linked to the corresponding masters.
