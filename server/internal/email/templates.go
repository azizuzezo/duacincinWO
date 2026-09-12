package email

import (
	"bytes"
	"html/template"
)

// otpTemplate follows PRD §8.2: logo, large clear OTP code, explicit
// "valid for 5 minutes, don't share" warning. Inline styles + a table
// wrapper for compatibility across email clients.
var otpTemplate = template.Must(template.New("otp").Parse(`
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F1F1F1;padding:32px 0;font-family:Arial,Helvetica,sans-serif;">
  <tr>
    <td align="center">
      <table role="presentation" width="480" cellpadding="0" cellspacing="0" style="background:#FFFFFF;border-radius:16px;overflow:hidden;">
        <tr>
          <td style="background:#152238;padding:24px;text-align:center;">
            {{if .LogoURL}}
            <img src="{{.LogoURL}}" alt="DuaCincin" width="56" height="56" style="display:block;margin:0 auto 8px;">
            {{end}}
            <span style="color:#FFFFFF;font-size:20px;font-weight:bold;">DuaCincin</span>
          </td>
        </tr>
        <tr>
          <td style="padding:32px;text-align:center;color:#0A0A0A;">
            <p style="font-size:16px;margin:0 0 16px;">{{.Intro}}</p>
            <div style="font-size:36px;font-weight:bold;letter-spacing:8px;color:#152238;background:#F1F1F1;border-radius:12px;padding:16px 0;margin:0 0 16px;">{{.Code}}</div>
            <p style="font-size:14px;color:#F5A623;font-weight:bold;margin:0 0 8px;">Kode ini berlaku 5 menit dan hanya boleh dipakai sekali.</p>
            <p style="font-size:13px;color:#666666;margin:0;">Jangan bagikan kode ini ke siapa pun, termasuk pihak yang mengaku dari DuaCincin.</p>
          </td>
        </tr>
      </table>
    </td>
  </tr>
</table>
`))

type otpTemplateData struct {
	LogoURL string
	Intro   string
	Code    string
}

// RenderPasswordResetOTPEmail renders the branded OTP email for the
// "lupa password" flow (PRD §8.2). logoURL may be empty (falls back to
// text-only branding) when PUBLIC_ASSET_BASE_URL is not configured yet.
func RenderPasswordResetOTPEmail(logoURL, code string) (subject, html string, err error) {
	var buf bytes.Buffer
	data := otpTemplateData{
		LogoURL: logoURL,
		Intro:   "Gunakan kode berikut untuk mengatur ulang password akun DuaCincin kamu:",
		Code:    code,
	}
	if err := otpTemplate.Execute(&buf, data); err != nil {
		return "", "", err
	}
	return "Kode OTP DuaCincin, berlaku 5 menit", buf.String(), nil
}
