// Shared data tables: SMS rates, orders, US events (the values are in data/shared-rates.json)
/* ── SHARED DATA ──
 One copy of each table. Every cost page reads from here, so a value is changed in one place only.
 CLICKATELL_RATES / TWILIO_RATES: SMS price per message (USD) by market.
 ORDERS: yearly B&M orders by market. TWILIO_ORDERS: same, for the Twilio markets only (0 = priced but no order data).
 US_EVENTS_2025: real US events, full-year 2025. Pages must not change these objects; copy them first if needed. */
const SHARED = HUB_DATA.shared;

const INTENTS = [{"key":"documents_required","label":"Documents Required","icon":"","data":[]},{"key":"balance_settlement","label":"Balance Settlement Deposit","icon":"","data":[]},{"key":"login_credentials","label":"Login Credentials or Password","icon":"","data":[]},{"key":"interview_required","label":"Interview Required","icon":"","data":[]},{"key":"refunds","label":"Refunds","icon":"","data":[]},{"key":"transaction_review","label":"Transaction Under Review","icon":"","data":[]},{"key":"cancellations","label":"Cancellations - Order on Hold","icon":"","data":[]},{"key":"transaction_status","label":"Transaction Status","icon":"","data":[]},{"key":"account_messages","label":"Account Messages","icon":"","data":[]}];

