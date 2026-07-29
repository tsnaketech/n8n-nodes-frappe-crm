# n8n-nodes-frappe-crm

Package de nœuds communautaires n8n pour les applications [Frappe](https://frappe.io/), à commencer par **Frappe CRM**. Il permet de lire et d'écrire leads, affaires, contacts, organisations, tâches et notes depuis vos workflows n8n.

[n8n](https://n8n.io/) est une plateforme d'automatisation de workflows sous [licence fair-code](https://docs.n8n.io/reference/license/).

Autres langues : [English](README.md) · [Español](README.es.md) · [Deutsch](README.de.md)

[Installation](#installation)
[Credentials](#credentials)
[Opérations](#opérations)
[Utilisation](#utilisation)
[Compatibilité](#compatibilité)
[Ressources](#ressources)
[Historique des versions](#historique-des-versions)
[Développement](#développement)

## Installation

Suivez le [guide d'installation](https://docs.n8n.io/integrations/community-nodes/installation/) de la documentation n8n sur les nœuds communautaires, avec `n8n-nodes-frappe-crm` comme nom de package.

**Auto-hébergé, via l'interface n8n** — allez dans **Settings > Community nodes > Install**, saisissez `n8n-nodes-frappe-crm` et validez.

**Auto-hébergé, manuellement :**

```bash
cd ~/.n8n/custom
npm install n8n-nodes-frappe-crm
```

Redémarrez n8n, puis cherchez « Frappe CRM » dans le panneau des nœuds.

## Credentials

Ce package n'utilise qu'un seul type de credential : **Frappe API** (`frappeApi`).

### Générer les clés d'API dans Frappe

1. Dans votre site Frappe, ouvrez l'utilisateur au nom duquel n8n doit agir (`/app/user`).
2. Descendez jusqu'à **Settings > API Access** et cliquez sur **Generate Keys**.
3. Copiez l'**API Secret** — il n'est affiché qu'une seule fois — ainsi que l'**API Key** visible sur la fiche utilisateur.

Le nœud agit en tant que cet utilisateur : il hérite de ses rôles et de ses permissions. Si un appel échoue sur une erreur de permission, vérifiez les rôles sur le doctype plutôt que le credential.

### Renseigner le credential

| Champ      | Exemple                          | Remarques                                                        |
| ---------- | -------------------------------- | ---------------------------------------------------------------- |
| Site URL   | `https://mon-site.frappe.cloud`  | Racine du site. Un `/crm` ou un `/` final est retiré automatiquement |
| API Key    | `a1b2c3d4e5f6g7h`                |                                                                   |
| API Secret | `s1e2c3r4e5t6`                   | Stocké chiffré par n8n                                            |

Les requêtes sont authentifiées par le header `Authorization: token {apiKey}:{apiSecret}`. Utilisez **Test** pour valider la connexion : l'appel vise `/api/method/frappe.auth.get_logged_user` et échoue si le site répond en tant que `Guest`, ce que renvoie Frappe lorsque les clés ne sont pas reconnues.

### Un seul credential pour tous les nœuds Frappe

`frappeApi` n'est délibérément **pas** spécifique au CRM. Frappe authentifie *un utilisateur sur un site*, pas une application : la même clé d'API fonctionne pour Frappe CRM, Frappe Helpdesk, Frappe HR et Frappe LMS, qui vivent sur le même site et partagent le même endpoint `/api`.

Les packages compagnons embarquent exactement le même credential, sous le même nom interne `frappeApi` :

| Package                      | Nœud            |
| ---------------------------- | --------------- |
| `n8n-nodes-frappe-helpdesk`  | Frappe Helpdesk |
| `n8n-nodes-frappe-hrms`      | Frappe HRMS     |

Installez-en plusieurs et n8n n'affiche qu'**un seul** type de credential « Frappe API » : vous configurez votre site une fois, et tous les nœuds Frappe peuvent le sélectionner. Créez un credential par *site* (« Frappe – prod », « Frappe – recette »), pas un par application.

Voir [docs/CREDENTIALS.md](docs/CREDENTIALS.md) pour l'architecture complète et la marche à suivre pour brancher un nouveau nœud Frappe sur ce credential.

## Opérations

Chaque resource propose les cinq mêmes opérations : **Create**, **Get**, **Get Many**, **Update** et **Delete**.

| Resource     | Doctype Frappe     | Remarques                                                          |
| ------------ | ------------------ | ------------------------------------------------------------------ |
| Lead         | `CRM Lead`         | `First Name` obligatoire ; identifiants du type `CRM-LEAD-2026-00001` |
| Deal         | `CRM Deal`         | Aucun champ obligatoire ; identifiants du type `CRM-DEAL-2026-00001` |
| Contact      | `Contact`          | Doctype du core Frappe — voir la note ci-dessous                    |
| Organization | `CRM Organization` | Le nom de l'organisation **est** l'identifiant du document          |
| Task         | `CRM Task`         | `Title` obligatoire ; identifiants entiers auto-incrémentés          |
| Note         | `FCRM Note`        | `Title` obligatoire                                                 |

Toutes les opérations passent par l'API REST standard de Frappe, sur `/api/resource/{doctype}`, en `GET`, `POST`, `PUT` et `DELETE`.

> **Pourquoi `Contact` et pas `CRM Contact` ?**
> Frappe CRM n'a pas de doctype `CRM Contact`. Le dossier `crm/fcrm/doctype/crm_contacts` définit `CRM Contacts`, une *table enfant* utilisée à l'intérieur de `CRM Deal`. Les contacts eux-mêmes sont stockés dans le doctype `Contact` du core Frappe, celui vers lequel pointe `CRM Deal.contact`.
>
> Sur ce doctype, `email_id`, `mobile_no` et `phone` sont des champs **dérivés** : Frappe les recalcule à partir des tables enfants `email_ids` et `phone_nos`, et les vide si ces tables sont vides. Envoyer `email_id` directement n'a donc aucun effet. Le nœud s'en charge pour vous : les champs **Email**, **Mobile Number** et **Phone** sont écrits dans les bonnes tables enfants. Attention, sur **Update**, cela remplace les lignes existantes au lieu de s'y ajouter.

### Options de « Get Many »

| Option              | Correspond à                      | Remarques                                                        |
| ------------------- | --------------------------------- | ---------------------------------------------------------------- |
| Return All          | pagination auto sur `limit_start` | Récupère 100 enregistrements par requête jusqu'à la dernière page |
| Limit               | `limit_page_length`               | Utilisé quand Return All est désactivé                            |
| Offset              | `limit_start`                     | Ignoré quand Return All est actif                                 |
| Fields              | `fields`                          | Séparés par des virgules ou tableau JSON. Par défaut `["*"]`      |
| Filters (JSON)      | `filters`                         | Syntaxe de filtres Frappe                                         |
| Or Filters (JSON)   | `or_filters`                      | Même syntaxe, combinée en OU                                      |
| Sort Field / Order  | `order_by`                        | par ex. `modified desc`                                           |

Frappe ne renvoie que la colonne `name` lorsque `fields` n'est pas précisé : le nœud utilise donc `["*"]` par défaut, pour vous rendre le document complet.

Les filtres acceptent les deux formes de Frappe — un objet pour une égalité simple, ou un tableau de triplets pour les opérateurs :

```json
{ "status": "Open" }
```

```json
[["annual_revenue", ">", 50000], ["status", "!=", "Lost"]]
```

### Gestion des erreurs

Frappe rapporte ses erreurs dans un champ `_server_messages` qui contient du JSON encodé *à l'intérieur* de JSON, souvent avec du HTML. Le nœud le déballe et remonte le vrai message : vous obtenez `Value missing for CRM Lead: First Name` plutôt que `Request failed with status code 417`. À défaut, il se rabat sur le champ `exception`, puis sur le code HTTP.

## Utilisation

Chaque exemple ci-dessous est un nœud à coller dans un workflow n8n. Remplacez le bloc `credentials` par le vôtre.

### Lead — création

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

Laisser `status` vide ne pose pas de problème : Frappe attribue lui-même le statut ouvert par défaut.

### Deal — get many, avec filtres

Récupérer toutes les affaires en cours à plus de 50 000, les plus récentes d'abord :

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

### Contact — création

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

`email` et `mobile_no` sont écrits de façon transparente dans les tables enfants `email_ids` et `phone_nos`.

### Organization — mise à jour

L'identifiant d'une organisation est son nom :

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

Modifier `organization_name` renomme l'enregistrement, puisque ce champ est l'identifiant du document.

### Task — création, rattachée à une affaire

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

Les champs Date et Datetime sont convertis au format attendu par Frappe (`YYYY-MM-DD` et `YYYY-MM-DD HH:mm:ss`).

Frappe stocke des datetimes **naïfs**, interprétés dans le fuseau du site (**Settings > System Settings > Time Zone**). Le nœud convertit donc les valeurs porteuses d'un fuseau — ce que produit le sélecteur de date n8n, par exemple `2026-08-15T17:00:00+02:00` ou `...Z` — vers le **fuseau du workflow n8n**, et laisse inchangées les valeurs déjà sans fuseau.

Concrètement : gardez le même fuseau pour votre workflow n8n et pour votre site Frappe. S'ils diffèrent, une échéance saisie à 17h00 arrivera à une autre heure dans le CRM.

### Note — création, rattachée à un lead

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

`content` est un champ Text Editor de Frappe : il accepte du HTML.

### Suppression

Pour n'importe quelle resource, à partir de son identifiant de document :

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

Le nœud renvoie `{ "success": true, "doctype": "CRM Lead", "name": "CRM-LEAD-2026-00001" }`.

## Compatibilité

Testé avec n8n 1.x et Frappe Framework v15 avec Frappe CRM. Le nœud n'utilise que les endpoints REST standard `/api/resource` : il devrait fonctionner avec toute version de Frappe CRM conservant les noms de doctypes listés ci-dessus.

## Ressources

- [Documentation n8n sur les nœuds communautaires](https://docs.n8n.io/integrations/#community-nodes)
- [Documentation de l'API REST Frappe](https://docs.frappe.io/framework/user/en/api/rest)
- [Code source de Frappe CRM](https://github.com/frappe/crm)
- [Architecture du credential partagé](docs/CREDENTIALS.md)

## Historique des versions

### 0.1.0

Version initiale. Nœud Frappe CRM avec les resources Lead, Deal, Contact, Organization, Task et Note, et le credential partagé `frappeApi`.

## Développement

```bash
npm install
npm run build     # compile vers dist/ et copie les icônes
npm run dev       # boucle de développement avec un n8n local
npm run lint      # même commande que la CI
npm run lint:fix
```

Il n'y a pas de runner de tests dans ce dépôt. Vérifiez vos changements avec `npm run build` puis un chargement réel dans n8n.

Voir [AGENTS.md](AGENTS.md) pour le guide de contribution complet.
