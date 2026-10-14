# python_worker/inspect_payment.py
from DrissionPage import ChromiumPage, ChromiumOptions
import time

co = ChromiumOptions()
co.set_browser_path(r"C:\Program Files\Google\Chrome\Application\chrome.exe")
co.set_argument('--no-sandbox')
co.set_argument('--lang=en-US')
co.headless(False)

page = ChromiumPage(co)
page.get("https://shop.garena.my/app/100067/idlogin")

inp = page.ele('tag:input')
if inp:
    inp.input("4005814084")
    btn = page.ele('text=Login')
    if btn: btn.click()

time.sleep(2)

# Click Monthly Membership
target = page.ele('text:Monthly Membership')
if target:
    target.click()
    print("Clicked Monthly Membership!", flush=True)

time.sleep(1)

# List all payment channels or buttons
print("=== All Buttons on Page ===", flush=True)
for b in page.eles('tag:button'):
    print(f"Button: '{b.text}'", flush=True)

for a in page.eles('tag:a'):
    txt = a.text.strip()
    if txt and ('payment' in txt.lower() or 'proceed' in txt.lower() or 'unipin' in txt.lower()):
        print(f"Link: '{txt}' -> href: {a.attr('href')}", flush=True)

# List payment channels
print("=== Payment Channels ===", flush=True)
for ch in page.eles('@class:channel'):
    print("Channel:", ch.text.replace('\n', ' ')[:60], flush=True)

time.sleep(2)
page.quit()
