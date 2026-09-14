# My Expenses × C•E•GO Price Radar integration

## Goal
My Expenses remains the source of truth for expense records. Price Radar receives only the minimum item-level purchase confirmation needed to update restock timing and shopping recommendations.

## Outbound event from My Expenses
When an expense contains a confidently identified item (manual item detail, barcode, or receipt scan), My Expenses can emit:

```json
{
  "type": "purchase.confirmed",
  "productId": "gtin-or-normalized-id",
  "productName": "維記鮮奶 946ml",
  "brand": "維記",
  "purchaseDate": "2026-09-14",
  "merchant": "Wellcome",
  "quantity": 1,
  "amount": 29.9,
  "currency": "HKD",
  "confidence": 0.98,
  "source": "receipt-scan"
}
```

## Inbound handoff from Price Radar
Price Radar may send a purchase-intent payload so My Expenses can prefill an expense/item:
- product id
- product name / brand / specification
- retailer
- observed promo price
- date
- optional promotion source

## Rules
- Never infer a specific item from a supermarket total alone.
- Low-confidence matches require one-tap confirmation.
- Full expense history does not leave My Expenses just to power restock reminders.
- Either app must continue to work if the connection is turned off.

## Rollout
1. Add explicit `記錄到 My Expenses` / `已買` handoff.
2. Add shared API/event sync once both apps are stable.
3. Add receipt-scan/item-level auto-confirmation later.

Target outcome: the user records or scans a purchase once; My Expenses saves the financial transaction and Price Radar automatically learns the latest purchase date for restock reminders.
