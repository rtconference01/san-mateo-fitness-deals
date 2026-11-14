# Fixtures

This repository is public. Fixtures in `tests/fixtures/<studio>/` must be scrubbed before they are committed.

Scrubbed means:

- No API keys, session cookies, access tokens, or other secrets.
- No personal data: names, email addresses, phone numbers, account ids, or booking details that identify a person.
- No screenshots. HTML and screenshots captured from studio sites are evidence and belong in object storage, which is gitignored (`snapshots/`, `captures/`, and `*.png` outside this folder). Do not add capture screenshots here.

Parser fixtures, when they are added, are saved HTML from a public pricing page with anything that could identify a person removed. A parser change has to pass every fixture.
