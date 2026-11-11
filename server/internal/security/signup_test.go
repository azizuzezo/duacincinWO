package security

import "testing"

func TestSignupTicketRoundTrip(t *testing.T) {
	const secret = "test-secret-test-secret-test-secret"
	hash := HashOTP("otp-secret", "123456")
	tok, err := IssueSignupTicket(secret, "a@b.co", hash)
	if err != nil {
		t.Fatal(err)
	}
	c, err := ParseSignupTicket(secret, tok)
	if err != nil || c.Email != "a@b.co" || !VerifyOTP("otp-secret", "123456", c.CodeHash) {
		t.Fatalf("round trip failed: %v %+v", err, c)
	}
	if VerifyOTP("otp-secret", "654321", c.CodeHash) {
		t.Fatal("wrong code accepted")
	}
	if _, err := ParseSignupTicket("other-secret-other-secret-other", tok); err == nil {
		t.Fatal("ticket accepted with wrong secret")
	}
	reset, _ := IssuePasswordResetTicket(secret, "user-id")
	if _, err := ParseSignupTicket(secret, reset); err == nil {
		t.Fatal("reset ticket accepted as signup ticket")
	}
	session, _ := IssueSessionToken(secret, "user-id", "client")
	if _, err := ParseSignupTicket(secret, session); err == nil {
		t.Fatal("session token accepted as signup ticket")
	}
}
