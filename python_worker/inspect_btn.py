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
    inp.input("4005814084")
    time.sleep(0.5)

btns = page.eles('tag:button')
for b in btns:
    if 'Login' in b.text:
        print(f"Button text: '{b.text}', class: '{b.attr('class')}', disabled: '{b.attr('disabled')}', tag: '{b.tag}'")
        print("HTML:", b.html)

page.quit()
