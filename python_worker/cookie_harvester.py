# python_worker/cookie_harvester.py
"""
DataDome Cookie Harvester & Auto-Topup Engine
- Launches Chrome locally without proxy.
- Auto-fills the Player ID.
- Detects the DataDome slider; waits for human completion (or auto-solve).
- Once passed, automatically captures the 'datadome' cookie and session tokens.
- Pushes the cookie to Redis so the Next.js web dashboard and background queue
  can execute 2-second topups without captcha!
"""

import time
import os
import sys
sys.stdout.reconfigure(encoding='utf-8')
import redis
from DrissionPage import ChromiumPage, ChromiumOptions

# Redis connection details from .env.local
REDIS_HOST = os.getenv("REDIS_HOST", "kind-goldfish-286221.upstash.io")
REDIS_PORT = int(os.getenv("REDIS_PORT", "6379"))
REDIS_PASSWORD = os.getenv("REDIS_PASSWORD", "gQAAAAAABF4NAAIgcDE2ZDJhOGUyZDhhYjY0ZGFhODdmMTdlOTM0MTA1OWI2ZA")

def save_cookie_to_redis(cookie_val):
    try:
        r = redis.Redis(
            host=REDIS_HOST,
            port=REDIS_PORT,
            password=REDIS_PASSWORD,
            ssl=True,
            decode_responses=True
        )
        # Store for shop.garena.my and garena.my
        ttl = 18 * 60 # 18 mins
        r.set("datadome:cookie:shop.garena.my", cookie_val, ex=ttl)
        r.set("datadome:cookie:garena.my", cookie_val, ex=ttl)
        print(f"✅ [Redis] Successfully stored DataDome cookie in Redis! TTL: {ttl}s", flush=True)
        return True
    except Exception as e:
        print(f"⚠️ [Redis] Error saving to Redis: {e}", flush=True)
        return False

def harvest_and_topup(player_id="4005814084"):
    print(f"🚀 Launching Chrome for UID: {player_id}...", flush=True)
    
    profile_dir = os.path.abspath(r"f:\ff\free-fire-top-up-boot-with-dashboard\python_worker\chrome_profile")
    os.makedirs(profile_dir, exist_ok=True)
    
    co = ChromiumOptions()
    co.set_browser_path(r"C:\Program Files\Google\Chrome\Application\chrome.exe")
    co.set_user_data_path(profile_dir)
    co.set_argument('--no-sandbox')
    co.set_argument('--disable-blink-features=AutomationControlled')
    co.set_argument('--start-maximized')
    co.headless(False) # Keep visible on desktop so user can slide if needed
    
    page = ChromiumPage(co)
    page.get("https://shop.garena.my/app/100067/idlogin")
    time.sleep(2)
    
    # Fill Player ID
    inp = page.ele('tag:input')
    if inp:
        inp.click()
        inp.clear()
        inp.input(f"{player_id}\n", clear=True)
        print(f"✅ Player ID {player_id} submitted.", flush=True)
    
    time.sleep(2)
    
    # Check if captcha frame appeared
    captcha_frame = page.get_frame('@src:captcha-delivery')
    if captcha_frame:
        print("\n" + "="*60, flush=True)
        print("⚠️  DataDome Slider Detected!", flush=True)
        print("👉 Please slide the verification slider on your Chrome screen once!", flush=True)
        print("="*60 + "\n", flush=True)
        
        # Wait up to 30 seconds for user to slide it
        for i in range(30):
            time.sleep(1)
            cf = page.get_frame('@src:captcha-delivery')
            if not cf:
                print("🎉 Slider passed successfully!", flush=True)
                break
            # Also check if logged in
            if "channel=" in page.url and not cf:
                break
    else:
        print("✅ No captcha appeared, logged in directly!", flush=True)
        
    time.sleep(2)
    
    # Grab DataDome cookie from browser
    datadome_val = None
    for c in page.cookies():
        if c.get('name') == 'datadome':
            datadome_val = c.get('value')
            print(f"🍪 Found DataDome cookie: {datadome_val[:35]}...", flush=True)
            break
            
    if datadome_val:
        save_cookie_to_redis(datadome_val)
        
    print(f"Current page URL: {page.url}", flush=True)
    return page, datadome_val

if __name__ == "__main__":
    uid = sys.argv[1] if len(sys.argv) > 1 else "4005814084"
    harvest_and_topup(uid)
