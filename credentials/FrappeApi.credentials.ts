import type {
	IAuthenticateGeneric,
	ICredentialTestRequest,
	ICredentialType,
	INodeProperties,
} from 'n8n-workflow';

/**
 * Generic Frappe credential.
 *
 * Deliberately free of any product-specific notion: it targets a Frappe *site*, not an
 * application. The Frappe CRM, Frappe Helpdesk, Frappe HRMS and Frappe LMS nodes all
 * declare `{ name: 'frappeApi', required: true }` and share the same credential instance.
 * See docs/CREDENTIALS.md.
 *
 * The internal name `frappeApi` and the field names are identical to the ones shipped by
 * the `n8n-nodes-frappe-helpdesk` and `n8n-nodes-frappe-hrms` packages, on purpose: a user
 * running several of them sees a single « Frappe API » credential type and configures
 * their site once. Any change here has to be mirrored there.
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
			placeholder: 'https://my-site.frappe.cloud',
			description:
				'Root URL of the Frappe site, without any path or trailing slash. The node appends /api/resource or /api/method itself.',
		},
		{
			displayName: 'API Key',
			name: 'apiKey',
			type: 'string',
			default: '',
			required: true,
			description:
				'Key generated from the Frappe user profile: Settings > API Access > Generate Keys',
			typeOptions: { password: true },
		},
		{
			displayName: 'API Secret',
			name: 'apiSecret',
			type: 'string',
			typeOptions: { password: true },
			default: '',
			required: true,
			description: 'Secret shown only once, when the keys are generated',
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
						'Anonymous connection: the site answered but did not recognise the keys. Check the API Key and API Secret.',
				},
			},
		],
	};
}
