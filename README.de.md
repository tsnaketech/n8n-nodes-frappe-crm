# n8n-nodes-frappe-crm

n8n Community-Node-Paket für [Frappe](https://frappe.io/)-Anwendungen, beginnend mit **Frappe CRM**. Es ermöglicht das Lesen und Schreiben von Leads, Deals, Kontakten, Organisationen, Aufgaben und Notizen aus n8n-Workflows heraus.

[n8n](https://n8n.io/) ist eine Workflow-Automatisierungsplattform unter [Fair-Code-Lizenz](https://docs.n8n.io/reference/license/).

Andere Sprachen: [English](README.md) · [Français](README.fr.md) · [Español](README.es.md)

[Installation](#installation)
[Credentials](#credentials)
[Operationen](#operationen)
[Verwendung](#verwendung)
[Kompatibilität](#kompatibilität)
[Ressourcen](#ressourcen)
[Versionsverlauf](#versionsverlauf)
[Entwicklung](#entwicklung)

## Installation

Folgen Sie der [Installationsanleitung](https://docs.n8n.io/integrations/community-nodes/installation/) in der n8n-Dokumentation zu Community-Nodes und verwenden Sie `n8n-nodes-frappe-crm` als Paketnamen.

**Self-hosted, über die n8n-Oberfläche** — gehen Sie zu **Settings > Community nodes > Install**, geben Sie `n8n-nodes-frappe-crm` ein und bestätigen Sie.

**Self-hosted, manuell:**

```bash
cd ~/.n8n/custom
npm install n8n-nodes-frappe-crm
```

Starten Sie n8n neu und suchen Sie im Node-Panel nach „Frappe CRM".

## Credentials

Dieses Paket verwendet einen einzigen Credential-Typ: **Frappe API** (`frappeApi`).

### API-Schlüssel in Frappe erzeugen

1. Öffnen Sie in Ihrer Frappe-Site den Benutzer, in dessen Namen n8n handeln soll (`/app/user`).
2. Scrollen Sie zu **Settings > API Access** und klicken Sie auf **Generate Keys**.
3. Kopieren Sie das **API Secret** — es wird nur einmal angezeigt — sowie den **API Key** auf dem Benutzerdokument.

Der Node handelt als dieser Benutzer und erbt damit dessen Rollen und Berechtigungen. Schlägt ein Aufruf mit einem Berechtigungsfehler fehl, prüfen Sie die Rollen auf dem Doctype statt des Credentials.

### Credential ausfüllen

| Feld       | Beispiel                          | Hinweise                                                            |
| ---------- | --------------------------------- | ------------------------------------------------------------------- |
| Site URL   | `https://meine-site.frappe.cloud` | Site-Wurzel. Ein abschließendes `/crm` oder `/` wird automatisch entfernt |
| API Key    | `a1b2c3d4e5f6g7h`                 |                                                                      |
| API Secret | `s1e2c3r4e5t6`                    | Wird von n8n verschlüsselt gespeichert                               |

Anfragen werden über den Header `Authorization: token {apiKey}:{apiSecret}` authentifiziert. Verwenden Sie **Test**, um die Verbindung zu prüfen: Der Aufruf geht an `/api/method/frappe.auth.get_logged_user` und schlägt fehl, wenn die Site als `Guest` antwortet — das gibt Frappe zurück, wenn die Schlüssel nicht erkannt werden.

### Ein Credential für alle Frappe-Nodes

`frappeApi` ist bewusst **nicht** CRM-spezifisch. Frappe authentifiziert *einen Benutzer auf einer Site*, nicht eine Anwendung: Derselbe API-Schlüssel funktioniert für Frappe CRM, Frappe Helpdesk, Frappe HR und Frappe LMS, die auf derselben Site liegen und denselben `/api`-Endpunkt teilen.

Die Begleitpakete liefern genau dasselbe Credential mit, unter demselben internen Namen `frappeApi`:

| Paket                        | Node            |
| ---------------------------- | --------------- |
| `n8n-nodes-frappe-helpdesk`  | Frappe Helpdesk |
| `n8n-nodes-frappe-hrms`      | Frappe HRMS     |

Installieren Sie mehrere davon, zeigt n8n weiterhin **einen einzigen** Credential-Typ „Frappe API": Sie konfigurieren Ihre Site einmal, und jeder Frappe-Node kann sie auswählen. Legen Sie ein Credential pro *Site* an („Frappe – Prod", „Frappe – Staging"), nicht pro Anwendung.

Siehe [docs/CREDENTIALS.md](docs/CREDENTIALS.md) für die vollständige Architektur und dafür, wie ein neuer Frappe-Node an dieses Credential angebunden wird.

## Operationen

Jede Resource bietet dieselben fünf Operationen: **Create**, **Get**, **Get Many**, **Update** und **Delete**.

| Resource     | Frappe-Doctype     | Hinweise                                                            |
| ------------ | ------------------ | ------------------------------------------------------------------- |
| Lead         | `CRM Lead`         | `First Name` erforderlich; IDs in der Form `CRM-LEAD-2026-00001`     |
| Deal         | `CRM Deal`         | Kein Pflichtfeld; IDs in der Form `CRM-DEAL-2026-00001`              |
| Contact      | `Contact`          | Doctype aus dem Frappe-Core — siehe Hinweis unten                    |
| Organization | `CRM Organization` | Der Name der Organisation **ist** die Dokument-ID                    |
| Task         | `CRM Task`         | `Title` erforderlich; IDs sind automatisch hochgezählte Ganzzahlen   |
| Note         | `FCRM Note`        | `Title` erforderlich                                                 |

Alle Operationen laufen über die Standard-REST-API von Frappe unter `/api/resource/{doctype}` mit `GET`, `POST`, `PUT` und `DELETE`.

> **Warum `Contact` und nicht `CRM Contact`?**
> Frappe CRM hat keinen Doctype `CRM Contact`. Der Ordner `crm/fcrm/doctype/crm_contacts` definiert `CRM Contacts`, eine *Child-Tabelle*, die innerhalb von `CRM Deal` verwendet wird. Die Kontakte selbst liegen im Doctype `Contact` des Frappe-Core, auf den auch `CRM Deal.contact` verweist.
>
> In diesem Doctype sind `email_id`, `mobile_no` und `phone` **abgeleitete** Felder: Frappe berechnet sie aus den Child-Tabellen `email_ids` und `phone_nos` und leert sie, wenn diese Tabellen leer sind. `email_id` direkt zu senden hat daher keine Wirkung. Der Node übernimmt das für Sie: Die Felder **Email**, **Mobile Number** und **Phone** werden in die richtigen Child-Tabellen geschrieben. Beachten Sie, dass dies bei **Update** die vorhandenen Zeilen ersetzt und nicht ergänzt.

### Optionen von „Get Many"

| Option              | Entspricht                            | Hinweise                                                       |
| ------------------- | ------------------------------------- | -------------------------------------------------------------- |
| Return All          | automatische Paginierung über `limit_start` | Holt 100 Datensätze pro Anfrage bis zur letzten Seite     |
| Limit               | `limit_page_length`                   | Wird verwendet, wenn Return All deaktiviert ist                 |
| Offset              | `limit_start`                         | Wird ignoriert, wenn Return All aktiv ist                       |
| Fields              | `fields`                              | Kommagetrennt oder als JSON-Array. Standard `["*"]`             |
| Filters (JSON)      | `filters`                             | Frappe-Filtersyntax                                             |
| Or Filters (JSON)   | `or_filters`                          | Gleiche Syntax, mit ODER verknüpft                              |
| Sort Field / Order  | `order_by`                            | z. B. `modified desc`                                           |

Frappe liefert nur die Spalte `name`, wenn `fields` nicht angegeben ist. Der Node verwendet daher standardmäßig `["*"]`, um Ihnen das vollständige Dokument zu geben.

Filter akzeptieren beide Frappe-Formen — ein Objekt für einfache Gleichheit oder ein Array von Tripeln für Operatoren:

```json
{ "status": "Open" }
```

```json
[["annual_revenue", ">", 50000], ["status", "!=", "Lost"]]
```

### Fehlerbehandlung

Frappe meldet Fehler in einem Feld `_server_messages`, das JSON *innerhalb* von JSON enthält, oft mit HTML-Markup. Der Node packt das aus und zeigt die tatsächliche Meldung: Sie erhalten `Value missing for CRM Lead: First Name` statt `Request failed with status code 417`. Andernfalls greift er auf das Feld `exception` und danach auf den HTTP-Status zurück.

## Verwendung

Jedes Beispiel unten ist ein Node, den Sie in einen n8n-Workflow einfügen können. Ersetzen Sie den `credentials`-Block durch Ihren eigenen.

### Lead — anlegen

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

`status` leer zu lassen ist unproblematisch: Frappe vergibt selbst den standardmäßigen offenen Status.

### Deal — get many, gefiltert

Alle offenen Deals über 50.000 abrufen, die neuesten zuerst:

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

### Contact — anlegen

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

`email` und `mobile_no` werden transparent in die Child-Tabellen `email_ids` und `phone_nos` geschrieben.

### Organization — aktualisieren

Die Dokument-ID einer Organisation ist ihr Name:

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

`organization_name` zu ändern benennt den Datensatz um, da dieses Feld die Dokument-ID ist.

### Task — anlegen, mit einem Deal verknüpft

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

Date- und Datetime-Felder werden in das von Frappe erwartete Format (`YYYY-MM-DD` bzw. `YYYY-MM-DD HH:mm:ss`) konvertiert.

Frappe speichert **naive** Datetimes, die in der Zeitzone der Site interpretiert werden (**Settings > System Settings > Time Zone**). Der Node konvertiert daher Werte mit Zeitzone — das, was der n8n-Datumsauswähler liefert, etwa `2026-08-15T17:00:00+02:00` oder `...Z` — in die **Zeitzone des n8n-Workflows** und lässt Werte ohne Zeitzone unverändert.

In der Praxis heißt das: Halten Sie die Zeitzone Ihres n8n-Workflows und die Ihrer Frappe-Site gleich. Weichen sie voneinander ab, landet ein auf 17:00 gesetztes Fälligkeitsdatum im CRM zu einer anderen Uhrzeit.

### Note — anlegen, an einen Lead angehängt

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

`content` ist ein Text-Editor-Feld von Frappe und akzeptiert daher HTML.

### Löschen

Für jede Resource, anhand ihrer Dokument-ID:

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

Der Node gibt `{ "success": true, "doctype": "CRM Lead", "name": "CRM-LEAD-2026-00001" }` zurück.

## Kompatibilität

Entwickelt für Version 1 der Node-API (`n8nNodesApiVersion: 1`), die sowohl n8n 1.x als auch 2.x für Community-Nodes verwenden. Das Paket wurde von **n8n 2.32.7** als Custom Extension geladen; es ist auf keine n8n-Version festgelegt und deklariert `n8n-workflow` als Wildcard-Peer-Dependency.

Die Operationen selbst wurden gegen **Frappe Framework 16.29.0 mit Frappe CRM 1.81.0** geprüft, indem der kompilierte Node gegen eine echte Site lief und jedes deklarierte Feld mit den Live-Metadaten der Doctypes abgeglichen wurde. Die ursprüngliche Entwicklung erfolgte auf Frappe Framework v15.

Der Node verwendet ausschließlich die Standard-REST-Endpunkte `/api/resource` und sollte daher mit jeder Frappe-CRM-Version funktionieren, die die oben genannten Doctype-Namen beibehält. Ein Vorbehalt ist wissenswert: Frappe antwortet mit `200 OK` und **verwirft stillschweigend** Felder, die es auf einem Doctype nicht mehr gibt. Ein Upgrade, das ein Feld entfernt, zeigt sich also nicht als Fehler, sondern als Daten, die geräuschlos verschwinden. Wird ein Feld nach einem Update nicht mehr gespeichert, prüfen Sie mit `GET /api/resource/DocType/CRM Organization`, ob es noch existiert.

## Ressourcen

- [n8n-Dokumentation zu Community-Nodes](https://docs.n8n.io/integrations/#community-nodes)
- [Dokumentation der Frappe-REST-API](https://docs.frappe.io/framework/user/en/api/rest)
- [Quellcode von Frappe CRM](https://github.com/frappe/crm)
- [Architektur des geteilten Credentials](docs/CREDENTIALS.md)

## Versionsverlauf

### 0.1.0

Erste Version. Frappe-CRM-Node mit den Resources Lead, Deal, Contact, Organization, Task und Note sowie dem geteilten Credential `frappeApi`.

## Entwicklung

```bash
npm install
npm run build     # kompiliert nach dist/ und kopiert die Icons
npm run dev       # Entwicklungsschleife mit einem lokalen n8n
npm run lint      # derselbe Befehl wie in der CI
npm run lint:fix
```

In diesem Repository gibt es keinen Test-Runner. Prüfen Sie Änderungen mit `npm run build` und anschließend einem echten Laden in n8n.

Siehe [AGENTS.md](AGENTS.md) für den vollständigen Beitragsleitfaden.
