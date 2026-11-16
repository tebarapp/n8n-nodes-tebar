# Changelog

## 0.1.1

- First release on npm. Same nodes as 0.1.0, which was tagged but never published (npm needs `access: public` to publish a new package with provenance).

## 0.1.0

- Tebar node: accounts (get, get many), posts (create, get, get many, cancel, retry), media (upload, upload from URL, get, get many, delete), comments (get, get many, reply, hide).
- Tebar Trigger node: registers a Tebar webhook for the chosen events, verifies each delivery's signature, and removes the webhook when the workflow is deactivated.
