# python_worker/test_flow.py
from DrissionPage import ChromiumPage, ChromiumOptions
import time

co = ChromiumOptions()
co.set_browser_path(r"C:\Program Files\Google\Chrome\Application\chrome.exe")
co.set_argument('--no-sandbox')
co.set_argument('--lang=en-US')
co.headless(False)

page = ChromiumPage(co)
print("1. Navigating to Garena Shop...")
page.get("https://shop.garena.my/app/100067/idlogin")

# Input UID
inp = page.ele('tag:input')
if inp:
    inp.input("4005814084")
    btn = page.ele('text=Login')
    if btn:
        btn.click()
        print("2. Logged in successfully!")

time.sleep(2)

print(f"Logged in page URL: {page.url}")

# Find Monthly Membership or target package
print("3. Looking for package...")
# Let's inspect all clickable package items
cards = page.eles('tag:li')
for c in cards:
    txt = c.text.strip().replace('\n', ' ')
    if txt:
        print(f"   Card: {txt[:50]}")

# Let's click Monthly Membership or target
target = page.ele('text:Monthly Membership') or page.ele('text:Monthly') or page.ele('text:Weekly Membership')
if target:
    print(f"Clicking package: {target.text}")
    target.click()
    time.sleep(1)

# Find Proceed to Payment
proceed = page.ele('text:Proceed to Payment') or page.ele('text:Proceed')
if proceed:
    print(f"Clicking proceed: {proceed.text}")
    proceed.click()
    time.sleep(3)

print("4. Checking tabs / frames / URL after proceed...")
print("Active URL:", page.url)
tabs = page.tab_ids
print(f"Total open tabs: {len(tabs)}")

for tid in tabs:
    tab = page.get_tab(tid)
    print(f"   Tab [{tid}]: {tab.url} - Title: {tab.title}")

time.sleep(5)
page.quit()
print("Finished flow test.")
