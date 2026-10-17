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

## Deploy (one time, then after every change in this folder)

1. Run `docs/migrations/007_ai_usage.sql` in the Supabase SQL Editor.
2. Install the CLI and sign in: `npm i -g supabase`, then `supabase login`.
3. Link the project: `supabase link --project-ref <project-ref>` (the ref is the
   subdomain of your Supabase URL).
4. Set the key: `supabase secrets set GEMINI_API_KEY=<new key>`.
5. Deploy: `supabase functions deploy ai-proxy`.
6. In Google AI Studio, revoke the old key: it was shipped in the JS bundle.

`SUPABASE_URL`, `SUPABASE_ANON_KEY` and `SUPABASE_SERVICE_ROLE_KEY` are
provided to the function automatically.

## Check

- No JWT gives 401, an unknown op gives 400.
- Latency per op: see the query at the end of `007_ai_usage.sql`.
