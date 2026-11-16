-- Commission is now added on top of the vendor's price (the couple pays
-- vendor price + commission, the vendor receives their price in full).
-- Each booking keeps the commission it was created with, so a later rate
-- change never moves an agreed deal. Null marks bookings made under the old
-- model (commission cut from the vendor at disbursement).
alter table bookings add column commission_amount bigint;
