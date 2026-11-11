package email

import (
	"bytes"
	"fmt"
	"html/template"
	"net/url"
	"strings"
)

// The OTP emails share one layout with the DuaCincin Invitation code email
// (same family: ivory card, gold, serif, code in per-digit cells), but carry
// the WO identity: the gold swan + two rings logo and the owner's couples in
// adat. Email-safe on purpose: 600px tables, inline styles, absolute https
// images in JPG/PNG (no WebP for Outlook), a hidden preheader, light scheme.
//
// Images live in web/public/email/ (logo.png is a PNG export of
// /brand/duacincin-logo.webp, never redrawn). Their absolute base is taken
// from the logoURL the callers already pass (PUBLIC_ASSET_BASE_URL +
// "/brand/duacincin-logo.webp"). With no logoURL the email renders text-only:
// no broken images and no relative links.

const logoPath = "/brand/duacincin-logo.webp"

var otpTemplate = template.Must(template.New("otp").Parse(`<!doctype html>
<html lang="id"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light only"><meta name="supported-color-schemes" content="light"><title>{{.DocTitle}}</title></head>
<body style="margin:0;padding:0;background:#F3ECDF;-webkit-text-size-adjust:100%;">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;">{{.Preheader}}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#F3ECDF;">
<tr><td align="center" style="padding:28px 12px;">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:600px;background:#FFFDF9;border-radius:22px;overflow:hidden;box-shadow:0 18px 40px rgba(60,40,20,0.12);">
{{if .Base}}
<tr><td style="padding:0;line-height:0;font-size:0;background:#15110D;">
<img src="{{.HeaderURL}}" width="600" alt="Pasangan pengantin berbusana adat Sunda, Jawa, dan pengantin internasional di bawah gapura emas" style="display:block;width:100%;max-width:600px;height:auto;border:0;">
</td></tr>
<tr><td align="center" style="padding:4px 36px 0;">
<img src="{{.LogoURL}}" width="64" height="64" alt="Logo DuaCincin" style="display:block;width:64px;height:64px;border:0;">
<div style="margin-top:8px;font-family:Georgia,'Times New Roman',serif;font-size:15px;letter-spacing:4px;text-transform:uppercase;color:#7A5C24;">DuaCincin</div>
</td></tr>
{{else}}
<tr><td align="center" style="background:#15110D;padding:30px 36px 26px;">
<div style="font-family:Georgia,'Times New Roman',serif;font-size:22px;letter-spacing:5px;text-transform:uppercase;color:#DCBB76;">DuaCincin</div>
</td></tr>
{{end}}

<tr><td align="center" style="padding:18px 40px 0;font-family:Georgia,'Times New Roman',serif;font-size:30px;line-height:1.25;color:#15110D;">
{{.TitleLead}}<br><em style="font-style:italic;color:#7A5C24;">{{.TitleEm}}</em>
</td></tr>

<tr><td align="center" style="padding:16px 44px 0;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;font-size:15px;line-height:1.7;color:#4D443B;">
{{.Intro}}
</td></tr>

<tr><td align="center" style="padding:26px 24px 8px;">
<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="background:#FAF3E6;border:1px solid #E6D3AC;border-radius:18px;">
<tr><td style="padding:18px 18px;">
<table role="presentation" cellpadding="0" cellspacing="0" border="0" aria-label="Kode {{.Code}}"><tr>
{{range $i, $d := .Digits}}{{if $i}}<td width="8" style="width:8px;font-size:0;line-height:0;">&nbsp;</td>{{end}}<td align="center" valign="middle" width="48" height="60" style="width:48px;height:60px;background:#FFFFFF;border:1px solid #D3C4AB;border-radius:12px;font-family:Georgia,'Times New Roman',serif;font-size:32px;line-height:60px;font-weight:bold;color:#15110D;">{{$d}}</td>{{end}}
</tr></table>
</td></tr></table>
</td></tr>

<tr><td align="center" style="padding:10px 36px 0;">
<span style="display:inline-block;padding:7px 16px;background:#15110D;border-radius:999px;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;font-size:12px;letter-spacing:0.5px;color:#F3D99A;">{{.Validity}}</span>
</td></tr>

<tr><td align="center" style="padding:20px 44px 6px;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;font-size:13px;line-height:1.7;color:#6B6157;">
Jangan berikan kode ini kepada siapa pun, termasuk yang mengaku dari DuaCincin.
</td></tr>

<tr><td style="padding:22px 36px 0;"><div style="height:1px;background:#E6DCCB;line-height:1px;font-size:0;">&nbsp;</div></td></tr>

<tr><td align="center" style="padding:24px 36px 4px;font-family:Georgia,'Times New Roman',serif;font-size:21px;line-height:1.35;color:#15110D;">
{{.NextTitle}}
</td></tr>
<tr><td align="center" style="padding:6px 44px 0;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;font-size:14px;line-height:1.7;color:#4D443B;">
{{.NextBody}}
</td></tr>
{{if and .Base .CTALabel}}
<tr><td align="center" style="padding:22px 36px 34px;">
<a href="{{.CTAURL}}" style="display:inline-block;padding:13px 28px;background:#B8924A;border-radius:999px;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;font-size:14px;font-weight:bold;color:#15110D;text-decoration:none;">{{.CTALabel}}</a>
</td></tr>
{{else}}
<tr><td style="padding:0 0 30px;font-size:0;line-height:0;">&nbsp;</td></tr>
{{end}}

<tr><td style="background:#15110D;padding:24px 36px;" align="center">
<div style="font-family:Georgia,'Times New Roman',serif;font-size:15px;color:#F3D99A;letter-spacing:2px;">DuaCincin</div>
<div style="margin-top:6px;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;font-size:12px;line-height:1.7;color:#BFB3A3;">Vendor pernikahan dan persiapan hari besar kalian{{if .Base}} · <a href="{{.Base}}" style="color:#E7CF95;text-decoration:none;">{{.Host}}</a>{{end}}</div>
<div style="margin-top:10px;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;font-size:11px;line-height:1.6;color:#A39886;">{{.IgnoreLine}}</div>
{{if .Base}}<div style="margin-top:10px;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;font-size:10px;line-height:1.6;color:#8C8173;">Latar gambar: lukisan Abdullah Suriosubroto, Raden Saleh, dan Claude Monet (domain publik).</div>{{end}}
</td></tr>

</table>
</td></tr>
</table>
</body></html>`))

