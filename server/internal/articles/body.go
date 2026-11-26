// Package articles holds the shared pieces of admin-written articles: the
// body validator (an allowlist over a ProseMirror/Tiptap JSON document, so
// every client can render it safely), slug derivation, and the public routes.
package articles

import (
	"bytes"
	"encoding/json"
	"fmt"
	"regexp"
	"strings"
)

const (
	MaxBodyBytes = 1 << 20
	maxDepth     = 12
)

// EmptyBody is the document of a new article.
var EmptyBody = json.RawMessage(`{"type":"doc","content":[]}`)

var (
	hexColor    = regexp.MustCompile(`^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$`)
	fontSizeRe  = regexp.MustCompile(`^([0-9]{2})px$`)
	widthRe     = regexp.MustCompile(`^([0-9]{2,3})%?$`)
	fontFamilys = map[string]bool{"Figtree": true, "Newsreader": true, "Georgia": true, "Times New Roman": true, "Arial": true, "Courier New": true}
	aligns      = map[string]bool{"left": true, "center": true, "right": true, "justify": true}
)

// Child allowlists per container node.
var (
	blockKinds  = []string{"paragraph", "heading", "bulletList", "orderedList", "blockquote", "horizontalRule", "image"}
	inlineKinds = []string{"text", "hardBreak"}
	itemKinds   = []string{"paragraph", "bulletList", "orderedList", "blockquote", "image", "heading"}
)

func in(list []string, s string) bool {
	for _, v := range list {
		if v == s {
			return true
		}
	}
	return false
}

type bodyError struct{ msg string }

func (e *bodyError) Error() string { return "isi artikel tidak valid: " + e.msg }

func fail(format string, args ...any) error { return &bodyError{fmt.Sprintf(format, args...)} }

// ValidateBody checks raw as an article document. It returns the body to
// store (the same JSON, compacted).
func ValidateBody(raw []byte) (json.RawMessage, error) {
	raw = bytes.TrimSpace(raw)
	if len(raw) == 0 || string(raw) == "null" {
		return EmptyBody, nil
	}
	if len(raw) > MaxBodyBytes {
		return nil, fail("terlalu besar (maksimal 1 MB)")
	}
	var doc any
	if err := json.Unmarshal(raw, &doc); err != nil {
		return nil, fail("bukan JSON yang benar")
	}
	m, ok := doc.(map[string]any)
	if !ok || m["type"] != "doc" {
		return nil, fail("akar dokumen harus bertipe doc")
	}
	if err := checkNode(m, 0, nil); err != nil {
		return nil, err
	}
	var buf bytes.Buffer
	if err := json.Compact(&buf, raw); err != nil {
		return nil, fail("bukan JSON yang benar")
	}
	return json.RawMessage(buf.Bytes()), nil
}

func checkKeys(m map[string]any, allowed ...string) error {
	for k := range m {
		if !in(allowed, k) {
			return fail("properti %q tidak dikenal", k)
		}
	}
	return nil
}

