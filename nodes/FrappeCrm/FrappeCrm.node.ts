import type {
	IDataObject,
	IExecuteFunctions,
	IHttpRequestMethods,
	ILoadOptionsFunctions,
	INodeExecutionData,
	INodeListSearchResult,
	INodePropertyOptions,
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
import type { FrappeCrmResource } from './types';

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
				normalized[key] = isDate || time === undefined ? day : `${day} ${time}:${seconds ?? '00'}`;
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
			`Parameter "${parameterName}" is not valid JSON: ${value}`,
			{
				itemIndex,
				description:
					'Expected an object {"field": "value"} or an array [["field","operator","value"]].',
			},
		);
	}
}

/** Accepts "name,status" as ["name","status"]. */
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

/** Documents fetched per page by the "Document" locator. It asks for more through its token. */
const SEARCH_PAGE_SIZE = 50;

/**
 * Field carrying the human-readable label of a resource, when `name` is not already it.
 *
 * Most doctypes here are autonamed with a series or a hash, so a list of bare `name` values
 * would be unusable. Exceptions, left out on purpose: contact and organization are named after the person or company itself.
 *
 * A wrong entry does not break the picker: `searchDocuments` retries on `name` alone when
 * Frappe rejects the field, so the list degrades to identifiers instead of erroring.
 */
const TITLE_FIELD_BY_RESOURCE: Partial<Record<FrappeCrmResource, string>> = {
	deal: 'organization',
	lead: 'lead_name',
	note: 'title',
	task: 'title',
};

/** Escapes the LIKE wildcards Frappe forwards to SQL, so a literal `%` searches for `%`. */
function escapeLike(value: string): string {
	return value.replace(/[\\%_]/g, (character) => `\\${character}`);
}

/**
 * Lists the documents of one doctype, filtered server-side.
 *
 * A plain dropdown is not an option: these doctypes grow without bound, so Frappe does the
 * filtering and the node only pages through the answer.
 */
async function searchIn(
	this: ILoadOptionsFunctions,
	doctype: string,
	titleField: string | undefined,
	filter?: string,
	paginationToken?: string,
): Promise<INodeListSearchResult> {
	const start = Number(paginationToken ?? 0);

	const query = (title: string | undefined): IDataObject => {
		const qs: IDataObject = {
			fields: title === undefined ? ['name'] : ['name', title],
			order_by: 'modified desc',
			limit_start: start,
			limit_page_length: SEARCH_PAGE_SIZE,
		};

		if (filter) {
			const pattern = `%${escapeLike(filter)}%`;
			// On a titled doctype the search has to match either side: nobody looks a record up
			// by the identifier Frappe gave it.
			qs.or_filters =
				title === undefined
					? [['name', 'like', pattern]]
					: [
							['name', 'like', pattern],
							[title, 'like', pattern],
						];
		}

		return qs;
	};

	const fetch = async (title: string | undefined): Promise<IDataObject[]> =>
		await frappeApiRequest.call<
			ILoadOptionsFunctions,
			[IHttpRequestMethods, string, IDataObject, IDataObject, number],
			Promise<IDataObject[]>
		>(this, 'GET', `/api/resource/${encodeURIComponent(doctype)}`, {}, query(title), 0);

	let effectiveTitle = titleField;
	let documents: IDataObject[];
	if (effectiveTitle === undefined) {
		documents = await fetch(undefined);
	} else {
		try {
			documents = await fetch(effectiveTitle);
		} catch {
			// The title field is a mapping, not a contract: a customised doctype, or a Frappe
			// version that renamed it, makes the query fail. Falling back to `name` keeps the
			// picker usable rather than turning a cosmetic detail into a blocking error. The
			// retry cannot fail for the same reason, so the error it may raise is the real one.
			effectiveTitle = undefined;
			documents = await fetch(undefined);
		}
	}

	return {
		results: documents.map((document) => {
			const name = String(document.name);
			const title = effectiveTitle === undefined ? undefined : document[effectiveTitle];
			return {
				name: typeof title === 'string' && title !== '' ? `${name} — ${title}` : name,
				value: name,
			};
		}),
		// A short page is the last one; returning no token stops the locator from asking again.
		paginationToken:
			documents.length === SEARCH_PAGE_SIZE ? String(start + SEARCH_PAGE_SIZE) : undefined,
	};
}

