from DrissionPage import ChromiumPage, ChromiumOptions
import time
import os

profile_dir = os.path.abspath(r"f:\ff\free-fire-top-up-boot-with-dashboard\python_worker\chrome_profile")
os.makedirs(profile_dir, exist_ok=True)

co = ChromiumOptions()
co.set_browser_path(r"C:\Program Files\Google\Chrome\Application\chrome.exe")
co.set_user_data_path(profile_dir)
co.set_argument('--no-sandbox')
co.set_argument('--disable-blink-features=AutomationControlled')
co.headless(False)

page = ChromiumPage(co)
page.get("https://shop.garena.my/app/100067/idlogin")
time.sleep(2)

print("Page loaded with persistent profile. Title:", page.title)
print("Current URL:", page.url)

page.quit()
