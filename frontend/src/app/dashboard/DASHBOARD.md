# Dashboard — Sigurna Banka

## Page Purpose & Context
- Goal: Provide a premium, at-a-glance overview of the customer's financial position and recent activity. Supports quick decisions (transfer, pay, view statements) and highlights security status.
- Users: authenticated bank customers (and admins with additional panels). 

## Layout Structure
- Top: compact glass navigation (see `frontend/src/app/shared/nav.component.html`).
- Hero row: three stat cards (Total balance, Available accounts, Pending payments).
- Secondary row: two-thirds Recent Transactions feed (grouped by date) + one-third Quick Actions & Security card.
- Lower row: Accounts list (card grid) and Cards overview (horizontal card scroll).

Flow: scan hero → review recent transactions → quick transfer → view account details.

## Information Hierarchy
- Primary: Total balance (large, bold, left-aligned in hero card).
- Secondary: per-account balances, pending amounts, card status.
- Tertiary: metadata & timestamps (muted gray).

## Visual Style
- Background: deep charcoal gradient with subtle red ambient glow near top-right.
- Glass cards: `background: rgba(255,255,255,0.06)`, `backdrop-filter: blur(12px)`, border `1px solid rgba(255,255,255,0.08)`.
- Accent: `--accent-red` used for primary CTAs and active nav states; avoided for errors.
- Typography: `--type-lg` for key numbers; `--type-md` for labels; `--type-sm` for metadata.

## Key Elements & Placement
- `Hero Stat Card` (component): left: label+small icon; center: big amount; right: action button. Use `sg-stat` and `sg-meta` classes.
- `Transaction Item` (component): avatar/icon, description, category tag, date, amount aligned right (green for incoming, red for outgoing).
- `Quick Actions` card: primary transfer button, scheduled payments, download statement.

## Security & Role Visibility
- Mask sensitive account numbers by default using class `sg-masked` with reveal toggle.
- Admin sees an extra `Operations` widget containing audit links and role tools. Nav shows `Admin` link only for `ADMIN` role.

## Component Guidance
- Use card spacing (`--space-md`) between sections.
- Use dotted separators for lists; avoid heavy table borders.
- Transaction grouping: sticky date separators on desktop.

## Interaction Patterns
- Reveal sensitive data: small inline toggle with explicit label and short delay to unmask.
- Transfer flow: inline quick-transfer modal → review screen (glass modal) → confirm with PIN or token.
- Destructive actions: require explicit typed confirmation (e.g., type 'CONFIRM') and show transaction preview.

## Responsive Behavior
- Desktop: three-column grid for hero + two-column for transactions & quick actions.
- Tablet: stack hero to two rows; transaction feed collapses to single column.
- Mobile: vertical stack with compact stat cards and collapsible filters.

## CSS Snippets (use tokens)
Add to `frontend/src/styles/dashboard.css` and import into main styles if needed.

```css
.sg-hero { display:flex; gap:16px; margin-bottom:20px; }
.sg-hero .card { flex:1; }
.sg-transactions { display:grid; grid-template-columns: 2fr 1fr; gap:20px; }
.transaction-item { display:flex; justify-content:space-between; padding:12px; border-radius:10px; }
.transaction-item.income .amount { color:var(--success); }
.transaction-item.outcome .amount { color:var(--danger); }
.sg-accounts-grid { display:grid; grid-template-columns: repeat(auto-fit,minmax(240px,1fr)); gap:16px; }
```

## Design Log Entry
- Followed premium dark glassmorphism rules; red used only for primary actions and active states; masked sensitive values by default.

## Notes For Developers
- Reuse `sg-glass` and token variables from `frontend/src/styles/sigurna-tokens.css`.
- Map Dashboard widgets to APIs: total balance → `GET /api/accounts/summary`, recent transactions → `GET /api/transactions?limit=20`, accounts list → `GET /api/accounts`.
