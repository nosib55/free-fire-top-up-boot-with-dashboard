from DrissionPage import ChromiumPage, ChromiumOptions
import time
import random

co = ChromiumOptions()
co.set_browser_path(r"C:\Program Files\Google\Chrome\Application\chrome.exe")
co.set_argument('--no-sandbox')
co.set_argument('--lang=en-US')
co.headless(False)

page = ChromiumPage(co)
page.get("https://shop.garena.my/app/100067/idlogin")
time.sleep(2)

# Enter UID
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

# Click Login
page.run_js('''
  const btns = Array.from(document.querySelectorAll('button'));
  for (const b of btns) {
    if (b.innerText.trim() === 'Login') {
      b.click();
      break;
    }
  }
''')

print("Waiting for DataDome frame...", flush=True)
time.sleep(3)

frame = page.get_frame('@src:captcha-delivery')
if not frame:
    print("No captcha frame detected!", flush=True)
else:
    print("Found captcha frame! Searching for .slider...", flush=True)
    slider = frame.ele('.slider')
    if slider:
        print(f"Found slider element at: {slider.rect.location}, size: {slider.rect.size}", flush=True)
        target = frame.ele('.sliderTarget')
        offset = 222
        if target:
            print(f"Found target element at: {target.rect.location}", flush=True)
            offset = target.rect.location[0] - slider.rect.location[0]
            print(f"Calculated offset: {offset}", flush=True)
        
        # Human-like drag
        print(f"Dragging slider by {offset}px...", flush=True)
        slider.drag(offset, 0, duration=0.6)
        print("Drag completed! Waiting 3s...", flush=True)
        time.sleep(3)
        
        # Take screenshot of result
        page.get_screenshot(path=r"f:\ff\free-fire-top-up-boot-with-dashboard\python_worker\after_slider_drag.png")
        print("Saved after_slider_drag.png!", flush=True)
        
        # Check current cookies
        cookies = page.cookies()
        print("Cookies count:", len(cookies), flush=True)
        for c in cookies:
            if 'datadome' in c.get('name', '').lower() or 'session' in c.get('name', '').lower():
                print(f"Cookie: {c.get('name')} = {c.get('value')[:30]}... domain={c.get('domain')}", flush=True)

# Also check if logged in
time.sleep(2)
print("Page URL after drag:", page.url, flush=True)
name_el = page.ele('text:4005814084') or page.ele('@class:user-info')
print("Is user info visible:", bool(name_el), flush=True)

page.quit()
