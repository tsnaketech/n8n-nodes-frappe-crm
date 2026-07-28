import type {
	IDataObject,
	IExecuteFunctions,
	IHttpRequestMethods,
	IHttpRequestOptions,
	ILoadOptionsFunctions,
	JsonObject,
} from 'n8n-workflow';
import { NodeApiError } from 'n8n-workflow';

/**
 * Couche transport partagée par tous les nœuds Frappe.
 *
 * Rien ici n'est spécifique au CRM : les futurs nœuds Helpdesk et LMS peuvent
 * importer ces fonctions telles quelles, elles ne connaissent que le credential
 * `frappeApi` et l'API REST générique de Frappe.
 */

const CREDENTIALS_NAME = 'frappeApi';

/** Nombre d'enregistrements demandés par page en pagination automatique. */
const AUTO_PAGE_SIZE = 100;

/** Garde-fou : au-delà, on considère que la pagination ne converge pas. */
const MAX_AUTO_PAGES = 1000;

/**
 * Chemins d'applications Frappe montées en SPA. Ils n'appartiennent pas à l'API :
 * `/api/...` vit toujours à la racine du site. On les retire pour tolérer qu'un
 * utilisateur colle l'URL affichée dans son navigateur (ex. https://site/crm).
 */
const SPA_MOUNT_PATHS = ['crm', 'helpdesk', 'lms', 'hr', 'insights', 'builder', 'app'];

/**
 * Normalise l'URL de site saisie dans le credential : retire le slash final et,
 * le cas échéant, le chemin de la SPA.
 */
export function normalizeSiteUrl(siteUrl: string): string {
	let normalized = (siteUrl ?? '').trim().replace(/\/+$/, '');

	for (const mount of SPA_MOUNT_PATHS) {
		if (normalized.toLowerCase().endsWith(`/${mount}`)) {
			normalized = normalized.slice(0, -(mount.length + 1));
			break;
		}
	}

	return normalized.replace(/\/+$/, '');
}

