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
 * `CRM Organization` fields.
 *
 * The doctype uses `autoname: field:organization_name`: the organization name *is* the
 * document identifier. Changing it renames the record.
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
		displayName: 'Company Description',
		name: 'company_description',
		type: 'string',
		typeOptions: { rows: 3 },
		default: '',
		description: "Description de l'organisation",
	},
	{
		displayName: 'Currency',
		name: 'currency',
		type: 'string',
		default: '',
		description: 'Code devise, lien vers le doctype Currency (ex. EUR, USD).',
	},
	{
		displayName: 'Facebook',
		name: 'facebook',
		type: 'string',
		default: '',
		description: 'URL de la page Facebook',
	},
	{
		displayName: 'Industry',
		name: 'industry',
		type: 'string',
		default: '',
		description: 'Lien vers un enregistrement du doctype CRM Industry',
	},
	{
		displayName: 'LinkedIn',
		name: 'linkedin',
		type: 'string',
		default: '',
		description: 'URL de la page LinkedIn',
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
		displayName: 'Twitter',
		name: 'twitter',
		type: 'string',
		default: '',
		description: 'Identifiant ou URL Twitter',
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