/**
 * Lists the documents of the resource currently selected — the "Document" locator.
 *
 * The doctype comes from the `resource` parameter rather than from one of its own: that
 * mapping is what this node knows and the generic Frappe node does not.
 */
export async function searchDocuments(
	this: ILoadOptionsFunctions,
	filter?: string,
	paginationToken?: string,
): Promise<INodeListSearchResult> {
	const resource = this.getNodeParameter('resource') as string;
	return await searchIn.call(
		this,
		getDoctype(resource),
		TITLE_FIELD_BY_RESOURCE[resource as FrappeCrmResource],
		filter,
		paginationToken,
	);
}

/**
 * Builds the search method of a Link field, bound to the doctype that field points at.
 *
 * One method per target doctype, and not a single generic one, because n8n names the method
 * in the field (`searchListMethod`) and calls it with nothing but the filter and the
 * pagination token — it never says which field asked. `searchDocuments` gets away with a
 * single method only because it can read the `resource` parameter.
 */
function linkSearch(doctype: string, titleField?: string) {
	return async function (
		this: ILoadOptionsFunctions,
		filter?: string,
		paginationToken?: string,
	): Promise<INodeListSearchResult> {
		return await searchIn.call(this, doctype, titleField, filter, paginationToken);
	};
}

/**
 * Builds the dropdown method of a Link field pointing at a configuration doctype.
 *
 * Everything is fetched in one call — `limit_page_length: 0` — which is why this is reserved
 * for lists an administrator maintains: a few dozen rows at most. Anything fed by daily
 * activity gets `linkSearch` instead, so the filtering stays on Frappe's side.
 *
 * `labelField` is for the doctypes autonamed after a code: `Loan Product` is its
 * `product_code`, so the raw list would read `ZZ-R668593`. Like the search, a rejected label
 * falls back to `name` alone rather than breaking the dropdown.
 */
function linkOptions(
	doctype: string,
	{ filters = {}, labelField }: { filters?: IDataObject; labelField?: string } = {},
) {
	return async function (this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
		const fetch = async (label: string | undefined): Promise<IDataObject[]> => {
			const records = await frappeApiRequest.call<
				ILoadOptionsFunctions,
				[IHttpRequestMethods, string, IDataObject, IDataObject, number],
				Promise<IDataObject[]>
			>(
				this,
				'GET',
				`/api/resource/${encodeURIComponent(doctype)}`,
				{},
				{
					fields: label === undefined ? ['name'] : ['name', label],
					filters,
					limit_page_length: 0,
				},
				0,
			);

			return Array.isArray(records) ? records : [];
		};

		let effectiveLabel = labelField;
		let records: IDataObject[];
		if (effectiveLabel === undefined) {
			records = await fetch(undefined);
		} else {
			try {
				records = await fetch(effectiveLabel);
			} catch {
				effectiveLabel = undefined;
				records = await fetch(undefined);
			}
		}

		return records
			.map((record) => {
				const name = String(record.name);
				const label = effectiveLabel === undefined ? undefined : record[effectiveLabel];
				return {
					name: typeof label === 'string' && label !== '' ? `${name} — ${label}` : name,
					value: name,
				};
			})
			.sort((a, b) => a.name.localeCompare(b.name));
	};
}

