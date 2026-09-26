# StockSense — UI/UX design brief (distilled)

The user's premium-SaaS redesign brief. Every frontend screen must follow it. Business logic and API
contracts are out of scope for design changes.

## Identity
- Brand **StockSense**, tagline **"Inventory, in real time."** Logo: stacked cubes + pulse dot (`LogoMark`), used in nav, auth, landing, favicon, mobile drawer.
- Feel: premium, minimal, technical, trustworthy. Own identity (Linear/Vercel/Stripe/Raycast calibre, not a copy).
- **Do not over-design:** gradients only for primary CTA, logo, selected/active states, hero, active stepper step. Restrained glass (top nav, palette). No neon, no giant illustrations.

## Tokens
- Dark (default): background `#09090B`, surface `#111113`, elevated `#18181B`, border ≈ `rgba(255,255,255,.08)`, hover slightly lighter; subtle glow on important components.
- Light: warm off-white background, white cards, soft gray borders, restrained shadows.
- Primary indigo `#6366F1`, violet `#7C3AED/#8B5CF6`, gradient indigo → violet → pink.
- Status: Draft gray · Ready sky · Waiting amber · Done green · Canceled/Late/Short rose. Badges = dot + icon/label, never colour alone.
- Type: Inter; JetBrains Mono for SKU, references, IDs, stock numbers; tabular numerals. Page title 24–32, section 18–20, body 14–16, secondary 12–13. Weight used intentionally.
- Spacing scale 8/12/16/20/24/32/40. Radius, shadows, motion from tokens only.
- Icons (lucide only): Dashboard LayoutDashboard · Receipt ArrowDownToLine · Delivery ArrowUpFromLine · Transfer ArrowLeftRight · Stock Boxes · Move History History · Warehouse Warehouse · Settings Settings · Bell · Search.

## Shell
- Sticky glass top nav: Dashboard · Operations ▾ (Receipt, Delivery, Internal Transfer, Adjustment) · Stock · Move History · Settings ▾ (Warehouse, Locations, Products, Categories, Contacts, Users, Reorder Rules). Active item: icon + subtle background + animated indicator.
- Right: ⌘K command button, notifications, theme toggle, avatar.
- Settings has its own layout with a settings side-nav; each page: title, description, content card, actions.

## Pages
- **Dashboard (most important):** greeting + warehouse switcher; filter bar; distinctive Receipt (incoming) and Delivery (outgoing) cards with icon, big number, status indicators, CTA, mini trend; varied KPI tiles (not identical) with sparklines + count-up; premium charts (custom grid/tooltip/legend, floating tooltip cards); Recent operations + actionable Low-stock alerts.
- **Operation pages:** breadcrumb (Operations / Receipts) · title · mono reference with copy · status · actions (primary gradient: To Do/Validate) · horizontal chevron stepper. Form in sections (INFORMATION, PRODUCTS, Summary: products count + total qty) — no label/textbox stacks with huge gaps. Product combobox shows `[SKU] Name` + ₹ cost + stock; qty stepper `[- 10 +]`; "+ Add Product" dashed row. First field autofocused on New. Confirm before Validate. Done → clear locked/read-only banner.
- **Delivery shortage:** only on the affected line: rose tint, "⚠ Short by 7 · Only 3 available".
- **Tables:** rounded container, sticky header, subtle separators, hover, ~52px rows, mono references, From → To chips, contact avatars, pagination. Tablet: fewer columns. Mobile: cards, not horizontal scroll.
- **Kanban:** rounded columns, status-coloured headers + count badges, rich cards (reference, contact, products, date, status), drag lift + shadow + slight rotation, valid drop glow, invalid drop feedback; horizontal scroll on mobile.
- **Stock:** strongest screen. Product avatar, mono SKU, ₹/unit, On hand, Free-to-use with mini progress bar, status badge, pencil on hover → inline adjustment popover; click row → animated per-location expansion (warehouse, location, on hand, reserved, free).
- **Move History:** timeline feel; IN +50 green, OUT −20 rose, ADJ ±; what/when/where/how much/who per row.
- **Notifications:** grouped Today / Earlier; icon, title, description, time, unread dot; click → record.
- **Command palette:** centred, "Search StockSense…", groups Pages / Products / Operations / Actions, keyboard nav, shortcut hints.
- **Profile:** large avatar, role badge, account details, password section, recent activity.
- **Auth:** split screen (form left, visual right); single column on mobile.
- **Landing:** hero "Inventory, / in real time." + Get Started / View Demo, floating dashboard mockup, gradient mesh, animated inventory flow; Features · How it works · Dashboard preview · Operations · Real-time · Analytics · FAQ · CTA · Footer.

## States & motion
- Skeletons (shimmer) for every loading state — never plain "Loading…". Empty states: icon + helpful line + CTA. Errors: clean message + Try Again.
- Toasts (Sonner) with icon, title, description, action (e.g. "Receipt validated · +100 Steel → WH/Stock1 [View move]"; "Low stock · Desk has 3 left [Create receipt]").
- Framer Motion: fast, subtle; page fade + slight rise; hover lift; count-ups; stepper animation; small confetti on validate; respect reduced motion.

## Responsive
- Test 320/375/390/430/768/1024/1440. Mobile is redesigned, not shrunk: drawer nav, sticky bottom action bar on forms, cards instead of tables, single-column forms, ≥44px touch targets, zero horizontal page overflow.
