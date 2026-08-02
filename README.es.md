# n8n-nodes-frappe-crm

Paquete de nodos comunitarios de n8n para las aplicaciones [Frappe](https://frappe.io/), empezando por **Frappe CRM**. Permite leer y escribir leads, oportunidades, contactos, organizaciones, tareas y notas desde tus flujos de trabajo de n8n.

[n8n](https://n8n.io/) es una plataforma de automatización de workflows con [licencia fair-code](https://docs.n8n.io/reference/license/).

Otros idiomas: [English](README.md) · [Français](README.fr.md) · [Deutsch](README.de.md)

[Instalación](#instalación)
[Credenciales](#credenciales)
[Operaciones](#operaciones)
[Uso](#uso)
[Compatibilidad](#compatibilidad)
[Recursos](#recursos)
[Historial de versiones](#historial-de-versiones)
[Desarrollo](#desarrollo)

## Instalación

Sigue la [guía de instalación](https://docs.n8n.io/integrations/community-nodes/installation/) de la documentación de nodos comunitarios de n8n, usando `n8n-nodes-frappe-crm` como nombre del paquete.

**Autoalojado, desde la interfaz de n8n** — ve a **Settings > Community nodes > Install**, escribe `n8n-nodes-frappe-crm` y confirma.

**Autoalojado, manualmente:**

```bash
cd ~/.n8n/custom
npm install n8n-nodes-frappe-crm
```

Reinicia n8n y busca «Frappe CRM» en el panel de nodos.

## Credenciales

Este paquete usa un único tipo de credencial: **Frappe API** (`frappeApi`).

### Generar las claves de API en Frappe

1. En tu sitio Frappe, abre el usuario en cuyo nombre debe actuar n8n (`/app/user`).
2. Baja hasta **Settings > API Access** y pulsa **Generate Keys**.
3. Copia el **API Secret** — solo se muestra una vez — y el **API Key** que aparece en la ficha del usuario.

El nodo actúa como ese usuario, por lo que hereda sus roles y permisos. Si una llamada falla por un error de permisos, revisa los roles sobre el doctype antes que la credencial.

### Rellenar la credencial

| Campo      | Ejemplo                          | Notas                                                              |
| ---------- | -------------------------------- | ------------------------------------------------------------------ |
| Site URL   | `https://mi-sitio.frappe.cloud`  | Raíz del sitio. Un `/crm` o `/` final se elimina automáticamente    |
| API Key    | `a1b2c3d4e5f6g7h`                |                                                                     |
| API Secret | `s1e2c3r4e5t6`                   | n8n lo almacena cifrado                                             |

Las peticiones se autentican con la cabecera `Authorization: token {apiKey}:{apiSecret}`. Usa **Test** para validar la conexión: llama a `/api/method/frappe.auth.get_logged_user` y falla si el sitio responde como `Guest`, que es lo que devuelve Frappe cuando no reconoce las claves.

### Una sola credencial para todos los nodos Frappe

`frappeApi` deliberadamente **no** es específica del CRM. Frappe autentica a *un usuario en un sitio*, no a una aplicación: la misma clave de API sirve para Frappe CRM, Frappe Helpdesk, Frappe HR y Frappe LMS, que viven en el mismo sitio y comparten el mismo endpoint `/api`.

Los paquetes complementarios incluyen exactamente la misma credencial, con el mismo nombre interno `frappeApi`:

| Paquete                      | Nodo            |
| ---------------------------- | --------------- |
| `n8n-nodes-frappe-helpdesk`  | Frappe Helpdesk |
| `n8n-nodes-frappe-hrms`      | Frappe HRMS     |

Instala varios y n8n sigue mostrando un **único** tipo de credencial «Frappe API»: configuras tu sitio una vez y todos los nodos Frappe pueden seleccionarla. Crea una credencial por *sitio* («Frappe – prod», «Frappe – staging»), no una por aplicación.

Consulta [docs/CREDENTIALS.md](docs/CREDENTIALS.md) para la arquitectura completa y para saber cómo conectar un nuevo nodo Frappe a esta credencial.

## Operaciones

Cada recurso ofrece las mismas cinco operaciones: **Create**, **Get**, **Get Many**, **Update** y **Delete**.

| Recurso      | Doctype de Frappe  | Notas                                                              |
| ------------ | ------------------ | ------------------------------------------------------------------ |
| Lead         | `CRM Lead`         | `First Name` obligatorio; los IDs son del tipo `CRM-LEAD-2026-00001` |
| Deal         | `CRM Deal`         | Ningún campo obligatorio; IDs del tipo `CRM-DEAL-2026-00001`         |
| Contact      | `Contact`          | Doctype del core de Frappe — ver la nota siguiente                  |
| Organization | `CRM Organization` | El nombre de la organización **es** el ID del documento             |
| Task         | `CRM Task`         | `Title` obligatorio; los IDs son enteros autoincrementales          |
| Note         | `FCRM Note`        | `Title` obligatorio                                                 |

Todas las operaciones usan la API REST estándar de Frappe en `/api/resource/{doctype}`, con `GET`, `POST`, `PUT` y `DELETE`.

> **¿Por qué `Contact` y no `CRM Contact`?**
> Frappe CRM no tiene un doctype `CRM Contact`. La carpeta `crm/fcrm/doctype/crm_contacts` define `CRM Contacts`, una *tabla hija* usada dentro de `CRM Deal`. Los contactos se almacenan en el doctype `Contact` del core de Frappe, que es al que apunta `CRM Deal.contact`.
>
> En ese doctype, `email_id`, `mobile_no` y `phone` son campos **derivados**: Frappe los recalcula a partir de las tablas hijas `email_ids` y `phone_nos`, y los vacía si esas tablas están vacías. Enviar `email_id` directamente no tiene ningún efecto. El nodo se encarga de ello: los campos **Email**, **Mobile Number** y **Phone** se escriben en las tablas hijas correctas. Ten en cuenta que en **Update** esto reemplaza las filas existentes en lugar de añadirse a ellas.

### Opciones de «Get Many»

| Opción              | Equivale a                              | Notas                                                        |
| ------------------- | --------------------------------------- | ------------------------------------------------------------ |
| Return All          | paginación automática por `limit_start` | Recupera 100 registros por petición hasta la última página    |
| Limit               | `limit_page_length`                     | Se usa cuando Return All está desactivado                     |
| Offset              | `limit_start`                           | Se ignora cuando Return All está activo                       |
| Fields              | `fields`                                | Separados por comas o array JSON. Por defecto `["*"]`         |
| Filters (JSON)      | `filters`                               | Sintaxis de filtros de Frappe                                 |
| Or Filters (JSON)   | `or_filters`                            | Misma sintaxis, combinada con OR                              |
| Sort Field / Order  | `order_by`                              | por ejemplo `modified desc`                                   |

Frappe solo devuelve la columna `name` cuando no se indica `fields`, por lo que el nodo usa `["*"]` por defecto para darte el documento completo.

Los filtros aceptan las dos formas de Frappe: un objeto para una igualdad simple, o un array de tripletas para los operadores:

```json
{ "status": "Open" }
```

```json
[["annual_revenue", ">", 50000], ["status", "!=", "Lost"]]
```

### Gestión de errores

Frappe reporta sus errores en un campo `_server_messages` que contiene JSON codificado *dentro* de JSON, a menudo con HTML. El nodo lo desempaqueta y muestra el mensaje real: obtienes `Value missing for CRM Lead: First Name` en lugar de `Request failed with status code 417`. Si no, recurre al campo `exception` y después al código HTTP.

## Uso

Cada ejemplo siguiente es un nodo que puedes pegar en un flujo de trabajo de n8n. Sustituye el bloque `credentials` por el tuyo.

### Lead — crear

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

Dejar `status` vacío no es problema: Frappe asigna por sí mismo el estado abierto por defecto.

### Deal — get many, con filtros

Recuperar todas las oportunidades abiertas por encima de 50 000, de la más reciente a la más antigua:

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

### Contact — crear

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

`email` y `mobile_no` se escriben de forma transparente en las tablas hijas `email_ids` y `phone_nos`.

### Organization — actualizar

El ID de una organización es su nombre:

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

Cambiar `organization_name` renombra el registro, porque ese campo es el ID del documento.

### Task — crear, vinculada a una oportunidad

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

Los campos Date y Datetime se convierten al formato que espera Frappe (`YYYY-MM-DD` y `YYYY-MM-DD HH:mm:ss`).

Frappe almacena datetimes **naive**, interpretados en la zona horaria del sitio (**Settings > System Settings > Time Zone**). Por eso el nodo convierte los valores que llevan zona horaria — lo que produce el selector de fecha de n8n, por ejemplo `2026-08-15T17:00:00+02:00` o `...Z` — a la **zona horaria del flujo de trabajo de n8n**, y deja sin tocar los valores que ya no la llevan.

En la práctica: mantén la misma zona horaria en tu flujo de n8n y en tu sitio Frappe. Si difieren, un vencimiento fijado a las 17:00 acabará a otra hora en el CRM.

### Note — crear, adjunta a un lead

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

`content` es un campo Text Editor de Frappe, por lo que acepta HTML.

### Eliminar

Para cualquier recurso, a partir de su ID de documento:

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

El nodo devuelve `{ "success": true, "doctype": "CRM Lead", "name": "CRM-LEAD-2026-00001" }`.

## Compatibilidad

Para **n8n 2.x**, escrito para la versión 1 de la API de nodos (`n8nNodesApiVersion: 1`). El paquete ha sido cargado por n8n 2.32.7 como extensión personalizada; no está fijado a ninguna versión de n8n y declara `n8n-workflow` como peer dependency comodín.

Las operaciones se probaron contra **Frappe Framework 16.29.0 con Frappe CRM 1.81.0**, ejecutando el nodo compilado sobre un sitio real y contrastando cada campo declarado con los metadatos en vivo de los doctypes. El desarrollo inicial se hizo sobre Frappe Framework v15.

El nodo solo usa los endpoints REST estándar `/api/resource`, por lo que debería funcionar con cualquier versión de Frappe CRM que conserve los nombres de doctype indicados arriba. Una salvedad conviene conocerla: Frappe responde `200 OK` y **descarta en silencio** los campos que ya no existen en un doctype. Una actualización que elimine un campo no se manifiesta como error, sino como datos que desaparecen sin aviso. Si un campo deja de guardarse tras actualizar, comprueba que sigue existiendo con `GET /api/resource/DocType/CRM Organization`.

## Recursos

- [Documentación de nodos comunitarios de n8n](https://docs.n8n.io/integrations/#community-nodes)
- [Documentación de la API REST de Frappe](https://docs.frappe.io/framework/user/en/api/rest)
- [Código fuente de Frappe CRM](https://github.com/frappe/crm)
- [Arquitectura de la credencial compartida](docs/CREDENTIALS.md)

## Historial de versiones

### 0.1.0

Versión inicial. Nodo Frappe CRM con los recursos Lead, Deal, Contact, Organization, Task y Note, y la credencial compartida `frappeApi`.

## Desarrollo

```bash
npm install
npm run build     # compila a dist/ y copia los iconos
npm run dev       # bucle de desarrollo con un n8n local
npm run lint      # el mismo comando que ejecuta la CI
npm run lint:fix
```

No hay ningún runner de tests en este repositorio. Verifica tus cambios con `npm run build` y después una carga real en n8n.

Consulta [AGENTS.md](AGENTS.md) para la guía completa de contribución.
