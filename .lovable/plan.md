## Goal
Replace existing referral flow with a fully automatic, payout-enabled commission system. Referrer earns 10% of every first-time payment from a referee, credited to a wallet they can withdraw to bank via Paystack Transfers. Admin gets emails for key events.

## Database (migration)
1. **`referral_wallets`** — `user_id` (PK→profiles), `balance_usd numeric default 0`, `pending_usd numeric default 0`, `lifetime_earned_usd numeric default 0`, `total_referrals int default 0`, timestamps. RLS: owner select/update; service insert/update.
2. **`referral_earnings`** — `id`, `referrer_id`, `referee_id`, `payment_reference`, `payment_amount_usd`, `commission_usd`, `status` (`pending`|`credited`|`reversed`), `created_at`. RLS: owner select; service all.
3. **`referral_payouts`** — `id`, `user_id`, `amount_usd`, `amount_ngn`, `bank_name`, `account_number`, `account_name`, `status` (`pending`|`processing`|`success`|`failed`), `paystack_transfer_code`, `paystack_recipient_code`, `failure_reason`, `created_at`, `completed_at`. RLS: owner select+insert; service all.
4. Repurpose existing `referral_codes` — keep table, ensure every profile gets one auto-generated `PS-XXXXXX` code on signup (already exists in `handle_new_user`); add `owner_id uuid` column linking to `profiles.user_id` (currently uses `owner_email` only).
5. Trigger: on first `referral_uses` insert per user → wallet `total_referrals++`.
6. RPC `credit_referral_commission(_referee_id, _amount_usd, _payment_ref)` — finds referrer via `referral_uses`, inserts `referral_earnings`, updates wallet balance, inserts notification, returns referrer email + name for admin email.

## Edge Functions
- **`verify-paystack-payment`** + **`verify-czar-payment`**: after successful payment, call `credit_referral_commission`. If commission credited, fire-and-forget call to `send-admin-event-email` (referrer earned X) and `send-admin-event-email` (new payment). Drop the legacy partner/manual payout branching — every referral pays 10% to the referrer's wallet, period.
- **NEW `request-referral-payout`** — auth required; reads wallet balance + profile bank details; min $5; converts USD→NGN at live rate; creates Paystack transfer recipient (`/transferrecipient`) + initiates transfer (`/transfer`); inserts `referral_payouts` row; deducts wallet balance; emails admin.
- **NEW `paystack-transfer-webhook`** — handles `transfer.success` / `transfer.failed` / `transfer.reversed` events; updates `referral_payouts` status; on failure refunds wallet; emails admin + user notification.
- **NEW `send-admin-event-email`** — internal helper: posts to existing `send-admin-email` infra OR uses Resend directly to `grey.izilein@gmail.com` for events: `signup`, `subscription`, `payout_requested`, `payout_failed`, `commission_credited`. Uses `RESEND_API_KEY` if set, else logs to `admin_emails`.
- **`handle_new_user` trigger**: also fire admin signup email via pg_net (or have Auth callback page invoke it once).

## Frontend
- **`/ref/:code`** route → captures code into `localStorage.ps_referral_code` and redirects to `/auth?ref=CODE`. (Auth page already reads `?ref`.)
- **Dashboard "Referrals" panel** (replace current pill section):
  - Share box with `yourapp.com/ref/CODE` + copy/share buttons.
  - Stat cards: Total Referrals, Pending, Lifetime Earned, Wallet Balance.
  - "Withdraw" button → modal collecting/showing bank details (reuses Settings payout fields), validates min $5, calls `request-referral-payout`.
  - Recent earnings + payouts tables.
- **Settings**: keep payout info; add inline "Wallet: $X" + link to dashboard.
- **Admin page**:
  - Replace manual "Mark Paid" referral table with read-only earnings + payouts dashboards.
  - Add filter/search for payouts (status), button to manually retry failed transfer.
  - Remove legacy `paystack_payout_mode` setting (no longer needed — always auto).

## Notifications
- In-app notification on commission credited ("You earned $X from <name>").
- In-app notification on payout success/failure.
- Admin emails (via Resend if available) for: new signup, new subscription, commission credited, payout requested, payout failed.

## Secrets
- `RESEND_API_KEY` (already discussed earlier — optional, falls back to logging).
- `PAYSTACK_SECRET_KEY` already exists — used for Transfers API.

## Admin bypass
- `grey.izilein@gmail.com` is excluded from earning commission AND from triggering admin signup/payment emails for self-actions (no self-spam).

## Out of scope
- PayPal payouts (Paystack only — Nigeria-focused, matches existing currency strategy).
- Discount-on-next-payment redemption (wallet → bank only for v1, simpler).