/**
 * Replaces the resource-locator objects a collection carries with the identifiers they hold.
 *
 * A locator is stored as `{ __rl: true, mode, value }`. Reading a whole collection with
 * `getNodeParameter('additionalFields', i)` returns those objects untouched: n8n only
 * unwraps a locator when the parameter is addressed by its own path with
 * `extractValue: true`, which would mean one call per field. Spreading the collection into
 * the request body without this would send Frappe an object where it expects a name.
 *
 * Only the stored `value` is taken. That is exact here because the manual mode of these
 * locators is a plain string with no `extractValue` regex of its own — the day one gains
 * one, it has to be read through `getNodeParameter` instead.
 */
function unwrapResourceLocators(collection: IDataObject): IDataObject {
	const unwrapped: IDataObject = {};

	for (const [key, value] of Object.entries(collection)) {
		const isLocator =
			value !== null && typeof value === 'object' && '__rl' in (value as IDataObject);
		unwrapped[key] = isLocator ? ((value as IDataObject).value as IDataObject[string]) : value;
	}

	return unwrapped;
}

export class FrappeCrm implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Frappe CRM',
		name: 'frappeCrm',
		// Frappe CRM logo: opaque magenta #ef0bf5 badge with the glyph knocked out in white.
		// A single file, hence the same magenta on both themes, by choice: the badge carries
		// its own background and holds contrast on light as well as dark.
		//
		// `icon-prefer-themed-variants` is silenced rather than worked around: the rule only
		// checks that `icon` is not a string literal, it never compares the two files, so the
		// { light, dark } form with the same path twice would satisfy it without changing a
		// single pixel on screen.
		//
		// Should monochrome variants ever be reintroduced: in n8n the key names the UI
		// theme, not the ink colour. A white icon belongs under `dark`, a black one under
		// `light` — the other way round makes them invisible.
		// eslint-disable-next-line @n8n/community-nodes/icon-prefer-themed-variants
		icon: 'file:../../icons/frappe-crm.svg',
		group: ['transform'],
		version: 1,
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		description: 'Read and write Frappe CRM leads, deals, contacts and tasks',
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

	methods = {
		listSearch: {
			searchDocuments,
			// Doctypes fed by daily activity: unbounded, so the filtering stays server-side.
			// A title field is given only where `name` is not already readable — `Contact` is
			// named after the person, `Address` after its title and type, `CRM Organization`
			// after the company.
			searchAddress: linkSearch('Address'),
			searchContact: linkSearch('Contact'),
			searchCrmLead: linkSearch('CRM Lead', 'lead_name'),
			searchCrmOrganization: linkSearch('CRM Organization'),
			searchUser: linkSearch('User', 'full_name'),
		},
		loadOptions: {
			// Configuration doctypes: an administrator maintains them, so the whole list fits.
			getCrmDealStatuses: linkOptions('CRM Deal Status'),
			getCrmIndustries: linkOptions('CRM Industry'),
			getCrmLeadSources: linkOptions('CRM Lead Source'),
			getCrmLeadStatuses: linkOptions('CRM Lead Status'),
			getCrmLostReasons: linkOptions('CRM Lost Reason'),
			getCrmTerritories: linkOptions('CRM Territory'),
			// Frappe seeds the full ISO list — around 150 rows — but a site enables a handful.
			// Filtering on `enabled` is what keeps this a dropdown rather than a search.
			getCurrencies: linkOptions('Currency', { filters: { enabled: 1 } }),
			getGenders: linkOptions('Gender'),
			getSalutations: linkOptions('Salutation'),
		},
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
					const collected = unwrapResourceLocators(
						this.getNodeParameter(collectionName, i, {}) as IDataObject,
					);

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
						const documentId = this.getNodeParameter('documentId', i, undefined, {
							extractValue: true,
						}) as string;
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
					const documentId = this.getNodeParameter('documentId', i, undefined, {
						extractValue: true,
					}) as string;
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
					const documentId = this.getNodeParameter('documentId', i, undefined, {
						extractValue: true,
					}) as string;
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
						`The operation "${operation}" is not supported`,
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
