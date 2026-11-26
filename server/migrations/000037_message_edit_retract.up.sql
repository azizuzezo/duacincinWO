-- A sender can edit a message shortly after sending it (edited_at) or retract
-- it later (retracted_at). A retracted message keeps its body for moderation
-- audit; the API never returns it. attachment_name/size describe a file
-- attachment (original name and bytes) for documents and videos.
alter table messages
    add column edited_at timestamptz,
    add column retracted_at timestamptz,
    add column attachment_name text,
    add column attachment_size bigint;
