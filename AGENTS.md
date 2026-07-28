# AGENTS.md

Guide pour les agents IA travaillant sur ce dépôt.

## Contexte du projet

Package de nœuds communautaires n8n, écrit en TypeScript, publié sous le nom
`n8n-nodes-frappe-crm` (dépôt : github.com/tsnaketech/n8n-nodes-frappe-crm).

Objectif : une **suite** de nœuds pour les applications Frappe. Seul le nœud Frappe CRM
existe aujourd'hui ; les nœuds Frappe Helpdesk et Frappe LMS sont prévus. Le template de
départ (`ExampleNode` / `ExampleApi`) a été supprimé.

Le point structurant : les trois applications tournent sur le même site Frappe et
partagent la même authentification. Le credential `frappeApi` est donc **unique et
générique** — il ne connaît que la racine du site, jamais un doctype ni un produit. Ne pas
créer de credential par application. Voir `docs/CREDENTIALS.md`, qui fait référence sur ce
point.

Le dépôt n'est pas initialisé sous git (`git init` reste à faire si besoin).

## Structure

```
nodes/FrappeCrm/FrappeCrm.node.ts       Nœud Frappe CRM (programmatique, routeur execute)
nodes/FrappeCrm/GenericFunctions.ts     Transport Frappe : requêtes, pagination, erreurs
nodes/FrappeCrm/types.ts                Map resource n8n -> doctype Frappe
nodes/FrappeCrm/descriptions/           Propriétés UI, un fichier par resource
credentials/FrappeApi.credentials.ts    Credential partagé (siteUrl + apiKey + apiSecret)
icons/frappe.svg, frappe.dark.svg       Icônes light/dark référencées par le nœud
docs/CREDENTIALS.md                     Architecture du credential partagé
.github/workflows/ci.yml                lint + build sur PR et push sur main
.github/workflows/publish.yml           Publication npm avec provenance sur tag *.*.*
```

`GenericFunctions.ts` est volontairement dépourvu de logique CRM : c'est la couche que les
futurs nœuds Helpdesk et LMS importeront. Toute logique propre à un doctype va dans
`FrappeCrm.node.ts`. À partir d'un troisième nœud, déplacer ce fichier vers `nodes/shared/`.

## Doctypes Frappe CRM

Noms vérifiés dans `crm/fcrm/doctype/` du dépôt frappe/crm. À ne pas deviner :

| Resource     | Doctype            |
| ------------ | ------------------ |
| Lead         | `CRM Lead`         |
| Deal         | `CRM Deal`         |
| Contact      | `Contact`          |
| Organization | `CRM Organization` |
| Task         | `CRM Task`         |
| Note         | `FCRM Note`        |

Deux pièges déjà rencontrés, à ne pas réintroduire :

- **Il n'existe pas de doctype `CRM Contact`.** `crm_contacts` définit `CRM Contacts`, une
  table enfant (`istable: 1`) de `CRM Deal`. Les contacts vivent dans le `Contact` du core.
- Sur `Contact`, `email_id` / `mobile_no` / `phone` sont **dérivés** des tables enfants
  `email_ids` / `phone_nos` : `set_primary_email()` les vide si la table est vide. Les
  envoyer directement est sans effet — cf. `buildContactBody()` dans le nœud.

`tsconfig.json` compile `credentials/**` et `nodes/**` vers `dist/`. Les chemins déclarés
dans `package.json` → `n8n.nodes` / `n8n.credentials` pointent vers `dist/`, pas vers les
sources : **toute création ou renommage de nœud doit être répercuté dans ces deux tableaux**,
sinon n8n ne charge rien et il n'y a aucune erreur explicite.

## Commandes

```bash
npm install          # node_modules n'est pas présent dans l'arbre actuel
npm run build        # n8n-node build → dist/ (JS compilé + icônes copiées)
npm run build:watch  # tsc --watch
npm run dev          # n8n-node dev (boucle de dev avec n8n)
npm run lint         # n8n-node lint — même commande que la CI
npm run lint:fix
npm run release      # release interactive : lint, build, bump, tag, push → déclenche publish.yml
```

