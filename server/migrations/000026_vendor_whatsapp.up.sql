-- The vendor's WhatsApp number, required on the profile form so Admin can
-- verify the business by phone when needed. Private: only the vendor and
-- Admin ever see it; public directory/detail responses never carry it
-- (PRD §8.3, contact stays in-platform). Stored as digits, 628...
alter table vendor_profiles add column whatsapp_number text not null default '';
