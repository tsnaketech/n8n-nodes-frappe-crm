/**
 * Correspondance resource n8n -> doctype Frappe.
 *
 * Noms vérifiés dans github.com/frappe/crm, dossier `crm/fcrm/doctype/`.
 * Attention : il n'existe pas de doctype « CRM Contact ». Le dossier `crm_contacts`
 * correspond à `CRM Contacts`, une table enfant (`"istable": 1`) utilisée dans le
 * champ `contacts` de `CRM Deal`. Frappe CRM s'appuie sur le doctype `Contact` du
 * core Frappe (cf. `CRM Deal.contact`, un Link vers `Contact`).
 */
export const DOCTYPE_BY_RESOURCE = {
	lead: 'CRM Lead',
	deal: 'CRM Deal',
	contact: 'Contact',
	organization: 'CRM Organization',
	task: 'CRM Task',
	note: 'FCRM Note',
} as const;

export type FrappeCrmResource = keyof typeof DOCTYPE_BY_RESOURCE;

export function getDoctype(resource: string): string {
	const doctype = DOCTYPE_BY_RESOURCE[resource as FrappeCrmResource];
	if (doctype === undefined) {
		throw new Error(`Resource inconnue : ${resource}`);
	}
	return doctype;
}
