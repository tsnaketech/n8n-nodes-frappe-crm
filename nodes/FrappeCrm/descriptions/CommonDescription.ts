import type { INodeProperties } from 'n8n-workflow';

/**
 * Property factories shared by the six resources: the CRUD operations are identical from
 * one doctype to the next, only the labels and the business fields differ.
 */

/**
 * Removes fields from a shared list. Used to build "Additional Fields" (create) out of
 * the full list, excluding the fields already exposed at the top level because they are
 * required.
 */
export function omitFields(fields: INodeProperties[], names: string[]): INodeProperties[] {
	return fields.filter((field) => !names.includes(field.name));
}

/** The five CRUD operations, specialised for a given resource. */
export function operationsFor(resource: string, singular: string): INodeProperties {
	return {
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: { show: { resource: [resource] } },
		options: [
			{
				name: 'Create',
				value: 'create',
				description: `Create a new ${singular}`,
				action: `Create a ${singular}`,
			},
			{
				name: 'Delete',
				value: 'delete',
				description: `Delete an existing ${singular}`,
				action: `Delete a ${singular}`,
			},
			{
				name: 'Get',
				value: 'get',
				description: `Retrieve a single ${singular}`,
				action: `Get a ${singular}`,
			},
			{
				name: 'Get Many',
				value: 'getAll',
				description: `Retrieve many ${singular}s`,
				action: `Get many ${singular}s`,
			},
			{
				name: 'Update',
				value: 'update',
				description: `Update an existing ${singular}`,
				action: `Update a ${singular}`,
			},
		],
		default: 'getAll',
	};
}

/**
 * Document identifier (Frappe's `name` field), required by get/update/delete.
 */
export function documentIdField(resource: string, description: string): INodeProperties {
	return {
		displayName: 'Document ID',
		name: 'documentId',
		type: 'string',
		default: '',
		required: true,
		displayOptions: { show: { resource: [resource], operation: ['get', 'update', 'delete'] } },
		description,
	};
}

/**
 * Pagination and read options for "Get Many".
 *
 * `returnAll` triggers automatic pagination through `limit_start`; otherwise `limit` is
 * sent as-is in `limit_page_length`.
 */
export function getManyFields(resource: string): INodeProperties[] {
	return [
		{
			displayName: 'Return All',
			name: 'returnAll',
			type: 'boolean',
			default: false,
			displayOptions: { show: { resource: [resource], operation: ['getAll'] } },
			description: 'Whether to return all results or only up to a given limit',
		},
		{
			displayName: 'Limit',
			name: 'limit',
			type: 'number',
			default: 50,
			typeOptions: { minValue: 1 },
			displayOptions: {
				show: { resource: [resource], operation: ['getAll'], returnAll: [false] },
			},
			description: 'Max number of results to return',
		},
		{
			displayName: 'Options',
			name: 'options',
			type: 'collection',
			placeholder: 'Add option',
			default: {},
			displayOptions: { show: { resource: [resource], operation: ['getAll'] } },
			options: [
				{
					displayName: 'Fields',
					name: 'fields',
					type: 'string',
					default: '',
					placeholder: 'name,lead_name,status',
					description:
						'Comma-separated list of fields to return. A JSON array is accepted too. Frappe only returns "name" by default.',
				},
				{
					displayName: 'Filters (JSON)',
					name: 'filters',
					type: 'json',
					default: '',
					placeholder: '{"status": "Open"}',
					description:
						'Filters in Frappe format: an object {"field": "value"} or an array [["field","operator","value"]], for example [["annual_revenue",">",10000]]',
				},
				{
					displayName: 'Offset',
					name: 'offset',
					type: 'number',
					default: 0,
					typeOptions: { minValue: 0 },
					description:
						'Number of records to skip (limit_start). Ignored when "Return All" is on.',
				},
				{
					displayName: 'Or Filters (JSON)',
					name: 'orFilters',
					type: 'json',
					default: '',
					placeholder: '[["status","=","Open"],["status","=","Replied"]]',
					description: 'Filters combined with OR, same format as "Filters"',
				},
				{
					displayName: 'Sort Field',
					name: 'sortField',
					type: 'string',
					default: 'modified',
					description: 'Field to sort on (order_by)',
				},
				{
					displayName: 'Sort Order',
					name: 'sortOrder',
					type: 'options',
					options: [
						{ name: 'Ascending', value: 'asc' },
						{ name: 'Descending', value: 'desc' },
					],
					default: 'desc',
					description: 'Sort direction',
				},
			],
		},
	];
}
