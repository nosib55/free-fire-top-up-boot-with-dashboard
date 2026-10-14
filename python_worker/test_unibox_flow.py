# python_worker/test_unibox_flow.py
from DrissionPage import ChromiumPage, ChromiumOptions
import time

co = ChromiumOptions()
co.set_browser_path(r"C:\Program Files\Google\Chrome\Application\chrome.exe")
co.set_argument('--no-sandbox')
co.set_argument('--lang=en-US')
co.headless(False)

page = ChromiumPage(co)
page.get("https://shop.garena.my/app/100067/idlogin")

# 1. Login
page.ele('tag:input').input("4005814084")
btn = page.ele('text=Login')
if btn:
    btn.click(by_js=True)
time.sleep(2)
print("1. Logged in!", flush=True)

# 2. Select package
pkg = page.ele('text:Monthly Membership') or page.ele('text:Weekly Membership')
if pkg:
    pkg.click(by_js=True)
    print(f"2. Package clicked: {pkg.text}", flush=True)

time.sleep(1)

# 3. Find Proceed
proceed_el = page.ele('text:Proceed to Payment') or page.ele('text:Proceed') or page.ele('text:পেমেন্ট')
if proceed_el:
    print(f"3. Found proceed: '{proceed_el.text}', tag: {proceed_el.tag}", flush=True)
    proceed_el.click(by_js=True)
    print("Clicked proceed!", flush=True)

time.sleep(3)

print(f"4. Active URL: {page.url}", flush=True)
for tid in page.tab_ids:
    tab = page.get_tab(tid)
    print(f"   Tab: {tab.url}", flush=True)
    if 'unipin' in tab.url or 'unibox' in tab.url:
        print("   Found UniBox tab!", flush=True)
        time.sleep(2)
        inputs = tab.eles('tag:input')
        print(f"   UniBox inputs count: {len(inputs)}", flush=True)
        for inp in inputs:
            print(f"     Input name: {inp.attr('name')}, id: {inp.attr('id')}, placeholder: {inp.attr('placeholder')}", flush=True)

time.sleep(4)
page.quit()
