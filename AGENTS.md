<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.

## What Lovable manages

Rules outside this block are the project's own. Change the pieces below in
Lovable, not by hand. With the [Lovable MCP](https://mcp.lovable.dev)
connected, `send_message` asks Lovable to do it; otherwise ask the user to
use the editor.

- **Database.** Do not add or edit `supabase/migrations/` or `drizzle/`.
  Ask Lovable to change the schema.
- **Generated files.** Do not edit a file whose header says it is automatically
  generated.
- **AI gateway.** Keep model calls on Lovable's gateway, and keep
  `LOVABLE_API_KEY` out of browser code.
- **Connectors.** Lovable provides native connectors. `list_connectors` shows
  which are enabled; `add_connector` only returns the dashboard link. When a
  connector is enabled, calls go through the connector gateway and need
  `LOVABLE_API_KEY`. When Lovable does not provide one, users can bring their
  own key and store it in Secrets.
- **Secrets.** Lovable manages them. Do not put secret values in the repo.
<!-- LOVABLE:END -->

## Project rules

- Admin access comes only from `user_roles`; the owner e-mail is granted admin by the `grant_owner_admin` trigger on confirmed sign-up. Why: no "first signup becomes admin" escalation.
- Every admin server function re-checks `has_role` server-side; the `/admin` route guard is display-only. Why: the brief forbids frontend-only permission checks.
- Payment gateway credentials live in `payment_gateway_secrets` (service_role only) and are read via `src/lib/payments.server.ts`; the browser only ever sees "saved / last 4 digits". Why: secrets must never reach the frontend.
- Prices, promo prices and coupons are computed by the pure rules in `src/lib/pricing.ts`, always re-evaluated on the server at checkout. Why: one source of truth for page, checkout and tests.
- Buyer access changes only through `applyAccessChange` (webhook and manual review); a failed payment never revokes access granted by an earlier approved one. Why: avoids wrongful revocations.
- Course content edits go through `content_drafts` (keyed by entity id) and reach live tables only via `publishDrafts`. Why: Salvar rascunho must not change the public course.
- The public page and the admin preview both render `src/components/landing/LandingView.tsx` from `site_settings` with defaults in `src/lib/landing-content.ts`. Why: preview must match the published page exactly.
