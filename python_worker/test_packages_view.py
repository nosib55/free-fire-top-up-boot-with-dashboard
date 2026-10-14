# python_worker/test_packages_view.py
from DrissionPage import ChromiumPage, ChromiumOptions
import time

co = ChromiumOptions()
co.set_browser_path(r"C:\Program Files\Google\Chrome\Application\chrome.exe")
co.set_argument('--no-sandbox')
co.set_argument('--lang=en-US')
co.headless(False)

page = ChromiumPage(co)
page.get("https://shop.garena.my/app/100067/idlogin")
time.sleep(2)

# Input UID
inp = page.ele('tag:input')
inp.input("4005814084")
time.sleep(0.5)

login_btn = page.ele('text=Login')
login_btn.click()
time.sleep(2)

# Scroll down to see packages
page.scroll.down(600)
time.sleep(1)

page.get_screenshot(path=r"f:\ff\free-fire-top-up-boot-with-dashboard\python_worker\packages_view.png")
print("Packages view saved!", flush=True)

page.quit()
