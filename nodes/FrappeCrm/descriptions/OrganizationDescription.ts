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
		description: 'Link to an Address doctype record',
	},
	{
		displayName: 'Annual Revenue',
		name: 'annual_revenue',
		type: 'number',
		default: 0,
	},
	{
		displayName: 'Currency',
		name: 'currency',
		type: 'string',
		default: '',
		description: 'Currency code, link to the Currency doctype (e.g. EUR, USD)',
	},
	{
		displayName: 'Exchange Rate',
		name: 'exchange_rate',
		type: 'number',
		default: 0,
		description: 'Exchange rate between the currency above and the site currency',
	},
	{
		displayName: 'Industry',
		name: 'industry',
		type: 'string',
		default: '',
		description: 'Link to a CRM Industry doctype record',
	},
	{
		displayName: 'Number of Employees',
		name: 'no_of_employees',
		type: 'options',
		options: NO_OF_EMPLOYEES_OPTIONS,
		default: '1-10',
		description: 'Employee count bracket',
	},
	{
		displayName: 'Organization Logo',
		name: 'organization_logo',
		type: 'string',
		default: '',
		description:
			'URL of the logo file, as returned by the Frappe upload (e.g. /files/logo.png)',
	},
	{
		displayName: 'Organization Name',
		name: 'organization_name',
		type: 'string',
		default: '',
		description:
			'Name of the organization. It doubles as the document identifier: changing it renames the record.',
	},
	{
		displayName: 'Territory',
		name: 'territory',
		type: 'string',
		default: '',
		description: 'Link to a CRM Territory doctype record',
	},
	{
		displayName: 'Website',
		name: 'website',
		type: 'string',
		default: '',
		description: 'Website of the organization',
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
		description: 'Name of the organization, which also acts as the document identifier',
	},
	documentIdField(
		'organization',
		'The Frappe record "name" field. For an organization it is its name, for example "Acme Corp".',
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