/** Retire les balises HTML et décode les entités les plus courantes. */
function stripHtml(value: string): string {
	return value
		.replace(/<br\s*\/?>/gi, '\n')
		.replace(/<\/(p|div|li|h\d)>/gi, '\n')
		.replace(/<[^>]*>/g, '')
		.replace(/&nbsp;/gi, ' ')
		.replace(/&amp;/gi, '&')
		.replace(/&lt;/gi, '<')
		.replace(/&gt;/gi, '>')
		.replace(/&quot;/gi, '"')
		.replace(/&#39;/gi, "'")
		.replace(/[ \t]+/g, ' ')
		.replace(/\n{3,}/g, '\n\n')
		.trim();
}

/**
 * Extrait les messages de `_server_messages`, que Frappe encode en JSON **dans**
 * du JSON : une chaîne contenant un tableau de chaînes, chacune étant elle-même
 * un objet JSON `{"message": "...", "title": "..."}`.
 */
function parseServerMessages(raw: unknown): string[] {
	if (typeof raw !== 'string' || raw.length === 0) return [];

	let entries: unknown;
	try {
		entries = JSON.parse(raw);
	} catch {
		return [stripHtml(raw)];
	}

	if (!Array.isArray(entries)) return [];

	const messages: string[] = [];
	for (const entry of entries) {
		if (typeof entry !== 'string') continue;

		let message = entry;
		try {
			const parsed = JSON.parse(entry) as unknown;
			if (typeof parsed === 'string') {
				message = parsed;
			} else if (parsed !== null && typeof parsed === 'object') {
				const candidate = (parsed as IDataObject).message;
				if (typeof candidate === 'string') message = candidate;
			}
		} catch {
			// L'entrée n'était pas du JSON imbriqué : on la garde telle quelle.
		}

		const cleaned = stripHtml(message);
		if (cleaned.length > 0) messages.push(cleaned);
	}

	return messages;
}

/**
 * Retire le préfixe de classe d'exception Python :
 * `frappe.exceptions.ValidationError: Statut requis` -> `Statut requis`.
 */
function cleanException(exception: string): string {
	const match = /^([A-Za-z_][\w.]*Error|[A-Za-z_][\w.]*Exception):\s*([\s\S]+)$/.exec(
		exception.trim(),
	);
	return stripHtml(match ? match[2] : exception);
}

/**
 * Construit un message lisible à partir du corps d'erreur renvoyé par Frappe,
 * plutôt que de se contenter du code HTTP.
 */
export function parseFrappeError(body: unknown, statusCode: number): string {
	if (typeof body === 'string') {
		const cleaned = stripHtml(body);
		// Une page d'erreur HTML complète n'apprend rien d'utile.
		if (cleaned.length > 0 && cleaned.length < 500) return cleaned;
		return `La requête Frappe a échoué (HTTP ${statusCode})`;
	}

	if (body !== null && typeof body === 'object') {
		const payload = body as IDataObject;

		const serverMessages = parseServerMessages(payload._server_messages);
		if (serverMessages.length > 0) return serverMessages.join(' | ');

		if (typeof payload.exception === 'string' && payload.exception.length > 0) {
			return cleanException(payload.exception);
		}

		if (typeof payload.message === 'string' && payload.message.length > 0) {
			return stripHtml(payload.message);
		}

		if (typeof payload.exc_type === 'string' && payload.exc_type.length > 0) {
			return payload.exc_type;
		}
	}

	return `La requête Frappe a échoué (HTTP ${statusCode})`;
}

/** Sérialise les valeurs structurées (filters, fields, or_filters) attendues en JSON par Frappe. */
export function serializeQuery(qs: IDataObject): IDataObject {
	const serialized: IDataObject = {};

	for (const [key, value] of Object.entries(qs)) {
		if (value === undefined || value === null || value === '') continue;
		serialized[key] =
			typeof value === 'object' ? JSON.stringify(value) : (value as IDataObject[string]);
	}

	return serialized;
}

/**
 * Exécute une requête authentifiée contre l'API REST Frappe et renvoie le contenu
 * de l'enveloppe `{ "data": ... }`.
 */
export async function frappeApiRequest<T = IDataObject>(
	this: IExecuteFunctions | ILoadOptionsFunctions,
	method: IHttpRequestMethods,
	endpoint: string,
	body: IDataObject = {},
	qs: IDataObject = {},
	itemIndex = 0,
): Promise<T> {
	const credentials = await this.getCredentials(CREDENTIALS_NAME);
	const baseURL = normalizeSiteUrl(credentials.siteUrl as string);

	const options: IHttpRequestOptions = {
		method,
		baseURL,
		url: endpoint,
		headers: { Accept: 'application/json' },
		json: true,
		// On inspecte nous-mêmes le corps pour produire le message d'erreur Frappe.
		returnFullResponse: true,
		ignoreHttpStatusErrors: true,
	};

	const serializedQs = serializeQuery(qs);
	if (Object.keys(serializedQs).length > 0) options.qs = serializedQs;
	if (Object.keys(body).length > 0) options.body = body;

	const response = (await this.helpers.httpRequestWithAuthentication.call(
		this,
		CREDENTIALS_NAME,
		options,
	)) as { statusCode: number; body: unknown };

	const statusCode = response.statusCode;

	if (statusCode >= 400) {
		const message = parseFrappeError(response.body, statusCode);
		const errorBody =
			response.body !== null && typeof response.body === 'object'
				? (response.body as JsonObject)
				: ({ body: response.body } as JsonObject);

		throw new NodeApiError(this.getNode(), errorBody, {
			message,
			httpCode: String(statusCode),
			itemIndex,
			description:
				statusCode === 401 || statusCode === 403
					? "Vérifiez l'API Key/Secret du credential et les permissions du rôle associé sur ce doctype."
					: undefined,
		});
	}

	const payload = response.body;
	if (payload !== null && typeof payload === 'object' && 'data' in (payload as IDataObject)) {
		return (payload as IDataObject).data as T;
	}

	return payload as T;
}

/**
 * Parcourt toutes les pages d'un doctype via `limit_start` / `limit_page_length`,
 * et renvoie l'ensemble des enregistrements.
 */
export async function frappeApiRequestAllItems(
	this: IExecuteFunctions,
	endpoint: string,
	qs: IDataObject = {},
	itemIndex = 0,
): Promise<IDataObject[]> {
	const returnData: IDataObject[] = [];
	let start = Number(qs.limit_start ?? 0);

	for (let page = 0; page < MAX_AUTO_PAGES; page++) {
		const batch = await frappeApiRequest.call<
			IExecuteFunctions,
			[IHttpRequestMethods, string, IDataObject, IDataObject, number],
			Promise<IDataObject[]>
		>(
			this,
			'GET',
			endpoint,
			{},
			{ ...qs, limit_start: start, limit_page_length: AUTO_PAGE_SIZE },
			itemIndex,
		);

		if (!Array.isArray(batch) || batch.length === 0) break;

		returnData.push(...batch);

		// Page incomplète : c'est la dernière.
		if (batch.length < AUTO_PAGE_SIZE) break;

		start += AUTO_PAGE_SIZE;
	}

	return returnData;
}
