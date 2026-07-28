import type { INodeProperties } from 'n8n-workflow';

import { documentIdField, getManyFields, omitFields, operationsFor } from './CommonDescription';

/** `CRM Task` fields. Only `title` is required. */
const taskFields: INodeProperties[] = [
	{
		displayName: 'Assigned To',
		name: 'assigned_to',
		type: 'string',
		default: '',
		description: "Email de l'utilisateur Frappe assigné à la tâche",
	},
	{
		displayName: 'Description',
		name: 'description',
		type: 'string',
		typeOptions: { rows: 4 },
		default: '',
		description: 'Contenu de la tâche, au format HTML (champ Text Editor)',
	},
	{
		displayName: 'Due Date',
		name: 'due_date',
		type: 'dateTime',
		default: '',
		description: "Date et heure d'échéance",
	},
	{
		displayName: 'Priority',
		name: 'priority',
		type: 'options',
		options: [
			{ name: 'Low', value: 'Low' },
			{ name: 'Medium', value: 'Medium' },
			{ name: 'High', value: 'High' },
		],
		default: 'Low',
		description: 'Priorité de la tâche',
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
		description: "Type d'enregistrement auquel la tâche est rattachée",
	},
	{
		displayName: 'Reference Document Name',
		name: 'reference_docname',
		type: 'string',
		default: '',
		description:
			"Identifiant de l'enregistrement rattaché, par exemple CRM-LEAD-2026-00001. À renseigner avec « Reference Doctype ».",
	},
	{
		displayName: 'Start Date',
		name: 'start_date',
		type: 'dateTime',
		default: '',
		description: 'Date de début',
	},
	{
		displayName: 'Status',
		name: 'status',
		type: 'options',
		options: [
			{ name: 'Backlog', value: 'Backlog' },
			{ name: 'Canceled', value: 'Canceled' },
			{ name: 'Done', value: 'Done' },
			{ name: 'In Progress', value: 'In Progress' },
			{ name: 'Todo', value: 'Todo' },
		],
		default: 'Backlog',
		description: 'Statut de la tâche',
	},
	{
		displayName: 'Title',
		name: 'title',
		type: 'string',
		default: '',
		description: 'Titre de la tâche',
	},
];

export const taskDescription: INodeProperties[] = [
	operationsFor('task', 'task'),
	{
		displayName: 'Title',
		name: 'title',
		type: 'string',
		default: '',
		required: true,
		displayOptions: { show: { resource: ['task'], operation: ['create'] } },
		description: 'Titre de la tâche, seul champ obligatoire de CRM Task',
	},
	documentIdField(
		'task',
		'Champ « name » de l\'enregistrement Frappe. CRM Task utilise autoname: autoincrement — son identifiant est donc un nombre, par exemple 42.',
	),
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add field',
		default: {},
		displayOptions: { show: { resource: ['task'], operation: ['create'] } },
		options: omitFields(taskFields, ['title']),
	},
	{
		displayName: 'Update Fields',
		name: 'updateFields',
		type: 'collection',
		placeholder: 'Add field',
		default: {},
		displayOptions: { show: { resource: ['task'], operation: ['update'] } },
		options: taskFields,
	},
	...getManyFields('task'),
];
