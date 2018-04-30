from hashlib import sha1
import hmac
import json

API_KEY = "Gac7hdzahZYpIKLZQP5Yi1WbaJhrvmjv"

def standardize_json_string(raw_body):
  # ensure sorted keys and no separators
  data = json.loads(raw_body)
  return json.dumps(data, sort_keys=True, separators=(',', ':'))

message = standardize_json_string("{\"user_id\": \"anon_0ec7beb0-8bb8-44bc-8f66-5a6e9f71767e|appMessaging\", \"sender\": \"bot\", \"text\": \"Howdy! \ud83d\ude04\", \"meta\": {\"state\": \"hi\", \"flow\": \"greetings\"}, \"timestamp\": 1524826992.48826, \"type\": \"text\", \"message_id\": \"M0Or2v2HZnWfusgZc\", \"bot_id\": \"BsXP3NzfRl3\"}")
print(message)
