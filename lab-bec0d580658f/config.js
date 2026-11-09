/* Edgewood Volunteer Hub – site settings.
 * Copyright (c) 2026 NE Prints & Design, LLC. All rights reserved.
 * HUB_API is the Hub's Apps Script web app. It is not a secret: it is in every Hub email already.
 * This folder is the permanent SANDBOX site (test copy of the Hub). It stays pointed at the sandbox after cutover;
 * only the root config.js switches to the live web app. */
window.HUB_API = 'https://script.google.com/macros/s/AKfycbxNNoPkMYMbM_VguDkvgDDRKU5rEl42Wbm7aslgMIRnPrJRTfr3uUDlwNkCgy5nTJdk/exec';
window.HUB_ENV = 'SANDBOX';

/* Google sign-in for admins (Google Cloud > Clients > Web application). Public, not a secret. */
window.HUB_GOOGLE_CLIENT_ID = '235845290660-vu9gh7pjfgpf4brdoq5rj6n90rj016ku.apps.googleusercontent.com';
/* Help page shown in the footer before anyone signs in (after sign-in the Hub's Settings › Help page link is used). */
window.HUB_HELP = '';
window.HUB_ASSETS = '../';   // portal.js lives one folder up
