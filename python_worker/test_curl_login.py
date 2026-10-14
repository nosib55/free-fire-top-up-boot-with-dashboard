from curl_cffi import requests
import json

session = requests.Session(impersonate="chrome124")

# 1. First visit main page to get initial cookies
resp = session.get("https://shop.garena.my/app/100067/idlogin")
print("GET /app/100067/idlogin status:", resp.status_code)
print("Initial cookies:", session.cookies.get_dict())

# 2. Try player_id_login
payload = {
    "app_id": 100067,
    "login_id": "4005814084",
    "app_server_id": 0
}
headers = {
    "Content-Type": "application/json",
    "Origin": "https://shop.garena.my",
    "Referer": "https://shop.garena.my/app/100067/idlogin"
}

resp_login = session.post(
    "https://shop.garena.my/api/auth/player_id_login",
    data=json.dumps(payload),
    headers=headers
)
print("POST player_id_login status:", resp_login.status_code)
print("Login response text:", resp_login.text[:300])
print("Updated cookies:", session.cookies.get_dict())
