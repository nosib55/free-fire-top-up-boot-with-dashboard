# python_worker/test_login_flow.py
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

page = ChromiumPage(co)
page.get("https://shop.garena.my/?app=100067&channel=202953")
time.sleep(2)

print("Finding Player ID input...")
inp = page.ele('tag:input')
if inp:
    print("Typing 4005814084...")
    inp.input("4005814084\n", clear=True)
    time.sleep(2)

# Check if captcha appeared
cf = page.get_frame('@src:captcha-delivery')
print("Captcha appeared?:", bool(cf))

time.sleep(2)
page.get_screenshot(path=r"f:\ff\free-fire-top-up-boot-with-dashboard\python_worker\after_uid_submit.png")
print("Saved after_uid_submit.png")

page.quit()
