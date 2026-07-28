import type {
	IDataObject,
	IExecuteFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
} from 'n8n-workflow';
import { NodeApiError, NodeConnectionTypes, NodeOperationError } from 'n8n-workflow';

import {
	contactDescription,
	dealDescription,
	leadDescription,
	noteDescription,
	organizationDescription,
	taskDescription,
} from './descriptions';
import { frappeApiRequest, frappeApiRequestAllItems } from './GenericFunctions';
import { getDoctype } from './types';

/** Date fields (day only) among those exposed by the node. */
const DATE_FIELDS = new Set(['start_date', 'expected_closure_date', 'closed_date']);

/** Datetime fields among those exposed by the node. */
const DATETIME_FIELDS = new Set(['due_date']);

/** Date or datetime carrying no timezone: `2026-08-15`, `2026-08-15T17:00:00`. */
const NAIVE_DATE_PATTERN = /^(\d{4}-\d{2}-\d{2})(?:[T ](\d{2}:\d{2})(?::(\d{2}))?)?$/;

/**
 * Formats an instant as wall-clock time in a given timezone.
 *
 * `toISOString()` would yield UTC, which is wrong here: Frappe stores *naive* datetimes,
 * interpreted in the site's timezone. A due date picked at 17:00 in Paris must therefore
 * be sent as `17:00:00`, not `15:00:00`.
 */
