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
print("Page text snippet:", page.html[:500])
is_blocked = "Access is temporarily restricted" in page.html or "blocked" in page.title.lower()
print("Is IP Blocked right now?:", is_blocked)

page.quit()
