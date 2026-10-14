# python_worker/test_unipin_flow.py
import sys
sys.stdout.reconfigure(encoding='utf-8')
import os
import time
from DrissionPage import ChromiumPage, ChromiumOptions

profile_dir = os.path.abspath(r"f:\ff\free-fire-top-up-boot-with-dashboard\python_worker\chrome_profile")

co = ChromiumOptions()
co.set_browser_path(r"C:\Program Files\Google\Chrome\Application\chrome.exe")
co.set_user_data_path(profile_dir)
co.set_argument('--no-sandbox')
co.set_argument('--disable-blink-features=AutomationControlled')
co.set_argument('--start-maximized')
co.headless(False)

start_t = time.time()
page = ChromiumPage(co)
print("1. Opening Shop...", flush=True)
page.get("https://shop.garena.my/?app=100067&channel=202953")
time.sleep(2)

print("Page URL:", page.url, flush=True)

# 2. Select Monthly Membership
print("2. Selecting Monthly Membership...", flush=True)
monthly = page.ele('text:Monthly Membership')
if monthly:
    monthly.click()
    print("✅ Clicked Monthly Membership", flush=True)
else:
    print("❌ Monthly Membership not found!", flush=True)

time.sleep(1)

# 3. Look for Proceed to Payment
print("3. Looking for Proceed / Payment button...", flush=True)
page.get_screenshot(path=r"f:\ff\free-fire-top-up-boot-with-dashboard\python_worker\before_proceed.png")

# Let's inspect all buttons
for b in page.eles('tag:button'):
    txt = b.text.strip().replace('\n', ' ')
    if txt:
        print(f"  Button: '{txt}' -> class: {b.attr('class')}", flush=True)

# Look for proceed / submit
proceed = page.ele('text:Proceed to Payment') or page.ele('text:পেমেন্ট') or page.ele('text:Proceed')
if proceed:
    print(f"✅ Found proceed button: '{proceed.text}', clicking...", flush=True)
    proceed.click()
else:
    # Try the red button in section 2
    red_btns = page.eles('@class:bg-primary-red')
    for rb in red_btns:
        print(f"  Red button: '{rb.text}'", flush=True)
        if 'proceed' in rb.text.lower() or 'login' not in rb.text.lower():
            rb.click()
            print("Clicked red button!", flush=True)
            break

time.sleep(3)
print("Active tabs count:", len(page.tab_ids), flush=True)
for tid in page.tab_ids:
    t = page.get_tab(tid)
    print(f"  Tab {tid}: {t.url} (Title: {t.title})", flush=True)

page.get_screenshot(path=r"f:\ff\free-fire-top-up-boot-with-dashboard\python_worker\after_proceed.png")
print("Saved after_proceed.png", flush=True)
elapsed = round((time.time() - start_t) * 1000)
print(f"Total time so far: {elapsed}ms", flush=True)

page.quit()
