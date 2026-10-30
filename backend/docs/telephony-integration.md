# Telephony integration contract

## Current integration boundary

The CRM call API persists normalized call events and IVR configuration. It does not yet call a vendor API to provision IVR menus, place calls, or fetch recordings. The provider name and API contract are intentionally required before adding those vendor-specific operations. Provider secrets are encrypted before MongoDB storage and are never returned to the browser.

## Backend environment

Set this value in the backend runtime environment:

| Variable | Purpose |
| --- | --- |
| `TELEPHONY_ENCRYPTION_KEY` | A random 32-byte key encoded as 64 hex characters or base64; encrypts provider and webhook secrets at rest |

Generate a key with `node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"` and store it in the backend's secret manager. Provider credentials, health URL, and webhook signing secret are entered in Calls & IVR settings and encrypted with AES-256-GCM before database storage. Loss or rotation of this key makes existing encrypted credentials unreadable. Provider credentials without a health endpoint are reported as `unverified`. A successful generic health URL check means only that the configured endpoint returned HTTP success; it does not verify call routing or IVR deployment.

## Webhook contract

Send `POST /api/webhooks/telephony/events` with a JSON body and `x-telephony-signature` header. The signature is `sha256=` followed by the lowercase hex HMAC-SHA256 of the exact request body bytes using the application's stored webhook signing secret.

```json
{
  "provider": "your-provider",
  "providerCallId": "provider-call-unique-id",
  "direction": "inbound",
  "from": "+919876543210",
  "to": "+915624102200",
  "status": "missed",
  "startedAt": "2026-10-27T10:00:00.000Z",
  "endedAt": "2026-10-27T10:00:12.000Z",
  "durationSeconds": 12,
  "ivrChoice": "1",
  "callerName": "Optional caller name"
}
```

Supported statuses: `ringing`, `answered`, `missed`, `busy`, `failed`, `completed`, and `no-answer`. Send updates with the same provider and call ID; they upsert the same call record. Missed inbound calls create one callback task, due 15 minutes later. If unknown caller lead creation is enabled in Calls & IVR mapping settings, an unmatched inbound number creates a lead and assigns it to an active Sales Executive or Admin.

## Authenticated CRM endpoints

All endpoints below require the application's bearer token:

- `GET /api/calls/dashboard?from=<ISO>&to=<ISO>`
- `GET /api/calls/logs?page=1&limit=20&q=&status=`
- `GET /api/calls/lookup?phone=`
- `GET|POST /api/calls/follow-ups`
- `PATCH /api/calls/follow-ups/:id`
- `GET|PUT /api/ivr/configuration`
- `GET /api/ivr/settings/status`
- `PUT /api/ivr/settings/provider` (Admin only; credential values are write-only)
- `GET|PUT /api/ivr/mapping`

Configure a provider-specific adapter before pointing a production provider directly at this normalized event endpoint. The vendor's signature format and payload must be verified and mapped before forwarding events.
