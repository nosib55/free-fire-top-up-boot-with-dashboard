# python_worker/find_proceed.py
import sys
sys.stdout.reconfigure(encoding='utf-8')
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
time.sleep(2)

pkg = page.ele('text:Monthly Membership')
if pkg:
    pkg.click(by_js=True)

time.sleep(1)

print("=== Elements with text containing 'proceed' or 'pay' ===", flush=True)
for el in page.eles('tag:*'):
    try:
        t = el.text.strip()
        if t and len(t) < 40:
            tl = t.lower()
            if any(w in tl for w in ['proceed', 'pay', 'confirm', 'payment']):
                print(f"Match: tag={el.tag}, class={el.attr('class')}, text='{t}'", flush=True)
    except:
        pass

page.quit()