// checkNode validates one node. allowedKinds restricts this node's type
// (nil for the root).
func checkNode(m map[string]any, depth int, allowedKinds []string) error {
	if depth > maxDepth {
		return fail("terlalu dalam (maksimal %d tingkat)", maxDepth)
	}
	t, _ := m["type"].(string)
	if t == "" {
		return fail("ada elemen tanpa tipe")
	}
	if allowedKinds != nil && !in(allowedKinds, t) {
		return fail("elemen %q tidak boleh berada di sini", t)
	}
	if err := checkKeys(m, "type", "attrs", "content", "marks", "text"); err != nil {
		return err
	}

	attrs := map[string]any{}
	if v, present := m["attrs"]; present && v != nil {
		a, ok := v.(map[string]any)
		if !ok {
			return fail("attrs pada %q harus berupa objek", t)
		}
		attrs = a
	}

	var childKinds []string
	switch t {
	case "doc":
		childKinds = blockKinds
		if err := checkAttrs(t, attrs); err != nil {
			return err
		}
	case "paragraph":
		childKinds = inlineKinds
		if err := checkAttrs(t, attrs, "textAlign"); err != nil {
			return err
		}
	case "heading":
		childKinds = inlineKinds
		if err := checkAttrs(t, attrs, "textAlign", "level"); err != nil {
			return err
		}
		lv, ok := attrs["level"].(float64)
		if !ok || lv != float64(int(lv)) || lv < 2 || lv > 4 {
			return fail("tingkat judul harus 2 sampai 4")
		}
	case "bulletList":
		childKinds = []string{"listItem"}
		if err := checkAttrs(t, attrs); err != nil {
			return err
		}
	case "orderedList":
		childKinds = []string{"listItem"}
		if err := checkAttrs(t, attrs, "start", "type"); err != nil {
			return err
		}
		if s, ok := attrs["start"].(float64); ok && (s != float64(int(s)) || s < 1 || s > 100000) {
			return fail("nomor awal daftar tidak valid")
		}
	case "listItem":
		childKinds = itemKinds
		if err := checkAttrs(t, attrs); err != nil {
			return err
		}
	case "blockquote":
		childKinds = blockKinds
		if err := checkAttrs(t, attrs); err != nil {
			return err
		}
	case "horizontalRule":
		if err := checkAttrs(t, attrs); err != nil {
			return err
		}
	case "hardBreak":
		if err := checkAttrs(t, attrs); err != nil {
			return err
		}
	case "image":
		if err := checkAttrs(t, attrs, "src", "alt", "title", "width"); err != nil {
			return err
		}
		if err := checkImage(attrs); err != nil {
			return err
		}
	case "text":
		if err := checkAttrs(t, attrs); err != nil {
			return err
		}
	default:
		return fail("jenis elemen %q tidak diizinkan", t)
	}

	if al, ok := attrs["textAlign"]; ok && al != nil {
		s, _ := al.(string)
		if !aligns[s] {
			return fail("perataan teks tidak valid")
		}
	}

	if t == "text" {
		if _, ok := m["text"].(string); !ok {
			return fail("teks harus berupa string")
		}
		if _, has := m["content"]; has {
			return fail("teks tidak boleh punya isi")
		}
		return checkMarks(m["marks"])
	}
	if _, has := m["text"]; has {
		return fail("elemen %q tidak boleh punya properti text", t)
	}
	if _, has := m["marks"]; has && m["marks"] != nil {
		return fail("elemen %q tidak boleh punya mark", t)
	}

	if c, has := m["content"]; has && c != nil {
		list, ok := c.([]any)
		if !ok {
			return fail("content pada %q harus berupa daftar", t)
		}
		if childKinds == nil && len(list) > 0 {
			return fail("elemen %q tidak boleh punya isi", t)
		}
		for _, item := range list {
			cm, ok := item.(map[string]any)
			if !ok {
				return fail("isi elemen harus berupa objek")
			}
			if err := checkNode(cm, depth+1, childKinds); err != nil {
				return err
			}
		}
	}
	return nil
}

func checkAttrs(node string, attrs map[string]any, allowed ...string) error {
	for k := range attrs {
		if !in(allowed, k) {
			return fail("atribut %q tidak dikenal pada %q", k, node)
		}
	}
	return nil
}

func okURL(s string, prefixes ...string) bool {
	for _, p := range prefixes {
		if strings.HasPrefix(s, p) {
			if p == "/" && strings.HasPrefix(s, "//") {
				return false
			}
			return true
		}
	}
	return false
}

func checkImage(attrs map[string]any) error {
	src, _ := attrs["src"].(string)
	if src == "" || len(src) > 2000 || !(okURL(src, "https://", "/") || LocalHTTP(src)) {
		return fail("alamat gambar harus diawali https:// atau /")
	}
	if v, ok := attrs["alt"]; ok && v != nil {
		s, isStr := v.(string)
		if !isStr || len([]rune(s)) > 300 {
			return fail("teks alternatif gambar maksimal 300 karakter")
		}
	}
	if v, ok := attrs["title"]; ok && v != nil {
		s, isStr := v.(string)
		if !isStr || len([]rune(s)) > 300 {
			return fail("judul gambar tidak valid")
		}
	}
	if v, ok := attrs["width"]; ok && v != nil {
		var w float64
		switch x := v.(type) {
		case float64:
			w = x
		case string:
			mm := widthRe.FindStringSubmatch(x)
			if mm == nil {
				return fail("lebar gambar harus 10 sampai 100 persen")
			}
			fmt.Sscan(mm[1], &w)
		default:
			return fail("lebar gambar harus 10 sampai 100 persen")
		}
		if w != float64(int(w)) || w < 10 || w > 100 {
			return fail("lebar gambar harus 10 sampai 100 persen")
		}
	}
	return nil
}