La CI n'exécute que `npm ci`, `npm run lint`, `npm run build`. Il n'y a **aucun test**
dans le dépôt et aucun runner de test configuré ; ne pas inventer `npm test`. Si un
changement mérite d'être vérifié, le faire via `npm run build` puis un chargement réel
dans n8n (voir README, section « Testing locally in n8n »).

## Conventions de code

- Prettier (`.prettierrc.js`) : **tabulations**, largeur 100, guillemets simples, points-virgules,
  virgules finales partout, fins de ligne LF. Attention : les fichiers `.ts` existants sont
  indentés en espaces (2), en désaccord avec cette config. Suivre l'indentation du fichier
  qu'on modifie plutôt que de reformater en masse ; un reformatage global doit être une
  tâche à part, explicitement demandée.
- ESLint : config `@n8n/node-cli/eslint`, non personnalisée. Elle impose les règles n8n sur
  le nommage des paramètres, `displayName`, l'ordre des options, etc. — ces erreurs de lint
  sont des vraies contraintes de la plateforme, ne pas les désactiver avec un commentaire
  sans raison.
- TypeScript en `strict`, avec `noUnusedLocals` et `noImplicitReturns` : du code mort ou une
  branche sans `return` casse le build.
- Importer les types depuis `n8n-workflow` en `import type`, et les valeurs
  (`NodeConnectionTypes`, `NodeOperationError`) en import normal.

## Patterns n8n à respecter

- Requêtes HTTP : passer par `this.helpers.httpRequestWithAuthentication.call(this, '<credName>', {...})`
  plutôt que `fetch`/`axios`. Cela applique les credentials et le proxy de l'instance.
- Boucle sur les items : itérer `this.getInputData()`, renseigner `pairedItem: { item: i }` sur
  chaque sortie, et honorer `this.continueOnFail()` avant de relancer l'erreur.
- Erreurs : `throw new NodeOperationError(this.getNode(), error, { itemIndex: i })`.
  Ne pas laisser remonter une `Error` brute.
- Le nœud expose `usableAsTool: true` (utilisable par les agents IA n8n) — garder les
  `description` et `action` des opérations lisibles, elles servent de doc à l'agent.
- Dates : ne **jamais** faire `toISOString()` pour alimenter un champ Frappe. Frappe stocke
  des datetimes naïfs interprétés dans le fuseau du site ; passer par UTC décale l'heure de
  tous les sites non-UTC (vérifié sur un site `Europe/Paris` : 17h00 devenait 15h00).
  `normalizeDates()` convertit vers `this.getTimezone()` et laisse passer les valeurs déjà
  sans fuseau.
- Erreurs Frappe : passer par `parseFrappeError()`. Frappe renvoie ses messages dans
  `_server_messages`, du JSON encodé **dans** du JSON et truffé de HTML ; remonter le code
  HTTP brut ne renseigne pas l'utilisateur. Les requêtes utilisent donc
  `ignoreHttpStatusErrors` pour inspecter le corps avant de lever une `NodeApiError`.

## Attention avec `npm run lint:fix`

L'autofix de `node-param-description-missing-final-period` **casse les descriptions
construites en template literal** : il a déjà remplacé une description
`` `... ${hint}` `` par une chaîne littérale tronquée, supprimant l'interpolation au
passage (le build ne le voit pas, seul `noUnusedLocals` a signalé le paramètre devenu
inutilisé). Après un `lint:fix`, relire le diff des fichiers `descriptions/` plutôt que de
le supposer sûr. Les `description` doivent rester des chaînes littérales.

## Documentation

Quatre READMEs traduits (`README.md`, `.fr.md`, `.es.md`, `.de.md`). Un changement visible par
l'utilisateur (nouvelle opération, nouveau credential, prérequis) doit être répercuté dans
**les quatre**, sinon les traductions divergent silencieusement.

## Publication

`publish.yml` se déclenche sur un tag `*.*.*` et publie sur npm avec provenance
(exigence n8n depuis mai 2026). Nécessite `@n8n/node-cli` ≥ 0.23.0. Ne pas publier
manuellement (`npm publish`) : cela produit un package sans attestation de provenance,
que n8n refusera.
