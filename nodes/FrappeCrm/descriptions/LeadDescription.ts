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

/** `CRM Lead` fields offered on create as well as update. */
const leadFields: INodeProperties[] = [
	{
		displayName: 'Annual Revenue',
		name: 'annual_revenue',
		type: 'number',
		default: 0,
	},
	{
		displayName: 'Email',
		name: 'email',
		type: 'string',
		placeholder: 'nom@email.com',
		default: '',
		description: 'Email address of the lead',
	},
	{
		displayName: 'First Name',
		name: 'first_name',
		type: 'string',
		default: '',
		description: 'First name of the lead',
	},
	{
		displayName: 'Gender',
		name: 'gender',
		type: 'string',
		default: '',
		description: 'Link to a Gender doctype record (e.g. Male, Female)',
	},
	{
		displayName: 'Industry',
		name: 'industry',
		type: 'string',
		default: '',
		description: 'Link to a CRM Industry doctype record',
	},
	{
		displayName: 'Job Title',
		name: 'job_title',
		type: 'string',
		default: '',
	},
	{
		displayName: 'Last Name',
		name: 'last_name',
		type: 'string',
		default: '',
	},
	{
		displayName: 'Lead Owner',
		name: 'lead_owner',
		type: 'string',
		default: '',
		description: 'Email of the user who owns the lead',
	},
	{
		displayName: 'Middle Name',
		name: 'middle_name',
		type: 'string',
		default: '',
	},
	{
		displayName: 'Mobile Number',
		name: 'mobile_no',
		type: 'string',
		default: '',
	},
	{
		displayName: 'Number of Employees',
		name: 'no_of_employees',
		type: 'options',
		options: NO_OF_EMPLOYEES_OPTIONS,
		default: '1-10',
		description: 'Employee count bracket of the organization',
	},
	{
		displayName: 'Organization',
		name: 'organization',
		type: 'string',
		default: '',
		description: 'Organization name of the lead (a free-text field on CRM Lead)',
	},
	{
		displayName: 'Phone',
		name: 'phone',
		type: 'string',
		default: '',
		description: 'Landline phone number',
	},
	{
		displayName: 'Salutation',
		name: 'salutation',
		type: 'string',
		default: '',
		description: 'Link to a Salutation doctype record (e.g. Mr, Mrs)',
	},
	{
		displayName: 'Source',
		name: 'source',
		type: 'string',
		default: '',
		description: 'Link to a CRM Lead Source doctype record',
	},
	{
		displayName: 'Status',
		name: 'status',
		type: 'string',
		default: '',
		description:
			'Link to a CRM Lead Status doctype record (e.g. New, Contacted, Qualified). Frappe applies the default status when left empty.',
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

export const leadDescription: INodeProperties[] = [
	operationsFor('lead', 'lead'),
	{
		displayName: 'First Name',
		name: 'first_name',
		type: 'string',
		default: '',
		required: true,
		displayOptions: { show: { resource: ['lead'], operation: ['create'] } },
		description: 'First name of the lead, the only field CRM Lead requires',
	},
	documentIdField(
		'lead',
		'The Frappe record "name" field. For a lead it looks like CRM-LEAD-2026-00001.',
	),
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add field',
		default: {},
		displayOptions: { show: { resource: ['lead'], operation: ['create'] } },
		options: omitFields(leadFields, ['first_name']),
	},
	{
		displayName: 'Update Fields',
		name: 'updateFields',
		type: 'collection',
		placeholder: 'Add field',
		default: {},
		displayOptions: { show: { resource: ['lead'], operation: ['update'] } },
		options: leadFields,
	},
	...getManyFields('lead'),
];
