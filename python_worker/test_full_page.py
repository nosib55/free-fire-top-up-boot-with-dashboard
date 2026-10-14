# python_worker/test_full_page.py
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

inp = page.ele('tag:input')
inp.input("4005814084")
time.sleep(0.5)

login_btn = page.ele('text=Login')
login_btn.click()
time.sleep(2)

page.get_screenshot(path=r"f:\ff\free-fire-top-up-boot-with-dashboard\python_worker\full_garena_page.png", full_page=True)
print("Full page screenshot saved!", flush=True)

page.quit()
