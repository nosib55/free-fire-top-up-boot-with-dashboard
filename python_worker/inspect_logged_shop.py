from DrissionPage import ChromiumPage, ChromiumOptions
import time
import os

profile_dir = os.path.abspath(r"f:\ff\free-fire-top-up-boot-with-dashboard\python_worker\chrome_profile")

co = ChromiumOptions()
co.set_browser_path(r"C:\Program Files\Google\Chrome\Application\chrome.exe")
co.set_user_data_path(profile_dir)
co.set_argument('--no-sandbox')
co.set_argument('--disable-blink-features=AutomationControlled')
co.headless(False)

page = ChromiumPage(co)
page.get("https://shop.garena.my/?app=100067&channel=202953")
time.sleep(3)

print("Title:", page.title)
print("URL:", page.url)
page.get_screenshot(path=r"f:\ff\free-fire-top-up-boot-with-dashboard\python_worker\logged_in_shop.png")

# Look for user info or packages
user_info = page.ele('@class:user-info') or page.ele('@class:player-name') or page.ele('text:4005814084')
print("User info found:", user_info.text if user_info else "None")

# Look for packages
monthly = page.ele('text:Monthly Membership')
print("Monthly membership found:", bool(monthly))

page.quit()
