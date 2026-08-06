import type { INodeProperties } from 'n8n-workflow';

import { documentIdField, getManyFields, omitFields, operationsFor } from './CommonDescription';

/**
 * Fields of the `Contact` doctype (Frappe core), the one Frappe CRM uses.
 *
 * "Email", "Mobile Number" and "Phone" are not plain fields on the Frappe side:
 * `Contact.email_id`, `Contact.mobile_no` and `Contact.phone` are recomputed from the
 * `email_ids` and `phone_nos` child tables (see `set_primary_email()` in
 * frappe/contacts/doctype/contact/contact.py, which blanks `email_id` out when
 * `email_ids` is empty). The node therefore turns them into child table rows before
 * sending — see `buildContactBody()` in FrappeCrm.node.ts.
 */
const contactFields: INodeProperties[] = [
	{
		displayName: 'Address',
		name: 'address',
		type: 'resourceLocator',
		default: { mode: 'list', value: '' },
		description: 'Link to an Address doctype record',
		modes: [
			{
				displayName: 'From List',
				name: 'list',
				type: 'list',
				typeOptions: {
					searchListMethod: 'searchAddress',
					searchable: true,
					searchFilterRequired: false,
				},
			},
			{
				displayName: 'By Name',
				name: 'name',
				type: 'string',
				placeholder: 'Head Office-Billing',
			},
		],
	},
	{
		displayName: 'Company Name',
		name: 'company_name',
		type: 'string',
		default: '',
		description: 'Company name of the contact',
	},
	{
		displayName: 'Department',
		name: 'department',
		type: 'string',
		default: '',
		description: 'Department the contact belongs to',
	},
	{
		displayName: 'Designation',
		name: 'designation',
		type: 'string',
		default: '',
		description: 'Role held by the contact',
	},
	{
		displayName: 'Email',
		name: 'email',
		type: 'string',
		placeholder: 'name@example.com',
		default: '',
		description:
			'Primary email address. Written to the email_ids child table with is_primary, because Frappe ignores an email_id sent directly.',
	},
	{
		displayName: 'First Name',
		name: 'first_name',
		type: 'string',
		default: '',
		description: 'First name of the contact',
	},
	{
		displayName: 'Gender Name or ID',
		name: 'gender',
		type: 'options',
		typeOptions: { loadOptionsMethod: 'getGenders' },
		default: '',
		description:
			'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>',
	},
	{
		displayName: 'Last Name',
		name: 'last_name',
		type: 'string',
		default: '',
		description: 'Last name of the contact',
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
		description: 'Mobile number. Written to the phone_nos child table with is_primary_mobile_no.',
	},
	{
		displayName: 'Phone',
		name: 'phone',
		type: 'string',
		default: '',
		description:
			'Landline phone number. Written to the phone_nos child table with is_primary_phone.',
	},
	{
		displayName: 'Salutation Name or ID',
		name: 'salutation',
		type: 'options',
		typeOptions: { loadOptionsMethod: 'getSalutations' },
		default: '',
		description:
			'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>',
	},
	{
		displayName: 'Status',
		name: 'status',
		type: 'options',
		options: [
			{ name: 'Passive', value: 'Passive' },
			{ name: 'Open', value: 'Open' },
			{ name: 'Replied', value: 'Replied' },
		],
		default: 'Passive',
		description: 'Follow-up status of the contact',
	},
	{
		displayName: 'Unsubscribed',
		name: 'unsubscribed',
		type: 'boolean',
		default: false,
		description: 'Whether the contact opted out of mailings',
	},
	{
		displayName: 'User',
		name: 'user',
		type: 'resourceLocator',
		default: { mode: 'list', value: '' },
		description: 'Email of a Frappe user to link to the contact',
		modes: [
			{
				displayName: 'From List',
				name: 'list',
				type: 'list',
				typeOptions: {
					searchListMethod: 'searchUser',
					searchable: true,
					searchFilterRequired: false,
				},
			},
			{
				displayName: 'By Name',
				name: 'name',
				type: 'string',
				placeholder: 'agent@example.com',
			},
		],
	},
];

export const contactDescription: INodeProperties[] = [
	operationsFor('contact', 'contact'),
	{
		displayName: 'First Name',
		name: 'first_name',
		type: 'string',
		default: '',
		required: true,
		displayOptions: { show: { resource: ['contact'], operation: ['create'] } },
		description: 'First name of the contact, used by Frappe to name the record',
	},
	documentIdField(
		'contact',
		'The Frappe record "name" field. For a contact it is the full name, for example "Marie Dupont".',
		undefined,
		'Marie Dupont',
	),
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add field',
		default: {},
		displayOptions: { show: { resource: ['contact'], operation: ['create'] } },
		options: omitFields(contactFields, ['first_name']),
	},
	{
		displayName: 'Update Fields',
		name: 'updateFields',
		type: 'collection',
		placeholder: 'Add field',
		default: {},
		displayOptions: { show: { resource: ['contact'], operation: ['update'] } },
		options: contactFields,
	},
	...getManyFields('contact'),
];