function formatInTimeZone(date: Date, timeZone: string, withTime: boolean): string {
	const parts = new Intl.DateTimeFormat('en-CA', {
		timeZone,
		year: 'numeric',
		month: '2-digit',
		day: '2-digit',
		...(withTime
			? ({ hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23' } as const)
			: {}),
	}).formatToParts(date);

	const part = (type: string) => parts.find((p) => p.type === type)?.value ?? '00';
	const day = `${part('year')}-${part('month')}-${part('day')}`;

	return withTime ? `${day} ${part('hour')}:${part('minute')}:${part('second')}` : day;
}

/**
 * n8n returns dateTime fields as ISO 8601; Frappe expects `YYYY-MM-DD` for a Date field
 * and `YYYY-MM-DD HH:mm:ss` for a Datetime field, both expressed in the site's timezone.
 *
 * A value carrying a timezone (`...Z` or `...+02:00`) is converted to `timeZone`, that of
 * the n8n workflow. A value that is already naive is passed through untouched: the user
 * entered wall-clock time, and reinterpreting it would shift it.
 */
function normalizeDates(fields: IDataObject, timeZone: string): IDataObject {
	const normalized: IDataObject = {};

	for (const [key, value] of Object.entries(fields)) {
		const isDate = DATE_FIELDS.has(key);
		const isDatetime = DATETIME_FIELDS.has(key);

		if (typeof value === 'string' && value !== '' && (isDate || isDatetime)) {
			const naive = NAIVE_DATE_PATTERN.exec(value);
			if (naive !== null) {
				const [, day, time, seconds] = naive;
				normalized[key] =
					isDate || time === undefined ? day : `${day} ${time}:${seconds ?? '00'}`;
				continue;
			}

			const parsed = new Date(value);
			if (!Number.isNaN(parsed.getTime())) {
				normalized[key] = formatInTimeZone(parsed, timeZone, isDatetime);
				continue;
			}
		}

		normalized[key] = value;
	}

	return normalized;
}

/**
 * Converts the flat Email/Mobile/Phone fields into child table rows.
 *
 * Frappe recomputes `Contact.email_id` from `email_ids` and blanks the field out when the
 * table is empty, so sending `email_id` directly has no effect.
 */
function buildContactBody(fields: IDataObject): IDataObject {
	const body: IDataObject = { ...fields };

	const email = body.email;
	delete body.email;
	if (typeof email === 'string' && email !== '') {
		body.email_ids = [{ email_id: email, is_primary: 1 }];
	}

	const mobileNo = body.mobile_no;
	const phone = body.phone;
	delete body.mobile_no;
	delete body.phone;

	const phoneNos: IDataObject[] = [];
	if (typeof mobileNo === 'string' && mobileNo !== '') {
		phoneNos.push({ phone: mobileNo, is_primary_mobile_no: 1 });
	}
	if (typeof phone === 'string' && phone !== '') {
		phoneNos.push({ phone, is_primary_phone: 1 });
	}
	if (phoneNos.length > 0) {
		body.phone_nos = phoneNos;
	}

	return body;
}

/** Parses a JSON parameter entered in the UI, tolerating an expression that already produced an object. */
function parseJsonParameter(
	context: IExecuteFunctions,
	value: unknown,
	parameterName: string,
	itemIndex: number,
): IDataObject | unknown[] | undefined {
	if (value === undefined || value === null || value === '') return undefined;
	if (typeof value === 'object') return value as IDataObject | unknown[];

	if (typeof value !== 'string') return undefined;

	try {
		return JSON.parse(value) as IDataObject | unknown[];
	} catch {
		throw new NodeOperationError(
			context.getNode(),
			`Le paramètre « ${parameterName} » n'est pas du JSON valide : ${value}`,
			{
				itemIndex,
				description:
					'Attendu : un objet {"champ": "valeur"} ou un tableau [["champ","opérateur","valeur"]].',
			},
		);
	}
}

/** Accepte « name,status » comme ["name","status"]. */
function parseFieldList(value: string): string[] {
	const trimmed = value.trim();
	if (trimmed.startsWith('[')) {
		return JSON.parse(trimmed) as string[];
	}
	return trimmed
		.split(',')
		.map((field) => field.trim())
		.filter((field) => field.length > 0);
}

export class FrappeCrm implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Frappe CRM',
		name: 'frappeCrm',
		// Frappe CRM logo: opaque magenta #ef0bf5 badge with the glyph knocked out in white.
		// A single file, hence the same magenta on both themes, by choice: the badge carries
		// its own background and holds contrast on light as well as dark. This leaves the
		// `icon-prefer-themed-variants` warning (non-blocking, lint exits 0); the
		// { light, dark } form requires two distinct file paths, hence a different tint on
		// one of the themes.
		//
		// Should monochrome variants ever be reintroduced: in n8n the key names the UI
		// theme, not the ink colour. A white icon belongs under `dark`, a black one under
		// `light` — the other way round makes them invisible.
		icon: 'file:../../icons/frappe-crm.svg',
		group: ['transform'],
		version: 1,
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		description: 'Lire et écrire les leads, affaires, contacts et tâches de Frappe CRM',
		defaults: {
			name: 'Frappe CRM',
		},
		inputs: [NodeConnectionTypes.Main],
		outputs: [NodeConnectionTypes.Main],
		usableAsTool: true,
		credentials: [
			{
				name: 'frappeApi',
				required: true,
			},
		],
		properties: [
			{
				displayName: 'Resource',
				name: 'resource',
				type: 'options',
				noDataExpression: true,
				options: [
					{ name: 'Contact', value: 'contact' },
					{ name: 'Deal', value: 'deal' },
					{ name: 'Lead', value: 'lead' },
					{ name: 'Note', value: 'note' },
					{ name: 'Organization', value: 'organization' },
					{ name: 'Task', value: 'task' },
				],
				default: 'lead',
			},
			...leadDescription,
			...dealDescription,
			...contactDescription,
			...organizationDescription,
			...taskDescription,
			...noteDescription,
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: INodeExecutionData[] = [];

		const resource = this.getNodeParameter('resource', 0) as string;
		const operation = this.getNodeParameter('operation', 0) as string;
		const doctype = getDoctype(resource);
		const basePath = `/api/resource/${encodeURIComponent(doctype)}`;

		for (let i = 0; i < items.length; i++) {
			try {
				if (operation === 'create' || operation === 'update') {
					const collectionName = operation === 'create' ? 'additionalFields' : 'updateFields';
					const collected = this.getNodeParameter(collectionName, i, {}) as IDataObject;

					let body: IDataObject = { ...collected };

					// Required fields are exposed at the top level, outside the collection.
					if (operation === 'create') {
						if (resource === 'lead' || resource === 'contact') {
							body.first_name = this.getNodeParameter('first_name', i) as string;
						} else if (resource === 'organization') {
							body.organization_name = this.getNodeParameter('organization_name', i) as string;
						} else if (resource === 'task' || resource === 'note') {
							body.title = this.getNodeParameter('title', i) as string;
						}
					}

					body = normalizeDates(body, this.getTimezone());
					if (resource === 'contact') body = buildContactBody(body);

					if (operation === 'create') {
						const created = await frappeApiRequest.call(this, 'POST', basePath, body);
						returnData.push({ json: created as IDataObject, pairedItem: { item: i } });
					} else {
						const documentId = this.getNodeParameter('documentId', i) as string;
						const updated = await frappeApiRequest.call(
							this,
							'PUT',
							`${basePath}/${encodeURIComponent(documentId)}`,
							body,
							{},
							i,
						);
						returnData.push({ json: updated as IDataObject, pairedItem: { item: i } });
					}
				} else if (operation === 'get') {
					const documentId = this.getNodeParameter('documentId', i) as string;
					const document = await frappeApiRequest.call(
						this,
						'GET',
						`${basePath}/${encodeURIComponent(documentId)}`,
						{},
						{},
						i,
					);
					returnData.push({ json: document as IDataObject, pairedItem: { item: i } });
				} else if (operation === 'delete') {
					const documentId = this.getNodeParameter('documentId', i) as string;
					await frappeApiRequest.call(
						this,
						'DELETE',
						`${basePath}/${encodeURIComponent(documentId)}`,
						{},
						{},
						i,
					);
					returnData.push({
						json: { success: true, doctype, name: documentId },
						pairedItem: { item: i },
					});
				} else if (operation === 'getAll') {
					const returnAll = this.getNodeParameter('returnAll', i) as boolean;
					const options = this.getNodeParameter('options', i, {}) as IDataObject;

					const qs: IDataObject = {};

					// Without `fields`, Frappe returns the `name` column only.
					qs.fields =
						typeof options.fields === 'string' && options.fields.trim() !== ''
							? parseFieldList(options.fields)
							: ['*'];

					const filters = parseJsonParameter(this, options.filters, 'Filters (JSON)', i);
					if (filters !== undefined) qs.filters = filters;

					const orFilters = parseJsonParameter(this, options.orFilters, 'Or Filters (JSON)', i);
					if (orFilters !== undefined) qs.or_filters = orFilters;

					if (typeof options.sortField === 'string' && options.sortField.trim() !== '') {
						const sortOrder = (options.sortOrder as string) ?? 'desc';
						qs.order_by = `${options.sortField.trim()} ${sortOrder}`;
					}

					let records: IDataObject[];
					if (returnAll) {
						records = await frappeApiRequestAllItems.call(this, basePath, qs, i);
					} else {
						qs.limit_page_length = this.getNodeParameter('limit', i) as number;
						qs.limit_start = (options.offset as number) ?? 0;
						records = await frappeApiRequest.call<
							IExecuteFunctions,
							Parameters<typeof frappeApiRequest>,
							Promise<IDataObject[]>
						>(this, 'GET', basePath, {}, qs, i);
					}

					for (const record of records) {
						returnData.push({ json: record, pairedItem: { item: i } });
					}
				} else {
					throw new NodeOperationError(
						this.getNode(),
						`L'opération « ${operation} » n'est pas supportée`,
						{ itemIndex: i },
					);
				}
			} catch (error) {
				// frappeApiRequest already throws a NodeApiError carrying the Frappe message;
				// only unexpected errors get wrapped here.
				const nodeError =
					error instanceof NodeApiError || error instanceof NodeOperationError
						? error
						: new NodeOperationError(this.getNode(), error as Error, { itemIndex: i });

				if (this.continueOnFail()) {
					returnData.push({
						json: { error: nodeError.message },
						pairedItem: { item: i },
					});
					continue;
				}
				throw nodeError;
			}
		}

		return [returnData];
	}
}
