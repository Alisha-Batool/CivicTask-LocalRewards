# CivicTask & Local Rewards

> **"Small actions. Real impact."**
> A production-grade civic-tech web application.

CivicTask connects student volunteers who complete verified community-service tasks with local neighborhood businesses offering rewards and discounts. The platform enforces an end-to-end trusted lifecycle:

```
Admin creates task ──► Student submits proof ──► Admin reviews evidence ──► Points awarded 
         ▲                                                                        │
         │                                                                        ▼
   Audit Ledger ◄── Points deducted ◄── Shopkeeper validates ◄── QR code generated
```

---

## 1. Core Architecture & Technologies

- **Frontend:** React 19, TypeScript, Tailwind CSS v4, Lucide icons, Plus Jakarta Sans typography.
- **Backend & Server Privileges:** Node.js Vite server middleware (`/api/*`) executing trusted business logic, Zod schema validation, and atomic Firestore transactions.
- **Database & Auth:** Google Cloud Firestore and Firebase Authentication with role-based access control (RBAC).
- **Security & Integrity:**
  - `firestore.rules` default-deny security rules preventing unauthorized reads, writes, and privilege escalation.
  - Server-side token validation via Google Identity Toolkit API.
  - Single-use, high-entropy, short-lived (15 min) QR redemption tokens hashed with SHA-256.
  - Atomic Firestore transactions for points balance mutation, redemption session resolution, transaction logging, and ledger creation.
  - In-memory sliding-window rate limiting on all sensitive write operations.
  - Proof verification enforcing HTTPS URLs or validated JPEG/PNG/WebP image files under 5 MB.
- **Scanning & Tokens:** `qrcode.react` for rendering QR codes and `html5-qrcode` for camera-based mobile scanning with manual fallback.

---

## 2. Roles & Permissions (RBAC)

| Role | Authoritative Source | Capabilities | Restrictions |
| :--- | :--- | :--- | :--- |
| **Student** | `users/{uid}.role == 'student'` | Browse tasks, submit service proof, view points balance, view ledger, request 15-min redemption QR codes. | Cannot approve tasks, award points, or modify balances directly. |
| **Shopkeeper** | `users/{uid}.role == 'shopkeeper'` | Manage storefront offer, scan student QR codes, verify discount preview, confirm atomic deduction. | Can only manage assigned storefront; cannot directly mutate user balances outside of atomic redemption. |
| **Admin** | `users/{uid}.role == 'admin'` | Publish/pause tasks, real-time moderation queue (approve/reject submissions), approve merchant applications, view full audit ledger. | Verified through server bootstrap config (`alishabatool838@gmail.com`) and Firestore rules. |

---

## 3. The 6-Step End-to-End Walkthrough

Judges can test the entire lifecycle in under 3 minutes:

1. **Seed Sample Tasks & Shops:**
   - Click the top purple/emerald banner: **"Seed Sample Tasks & Shops"**.
   - This automatically seeds 5 civic tasks (community garden, reading mentorship, food pantry, watershed cleanup, digital literacy) and 4 local storefronts (Roast & Crumb Bakery, Civic Exchange Books, GreenWheel Cycle Shop, Sunnyside Farmers Market).
2. **Student Submits Proof:**
   - In the **Student Hub**, select *"Northside Community Garden Spring Planting"*.
   - Click **Submit Proof**, upload a photo or HTTPS link, write a 2-sentence service reflection, and submit.
   - Status transitions to *"Under Review"*.
3. **Admin Reviews & Awards Points:**
   - Switch role to **Admin Moderation** via the top evaluator switcher.
   - In the **Review Queue**, view the student's submitted photo and reflection.
   - Click **Approve & Award Points**.
   - An atomic transaction verifies pending state, increments the student's balance (+120 pts), and writes an immutable credit record to `pointsLedger`.
4. **Student Generates QR Code:**
   - Switch back to **Student Hub** -> **Local Rewards Marketplace**.
   - Note the updated points balance (now 120+ pts).
   - Click **Redeem QR** on a shop offer (e.g. *Sunnyside Farmers Market* for 120 pts).
   - A single-use QR token is generated with a 15-minute countdown and an 8-character manual code fallback (e.g. `CT-9824-XK`).
5. **Shopkeeper Scans & Validates:**
   - Switch role to **Merchant Scanner**.
   - Open camera scanner or paste the manual redemption code into the input field and click **Verify**.
   - The server verifies session validity, checks that the student has sufficient points, and displays the confirmation card with student name and offer.
   - Click **Confirm & Apply Discount**.
   - An atomic transaction deducts 120 pts from the student balance, marks the token `redeemed`, writes to `transactions`, and adds a debit entry to `pointsLedger`. Replay attempts will be rejected!
6. **Audit & Transparency:**
   - Go to **Admin Moderation** -> **Points Ledger & Audit**.
   - View the immutable, timestamped ledger entries containing unique idempotency keys and actor IDs.

---

## 4. Running Automated Tests

Run the security and points engine unit tests:

```bash
npx tsx tests/pointsEngine.test.ts
```

The test runner verifies:
- Positive-integer bounds on reward points.
- Rejection of non-HTTPS links and invalid image formats.
- Cryptographic SHA-256 hash matching on redemption tokens.
- Balance deduction invariants (preventing overdrafts).
- Temporal expiration of QR sessions.

---

## 5. Development & Deployment

```bash
# Install dependencies
npm install

# Start development server on port 3000
npm run dev

# Build for production
npm run build
```

---

## 6. License

Apache 2.0. Verified civic-tech reward platform.
