# Master data API

All routes below are mounted under `/api/masters` and require a bearer token.
Responses use `{ success, data }`; collection results are returned in
`data.items`, and create/update results in `data.item`. Collection responses
include `data.pagination` with `page`, `limit`, `total`, and `pages`.

| Resource | Collection endpoint |
| --- | --- |
| Customers | `/customers` |
| Lead sources | `/lead-sources` |
| Product items | `/items` |
| Suppliers | `/suppliers` |
| Warehouses | `/warehouses` |
| Expense categories | `/expense-categories` |

Each collection supports `GET` and `POST`; `PATCH /:id` updates a record and
`DELETE /:id` removes it. Collection `GET` accepts `page`, `limit` (maximum
100), `q` for a text search, and `status=Active|Inactive` where applicable.
Admin and SuperAdmin users have full access. Other roles must have a matching
permission string, such as `Customers.View`, `customers:create`,
`masters:items:edit`, or `Masters.Delete`. Product items accept `categoryName`;
the API creates or reuses the corresponding product category. Active product
categories are also available at `GET /product-categories`.

Customers retain their existing customer, address, solar-site, and document
schema. Lead-source counts are calculated from active CRM leads, with `Won`
stages reported as conversions. Customer records referenced by leads or
quotations, lead sources referenced by leads, and items referenced by
quotations cannot be deleted.
# Permission setup

Master record permission enforcement is disabled until `MASTER_PERMISSIONS_ENABLED=true`
is set in the backend environment. While disabled, authenticated active users can
access master records without assigned permissions. Enable it after configuring
user permissions; non-admin users then need the matching resource/action permission.
Restart the backend after changing this setting.

