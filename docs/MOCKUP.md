# StockSense — Mockup transcription (source of truth)

Transcribed from the Excalidraw architecture board ("StockSense - 8 hours"). Every screen
annotation is recorded here; when the spec and the board disagree on workflow, the board wins
unless noted.

## Global chrome

- Top nav on every app screen: **Dashboard · Operations · Stock · Move History · Settings**, avatar
  box ("A") at the top right. (Some frames label the third item "Products"; the dashboard frame
  says "Stock", which we use.)
- Annotations from the dashboard nav:
  - Operations → "Operation can be performed subsequently: 1. Receipt 2. Delivery 3. Adjustment"
  - Stock → "List the available stock"
  - Move History → "Display the history of In/Out stocks"
  - Settings → "1. Warehouse 2. Locations"
  - Dashboard → "Dashboard to display the current statistics"

## Login / Sign up ("App Logo" above both)

- **Login page:** Login Id, Password, `Sign In` button, footer links `Forget Password ? | Sign Up`.
- **Sign up page:** Enter Login Id, Enter Email Id, Enter Password, Re-Enter Password, `Sign Up`.
- Rules (from spec, matching the tiny board notes): login id unique 6–12 chars; email not already
  in DB; password > 8 chars with lowercase, uppercase and special char; wrong login shows
  "Invalid Login Id or Password".

## Dashboard

- Title "Dashboard" at the top right of the content area.
- **Receipt card:** button `4 To receive`; beside it `1 Late`, `6 operations`.
- **Delivery card:** button `4 To Deliver`; beside it `1 Late`, `2 waiting`, `6 operations`.
- Legend box:
  - **Late:** schedule date < today's date
  - **Operations:** schedule date > today's date
  - **Waiting:** waiting for the stocks

## Receipts list — "When user clicks on receipt operations, by default land on List View"

- Header: `NEW` button + title **Receipts**; right side: search icon, list icon, kanban icon.
- Columns: **Reference · From · To · Contact · Schedule date · Status**
- Example rows: `WH/IN/0001 | vendor | WH/Stock1 | Azure Interior | … | Ready`, `WH/IN/0002 | vendor | WH/Stock1 | Azure Interior | … | Ready`
- Notes: "Allow user to search receipts based on reference & contacts"; "Allow user to switch to
  the kanban view based on status"; "To" column → "Locations of warehouse".
- **Reference rule:** auto-increment, structure `WH/IN/0001` = `<Warehouse>/<Operation>/<ID>`;
  Warehouse = warehouse short code, Operation = IN/OUT (INT, ADJ per spec), ID = auto-incremental unique id.

## Receipt form

- Header: `New` + **Receipt**.
- Action row: `Validate` · `Print` · `Cancel` on the left; stepper **Draft > Ready > Done** on the right.
- Fields: reference `WH/IN/0001`; **Receive From**; **Responsible** (left column) · **Schedule Date** (right column).
- Products table: **Product | Quantity**, e.g. `[DESK001] Desk | 6`, followed by a `New Product` row.
- Notes:
  - "To DO = when in Draft, Validate = when in Ready. On click TODO move to Ready; on click Validate move to Done."
  - "Print the receipt once it's DONE."
  - "Draft – initial stage; Ready – ready to receive; Done – received."
  - Responsible: "auto fill with the current logged-in user."

## Delivery list — "When user clicks on Delivery operations, by default land on List View"

- Same header pattern: `NEW` + **Delivery**, search / list / kanban icons.
- Columns: **Reference · From · To · Contact · Schedule date · Status**
- Example rows: `WH/OUT/0001 | WH/Stock1 | (customer) | Azure Interior | … | Ready`
- Notes: "Allow user to search delivery based on reference & contacts"; kanban by status; "Populate all delivery orders".

## Delivery form

- Header: `New` + **Delivery**.
- Action row: `Validate` · `Print` · `Cancel`; stepper **Draft > Waiting > Ready > Done** on the right.
- Fields: reference `WH/OUT/0001`; **Delivery Address**; **Responsible** (left) · **Schedule Date**; **Operation type** (dropdown) (right).
- Products table: **Product | Quantity**, `[DESK001] Desk | 6`, `New Product` row, `Add New product`.
- Notes:
  - "Draft: initial state. Waiting: waiting for the out-of-stock product to be in. Ready: ready to deliver/receive. Done: received or delivered."
  - "Alert the notification & mark the line red if product is not in stock."
- Spec additions on top of the board: Check Availability, Pick ☐ / Pack ☐ before Validate.

## Move History — "When user clicks on Move History, by default land on List View"

- Header: `NEW` + **Move History**; search / list / kanban icons.
- Columns: **Reference · Date · Contact · From · To · Quantity · Status**
- Example rows: `WH/IN/0001 | 12/1/2001 | Azure Interior | vendor | WH/Stock1 | … | Ready`,
  `WH/OUT/0002 | … | WH/Stock1 | vendor`, `WH/OUT/0002 | … | WH/Stock2 | vendor`
- Notes:
  - "Populate all moves done between the From – To location in inventory."
  - "If a single reference has multiple products, display it in multiple rows."
  - "In moves should be displayed in green, Out moves in red."
  - Search by reference & contacts; kanban by status.

## Stock

- Title **Stock** with a search icon.
- Columns: **Product · per unit cost · On hand · Free to Use**
- Rows: `Desk | 3000 Rs | 50 | 45`, `Table | 3000 Rs | 50 | 50`
- Note: "User must be able to update the stock from here."

## Settings → Warehouse ("This page contains the warehouse details & location")

- Fields: **Name**, **Short Code**, **Address**.

## Settings → Location

- Fields: **Name**, **Short Code**, **Warehouse** (e.g. `WH`).
- Note: "This holds the multiple locations of warehouse, rooms etc."
