# Edgewood Volunteer Hub – volunteer pages

Public pages for the Edgewood Volunteer Hub (IU concessions volunteers).
The data and logic live in the Hub's Google Apps Script back end; nothing in this repo holds volunteer data, codes or settings.

## Ownership

Copyright © 2026 NE Prints & Design, LLC. All rights reserved.

The Edgewood Volunteer Hub (the code in this repository, the Google Apps Script back end, and its design) was written and designed by Nick Ely as an unpaid volunteer and is owned by NE Prints & Design, LLC.

- Hosting this repository under the `edgewood-volunteers` account is for continuity and does not transfer ownership of the code.
- No license is granted. The code is publicly visible, but copying, modifying, redistributing or reusing it requires written permission from NE Prints & Design, LLC.
- Volunteer data (people, shifts, hours, documents) belongs to the Edgewood programs it was collected for, not to the code's owner.

## Sandbox site

`/lab-bec0d580658f/` is the test site. It loads the same `portal.js` but has its own `config.js` pointing at the
SANDBOX copy of the Hub, shows an orange SANDBOX bar, and asks search engines not to index it. Saved volunteer codes and
admin sign-ins are kept separately from the live site. If `index.html` changes, copy it into that folder too
(the only difference is the `robots` meta line).
