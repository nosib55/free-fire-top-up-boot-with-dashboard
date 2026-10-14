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

inp = page.ele('tag:input')
if inp:
    inp.click()
    inp.clear()
    # Type with human typing speed and press Enter
    inp.input("4005814084\n", clear=True)
    print("Typed UID and pressed Enter!", flush=True)

time.sleep(3)
print("URL:", page.url)
page.get_screenshot(path=r"f:\ff\free-fire-top-up-boot-with-dashboard\python_worker\after_enter_press.png")

# Check if iframe appeared
captcha_frame = page.get_frame('@src:captcha-delivery')
print("Did captcha appear?:", bool(captcha_frame))

# Check nickname or user info
user_info = page.ele('@class:user-info') or page.ele('@class:player-name')
print("User info text:", user_info.text if user_info else "None")

page.quit()
