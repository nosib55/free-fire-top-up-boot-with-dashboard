# python_worker/take_screenshot.py
from DrissionPage import ChromiumPage, ChromiumOptions
import time

co = ChromiumOptions()
co.set_browser_path(r"C:\Program Files\Google\Chrome\Application\chrome.exe")
co.set_argument('--no-sandbox')
co.set_argument('--lang=en-US')
co.headless(False)

page = ChromiumPage(co)
page.get("https://shop.garena.my/app/100067/idlogin")

page.ele('tag:input').input("4005814084")
btn = page.ele('text=Login')
if btn: btn.click(by_js=True)
time.sleep(3)

print("Page URL after login:", page.url, flush=True)
page.get_screenshot(path=r"f:\ff\free-fire-top-up-boot-with-dashboard\python_worker\garena_logged_in.png")
print("Screenshot saved to garena_logged_in.png!", flush=True)

# Also let's save the HTML text to a file so we can view it
with open(r"f:\ff\free-fire-top-up-boot-with-dashboard\python_worker\garena_page.html", "w", encoding="utf-8") as f:
    f.write(page.html)
print("HTML saved to garena_page.html!", flush=True)

page.quit()
