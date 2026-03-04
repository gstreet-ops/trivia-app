# Contacts & Engagement Layer — Design Spec

**Date:** March 1, 2026 | **Version:** 2.0

Full spec exported from Cowork session. See `crm-contacts-spec-v2.md` in outputs.

## Summary of decisions

- **Tab name:** "Contacts"
- **Scoping:** Cross-community via Organizations model (Option C)
- **Organizations:** Auto-created transparently on first community or Contacts tab load
- **Both platforms:** Shared component in packages/shared for embed admin + trivia-app
- **Privacy:** Add CRM clause to ToS/Privacy Policy. Include "delete my data" flow.
- **Identity resolution:** Email as primary key within org scope. Triggers on subscribers, form_submissions, community_members, games, community_messages.
- **Storage:** ~50 MB/year for moderate usage. Well within Supabase limits.

## New tables (4)

1. `organizations` — ownership wrapper, future billing anchor
2. `organization_members` — multi-user org access (owner/admin/viewer)
3. `contacts` — unified identity per org (email + profile_id + tags + notes + status)
4. `contact_communities` — which communities a contact has interacted with
5. `contact_activity` — event stream (every interaction, timestamped, typed)

## Altered tables (1)

- `communities` — add `organization_id` FK

## Implementation phases

- **Phase A:** Organizations + schema + triggers (1 CC session)
- **Phase B:** Contacts Tab UI as shared component (2 CC sessions)
- **Phase C:** Activity feed, engagement scores, CSV import/export, auto-status (1 CC session)
- **Phase D:** Webhook events, segment export, broadcast targeting (1-2 CC sessions)