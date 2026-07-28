# Architecture du credential partagé `frappeApi`

Ce dépôt a vocation à héberger plusieurs nœuds n8n pour les applications Frappe
(CRM, Helpdesk, LMS…). Tous s'authentifient **de la même façon**, contre le même site.
Le credential `frappeApi` est donc défini une seule fois et partagé, plutôt que dupliqué
par produit.

## Pourquoi un seul credential

Frappe Framework n'authentifie pas « une application », il authentifie **un utilisateur
sur un site**. Une paire API Key / API Secret est émise pour un utilisateur Frappe et
vaut pour toutes les applications installées sur ce site — le CRM, le Helpdesk et le LMS
partagent la même base, les mêmes utilisateurs et le même endpoint `/api`.

Créer un `frappeCrmApi`, un `frappeHelpdeskApi` et un `frappeLmsApi` reviendrait donc à
demander trois fois la même chose à l'utilisateur, avec trois fois le risque de la saisir
différemment. Un seul credential veut dire :

- une seule saisie d'URL, de clé et de secret, même si l'utilisateur installe les trois nœuds ;
- une rotation de clé à faire à un seul endroit ;
- un test de connexion qui vaut pour tous les nœuds.

## Ce que le credential contient

| Champ       | Nom interne | Rôle                                                        |
| ----------- | ----------- | ----------------------------------------------------------- |
| Site URL    | `siteUrl`   | Racine du site Frappe, par ex. `https://mon-site.frappe.cloud` |
| API Key     | `apiKey`    | Clé publique de la paire                                     |
| API Secret  | `apiSecret` | Secret de la paire, stocké chiffré                           |

L'authentification est un header appliqué à toutes les requêtes :

```
Authorization: token {apiKey}:{apiSecret}
```

Le test de connexion appelle `GET /api/method/frappe.auth.get_logged_user`. Cet endpoint
est fourni par Frappe Framework lui-même, pas par une application : il fonctionne à
l'identique sur un site CRM, Helpdesk ou LMS. Une règle supplémentaire traite la réponse
`{"message": "Guest"}` comme un échec — Frappe répond `200 OK` en tant qu'invité quand les
clés ne sont pas reconnues, ce qui donnerait sinon un faux positif.

## Ce que le credential ne contient pas, volontairement

Aucune notion de doctype, de resource ni de chemin d'application. Le credential ne connaît
que la racine du site ; c'est chaque nœud qui construit ses propres URL
(`/api/resource/CRM Lead`, `/api/resource/HD Ticket`, …). C'est cette absence de couplage
qui le rend réutilisable tel quel.

Note pratique : `normalizeSiteUrl()` retire un éventuel chemin de SPA en fin d'URL
(`/crm`, `/helpdesk`, `/lms`, `/app`…) ainsi que le slash final. Coller
`http://crm.localhost:8001/crm`, l'URL affichée par le navigateur, fonctionne donc aussi
bien que la racine du site — l'API vit toujours à la racine.

## Comment un futur nœud le réutilise

### 1. Déclarer le credential dans la description du nœud

Rien à créer : il suffit de le référencer par son nom interne.

```ts
export class FrappeHelpdesk implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Frappe Helpdesk',
		name: 'frappeHelpdesk',
		// ...
		credentials: [
			{
				name: 'frappeApi', // exactement le même que le nœud Frappe CRM
				required: true,
			},
		],
	};
}
```

### 2. Réutiliser la couche transport

`nodes/FrappeCrm/GenericFunctions.ts` ne contient rien de spécifique au CRM :
`frappeApiRequest`, `frappeApiRequestAllItems` et `parseFrappeError` ne connaissent que
le credential `frappeApi` et l'API REST générique de Frappe. Un nœud Helpdesk peut les
importer directement :

```ts
import { frappeApiRequest } from '../FrappeCrm/GenericFunctions';

const tickets = await frappeApiRequest.call(this, 'GET', '/api/resource/HD Ticket');
```

Si un troisième nœud arrive, il sera temps de déplacer ce fichier vers un
`nodes/shared/` commun. Tant qu'il n'y en a que deux, l'import direct évite une
indirection prématurée — mais **le fichier ne doit rien apprendre du CRM** : toute logique
propre à un doctype a sa place dans `FrappeCrm.node.ts`, pas ici.

### 3. Déclarer le nœud dans `package.json`

Le credential reste déclaré une seule fois, quel que soit le nombre de nœuds :

```json
{
	"n8n": {
		"credentials": ["dist/credentials/FrappeApi.credentials.js"],
		"nodes": [
			"dist/nodes/FrappeCrm/FrappeCrm.node.js",
			"dist/nodes/FrappeHelpdesk/FrappeHelpdesk.node.js"
		]
	}
}
```

## Côté utilisateur

Dans n8n, une instance de credential « Frappe API » configurée pour un site est
sélectionnable depuis n'importe quel nœud Frappe de ce package. Un utilisateur qui gère
plusieurs sites crée une instance par site (« Frappe – prod », « Frappe – recette »), pas
une par application.

## Compatibilité à préserver

Le nom interne `frappeApi` et les noms de champs `siteUrl`, `apiKey`, `apiSecret` font
partie du contrat public : les workflows enregistrés y font référence. Les renommer
casserait les credentials déjà configurés chez les utilisateurs. Un champ **ajouté**
(par exemple un token alternatif) doit donc être optionnel et laisser le comportement
actuel inchangé par défaut.
