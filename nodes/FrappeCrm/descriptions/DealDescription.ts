import type { INodeProperties } from 'n8n-workflow';

import { documentIdField, getManyFields, operationsFor } from './CommonDescription';

const NO_OF_EMPLOYEES_OPTIONS = [
	{ name: '1-10', value: '1-10' },
	{ name: '11-50', value: '11-50' },
	{ name: '51-200', value: '51-200' },
	{ name: '201-500', value: '201-500' },
	{ name: '501-1000', value: '501-1000' },
	{ name: '1000+', value: '1000+' },
];

/** `CRM Deal` fields. None is required API-side: Frappe infers the default status. */
const dealFields: INodeProperties[] = [
	{
		displayName: 'Annual Revenue',
		name: 'annual_revenue',
		type: 'number',
		default: 0,
		description: 'Annual revenue of the organization',
	},
	{
		displayName: 'Close Date',
		name: 'closed_date',
		type: 'dateTime',
		default: '',
		description: 'Actual closing date',
	},
	{
		displayName: 'Contact',
		name: 'contact',
		type: 'resourceLocator',
		default: { mode: 'list', value: '' },
		description: 'Link to a Contact doctype record',
		modes: [
			{
				displayName: 'From List',
				name: 'list',
				type: 'list',
				typeOptions: {
					searchListMethod: 'searchContact',
					searchable: true,
					searchFilterRequired: false,
				},
			},
			{
				displayName: 'By Name',
				name: 'name',
				type: 'string',
				placeholder: 'Marie Dupont',
			},
		],
	},
	{
		displayName: 'Currency Name or ID',
		name: 'currency',
		type: 'options',
		typeOptions: { loadOptionsMethod: 'getCurrencies' },
		default: '',
		description:
			'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>',
	},
	{
		displayName: 'Deal Owner',
		name: 'deal_owner',
		type: 'string',
		default: '',
		description: 'Email of the user who owns the deal',
	},
	{
		displayName: 'Email',
		name: 'email',
		type: 'string',
		placeholder: 'name@example.com',
		default: '',
		description: 'Email address of the primary contact',
	},
	{
		displayName: 'Expected Closure Date',
		name: 'expected_closure_date',
		type: 'dateTime',
		default: '',
		description: 'Expected closing date',
	},
	{
		displayName: 'Expected Deal Value',
		name: 'expected_deal_value',
		type: 'number',
		default: 0,
		description: 'Expected value of the deal',
	},
	{
		displayName: 'First Name',
		name: 'first_name',
		type: 'string',
		default: '',
		description: 'First name of the primary contact',
	},
	{
		displayName: 'Industry Name or ID',
		name: 'industry',
		type: 'options',
		typeOptions: { loadOptionsMethod: 'getCrmIndustries' },
		default: '',
		description:
			'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>',
	},
	{
		displayName: 'Job Title',
		name: 'job_title',
		type: 'string',
		default: '',
		description: 'Job title of the primary contact',
	},
	{
		displayName: 'Last Name',
		name: 'last_name',
		type: 'string',
		default: '',
		description: 'Last name of the primary contact',
	},
	{
		displayName: 'Lead',
		name: 'lead',
		type: 'resourceLocator',
		default: { mode: 'list', value: '' },
		description: 'Link to the originating CRM Lead, when the deal comes from a conversion',
		modes: [
			{
				displayName: 'From List',
				name: 'list',
				type: 'list',
				typeOptions: {
					searchListMethod: 'searchCrmLead',
					searchable: true,
					searchFilterRequired: false,
				},
			},
			{
				displayName: 'By Name',
				name: 'name',
				type: 'string',
				placeholder: 'CRM-LEAD-2026-00001',
			},
		],
	},
	{
		displayName: 'Lost Reason Name or ID',
		name: 'lost_reason',
		type: 'options',
		typeOptions: { loadOptionsMethod: 'getCrmLostReasons' },
		default: '',
		description:
			'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>',
	},
	{
		displayName: 'Mobile Number',
		name: 'mobile_no',
		type: 'string',
		default: '',
		description: 'Mobile number of the primary contact',
	},
	{
		displayName: 'Next Step',
		name: 'next_step',
		type: 'string',
		default: '',
		description: 'Next planned action',
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
		type: 'resourceLocator',
		default: { mode: 'list', value: '' },
		description:
			'Link to a CRM Organization doctype record. This is the organization name, which doubles as its identifier.',
		modes: [
			{
				displayName: 'From List',
				name: 'list',
				type: 'list',
				typeOptions: {
					searchListMethod: 'searchCrmOrganization',
					searchable: true,
					searchFilterRequired: false,
				},
			},
			{
				displayName: 'By Name',
				name: 'name',
				type: 'string',
				placeholder: 'Acme Corp',
			},
		],
	},
	{
		displayName: 'Phone',
		name: 'phone',
		type: 'string',
		default: '',
		description: 'Landline phone number',
	},
	{
		displayName: 'Probability',
		name: 'probability',
		type: 'number',
		default: 0,
		typeOptions: { minValue: 0, maxValue: 100 },
		description: 'Probability of closing, as a percentage',
	},
	{
		displayName: 'Source Name or ID',
		name: 'source',
		type: 'options',
		typeOptions: { loadOptionsMethod: 'getCrmLeadSources' },
		default: '',
		description:
			'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>',
	},
	{
		displayName: 'Status Name or ID',
		name: 'status',
		type: 'options',
		typeOptions: { loadOptionsMethod: 'getCrmDealStatuses' },
		default: '',
		description:
			'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>',
	},
	{
		displayName: 'Territory Name or ID',
		name: 'territory',
		type: 'options',
		typeOptions: { loadOptionsMethod: 'getCrmTerritories' },
		default: '',
		description:
			'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>',
	},
	{
		displayName: 'Website',
		name: 'website',
		type: 'string',
		default: '',
		description: 'Website of the organization',
	},
];

export const dealDescription: INodeProperties[] = [
	operationsFor('deal', 'deal'),
	documentIdField(
		'deal',
		'The Frappe record "name" field. For a deal it looks like CRM-DEAL-2026-00001.',
		undefined,
		'CRM-DEAL-2026-00001',
	),
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add field',
		default: {},
		displayOptions: { show: { resource: ['deal'], operation: ['create'] } },
		options: dealFields,
	},
	{
		displayName: 'Update Fields',
		name: 'updateFields',
		type: 'collection',
		placeholder: 'Add field',
		default: {},
		displayOptions: { show: { resource: ['deal'], operation: ['update'] } },
		options: dealFields,
	},
	...getManyFields('deal'),
];
