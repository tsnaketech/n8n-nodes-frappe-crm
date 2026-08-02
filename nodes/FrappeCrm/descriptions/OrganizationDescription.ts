import type { INodeProperties } from 'n8n-workflow';

import { documentIdField, getManyFields, omitFields, operationsFor } from './CommonDescription';

const NO_OF_EMPLOYEES_OPTIONS = [
	{ name: '1-10', value: '1-10' },
	{ name: '11-50', value: '11-50' },
	{ name: '51-200', value: '51-200' },
	{ name: '201-500', value: '201-500' },
	{ name: '501-1000', value: '501-1000' },
	{ name: '1000+', value: '1000+' },
];

/**
 * `CRM Organization` fields, checked against the doctype meta of Frappe CRM 1.81.0.
 *
 * The doctype uses `autoname: field:organization_name`: the organization name *is* the
 * document identifier. Changing it renames the record.
 *
 * `company_description`, `facebook`, `linkedin` and `twitter` used to be listed here but no
 * longer exist on the doctype. Frappe drops unknown keys instead of rejecting them — the
 * insert answered `200 OK` with the values silently gone — so exposing them meant offering
 * fields that quietly discarded what the user typed.
 */
const organizationFields: INodeProperties[] = [
	{
		displayName: 'Address',
		name: 'address',
		type: 'string',
		default: '',
		description: 'Lien vers un enregistrement du doctype Address',
	},
	{
		displayName: 'Annual Revenue',
		name: 'annual_revenue',
		type: 'number',
		default: 0,
		description: "Chiffre d'affaires annuel",
	},
	{
		displayName: 'Currency',
		name: 'currency',
		type: 'string',
		default: '',
		description: 'Code devise, lien vers le doctype Currency (ex. EUR, USD).',
	},
	{
		displayName: 'Exchange Rate',
		name: 'exchange_rate',
		type: 'number',
		default: 0,
		description: 'Taux de change entre la devise ci-dessus et la devise du site',
	},
	{
		displayName: 'Industry',
		name: 'industry',
		type: 'string',
		default: '',
		description: 'Lien vers un enregistrement du doctype CRM Industry',
	},
	{
		displayName: 'Number of Employees',
		name: 'no_of_employees',
		type: 'options',
		options: NO_OF_EMPLOYEES_OPTIONS,
		default: '1-10',
		description: "Tranche d'effectif",
	},
	{
		displayName: 'Organization Logo',
		name: 'organization_logo',
		type: 'string',
		default: '',
		description:
			"URL du fichier logo, telle que renvoyée par l'upload Frappe (ex. /files/logo.png).",
	},
	{
		displayName: 'Organization Name',
		name: 'organization_name',
		type: 'string',
		default: '',
		description:
			"Nom de l'organisation. Il sert d'identifiant au document : le modifier renomme l'enregistrement.",
	},
	{
		displayName: 'Territory',
		name: 'territory',
		type: 'string',
		default: '',
		description: 'Lien vers un enregistrement du doctype CRM Territory',
	},
	{
		displayName: 'Website',
		name: 'website',
		type: 'string',
		default: '',
		description: "Site web de l'organisation",
	},
];

export const organizationDescription: INodeProperties[] = [
	operationsFor('organization', 'organization'),
	{
		displayName: 'Organization Name',
		name: 'organization_name',
		type: 'string',
		default: '',
		required: true,
		displayOptions: { show: { resource: ['organization'], operation: ['create'] } },
		description: "Nom de l'organisation, qui sert aussi d'identifiant au document",
	},
	documentIdField(
		'organization',
		"Champ « name » de l'enregistrement Frappe. Pour une organisation il s'agit de son nom, par exemple « Acme Corp ».",
	),
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add field',
		default: {},
		displayOptions: { show: { resource: ['organization'], operation: ['create'] } },
		options: omitFields(organizationFields, ['organization_name']),
	},
	{
		displayName: 'Update Fields',
		name: 'updateFields',
		type: 'collection',
		placeholder: 'Add field',
		default: {},
		displayOptions: { show: { resource: ['organization'], operation: ['update'] } },
		options: organizationFields,
	},
	...getManyFields('organization'),
];
