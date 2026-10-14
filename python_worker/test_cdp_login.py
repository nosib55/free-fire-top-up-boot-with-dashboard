from DrissionPage import ChromiumPage, ChromiumOptions
import time

co = ChromiumOptions()
co.set_browser_path(r"C:\Program Files\Google\Chrome\Application\chrome.exe")
co.set_argument('--no-sandbox')
co.set_argument('--disable-blink-features=AutomationControlled')
co.headless(False)

page = ChromiumPage(co)
page.get("https://shop.garena.my/app/100067/idlogin")
time.sleep(2)

print("Starting real user simulation...")

# 1. Real CDP click on input
inp = page.ele('tag:input')
if inp:
    print("Found input, clicking with CDP...")
    inp.click()
    time.sleep(0.3)
    print("Typing UID with CDP...")
    inp.input("4005814084")
    time.sleep(0.5)

# 2. Real CDP click on Login button
btn = page.ele('text=Login')
if btn:
    print("Found Login button, clicking with real CDP mouse click...")
    btn.click() # Real CDP mouse click (isTrusted = true)

print("Waiting 4s to observe outcome...")
time.sleep(4)

print("Current URL:", page.url)

# Check if captcha frame appeared
captcha_frame = page.get_frame('@src:captcha-delivery')
print("Did captcha appear?:", bool(captcha_frame))

# Check if player name or packages appeared
page.get_screenshot(path=r"f:\ff\free-fire-top-up-boot-with-dashboard\python_worker\cdp_login_result.png")
print("Saved cdp_login_result.png")

page.quit()
