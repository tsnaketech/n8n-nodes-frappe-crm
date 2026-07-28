import type { INodeProperties } from 'n8n-workflow';

/**
 * Fabriques de propriétés communes aux six resources : les opérations CRUD sont
 * identiques d'un doctype à l'autre, seuls les libellés et les champs métier changent.
 */

/**
 * Retire des champs d'une liste partagée. Sert à construire « Additional Fields »
 * (création) à partir de la liste complète, en excluant les champs déjà exposés au
 * premier niveau parce qu'ils sont obligatoires.
 */
export function omitFields(fields: INodeProperties[], names: string[]): INodeProperties[] {
	return fields.filter((field) => !names.includes(field.name));
}

/** Les cinq opérations CRUD, déclinées pour une resource donnée. */
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
				description: `Créer un(e) ${singular}`,
				action: `Create a ${singular}`,
			},
			{
				name: 'Delete',
				value: 'delete',
				description: `Supprimer un(e) ${singular}`,
				action: `Delete a ${singular}`,
			},
			{
				name: 'Get',
				value: 'get',
				description: `Récupérer un(e) ${singular}`,
				action: `Get a ${singular}`,
			},
			{
				name: 'Get Many',
				value: 'getAll',
				description: `Récupérer plusieurs ${singular}s`,
				action: `Get many ${singular}s`,
			},
			{
				name: 'Update',
				value: 'update',
				description: `Mettre à jour un(e) ${singular}`,
				action: `Update a ${singular}`,
			},
		],
		default: 'getAll',
	};
}

/**
 * Identifiant du document (le champ `name` de Frappe), requis par get/update/delete.
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
 * Pagination et options de lecture pour « Get Many ».
 *
 * `returnAll` déclenche la pagination automatique par `limit_start`; sinon `limit`
 * est envoyé tel quel dans `limit_page_length`.
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
						'Liste des champs à retourner, séparés par des virgules. Accepte aussi un tableau JSON. Par défaut Frappe ne renvoie que « name ».',
				},
				{
					displayName: 'Filters (JSON)',
					name: 'filters',
					type: 'json',
					default: '',
					placeholder: '{"status": "Open"}',
					description:
						'Filtres au format Frappe : objet {"champ": "valeur"} ou tableau [["champ","opérateur","valeur"]], par exemple [["annual_revenue",">",10000]]',
				},
				{
					displayName: 'Offset',
					name: 'offset',
					type: 'number',
					default: 0,
					typeOptions: { minValue: 0 },
					description:
						'Nombre d\'enregistrements à ignorer (limit_start). Ignoré lorsque « Return All » est actif.',
				},
				{
					displayName: 'Or Filters (JSON)',
					name: 'orFilters',
					type: 'json',
					default: '',
					placeholder: '[["status","=","Open"],["status","=","Replied"]]',
					description: 'Filtres combinés en OU, même format que « Filters »',
				},
				{
					displayName: 'Sort Field',
					name: 'sortField',
					type: 'string',
					default: 'modified',
					description: 'Champ utilisé pour le tri (order_by)',
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
					description: 'Sens du tri',
				},
			],
		},
	];
}
