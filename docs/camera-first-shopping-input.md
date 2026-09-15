# Camera-first shopping input

## Product rule
Keep shopping input deliberately simple. The user should not have to complete item-level bookkeeping after taking a receipt/order photo.

Primary flow:

`購物入帳 → camera opens → take photo OR choose screenshot/photo → recognise what is clear → one confirmation → save expense`

## Recognition philosophy: useful, not perfect

Recognition is best-effort and must never block saving just because every line item cannot be understood.

- If only the category is clear, save the category. Example: clearly looks like `薯片` → record `薯片`.
- If a brand is also clear, enrich it. Example: `Lay's 薯片`.
- If specification/size/quantity is clear, enrich those fields too.
- If an item is genuinely unclear, ignore that item for inventory / Price Radar instead of forcing the user through a correction form.
- Do not invent an item, brand, size or quantity when confidence is poor.
- Unknown lines do not block the whole receipt from being entered as an expense.
- The receipt total / merchant / date can still be used for the financial expense when confidently recognised, independently of item-level recognition.

## UI rule
The normal path must not show the current multi-section manual form.

The home shortcut `🧾 購物入帳` should launch the camera-first flow immediately. The capture flow should also expose a secondary `相簿／截圖` choice.

After recognition, show only a compact summary such as:

- 惠康 · 今日 · HK$86.40
- 鮮奶 236 ml × 3
- Lay's 薯片 × 1

Primary action: `確認入帳`
Secondary action: `有錯，修改`

Manual merchant/date/amount/category/item/spec fields belong behind `有錯，修改`; they are not the default workflow.

## Price Radar handoff
Only recognised item-level facts are eligible for `purchase.confirmed` / restock learning.

- A supermarket total alone never proves that a particular product was purchased.
- Search/view/save activity in Price Radar never counts as a purchase.
- Unrecognised receipt lines are omitted from Radar rather than guessed.
- Recognised generic item (`薯片`) may be stored generically; recognised brand (`Lay's`) may be stored at brand level; exact product/barcode may be stored when available.

This keeps the Life Loop low-friction: recognise as much as is reliable, ignore the rest, and never make the user do unnecessary data entry.