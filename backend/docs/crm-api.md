# CRM API

CRM endpoints require a bearer token. They return `{ success, data }`;
collection routes return `data.items` and `data.pagination`, while create and
update routes return `data.item`.

| Resource | Collection endpoint | Record endpoint |
| --- | --- | --- |
| Leads | `/api/leads` | `/api/leads/:id` |
| Follow-up tasks | `/api/follow-ups` | `/api/follow-ups/:id` |
| Quotations | `/api/quotations` | `/api/quotations/:id` |
| Customers | `/api/masters/customers` | `/api/masters/customers/:id` |

Leads and quotations support `GET`, `POST`, `PATCH`, and `DELETE`. Lead deletion
is a soft delete so linked CRM records remain intact. Quotations are soft
deleted and detached from their linked lead. Follow-up tasks support the same
CRUD operations; task states are `pending`, `completed`, and `cancelled`.
`GET /api/leads/options` returns active lead sources and users for assignment;
`GET /api/follow-ups/options` returns active users.

Collection routes accept `page` and `limit` (maximum 100). Leads also accept
`q`, `stage`, `source`, `assignedEmployee`, `from`, and `to`. Follow-up tasks
accept `q`, `status`, `linkedTo`, and `assignedTo`. Quotations accept `q` and
`status`.

Quotation writes reference an existing customer and active product items by
MongoDB ID. The backend generates a unique yearly quotation number and
recalculates line amounts, discount, tax, and grand total from the submitted
quantities and rates.

Customer creation, editing, and deletion remain on the existing Customer
Master API. This is the same Customer model used by CRM and quotation records.
Missed-call callbacks remain on `/api/calls/follow-ups`; they are distinct from
the CRM follow-up task endpoints above.
