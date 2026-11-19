-- Kirana asks a first-time visitor their name and age (optional), so she
-- can greet them by name when they come back. Kept on the conversation's
-- session (device or account), nowhere else.
alter table ai_chat_sessions add column visitor_name text;
alter table ai_chat_sessions add column visitor_age int check (visitor_age is null or visitor_age between 15 and 99);
