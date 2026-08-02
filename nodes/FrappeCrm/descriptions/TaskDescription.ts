import type { INodeProperties } from 'n8n-workflow';

import { documentIdField, getManyFields, omitFields, operationsFor } from './CommonDescription';

/** `CRM Task` fields. Only `title` is required. */
const taskFields: INodeProperties[] = [
	{
		displayName: 'Assigned To',
		name: 'assigned_to',
		type: 'string',
		default: '',
		description: 'Email of the Frappe user assigned to the task',
	},
	{
		displayName: 'Description',
		name: 'description',
		type: 'string',
		typeOptions: { rows: 4 },
		default: '',
		description: 'Body of the task, as HTML (a Text Editor field)',
	},
	{
		displayName: 'Due Date',
		name: 'due_date',
		type: 'dateTime',
		default: '',
		description: 'Due date and time',
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
		description: 'Priority of the task',
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
		description: 'Record type the task is attached to',
	},
	{
		displayName: 'Reference Document Name',
		name: 'reference_docname',
		type: 'string',
		default: '',
		description:
			'Identifier of the attached record, for example CRM-LEAD-2026-00001. Set it together with "Reference Doctype".',
	},
	{
		displayName: 'Start Date',
		name: 'start_date',
		type: 'dateTime',
		default: '',
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
		description: 'Status of the task',
	},
	{
		displayName: 'Title',
		name: 'title',
		type: 'string',
		default: '',
		description: 'Title of the task',
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
		description: 'Title of the task, the only field CRM Task requires',
	},
	documentIdField(
		'task',
		'The Frappe record "name" field. CRM Task uses autoname: autoincrement, so the identifier is a number, for example 42.',
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
