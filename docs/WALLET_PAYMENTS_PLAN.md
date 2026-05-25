# Wallet, Credits & Real-Money Payments — Planning Doc

Status: **DRAFT / PLANNING ONLY — not implemented.**
Owner: TBD · Last updated: 2026-05-24

---

## 0. TL;DR

We want to let a host create a room with a **wager** (e.g. 20 credits/player). All
players' wagers form a **pool** (3 players → 60 credits), and the winner takes the
pool (minus an optional platform rake). Credits are backed by **real money**: users
can **buy** credits and **withdraw** credits back to cash.

This turns the app from a casual game into a **real-money gaming (RMG) platform**.
That is a large undertaking that touches accounts/auth, a financial ledger, payment
+ payout integrations, KYC/AML, fraud prevention, and — most importantly — **legal
and regulatory compliance**. This doc breaks it into phases and flags the hard parts
up front.

---

## 1. ⚠️ Read this first: legal & compliance reality

Wagering credits that are purchased with and withdrawable to real money is, in most
jurisdictions, **gambling / real-money gaming**, even if the game involves skill.
This is **not a normal feature** — it carries serious legal, financial, and platform
risk. Before writing wallet code we need decisions/answers on:

- **Jurisdiction & licensing.** Real-money gaming is regulated per-country and often
  per-state/region. In India (the project's apparent locale), RMG is contentious:
  several states ban paid online games, the legal "skill vs. chance" distinction is
  litigated, and there is a **28% GST on the full entry/deposit amount** plus TDS on
  winnings. Other countries require gambling licenses entirely. **We likely need legal
  counsel before launch.**
- **Age verification** (18+/21+ depending on region).
- **KYC/AML.** Withdrawals to real money require identity verification (KYC) and
  anti-money-laundering controls; payouts of "winnings" are a classic money-laundering
  vector and providers/regulators treat them strictly.
- **Tax.** GST/VAT on deposits, TDS/withholding on winnings, reporting obligations,
  and issuing tax documents to users.
- **App store / platform policy.** Apple App Store and Google Play heavily restrict
  real-money gambling apps (geo-gating, licensing proof, separate developer programs).
  Even as a web app, this affects distribution and marketing.
- **Payment provider acceptance.** Stripe, Razorpay, PayPal, etc. classify gambling/RMG
  as **high-risk or prohibited**; you usually need a special account, underwriting, and
  sometimes a gaming-specific PSP. Standard accounts can be frozen for RMG activity.
- **Responsible gaming.** Deposit limits, self-exclusion, "cool-off" periods, and
  problem-gambling resources are legally required in many places.

**Recommendation:** Treat compliance as a **gating prerequisite**, not an afterthought.
A safer interim path is a **"play-money / no cash-out" version** (credits are cosmetic,
not purchasable or withdrawable) that exercises 90% of the engineering (accounts,
wallet, wagering, pooling, payout) **without** the legal exposure, then add real-money
rails only once compliance is cleared. See Phase plan §7.

---

## 2. Goals & non-goals

### Goals
- Real user accounts with profiles (replace anonymous-guest-only model).
- A credit **wallet** per user with an auditable balance.
- Host-set **wager** per room; wagers escrowed into a **pool**; winner paid out.
- **Buy credits** with real money (deposit).
- **Withdraw credits** to real money (payout) — gated by KYC.
- Tamper-proof, server-authoritative, **double-entry** accounting.

### Non-goals (for the first build)
- Tournaments / brackets, leaderboards with prizes.
- Multi-currency, crypto.
- In-game item store.
- Social features (friends, clans).

---

## 3. Current state (what we have today)

- **Players are anonymous guests** — a random token + a display name/avatar typed per
  room. No password, email, or persistent identity. (`User` model exists but is unused.)
- **MongoDB**: `rooms` (transient), `gamehistories` (finished games). **Redis**: live
  game state, sessions.
- **Auth**: a guest JWT issued over the socket connection; no real login.
- **Server is authoritative** for game state already (good foundation for wagering).

**Implication:** Wagering requires durable identity. We must introduce real accounts
and migrate the guest flow (guests can still *play free* rooms, but wager rooms require
a verified account with a funded wallet).

---

## 4. System design

### 4.1 Identity & auth
- Add real accounts: email + password (or OTP/phone, common in India) and/or OAuth
  (Google). Keep "guest" mode for free rooms.
- Email/phone verification; 18+ attestation at signup; KYC record before first withdrawal.
- Session: short-lived access JWT + refresh token; bind wallet operations to the
  authenticated user id (not the ephemeral guest token).

### 4.2 Wallet & ledger (the core)
Use a **double-entry ledger** — never mutate a single "balance" field directly. Balance
is derived/cached from immutable ledger entries. Every credit movement is a transaction
with two entries (debit one account, credit another) that must sum to zero.

Account types (ledger "accounts"):
- `user:<id>:available` — spendable balance
- `user:<id>:locked` — escrowed into an active wager
- `house:rake` — platform fee revenue
- `house:float` — counterparty for deposits/withdrawals
- `external:psp` — money in/out via payment provider

Core invariant: **sum of all ledger entries for a transaction = 0**, and a user's
available balance can never go negative. All wallet writes are **atomic** (MongoDB
multi-doc transactions or Postgres) and **idempotent** (keyed by an idempotency id).

> Strongly consider **PostgreSQL** for the wallet/ledger (ACID, constraints, easy
> double-entry, `SELECT ... FOR UPDATE`). Keep Mongo/Redis for game state. Money and
> game state have very different durability needs.

### 4.3 Wager / pool lifecycle
1. **Create room with wager W.** Host picks W (from an allowed set, with min/max).
2. **Join = ante.** Each joining player must have `available >= W`; on join we **move
   W from `available` → `locked`** (escrow) atomically. If they can't pay, they can't
   join the wager room.
3. **Pool = Σ locked.** For N players, pool = N·W, tracked on the room/match record.
4. **Game plays out** (existing engine, server-authoritative).
5. **Settlement on game end:**
   - Winner credited `pool − rake` to `available`.
   - Each player's `locked` W is released (debited from locked, the winner's share
     credited; losers' locked simply leaves their locked account into the pool).
   - `house:rake` credited the rake.
   - All as **one atomic settlement transaction** referencing the `gameId`.
6. **Edge cases (must be designed):**
   - Player **disconnects/leaves mid-game** → forfeit wager? grace period? auto-fold?
   - **Game abandoned / server crash** → refund all antes (escrow returns to available).
   - **Draw / no winner** (shouldn't happen in UNO, but elimination/timeout paths) →
     refund or split.
   - **Idempotent settlement** — settling the same game twice must be impossible.
   - The **turn-timeout auto-skip** we already have interacts with "AFK forfeits."

### 4.4 Deposits (buy credits)
- User initiates purchase → create a payment intent with the PSP (amount, currency).
- Redirect/checkout on the **PSP-hosted page** (never touch raw card data → keeps us
  out of heavy PCI scope).
- On PSP **webhook `payment.succeeded`** (verified signature, idempotent): credit the
  user's `available` from `house:float`, record `external:psp` entry. **Never** credit
  on client callback alone — only on the verified server webhook.
- Map money→credits at a fixed rate (e.g. ₹1 = 1 credit); store rate + fees on the txn.

### 4.5 Withdrawals (cash out)
- Gated by **completed KYC** and a minimum threshold; apply withholding/TDS if required.
- User requests payout → move `available → locked(withdrawal)` → create a **payout** via
  PSP payout API (or manual review queue for the first version) → on payout success
  webhook, finalize (debit locked, credit `external:psp`); on failure, return to available.
- Anti-fraud holds: cooling period for newly deposited funds, velocity limits, manual
  review over a threshold.

### 4.6 Payment provider options
| Provider | Notes |
|---|---|
| **Razorpay** | India-first; UPI/cards/netbanking; has Payouts (RazorpayX). RMG still needs special approval. |
| **Stripe** | Great DX; **gambling/RMG generally prohibited** without special arrangement; payouts via Connect. |
| **Cashfree / PayU** | India PSPs with payout support; check RMG policy. |
| **Gaming-specific PSP** | May be required if mainstream PSPs decline RMG. |

Pick based on (a) RMG acceptance in our jurisdiction and (b) payout support. **Confirm
RMG eligibility with the provider before building.**

---

## 5. Data model (new)

(Illustrative — finalize per chosen DB.)

- `users`: id, email/phone, passwordHash/authProvider, displayName, avatar, ageVerified,
  kycStatus (`none|pending|verified|rejected`), createdAt, flags.
- `wallets`: userId, availableBalance (cached), lockedBalance (cached), currency, updatedAt.
- `ledger_entries`: id, txnId, account, direction (debit/credit), amount, currency,
  createdAt. **Immutable, append-only.**
- `transactions`: id, type (`deposit|withdrawal|ante|settlement|rake|refund`), status,
  idempotencyKey, relatedGameId/paymentId, metadata, createdAt.
- `payments`: id, userId, pspId, amount, currency, status, raw webhook payload, createdAt.
- `payouts`: id, userId, amount, status, kycRef, pspPayoutId, createdAt.
- `game_wagers`: gameId, roomCode, wagerPerPlayer, poolTotal, rake, status
  (`open|locked|settled|refunded`), winnerUserId, settledAt.
- `kyc_records`: userId, provider, status, documents ref, verifiedAt.
- `audit_log`: actor, action, before/after, ip, createdAt (for disputes/compliance).

---

## 6. Security, integrity & fraud

- **Server-authoritative everything.** Client never asserts balances or outcomes.
- **Atomic + idempotent** wallet ops; idempotency keys on every money mutation and webhook.
- **Double-entry invariant** enforced in code + DB constraints; periodic reconciliation
  job (sum of ledger == sum of balances == PSP records).
- **Webhook signature verification**; replay protection.
- **Collusion / multi-accounting** detection: device/IP fingerprinting, shared-table
  collusion heuristics, limits on playing repeatedly with the same accounts.
- **Chargeback handling**: deposits can be reversed by the bank weeks later — never let
  withdrawable balance exceed "cleared" funds; hold periods on fresh deposits.
- **Rate limits** on deposit/withdraw/join; anomaly alerts.
- **Responsible gaming**: deposit/loss limits, self-exclusion, session reminders.
- **Privacy**: KYC docs are sensitive PII — encrypt at rest, strict access, retention policy.

---

## 7. Phased roadmap

**Phase 0 — Decisions & compliance (BLOCKER).**
Legal review, jurisdiction, licensing, PSP RMG eligibility, age/KYC requirements, tax.
No code until the answers exist. _Deliverable: go/no-go + constraints._

**Phase 1 — Accounts & profiles.**
Real auth (email/OTP/OAuth), profile, keep guest mode for free play. Migrate socket auth
to authenticated user id. _No money yet._

**Phase 2 — Play-money wallet + wagering (no cash).**
Ledger, wallet, room wagers, escrow, pooling, atomic settlement, refunds, AFK/forfeit
rules — all with **non-purchasable, non-withdrawable** credits. This de-risks the hard
engineering and game-integration without legal exposure. _Highly recommended milestone._

**Phase 3 — Deposits (real money in).**
PSP integration (hosted checkout), webhooks, credit issuance, receipts, GST handling.

**Phase 4 — KYC + withdrawals (real money out).**
KYC provider, payout API or manual queue, holds/limits, TDS, responsible-gaming tools.

**Phase 5 — Hardening & ops.**
Reconciliation, fraud tooling, dispute/chargeback workflow, audit exports, dashboards,
monitoring, on-call for money flows.

---

## 8. Effort & risk (rough)

- Phases 1–2 (accounts + play-money wagering): **substantial** but standard engineering;
  the wager/escrow/settlement + game-integration is the interesting part.
- Phases 3–4 (real money): **high effort + high external dependency** (PSP onboarding,
  KYC vendor, legal) and the **highest risk** (financial correctness, fraud, compliance).
- The **legal/compliance track runs in parallel and gates launch.**

---

## 9. Open questions (need answers before Phase 1)

1. Target **jurisdiction(s)** and have we confirmed RMG legality there?
2. Is a **gambling/gaming license** required? Do we have/can we get one?
3. Which **PSP** has agreed to support our RMG use case, with **payouts**?
4. **KYC** provider and threshold (KYC before first withdrawal? before deposit?).
5. **Rake** model and amount (e.g. 0%? 10% of pool?).
6. Credit↔money **conversion rate** and min/max deposit, withdrawal threshold.
7. **AFK/disconnect** policy in wager games (forfeit vs. refund vs. grace).
8. Are we OK starting with **Phase 2 play-money** to de-risk, then adding cash rails?
9. **DB choice** for the ledger (recommend Postgres alongside existing Mongo/Redis).

---

## 10. My recommendation

Build **Phase 1 (accounts) + Phase 2 (play-money wallet & wagering)** first. It delivers
the entire wager/pool/payout *experience* and all the hard financial-integrity
engineering, is shippable and testable, and carries **no real-money legal risk**. In
parallel, run the **compliance/PSP track**; only start Phases 3–4 once that clears. This
sequences the work so engineering progress isn't blocked on legal, and we never expose
the platform (or users' money) before the controls are in place.
