# python_worker/test_step_by_step.py
import sys
sys.stdout.reconfigure(encoding='utf-8')
import time
from DrissionPage import ChromiumPage, ChromiumOptions

co = ChromiumOptions()
co.set_browser_path(r"C:\Program Files\Google\Chrome\Application\chrome.exe")
co.set_argument('--no-sandbox')
co.set_argument('--disable-blink-features=AutomationControlled')
co.set_argument('--start-maximized')
co.headless(False)

page = ChromiumPage(co)
page.get("https://shop.garena.my/app/100067/idlogin")
time.sleep(2)

print("Page URL:", page.url)

# If on login page, fill UID
if 'idlogin' in page.url or page.ele('tag:input'):
    inp = page.ele('tag:input')
    if inp:
        print("Typing UID 4005814084...")
        inp.input("4005814084\n", clear=True)
        time.sleep(2)

# Check for slider
cf = page.get_frame('@src:captcha-delivery')
if cf:
    print("Captcha detected, waiting...")
    for _ in range(15):
        time.sleep(1)
        if not page.get_frame('@src:captcha-delivery'):
            break

time.sleep(2)
print("URL after login:", page.url)
page.get_screenshot(path=r"f:\ff\free-fire-top-up-boot-with-dashboard\python_worker\step1_login.png")

# Click Monthly Membership
monthly = page.ele('text:Monthly Membership')
if monthly:
    print("Clicking Monthly Membership...")
    monthly.click()
    time.sleep(1.5)

page.get_screenshot(path=r"f:\ff\free-fire-top-up-boot-with-dashboard\python_worker\step2_pkg_clicked.png")

# Look for Proceed button
btns = page.eles('tag:button')
for b in btns:
    txt = b.text.strip().replace('\n', ' ')
    if txt:
        print(f"Button: '{txt}' -> class: {b.attr('class')}")

page.quit()
