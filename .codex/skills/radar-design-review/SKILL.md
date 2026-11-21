---
name: radar-design-review
description: Apply the Radar Promo Brasil design intelligence when building, redesigning, polishing, or reviewing dashboards, reports, offer cards, settings, video studio, and mobile UI. Combine local UI UX Pro Max guidance with anti-generic design critique.
---

# Radar Design Review

This skill combines the project's existing UI UX Pro Max data with design-review principles inspired by Impeccable (Apache-2.0) and Taste-Skill (MIT). It is an adaptation, not a copy of their full source. Upstream links: https://github.com/pbakaus/impeccable and https://github.com/Leonxlnx/taste-skill.

## Radar UI principles
- Preserve the existing Radar brand, navigation, feature behavior, data contracts, permissions, and mobile workflows.
- Design for a dense operational dashboard: information hierarchy, scanability, status clarity, fast actions, and data accuracy matter more than decorative landing-page effects.
- Avoid generic AI-generated layouts, excessive gradients, excessive cards, arbitrary glassmorphism, random icon sets, fake metrics, and unnecessary motion.
- Make the visual decision explicit: target user, task, hierarchy, visual direction, spacing/type/color, and what is deliberately not changed.
- Use the existing UI UX Pro Max skill and its data/references as primary design evidence. Don't install duplicate datasets.
- Use real project data only where access is authorized; prototypes and screenshots must use synthetic data or redacted data.

## Review workflow
1. Read project UI, navigation, CSS tokens, route/page source, existing design rules, and relevant feature docs before editing.
2. Identify baseline screenshots or renderable pages; if unavailable, state that visual verification is blocked.
3. Check mobile widths first (minimum 390px target), then tablet and desktop. Avoid horizontal overflow and hover-only interactions.
4. Check accessibility: semantic controls, labels, focus states, contrast, keyboard support, touch targets (44px where practical), and reduced motion.
5. Improve the requested surface only; preserve existing route, data, API, role, and action semantics.
6. Verify rendered results at actual sizes. If browser/screenshot tools are unavailable, do not claim visual verification; provide a precise validation blocker.
7. Report changed files, visual/functional tests, regressions considered, and rollback.

## Dashboard-specific rules
- Show units, dates, time ranges, status meanings and data freshness.
- Distinguish real metrics from sample/demo values.
- Keep destructive, publishing, queue, and integration actions visibly separate from read-only analytics.
- Never add auto-publishing or change offer/queue state as a UI improvement.
- Maintain Portuguese (Brazil) copy unless the user explicitly asks otherwise.