type otpTemplateData struct {
	DocTitle   string
	Preheader  string
	Base       string
	Host       string
	HeaderURL  string
	LogoURL    string
	TitleLead  string
	TitleEm    string
	Intro      string
	Code       string
	Digits     []string
	Validity   string
	NextTitle  string
	NextBody   string
	CTALabel   string
	CTAURL     string
	IgnoreLine string
}

// assetBase turns the logoURL the callers pass into the public origin (plus
// any path prefix) that serves web/public. Anything that is not an absolute
// http(s) URL yields "" and the email falls back to text-only branding.
func assetBase(logoURL string) (base, host string) {
	u, err := url.Parse(strings.TrimSpace(logoURL))
	if err != nil || u.Host == "" || (u.Scheme != "https" && u.Scheme != "http") {
		return "", ""
	}
	prefix := ""
	if strings.HasSuffix(u.Path, logoPath) {
		prefix = strings.TrimRight(strings.TrimSuffix(u.Path, logoPath), "/")
	}
	return u.Scheme + "://" + u.Host + prefix, u.Host
}

func render(logoURL string, d otpTemplateData) (string, error) {
	d.Base, d.Host = assetBase(logoURL)
	if d.Base != "" {
		d.HeaderURL = d.Base + "/email/header.jpg"
		d.LogoURL = d.Base + "/email/logo.png"
		if d.CTAURL != "" {
			d.CTAURL = d.Base + d.CTAURL
		}
	}
	d.Digits = strings.Split(d.Code, "")
	var buf bytes.Buffer
	if err := otpTemplate.Execute(&buf, d); err != nil {
		return "", err
	}
	return buf.String(), nil
}

// RenderPasswordResetOTPEmail renders the branded OTP email for the
// "lupa password" flow (PRD §8.2). logoURL may be empty (falls back to
// text-only branding) when PUBLIC_ASSET_BASE_URL is not configured yet.
func RenderPasswordResetOTPEmail(logoURL, code string) (subject, html string, err error) {
	html, err = render(logoURL, otpTemplateData{
		DocTitle:   "Kode kata sandi baru DuaCincin",
		Preheader:  fmt.Sprintf("Kode kamu %s. Berlaku 5 menit untuk membuat kata sandi baru.", code),
		TitleLead:  "Ini kode untuk membuat",
		TitleEm:    "kata sandi baru",
		Intro:      "Ketik kode ini di halaman lupa kata sandi, lalu buat kata sandi baru untuk akun DuaCincin kamu.",
		Code:       code,
		Validity:   "Berlaku 5 menit, sekali pakai",
		NextTitle:  "Setelah kata sandi tersimpan",
		NextBody:   "Masuk lagi dengan kata sandi baru, lalu lanjutkan percakapan dengan vendor, daftar tamu, dan rencana hari besar kalian.",
		CTALabel:   "Masuk ke DuaCincin",
		CTAURL:     "/login",
		IgnoreLine: "Tidak merasa meminta kata sandi baru? Abaikan saja email ini. Kata sandi lama kamu tetap berlaku.",
	})
	if err != nil {
		return "", "", err
	}
	return fmt.Sprintf("%s adalah kode kata sandi baru DuaCincin kamu", code), html, nil
}

