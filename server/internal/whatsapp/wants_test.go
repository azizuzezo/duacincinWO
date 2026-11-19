package whatsapp

import "testing"

func TestWantsWO(t *testing.T) {
	for _, m := range []string{"rina@gmail.com", "Halo DuaCincin, mau hubungkan akun", "duacincin.id", "Hubungkan WhatsApp"} {
		if !wantsWO(m) {
			t.Fatal("should reach WO:", m)
		}
	}
	for _, m := range []string{"Terima kasih undangannya, insyaallah hadir", "Aamiin, selamat ya!", "ok", "Siapa ini?"} {
		if wantsWO(m) {
			t.Fatal("an invitation guest's reply must not reach WO:", m)
		}
	}
}
