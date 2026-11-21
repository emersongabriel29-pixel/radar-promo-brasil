---
name: radar-security-audit
description: Defensive, source-first security review of Radar Promo Brasil. Use when auditing code, APIs, auth, webhooks, queues, integrations, AI/media processing, secrets, or deployment configuration. Does not authorize live probing, publishing, or production mutation.
---

# Radar Promo Brasil — Security Audit

This project skill adapts the defensive methodology from Cloudflare's security-audit-skill (https://github.com/cloudflare/security-audit-skill). It is not a verbatim copy. Review the upstream repository and license before importing additional files.

## Operating rules
- Inspect source and configuration first. Findings require evidence and a concrete trust boundary, affected principal/resource, and impact.
- Read the Radar master rules and sync rule before any change: `docs/MASTER-RULES.md`, `docs/HATCHABLE-GITHUB-SYNC-RULE.md`, `AGENTS.md`.
- Do not test deployed endpoints, shared infrastructure, real credentials, production identities, live queue/publication flows, or real affiliate data.
- Do not execute target-controlled code unless an OS-enforced sandbox has no external network, an empty allowlisted environment, read-only source, bounded scratch, and resource limits. If unavailable, static analysis only and mark validation blocked.
- Use synthetic principals, fixtures, URLs, and secrets.
- Never copy secrets or sensitive data into reports, memory, PRs, or logs.
- Findings are not confirmed without source evidence and safe validation. Mark external/runtime facts as NEEDS VALIDATION.
- Do not fix automatically. Propose smallest targeted fix, explain side effects, tests, rollback and documentation.
- Never delete, disable, weaken, or replace existing functionality as an audit shortcut.

## Audit coverage for Radar
1. Authentication/authorization and access declarations; public/member/admin route boundary.
2. Input validation, parameterized DB operations, SQL injection, XSS, SSRF, path traversal, open redirects.
3. Affiliate API secrets, callback/webhook verification, signatures, replay, rate limits and tenant isolation.
4. Telegram/WhatsApp credentials, destination IDs, permission checks, message injection and accidental publication.
5. Queue lifecycle, deduplication, concurrency, retry/idempotency, manual approval and status transitions.
6. AI providers, prompt injection, data exfiltration, provider logging, quota/cost controls, fallback safety.
7. Media/image/video handling, upload limits, file type verification, storage access and cleanup.
8. Scheduler/cron authorization, resource exhaustion and overlapping jobs.
9. Database/RLS/migrations, backup and recovery, retention, audit trails.
10. Deployment/runtime configuration, dependency/supply-chain, CORS, CSP and secrets handling.

## Workflow
- Identify the exact source ref and dirty state. Read project docs and route inventory.
- Create a scope/coverage ledger; label every surface covered, partial, deferred, blocked, or out of scope.
- Trace source to sink and authorization boundary. Use focused read-only searches; no blind fuzzing.
- Record each candidate with severity, confidence, affected path/line, source evidence, threat actor, impact, safe reproduction (synthetic/local only), and minimal remediation.
- Independently re-check candidates; remove unsupported claims and document false positives.
- For any remediation, make an isolated branch/PR; test before merge/deploy; preserve existing behavior and add regression tests.
- Finish with a report: scope/ref, coverage gaps, findings, validation blockers, recommendations, tests, and rollback.

## Radar-specific no-go actions
Never send Telegram/WhatsApp messages, publish offers, alter READY queues, trigger real affiliate imports, call paid AI providers, change production settings, rotate secrets, or deploy during an audit unless the user separately and explicitly authorizes that action.

## Source
Upstream: https://github.com/cloudflare/security-audit-skill
Reviewed source path: `skills/security-audit/SKILL.md`
Reviewed upstream commit: `c1c8a8c1471069fb0e188eeaff69b8e8db6564a8`
