from DrissionPage import ChromiumPage, ChromiumOptions

co = ChromiumOptions()
co.set_browser_path(r"C:\Program Files\Google\Chrome\Application\chrome.exe")
co.set_argument('--no-sandbox')
co.set_argument('--disable-blink-features=AutomationControlled')
co.set_argument('--user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/133.0.0.0 Safari/537.36')
co.headless(False)

page = ChromiumPage(co)
page.get("https://shop.garena.my/app/100067/idlogin")

# Check webdriver property
res = page.run_js("return { webdriver: navigator.webdriver, userAgent: navigator.userAgent, plugins: navigator.plugins.length }")
print("Navigator stats:", res)
page.quit()
