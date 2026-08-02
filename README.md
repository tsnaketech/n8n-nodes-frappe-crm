# n8n-nodes-frappe-crm

This is an n8n community node package for [Frappe](https://frappe.io/) applications, starting with **Frappe CRM**. It lets you read and write leads, deals, contacts, organizations, tasks and notes from your n8n workflows.

[n8n](https://n8n.io/) is a [fair-code licensed](https://docs.n8n.io/reference/license/) workflow automation platform.

Other languages: [Français](README.fr.md) · [Español](README.es.md) · [Deutsch](README.de.md)

[Installation](#installation)
[Credentials](#credentials)
[Operations](#operations)
[Usage](#usage)
[Compatibility](#compatibility)
[Resources](#resources)
[Version history](#version-history)
[Development](#development)

## Installation

Follow the [installation guide](https://docs.n8n.io/integrations/community-nodes/installation/) in the n8n community nodes documentation, using `n8n-nodes-frappe-crm` as the package name.

**Self-hosted, via the n8n UI** — go to **Settings > Community nodes > Install**, enter `n8n-nodes-frappe-crm` and confirm.

**Self-hosted, manually:**

```bash
cd ~/.n8n/custom
npm install n8n-nodes-frappe-crm
```

Restart n8n, then search for "Frappe CRM" in the node panel.

## Credentials

This package uses a single credential type, **Frappe API** (`frappeApi`).

### Generating API keys in Frappe

1. In your Frappe site, open the user you want n8n to act as (`/app/user`).
2. Scroll to **Settings > API Access** and click **Generate Keys**.
3. Copy the **API Secret** — it is shown only once — and the **API Key** displayed on the user document.

The n8n node acts as that user, so it inherits that user's roles and permissions. If a call fails with a permission error, check the roles on the doctype rather than the credential.

### Filling in the credential

| Field      | Example                          | Notes                                                        |
| ---------- | -------------------------------- | ------------------------------------------------------------ |
| Site URL   | `https://my-site.frappe.cloud`   | Site root. A trailing `/crm` or `/` is stripped automatically |
| API Key    | `a1b2c3d4e5f6g7h`                |                                                               |
| API Secret | `s1e2c3r4e5t6`                   | Stored encrypted by n8n                                       |

Requests are authenticated with the header `Authorization: token {apiKey}:{apiSecret}`. Use **Test** to validate the connection — it calls `/api/method/frappe.auth.get_logged_user` and fails if the site answers as `Guest`, which is what Frappe returns when the keys are not recognised.

### One credential for every Frappe node

`frappeApi` is deliberately **not** CRM-specific. Frappe authenticates a *user on a site*, not an application: the same API key works for Frappe CRM, Frappe Helpdesk, Frappe HR and Frappe LMS, which all live on the same site and share the same `/api` endpoint.

The companion packages ship the very same credential type, under the same internal name `frappeApi`:

| Package                      | Node            |
| ---------------------------- | --------------- |
| `n8n-nodes-frappe-helpdesk`  | Frappe Helpdesk |
| `n8n-nodes-frappe-hrms`      | Frappe HRMS     |

Install several of them and n8n still shows a **single** « Frappe API » credential type — you configure your site once, and every Frappe node can select it. Create one credential per *site* (`Frappe – prod`, `Frappe – staging`), not per application.

See [docs/CREDENTIALS.md](docs/CREDENTIALS.md) for the full architecture and for how to wire a new Frappe node to this credential.

## Operations

Every resource supports the same five operations: **Create**, **Get**, **Get Many**, **Update** and **Delete**.

| Resource     | Frappe doctype     | Notes                                                              |
| ------------ | ------------------ | ------------------------------------------------------------------ |
| Lead         | `CRM Lead`         | `First Name` required; IDs look like `CRM-LEAD-2026-00001`          |
| Deal         | `CRM Deal`         | No required field; IDs look like `CRM-DEAL-2026-00001`              |
| Contact      | `Contact`          | Core Frappe doctype — see the note below                            |
| Organization | `CRM Organization` | The organization name **is** the document ID                        |
| Task         | `CRM Task`         | `Title` required; IDs are auto-incremented integers                 |
| Note         | `FCRM Note`        | `Title` required                                                    |

All operations go through the standard Frappe REST API at `/api/resource/{doctype}` using `GET`, `POST`, `PUT` and `DELETE`.

> **Why `Contact` and not `CRM Contact`?**
> Frappe CRM has no `CRM Contact` doctype. Its `crm/fcrm/doctype/crm_contacts` folder defines `CRM Contacts`, a *child table* used inside `CRM Deal`. Contacts themselves are stored in Frappe's core `Contact` doctype, which is what `CRM Deal.contact` links to.
>
> On that doctype, `email_id`, `mobile_no` and `phone` are **derived** fields: Frappe recomputes them from the `email_ids` and `phone_nos` child tables and blanks them out if those tables are empty. Sending `email_id` directly has no effect. The node handles this for you — the **Email**, **Mobile Number** and **Phone** fields are written into the correct child tables. Note that on **Update**, this replaces the existing rows rather than appending to them.

### Get Many options

| Option              | Maps to                          | Notes                                                             |
| ------------------- | -------------------------------- | ----------------------------------------------------------------- |
| Return All          | auto-paginates `limit_start`      | Fetches 100 records per request until the last page                |
| Limit               | `limit_page_length`               | Used when Return All is off                                        |
| Offset              | `limit_start`                     | Ignored when Return All is on                                      |
| Fields              | `fields`                          | Comma-separated or a JSON array. Defaults to `["*"]`               |
| Filters (JSON)      | `filters`                         | Frappe filter syntax                                               |
| Or Filters (JSON)   | `or_filters`                      | Same syntax, combined with OR                                      |
| Sort Field / Order  | `order_by`                        | e.g. `modified desc`                                               |

Frappe returns only the `name` column when `fields` is not specified, so the node defaults to `["*"]` to give you the full document.

Filters accept both Frappe forms — an object for simple equality, or an array of triples for operators:

```json
{ "status": "Open" }
```

```json
[["annual_revenue", ">", 50000], ["status", "!=", "Lost"]]
```

### Error handling

Frappe reports errors in a `_server_messages` field that contains JSON encoded *inside* JSON, often with HTML markup. The node unwraps it and surfaces the actual message — you get `Value missing for CRM Lead: First Name` rather than `Request failed with status code 417`. It falls back to the `exception` field, then to the HTTP status.

## Usage

Each example below is a node you can paste into an n8n workflow. Replace the `credentials` block with your own credential.

### Lead — create

```json
{
	"parameters": {
		"resource": "lead",
		"operation": "create",
		"first_name": "Marie",
		"additionalFields": {
			"last_name": "Dupont",
			"email": "marie.dupont@acme.io",
			"organization": "Acme Corp",
			"status": "New",
			"source": "Website",
			"no_of_employees": "51-200"
		}
	},
	"type": "n8n-nodes-frappe-crm.frappeCrm",
	"typeVersion": 1,
	"name": "Create Lead",
	"position": [0, 0],
	"credentials": { "frappeApi": { "id": "1", "name": "Frappe account" } }
}
```

Leaving `status` empty is fine: Frappe assigns the default open status itself.

### Deal — get many, filtered

Fetch every open deal worth more than 50 000, newest first:

```json
{
	"parameters": {
		"resource": "deal",
		"operation": "getAll",
		"returnAll": true,
		"options": {
			"fields": "name,organization,status,expected_deal_value,deal_owner",
			"filters": "[[\"status\",\"!=\",\"Lost\"],[\"expected_deal_value\",\">\",50000]]",
			"sortField": "modified",
			"sortOrder": "desc"
		}
	},
	"type": "n8n-nodes-frappe-crm.frappeCrm",
	"typeVersion": 1,
	"name": "Open Deals",
	"position": [0, 0],
	"credentials": { "frappeApi": { "id": "1", "name": "Frappe account" } }
}
```

### Contact — create

```json
{
	"parameters": {
		"resource": "contact",
		"operation": "create",
		"first_name": "Jean",
		"additionalFields": {
			"last_name": "Martin",
			"email": "jean.martin@acme.io",
			"mobile_no": "+33 6 12 34 56 78",
			"company_name": "Acme Corp",
			"designation": "CTO"
		}
	},
	"type": "n8n-nodes-frappe-crm.frappeCrm",
	"typeVersion": 1,
	"name": "Create Contact",
	"position": [0, 0],
	"credentials": { "frappeApi": { "id": "1", "name": "Frappe account" } }
}
```

`email` and `mobile_no` are transparently written to the `email_ids` and `phone_nos` child tables.

### Organization — update

The document ID of an organization is its name:

```json
{
	"parameters": {
		"resource": "organization",
		"operation": "update",
		"documentId": "Acme Corp",
		"updateFields": {
			"website": "https://acme.io",
			"industry": "Technology",
			"annual_revenue": 2500000,
			"no_of_employees": "201-500"
		}
	},
	"type": "n8n-nodes-frappe-crm.frappeCrm",
	"typeVersion": 1,
	"name": "Update Organization",
	"position": [0, 0],
	"credentials": { "frappeApi": { "id": "1", "name": "Frappe account" } }
}
```

Changing `organization_name` renames the record, because that field is the document ID.

### Task — create, linked to a deal

```json
{
	"parameters": {
		"resource": "task",
		"operation": "create",
		"title": "Send the proposal",
		"additionalFields": {
			"status": "Todo",
			"priority": "High",
			"due_date": "2026-08-15T17:00:00",
			"assigned_to": "sales@acme.io",
			"reference_doctype": "CRM Deal",
			"reference_docname": "CRM-DEAL-2026-00001"
		}
	},
	"type": "n8n-nodes-frappe-crm.frappeCrm",
	"typeVersion": 1,
	"name": "Create Task",
	"position": [0, 0],
	"credentials": { "frappeApi": { "id": "1", "name": "Frappe account" } }
}
```

Date and datetime fields are converted to the format Frappe expects (`YYYY-MM-DD` and `YYYY-MM-DD HH:mm:ss`).

Frappe stores **naive** datetimes, interpreted in the site's timezone (**Settings > System Settings > Time Zone**). The node therefore converts values that carry a timezone — what the n8n date picker produces, such as `2026-08-15T17:00:00+02:00` or `...Z` — into the **n8n workflow timezone**, and passes values that already have no timezone through unchanged.

In practice this means: keep your n8n workflow timezone and your Frappe site timezone the same. If they differ, a due date picked at 17:00 will land at a different hour in the CRM.

### Note — create, attached to a lead

```json
{
	"parameters": {
		"resource": "note",
		"operation": "create",
		"title": "Discovery call",
		"additionalFields": {
			"content": "<p>Budget confirmed, decision expected in September.</p>",
			"reference_doctype": "CRM Lead",
			"reference_docname": "CRM-LEAD-2026-00001"
		}
	},
	"type": "n8n-nodes-frappe-crm.frappeCrm",
	"typeVersion": 1,
	"name": "Create Note",
	"position": [0, 0],
	"credentials": { "frappeApi": { "id": "1", "name": "Frappe account" } }
}
```

`content` is a Frappe Text Editor field, so it takes HTML.

### Delete

Any resource, given its document ID:

```json
{
	"parameters": {
		"resource": "lead",
		"operation": "delete",
		"documentId": "CRM-LEAD-2026-00001"
	},
	"type": "n8n-nodes-frappe-crm.frappeCrm",
	"typeVersion": 1,
	"name": "Delete Lead",
	"position": [0, 0],
	"credentials": { "frappeApi": { "id": "1", "name": "Frappe account" } }
}
```

The node outputs `{ "success": true, "doctype": "CRM Lead", "name": "CRM-LEAD-2026-00001" }`.

## Compatibility

Tested against n8n 1.x, **Frappe Framework 16.29.0 and Frappe CRM 1.81.0**, with the field list checked against the live doctype metadata. Earlier development happened on Frappe Framework v15.

The node only uses the standard `/api/resource` REST endpoints, so it should work with any Frappe CRM version that keeps the doctype names listed above. One caveat worth knowing: Frappe answers `200 OK` and **silently drops** fields that no longer exist on a doctype, so an upgrade that removes a field shows up as data quietly going missing rather than as an error. If you upgrade Frappe CRM and a field stops being saved, check it still exists via `GET /api/resource/DocType/CRM Organization`.

## Resources

- [n8n community nodes documentation](https://docs.n8n.io/integrations/#community-nodes)
- [Frappe REST API documentation](https://docs.frappe.io/framework/user/en/api/rest)
- [Frappe CRM source](https://github.com/frappe/crm)
- [Shared credential architecture](docs/CREDENTIALS.md)

## Version history

### 0.1.0

Initial release. Frappe CRM node with Lead, Deal, Contact, Organization, Task and Note resources, and the shared `frappeApi` credential.

## Development

```bash
npm install
npm run build     # compiles to dist/ and copies icons
npm run dev       # development loop against a local n8n
npm run lint      # same command the CI runs
npm run lint:fix
```

There is no test runner in this repository. Verify changes with `npm run build` followed by a real load in n8n.

See [AGENTS.md](AGENTS.md) for the full contributor guide.
