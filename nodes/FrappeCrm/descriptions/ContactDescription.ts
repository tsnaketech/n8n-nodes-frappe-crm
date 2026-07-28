import type { INodeProperties } from 'n8n-workflow';

import { documentIdField, getManyFields, omitFields, operationsFor } from './CommonDescription';

/**
 * Fields of the `Contact` doctype (Frappe core), the one Frappe CRM uses.
 *
 * « Email », « Mobile Number » and « Phone » are not plain fields on the Frappe side:
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
		type: 'string',
		default: '',
		description: 'Lien vers un enregistrement du doctype Address',
	},
	{
		displayName: 'Company Name',
		name: 'company_name',
		type: 'string',
		default: '',
		description: "Nom de l'entreprise du contact",
	},
	{
		displayName: 'Department',
		name: 'department',
		type: 'string',
		default: '',
		description: 'Service auquel le contact est rattaché',
	},
	{
		displayName: 'Designation',
		name: 'designation',
		type: 'string',
		default: '',
		description: 'Fonction occupée par le contact',
	},
	{
		displayName: 'Email',
		name: 'email',
		type: 'string',
		placeholder: 'nom@email.com',
		default: '',
		description:
			"Adresse email principale. Écrite dans la table enfant email_ids avec is_primary, car Frappe ignore un email_id envoyé directement.",
	},
	{
		displayName: 'First Name',
		name: 'first_name',
		type: 'string',
		default: '',
		description: 'Prénom du contact',
	},
	{
		displayName: 'Gender',
		name: 'gender',
		type: 'string',
		default: '',
		description: 'Lien vers un enregistrement du doctype Gender (ex. Male, Female).',
	},
	{
		displayName: 'Last Name',
		name: 'last_name',
		type: 'string',
		default: '',
		description: 'Nom de famille du contact',
	},
	{
		displayName: 'Middle Name',
		name: 'middle_name',
		type: 'string',
		default: '',
		description: 'Deuxième prénom',
	},
	{
		displayName: 'Mobile Number',
		name: 'mobile_no',
		type: 'string',
		default: '',
		description:
			'Numéro de mobile. Écrit dans la table enfant phone_nos avec is_primary_mobile_no.',
	},
	{
		displayName: 'Phone',
		name: 'phone',
		type: 'string',
		default: '',
		description: 'Numéro de téléphone fixe. Écrit dans la table enfant phone_nos avec is_primary_phone.',
	},
	{
		displayName: 'Salutation',
		name: 'salutation',
		type: 'string',
		default: '',
		description: 'Lien vers un enregistrement du doctype Salutation (ex. Mr, Mrs).',
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
		description: 'Statut de suivi du contact',
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
		type: 'string',
		default: '',
		description: "Email d'un utilisateur Frappe à associer au contact",
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
		description: 'Prénom du contact, utilisé par Frappe pour nommer l\'enregistrement',
	},
	documentIdField(
		'contact',
		'Champ « name » de l\'enregistrement Frappe. Pour un contact il correspond au nom complet, par exemple « Marie Dupont ».',
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
