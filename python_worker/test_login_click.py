# python_worker/test_login_click.py
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

# Click the Login button specifically inside the login box
login_btn = page.ele('css:button.login-btn') or page.ele('css:button[type="submit"]') or page.ele('text=Login')
print(f"Found login button: {login_btn.text}, class: {login_btn.attr('class')}")
login_btn.click()
time.sleep(3)

print("Current URL:", page.url)
page.get_screenshot(path=r"f:\ff\free-fire-top-up-boot-with-dashboard\python_worker\after_login_click.png")
print("Screenshot after login click saved!")

page.quit()
