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

/** Champs de `CRM Lead` proposés en création comme en mise à jour. */
const leadFields: INodeProperties[] = [
	{
		displayName: 'Annual Revenue',
		name: 'annual_revenue',
		type: 'number',
		default: 0,
		description: "Chiffre d'affaires annuel",
	},
	{
		displayName: 'Email',
		name: 'email',
		type: 'string',
		placeholder: 'nom@email.com',
		default: '',
		description: 'Adresse email du lead',
	},
	{
		displayName: 'First Name',
		name: 'first_name',
		type: 'string',
		default: '',
		description: 'Prénom du lead',
	},
	{
		displayName: 'Gender',
		name: 'gender',
		type: 'string',
		default: '',
		description: 'Lien vers un enregistrement du doctype Gender (ex. Male, Female).',
	},
	{
		displayName: 'Industry',
		name: 'industry',
		type: 'string',
		default: '',
		description: 'Lien vers un enregistrement du doctype CRM Industry',
	},
	{
		displayName: 'Job Title',
		name: 'job_title',
		type: 'string',
		default: '',
		description: 'Intitulé de poste',
	},
	{
		displayName: 'Last Name',
		name: 'last_name',
		type: 'string',
		default: '',
		description: 'Nom de famille',
	},
	{
		displayName: 'Lead Owner',
		name: 'lead_owner',
		type: 'string',
		default: '',
		description: "Email de l'utilisateur propriétaire du lead",
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
		description: 'Numéro de mobile',
	},
	{
		displayName: 'Number of Employees',
		name: 'no_of_employees',
		type: 'options',
		options: NO_OF_EMPLOYEES_OPTIONS,
		default: '1-10',
		description: "Tranche d'effectif de l'organisation",
	},
	{
		displayName: 'Organization',
		name: 'organization',
		type: 'string',
		default: '',
		description: "Nom de l'organisation du lead (champ texte libre sur CRM Lead)",
	},
	{
		displayName: 'Phone',
		name: 'phone',
		type: 'string',
		default: '',
		description: 'Numéro de téléphone fixe',
	},
	{
		displayName: 'Salutation',
		name: 'salutation',
		type: 'string',
		default: '',
		description: 'Lien vers un enregistrement du doctype Salutation (ex. Mr, Mrs).',
	},
	{
		displayName: 'Source',
		name: 'source',
		type: 'string',
		default: '',
		description: 'Lien vers un enregistrement du doctype CRM Lead Source',
	},
	{
		displayName: 'Status',
		name: 'status',
		type: 'string',
		default: '',
		description:
			'Lien vers un enregistrement du doctype CRM Lead Status (ex. New, Contacted, Qualified). Frappe applique le statut par défaut si le champ est laissé vide.',
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

export const leadDescription: INodeProperties[] = [
	operationsFor('lead', 'lead'),
	{
		displayName: 'First Name',
		name: 'first_name',
		type: 'string',
		default: '',
		required: true,
		displayOptions: { show: { resource: ['lead'], operation: ['create'] } },
		description: 'Prénom du lead, seul champ obligatoire de CRM Lead',
	},
	documentIdField(
		'lead',
		'Champ « name » de l\'enregistrement Frappe. Pour un lead il ressemble à CRM-LEAD-2026-00001.',
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