func checkMarks(v any) error {
	if v == nil {
		return nil
	}
	list, ok := v.([]any)
	if !ok {
		return fail("marks harus berupa daftar")
	}
	for _, item := range list {
		mk, ok := item.(map[string]any)
		if !ok {
			return fail("mark harus berupa objek")
		}
		if err := checkKeys(mk, "type", "attrs"); err != nil {
			return err
		}
		t, _ := mk["type"].(string)
		attrs := map[string]any{}
		if a, present := mk["attrs"]; present && a != nil {
			am, ok := a.(map[string]any)
			if !ok {
				return fail("attrs pada mark harus berupa objek")
			}
			attrs = am
		}
		str := func(k string) (string, bool) {
			v, present := attrs[k]
			if !present || v == nil {
				return "", false
			}
			s, _ := v.(string)
			return s, true
		}
		switch t {
		case "bold", "italic", "underline", "strike", "code":
			if err := checkAttrs(t, attrs); err != nil {
				return err
			}
		case "highlight":
			if err := checkAttrs(t, attrs, "color"); err != nil {
				return err
			}
			if c, has := str("color"); has && !hexColor.MatchString(c) {
				return fail("warna sorot tidak valid")
			}
		case "link":
			if err := checkAttrs(t, attrs, "href", "target", "rel", "class"); err != nil {
				return err
			}
			href, _ := str("href")
			if len(href) > 2000 || !okURL(href, "https://", "http://", "mailto:", "/") {
				return fail("alamat tautan harus diawali https://, http://, mailto: atau /")
			}
			if tg, has := str("target"); has && tg != "_blank" && tg != "_self" {
				return fail("target tautan tidak valid")
			}
			if rel, has := str("rel"); has && len(rel) > 100 {
				return fail("rel tautan terlalu panjang")
			}
			if cl, has := str("class"); has && cl != "" {
				return fail("class tautan tidak diizinkan")
			}
		case "textStyle":
			if err := checkAttrs(t, attrs, "fontFamily", "fontSize", "color"); err != nil {
				return err
			}
			if f, has := str("fontFamily"); has && !fontFamilys[f] {
				return fail("jenis huruf tidak diizinkan")
			}
			if s, has := str("fontSize"); has {
				mm := fontSizeRe.FindStringSubmatch(s)
				var n int
				if mm != nil {
					fmt.Sscan(mm[1], &n)
				}
				if mm == nil || n < 10 || n > 72 {
					return fail("ukuran huruf harus 10px sampai 72px")
				}
			}
			if c, has := str("color"); has && !hexColor.MatchString(c) {
				return fail("warna teks tidak valid")
			}
		default:
			return fail("mark %q tidak diizinkan", t)
		}
	}
	return nil
}

// Stats walks a validated body: words of text, and whether it has any
// visible content (non-blank text or an image).
func Stats(body json.RawMessage) (words int, hasContent bool) {
	var doc map[string]any
	if json.Unmarshal(body, &doc) != nil {
		return 0, false
	}
	var walk func(m map[string]any)
	walk = func(m map[string]any) {
		switch m["type"] {
		case "text":
			if s, _ := m["text"].(string); strings.TrimSpace(s) != "" {
				words += len(strings.Fields(s))
				hasContent = true
			}
		case "image":
			hasContent = true
		}
		if list, ok := m["content"].([]any); ok {
			for _, c := range list {
				if cm, ok := c.(map[string]any); ok {
					walk(cm)
				}
			}
		}
	}
	walk(doc)
	return words, hasContent
}

// ReadingMinutes is about 200 words per minute, at least 1.
func ReadingMinutes(body json.RawMessage) int {
	words, _ := Stats(body)
	if m := (words + 199) / 200; m > 1 {
		return m
	}
	return 1
}

// LocalHTTP reports whether u is a plain-http address on this machine
// (localhost or 127.0.0.1). Photos uploaded to a local storage emulator come
// back as such an address; everything else must be https.
func LocalHTTP(u string) bool {
	for _, p := range []string{"http://localhost:", "http://localhost/", "http://127.0.0.1:", "http://127.0.0.1/"} {
		if strings.HasPrefix(u, p) {
			return true
		}
	}
	return false
}
