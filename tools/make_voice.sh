#!/bin/bash
# Speaks every line in tools/voice-lines.json in the Cabbie voice (qwen-voice skill), then makes small MP3s.
#   bash tools/make_voice.sh            (from 03 Build)
set -e
cd "$(dirname "$0")/.."
WAV="../02 Assets/Voice/game-lines"; mkdir -p "$WAV" audio/voice
PY=~/.cache/qwen-tts/venv/bin/python
FF=~/.cache/howto-video/node_modules/ffmpeg-static/ffmpeg
$PY - "$WAV" <<'PY'
import json, os, sys
w = os.path.abspath(sys.argv[1])
jobs = [{"text": l["text"], "out": os.path.join(w, l["id"] + ".wav")} for l in json.load(open("tools/voice-lines.json"))
        if not os.path.exists(os.path.join(w, l["id"] + ".wav"))]
json.dump(jobs, open("/tmp/ronnie-voice-jobs.json", "w"))
print(len(jobs), "lines to speak")
PY
[ "$(python3 -c 'import json;print(len(json.load(open("/tmp/ronnie-voice-jobs.json"))))')" = "0" ] || \
  $PY ~/.claude/skills/qwen-voice/scripts/qwen_voice.py say --voice cabbie --lines /tmp/ronnie-voice-jobs.json 2>&1 | grep -E "s  /|Error|Traceback"
for f in "$WAV"/*.wav; do
  o="audio/voice/$(basename "${f%.wav}").mp3"
  [ -s "$o" ] || "$FF" -loglevel error -y -i "$f" -af "silenceremove=start_periods=1:start_threshold=-45dB,areverse,silenceremove=start_periods=1:start_threshold=-45dB,areverse" -ac 1 -ar 24000 -b:a 48k "$o"
done
ls audio/voice | wc -l
node -e "const l=JSON.parse(require(\"fs\").readFileSync(\"tools/voice-lines.json\"));require(\"fs\").writeFileSync(\"js/voices.js\",\"// Generated from tools/voice-lines.json by tools/make_voice.sh. Clips live in audio/voice/<id>.mp3\nexport const VOICE_LINES = \"+JSON.stringify(l.map(x=>({id:x.id,group:x.group,ron:!!x.ron,text:x.text})))+\";\n\")"
