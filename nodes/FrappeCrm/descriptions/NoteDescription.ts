import type { INodeProperties } from 'n8n-workflow';

import { documentIdField, getManyFields, omitFields, operationsFor } from './CommonDescription';

/** `FCRM Note` fields. Only `title` is required. */
const noteFields: INodeProperties[] = [
	{
		displayName: 'Content',
		name: 'content',
		type: 'string',
		typeOptions: { rows: 5 },
		default: '',
		description: 'Contenu de la note, au format HTML (champ Text Editor)',
	},
	{
		displayName: 'Reference Doctype',
		name: 'reference_doctype',
		type: 'options',
		options: [
			{ name: 'CRM Lead', value: 'CRM Lead' },
			{ name: 'CRM Deal', value: 'CRM Deal' },
		],
		default: 'CRM Lead',
		description: "Type d'enregistrement auquel la note est rattachée",
	},
	{
		displayName: 'Reference Document Name',
		name: 'reference_docname',
		type: 'string',
		default: '',
		description:
			"Identifiant de l'enregistrement rattaché, par exemple CRM-DEAL-2026-00001. À renseigner avec « Reference Doctype ».",
	},
	{
		displayName: 'Title',
		name: 'title',
		type: 'string',
		default: '',
		description: 'Titre de la note',
	},
];

export const noteDescription: INodeProperties[] = [
	operationsFor('note', 'note'),
	{
		displayName: 'Title',
		name: 'title',
		type: 'string',
		default: '',
		required: true,
		displayOptions: { show: { resource: ['note'], operation: ['create'] } },
		description: 'Titre de la note, seul champ obligatoire de FCRM Note',
	},
	documentIdField(
		'note',
		'Champ « name » de l\'enregistrement Frappe. FCRM Note utilise un identifiant hash généré par Frappe.',
	),
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add field',
		default: {},
		displayOptions: { show: { resource: ['note'], operation: ['create'] } },
		options: omitFields(noteFields, ['title']),
	},
	{
		displayName: 'Update Fields',
		name: 'updateFields',
		type: 'collection',
		placeholder: 'Add field',
		default: {},
		displayOptions: { show: { resource: ['note'], operation: ['update'] } },
		options: noteFields,
	},
	...getManyFields('note'),
];
