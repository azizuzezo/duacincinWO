-- Status pesan ala WhatsApp dan "Tutup sesi" chat.
--
-- messages.delivered_at: aplikasi penerima sudah mengambil pesan ini (daftar
-- percakapan, isi thread, atau websocket). messages.read_at: penerima membuka
-- thread dengan pesan ini terlihat. Keduanya hanya diisi untuk pesan dari
-- pihak lawan bicara, tidak pernah untuk pesan sendiri.
alter table messages
    add column if not exists delivered_at timestamptz,
    add column if not exists read_at timestamptz;

-- Pembaruan status selalu mencari pesan yang masih kosong statusnya.
create index if not exists messages_undelivered_idx on messages (conversation_id) where delivered_at is null;
create index if not exists messages_unread_idx on messages (conversation_id, created_at) where read_at is null;

-- Riwayat yang sudah tercatat di conversation_reads (posisi baca terakhir
-- tiap peserta) diterjemahkan ke status per pesan, supaya pesan lama yang
-- benar-benar sudah dibaca tidak tampil sebagai "terkirim" saja. Pesan yang
-- belum pernah tercatat dibaca dibiarkan kosong (centang satu): tidak ada
-- klaim yang tidak didukung data.
update messages m
set read_at = cr.updated_at,
    delivered_at = cr.updated_at
from conversations c, conversation_reads cr, messages lr
where m.conversation_id = c.id
  and cr.conversation_id = c.id
  and lr.id = cr.last_read_message_id
  and m.created_at <= lr.created_at
  and m.read_at is null
  and (
      (cr.user_id = c.client_id and m.sender_id <> c.client_id) or
      (cr.user_id <> c.client_id and m.sender_id = c.client_id)
  );

-- Sesi chat yang ditutup salah satu peserta. closed_at null = sesi terbuka.
alter table conversations
    add column if not exists closed_at timestamptz,
    add column if not exists closed_by uuid references users (id) on delete set null;
