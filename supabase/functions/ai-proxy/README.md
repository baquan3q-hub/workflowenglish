# ai-proxy

Edge Function that holds the Gemini key. The app calls it through
`services/aiClient.ts` with `{ op, payload }`; prompts are built here, in `ops/`.

| op | per user per hour |
|---|---|
| generateLesson, generateSentences | 20 |
| generateRemedialLesson, recommendWords | 10 |
| gradeSentence, ieltsChat | 60 |
| gradeIeltsWriting, gradeIeltsSpeaking | 15 |
| transcribeAudio | 30 |
| tts | 120 |
| listeningAudio | 80 (cached files are free) |
| generateListeningSection | 10 |
| aiHealth | 10 |

## Models

The lists live in `models.ts`. Google retired `gemini-2.0-flash` (June 2026) and
limits `gemini-2.5-*` to projects that already used them, so a new key gets 404
for both: that is why every AI feature failed with "AI đang bận".

- Text: `gemini-3.6-flash`, then `gemini-3.5-flash-lite`, then `gemini-2.5-flash`
  (lessons start with `gemini-3.8-flash`).
- Speech: `gemini-2.5-flash-preview-tts` (until 17 Nov 2026), then
  `gemini-3.8-flash-lite-tts` / `gemini-3.8-flash-tts` through the Interactions API.

When Google moves on again, replace a list without a code change:

```
supabase secrets set GEMINI_TEXT_MODELS=gemini-x-flash,gemini-y-flash-lite
supabase secrets set GEMINI_TTS_MODELS=gemini-x-tts
```

Failures now carry a `reason` (`not_configured`, `key_invalid`, `model_unavailable`,
`quota`, `blocked`, `unknown`) that the app turns into a clear message.

## Deploy (one time, then after every change in this folder)

1. Run `docs/migrations/007_ai_usage.sql` in the Supabase SQL Editor, and
   `009_ielts_listening.sql` for the `ielts-audio` bucket used by `listeningAudio`.
2. Install the CLI and sign in: `npm i -g supabase`, then `supabase login`.
3. Link the project: `supabase link --project-ref <project-ref>` (the ref is the
   subdomain of your Supabase URL).
4. Set the key: `supabase secrets set GEMINI_API_KEY=<new key>`.
5. Deploy: `supabase functions deploy ai-proxy`.
6. In Google AI Studio, revoke the old key: it was shipped in the JS bundle.

`SUPABASE_URL`, `SUPABASE_ANON_KEY` and `SUPABASE_SERVICE_ROLE_KEY` are
provided to the function automatically.

## Check

- Admin page → "Kiểm tra AI" (op `aiHealth`): tests the key, every model, the
  `ai_usage` table and the `ielts-audio` bucket, and says how to fix each failure.
- No JWT gives 401, an unknown op gives 400.
- Latency per op: see the query at the end of `007_ai_usage.sql`.
