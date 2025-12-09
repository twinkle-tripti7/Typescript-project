## Stripe Checkout Flow (Application Fee)

When a user chooses to pay the application fee, I first insert a new row into the `payment_requests` table with the `tenant_id`, `application_id`, `amount`, and `status` set to `"pending"`. After inserting this row, I call Stripe’s API to create a Checkout Session, passing the amount, currency, success/cancel URLs, and storing the `payment_request_id` inside the session’s metadata.

Stripe returns a `session.id`, which I save back into the `payment_requests` table so I can track it later. Once payment begins, Stripe sends webhook events to my backend. I listen specifically for `checkout.session.completed` and verify the signature for security. From the webhook, I read the `metadata.payment_request_id`, then update that record to `status = "paid"` and store Stripe’s `payment_intent` or `charge_id`.

Finally, I update the related application row—marking its fee as paid or advancing its workflow—to ensure the system reflects the successful payment.
