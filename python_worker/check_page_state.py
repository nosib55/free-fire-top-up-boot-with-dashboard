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

print("Current URL:", page.url)
page.get_screenshot(path=r"f:\ff\free-fire-top-up-boot-with-dashboard\python_worker\current_state.png")

page.run_js('''
  const inp = document.querySelector('input');
  if (inp) {
    inp.focus();
    inp.value = "4005814084";
    inp.dispatchEvent(new Event('input', { bubbles: true }));
    inp.dispatchEvent(new Event('change', { bubbles: true }));
  }
''')
time.sleep(0.5)

page.run_js('''
  const btns = Array.from(document.querySelectorAll('button'));
  for (const b of btns) {
    if (b.innerText.trim() === 'Login') {
      b.click();
      break;
    }
  }
''')

time.sleep(3)
print("After login click URL:", page.url)
page.get_screenshot(path=r"f:\ff\free-fire-top-up-boot-with-dashboard\python_worker\after_click_state.png")

iframes = page.eles('tag:iframe')
print(f"Total iframes: {len(iframes)}")
for i, f in enumerate(iframes):
    print(f"  iframe {i}: src={f.attr('src')}")

page.quit()
