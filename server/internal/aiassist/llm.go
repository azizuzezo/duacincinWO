package aiassist

import (
	"bufio"
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"sort"
	"strings"
	"time"
)

// Minimal client for an OpenAI-compatible POST {base}/chat/completions with
// stream=true and tools. Only the fields this feature uses are modelled.

type chatMessage struct {
	Role    string `json:"role"`
	Content string `json:"content"`
	// ReasoningContent is echoed back within one turn: reasoning models
	// (DeepSeek thinking mode) require it on assistant tool-call messages.
	ReasoningContent string     `json:"reasoning_content,omitempty"`
	ToolCalls        []toolCall `json:"tool_calls,omitempty"`
	ToolCallID       string     `json:"tool_call_id,omitempty"`
}

type toolCall struct {
	ID       string `json:"id"`
	Type     string `json:"type"`
	Function struct {
		Name      string `json:"name"`
		Arguments string `json:"arguments"`
	} `json:"function"`
}

type toolDef struct {
	Type     string      `json:"type"`
	Function toolDefFunc `json:"function"`
}

type toolDefFunc struct {
	Name        string         `json:"name"`
	Description string         `json:"description"`
	Parameters  map[string]any `json:"parameters"`
}

type chatRequest struct {
	Model       string        `json:"model"`
	Messages    []chatMessage `json:"messages"`
	Tools       []toolDef     `json:"tools,omitempty"`
	Stream      bool          `json:"stream"`
	MaxTokens   int           `json:"max_tokens,omitempty"`
	Temperature float64       `json:"temperature"`
	// ReasoningEffort ("none", "low", ...) is sent only when configured
	// (AI_REASONING_EFFORT): thinking models answer much faster on "low".
	ReasoningEffort string `json:"reasoning_effort,omitempty"`
}

// streamChunk is one `data:` line of the SSE stream.
type streamChunk struct {
	Choices []struct {
		Delta struct {
			Content          string `json:"content"`
			ReasoningContent string `json:"reasoning_content"`
			ToolCalls        []struct {
				Index    int    `json:"index"`
				ID       string `json:"id"`
				Type     string `json:"type"`
				Function struct {
					Name      string `json:"name"`
					Arguments string `json:"arguments"`
				} `json:"function"`
			} `json:"tool_calls"`
		} `json:"delta"`
		FinishReason string `json:"finish_reason"`
	} `json:"choices"`
	Error *struct {
		Message string `json:"message"`
	} `json:"error"`
}

type llmClient struct {
	baseURL, apiKey, model, reasoning string
	http                              *http.Client
}

// streamResult is what one completion round produced.
type streamResult struct {
	Content   string
	Reasoning string
	ToolCalls []toolCall
}

// stream runs one completion round. onText receives each visible text piece
// as it arrives; onThinking fires (once per round at most) when a reasoning
// model starts emitting hidden reasoning, so the UI can say it is thinking.
func (c *llmClient) stream(ctx context.Context, msgs []chatMessage, tools []toolDef, onText func(string), onThinking func()) (*streamResult, error) {
	body, err := json.Marshal(chatRequest{
		Model:           c.model,
		Messages:        msgs,
		Tools:           tools,
		Stream:          true,
		MaxTokens:       900,
		Temperature:     0.6,
		ReasoningEffort: c.reasoning,
	})
	if err != nil {
		return nil, err
	}
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, c.baseURL+"/chat/completions", bytes.NewReader(body))
	if err != nil {
		return nil, err
	}
	req.Header.Set("Authorization", "Bearer "+c.apiKey)
	// Sarvam authenticates with its own header (docs.sarvam.ai v2).
	if strings.Contains(c.baseURL, "sarvam.ai") {
		req.Header.Set("api-subscription-key", c.apiKey)
	}
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Accept", "text/event-stream")

	resp, err := c.http.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusOK {
		snippet, _ := io.ReadAll(io.LimitReader(resp.Body, 512))
		return nil, fmt.Errorf("upstream status %d: %s", resp.StatusCode, strings.TrimSpace(string(snippet)))
	}

	// Some gateways ignore stream=true and answer with one JSON body.
	if !strings.Contains(resp.Header.Get("Content-Type"), "event-stream") {
		return decodeWhole(resp.Body, onText)
	}

	var (
		content  strings.Builder
		reason   strings.Builder
		calls    = map[int]*toolCall{}
		thinking bool
	)
	sc := bufio.NewScanner(resp.Body)
	sc.Buffer(make([]byte, 0, 64*1024), 1<<20)
	for sc.Scan() {
		line := strings.TrimSpace(sc.Text())
		data, ok := strings.CutPrefix(line, "data:")
		if !ok {
			continue
		}
		data = strings.TrimSpace(data)
		if data == "[DONE]" {
			break
		}
		var chunk streamChunk
		if err := json.Unmarshal([]byte(data), &chunk); err != nil {
			continue
		}
		if chunk.Error != nil {
			return nil, fmt.Errorf("upstream error: %s", chunk.Error.Message)
		}
		for _, ch := range chunk.Choices {
			reason.WriteString(ch.Delta.ReasoningContent)
			if ch.Delta.ReasoningContent != "" && !thinking {
				thinking = true
				if onThinking != nil {
					onThinking()
				}
			}
			if ch.Delta.Content != "" {
				content.WriteString(ch.Delta.Content)
				onText(ch.Delta.Content)
			}
			for _, tc := range ch.Delta.ToolCalls {
				cur, ok := calls[tc.Index]
				if !ok {
					cur = &toolCall{Type: "function"}
					calls[tc.Index] = cur
				}
				if tc.ID != "" {
					cur.ID = tc.ID
				}
				if tc.Function.Name != "" {
					cur.Function.Name += tc.Function.Name
				}
				cur.Function.Arguments += tc.Function.Arguments
			}
		}
	}
	if err := sc.Err(); err != nil {
		return nil, err
	}

	res := &streamResult{Content: content.String(), Reasoning: reason.String()}
	idx := make([]int, 0, len(calls))
	for i := range calls {
		idx = append(idx, i)
	}
	sort.Ints(idx)
	for n, i := range idx {
		tc := *calls[i]
		if tc.Function.Name == "" {
			continue
		}
		if tc.ID == "" {
			tc.ID = fmt.Sprintf("call_%d_%d", time.Now().UnixNano(), n)
		}
		res.ToolCalls = append(res.ToolCalls, tc)
	}
	return res, nil
}

func decodeWhole(r io.Reader, onText func(string)) (*streamResult, error) {
	var whole struct {
		Choices []struct {
			Message chatMessage `json:"message"`
		} `json:"choices"`
	}
	if err := json.NewDecoder(io.LimitReader(r, 1<<20)).Decode(&whole); err != nil {
		return nil, err
	}
	if len(whole.Choices) == 0 {
		return nil, fmt.Errorf("upstream returned no choices")
	}
	m := whole.Choices[0].Message
	if m.Content != "" {
		onText(m.Content)
	}
	return &streamResult{Content: m.Content, Reasoning: m.ReasoningContent, ToolCalls: m.ToolCalls}, nil
}
