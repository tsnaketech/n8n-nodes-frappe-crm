import type {
	IAuthenticateGeneric,
	ICredentialTestRequest,
	ICredentialType,
	INodeProperties,
} from 'n8n-workflow';

/**
 * Credential Frappe générique.
 *
 * Volontairement dépourvu de toute notion propre à un produit : il cible un *site*
 * Frappe, pas une application. Les nœuds Frappe CRM, Frappe Helpdesk et Frappe LMS
 * déclarent tous `{ name: 'frappeApi', required: true }` et se partagent la même
 * instance de credential. Voir docs/CREDENTIALS.md.
 */
export class FrappeApi implements ICredentialType {
	name = 'frappeApi';

	displayName = 'Frappe API';

	icon = { light: 'file:../icons/frappe.svg', dark: 'file:../icons/frappe.dark.svg' } as const;

	documentationUrl = 'https://docs.frappe.io/framework/user/en/api/rest';

	properties: INodeProperties[] = [
		{
			displayName: 'Site URL',
			name: 'siteUrl',
			type: 'string',
			default: '',
			required: true,
			placeholder: 'https://mon-site.frappe.cloud',
			description:
				"URL racine du site Frappe, sans chemin ni slash final. Le nœud y ajoute lui-même /api/resource ou /api/method.",
		},
		{
			displayName: 'API Key',
			name: 'apiKey',
			type: 'string',
			default: '',
			required: true,
			description:
				'Clé générée depuis le profil utilisateur Frappe : Settings > API Access > Generate Keys',
			typeOptions: { password: true },
		},
		{
			displayName: 'API Secret',
			name: 'apiSecret',
			type: 'string',
			typeOptions: { password: true },
			default: '',
			required: true,
			description: "Secret affiché une seule fois, au moment de la génération des clés",
		},
	];

	authenticate: IAuthenticateGeneric = {
		type: 'generic',
		properties: {
			headers: {
				Authorization: '=token {{$credentials.apiKey}}:{{$credentials.apiSecret}}',
			},
		},
	};

	test: ICredentialTestRequest = {
		request: {
			baseURL: '={{$credentials.siteUrl.replace(new RegExp("/+$"), "")}}',
			url: '/api/method/frappe.auth.get_logged_user',
			method: 'GET',
		},
		rules: [
			{
				type: 'responseSuccessBody',
				properties: {
					key: 'message',
					value: 'Guest',
					message:
						"Connexion anonyme : le site a répondu mais n'a pas reconnu les clés. Vérifiez l'API Key et l'API Secret.",
				},
			},
		],
	};
}
