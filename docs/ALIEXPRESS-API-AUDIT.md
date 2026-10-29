# AliExpress Open Platform audit

The member-only endpoint `POST /api/integrations/aliexpress` supports two additional actions:

- `{ "action": "audit" }`: makes a bounded set of real read-only calls and returns only status/count/field-presence diagnostics, not raw order or product records. Default checks are product search, smart match, hot products, categories, campaigns, product details, campaign products, and orders over the previous seven days. Up to eight actions may be selected with `actions`. Actions depending on an ID discovered earlier must be ordered after the corresponding discovery action. `ordersByCursor` is skipped unless a cursor is supplied through the normal dedicated action.
- `{ "action": "generateLinksBatch", "productUrls": ["https://www.aliexpress.com/item/..."] }`: generates up to ten links, one API call per URL, and returns per-item success/error. It does not import or publish offers.

The endpoint requires a signed-in member, an active account, saved AliExpress credentials, and the project's credential-encryption key. The existing legacy-API acknowledgement gate still applies.

## Reading the result

- `status: "OK"` means that call returned a parseable response; it does not guarantee that all expected fields were present.
- `status: "ERROR"` and `permissionDenied: true` indicate that the app likely lacks the corresponding permission or the API rejected the request.
- `SKIPPED` means the call needs an ID/cursor that was not discovered in this audit.
- `complete: true` means no selected action failed or was skipped. It does not mean every possible AliExpress API operation is available to this account.
- API methods in the GET capability list are implemented code paths, not a statement that the AliExpress app has been granted those scopes.

## Safety

The audit is read-only and bounded to eight calls. Batch link generation is bounded to ten separate calls. Neither action approves, imports, queues, nor publishes offers. Do not include App Secret in requests; credentials are loaded server-side. Run the audit from the authenticated integration UI or its authorized session, not from a public client.
