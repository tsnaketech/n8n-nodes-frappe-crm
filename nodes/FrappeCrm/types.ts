/**
 * Mapping from n8n resource to Frappe doctype.
 *
 * Names verified against github.com/frappe/crm, folder `crm/fcrm/doctype/`.
 * Careful: there is no « CRM Contact » doctype. The `crm_contacts` folder defines
 * `CRM Contacts`, a child table (`"istable": 1`) used in the `contacts` field of
 * `CRM Deal`. Frappe CRM relies on the core Frappe `Contact` doctype instead
 * (see `CRM Deal.contact`, a Link to `Contact`).
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
