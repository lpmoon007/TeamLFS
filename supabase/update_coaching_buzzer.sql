-- Smooth "went to the buzzer" -> "let the clock nearly run out" in the debrief coaching prose.
-- ASCII-only, paste-safe, run-safe: in-place text replace on the solo_content documents only.
update documents
set body_json = replace(body_json::text, 'went to the buzzer', 'let the clock nearly run out')::jsonb
where key = 'solo_content' and body_json::text like '%went to the buzzer%';