// RenderSignupOTPEmail renders the branded OTP email that confirms the
// email address when someone creates a DuaCincin account.
func RenderSignupOTPEmail(logoURL, code string) (subject, html string, err error) {
	html, err = render(logoURL, otpTemplateData{
		DocTitle:   "Kode pendaftaran DuaCincin",
		Preheader:  fmt.Sprintf("Kode kamu %s. Berlaku 10 menit untuk menyelesaikan pendaftaran.", code),
		TitleLead:  "Satu langkah lagi untuk",
		TitleEm:    "akun DuaCincin kamu",
		Intro:      "Ketik kode ini di halaman pendaftaran untuk memastikan email ini milik kamu. Setelah itu akun langsung aktif.",
		Code:       code,
		Validity:   "Berlaku 10 menit, sekali pakai",
		NextTitle:  "Setelah akun aktif",
		NextBody:   "Cari vendor pernikahan, simpan yang kamu suka, dan mulai susun rencana hari besar kalian di satu tempat.",
		IgnoreLine: "Tidak merasa mendaftar di DuaCincin? Abaikan saja email ini. Tanpa kode ini, tidak ada akun yang dibuat dengan email kamu.",
	})
	if err != nil {
		return "", "", err
	}
	return fmt.Sprintf("%s adalah kode pendaftaran DuaCincin kamu", code), html, nil
}

// RenderSignupOTPText is the plain-text part sent next to RenderSignupOTPEmail.
func RenderSignupOTPText(code string) string {
	return fmt.Sprintf("Kode pendaftaran DuaCincin kamu: %s\n\n"+
		"Kode ini berlaku 10 menit dan hanya bisa dipakai sekali. Jangan berikan kode ini kepada siapa pun, termasuk yang mengaku dari DuaCincin.\n\n"+
		"Tidak merasa mendaftar di DuaCincin? Abaikan saja email ini. Tanpa kode ini, tidak ada akun yang dibuat dengan email kamu.\n", code)
}

// RenderPhoneLinkOTPEmail renders the branded OTP email sent when a user
// links a WhatsApp number to their DuaCincin account (see internal/whatsapp).
func RenderPhoneLinkOTPEmail(logoURL, code string) (subject, html string, err error) {
	html, err = render(logoURL, otpTemplateData{
		DocTitle:   "Kode menghubungkan WhatsApp ke DuaCincin",
		Preheader:  fmt.Sprintf("Kode kamu %s. Balas chat WhatsApp DuaCincin dengan kode ini, berlaku 5 menit.", code),
		TitleLead:  "Hubungkan WhatsApp",
		TitleEm:    "ke akun kamu",
		Intro:      "Seseorang ingin menghubungkan nomor WhatsApp ke akun DuaCincin dengan email ini. Kalau itu kamu, balas chat WhatsApp DuaCincin dengan kode berikut.",
		Code:       code,
		Validity:   "Berlaku 5 menit, sekali pakai",
		NextTitle:  "Setelah nomor terhubung",
		NextBody:   "Kamu bisa mencari vendor dan membalas pesan percakapan langsung dari WhatsApp. Ketik menu kapan saja untuk melihat pilihan.",
		IgnoreLine: "Tidak merasa menghubungkan WhatsApp? Abaikan saja email ini. Tanpa kode ini, nomor tersebut tidak bisa terhubung ke akun kamu.",
	})
	if err != nil {
		return "", "", err
	}
	return fmt.Sprintf("%s adalah kode untuk menghubungkan WhatsApp ke DuaCincin", code), html, nil
}

// RenderPasswordResetOTPText is the plain-text part sent next to
// RenderPasswordResetOTPEmail (clients that do not show HTML, previews).
func RenderPasswordResetOTPText(code string) string {
	return fmt.Sprintf("Kode untuk membuat kata sandi baru DuaCincin kamu: %s\n\n"+
		"Kode ini berlaku 5 menit dan hanya bisa dipakai sekali. Jangan berikan kode ini kepada siapa pun, termasuk yang mengaku dari DuaCincin.\n\n"+
		"Tidak merasa meminta kata sandi baru? Abaikan saja email ini. Kata sandi lama kamu tetap berlaku.\n", code)
}

// RenderPhoneLinkOTPText is the plain-text part sent next to
// RenderPhoneLinkOTPEmail.
func RenderPhoneLinkOTPText(code string) string {
	return fmt.Sprintf("Kode untuk menghubungkan WhatsApp ke akun DuaCincin kamu: %s\n\n"+
		"Balas chat WhatsApp DuaCincin dengan kode ini. Berlaku 5 menit dan hanya bisa dipakai sekali. Jangan berikan kode ini kepada siapa pun, termasuk yang mengaku dari DuaCincin.\n\n"+
		"Tidak merasa menghubungkan WhatsApp? Abaikan saja email ini. Tanpa kode ini, nomor tersebut tidak bisa terhubung ke akun kamu.\n", code)
}
