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

print("Waiting for DataDome frame...", flush=True)
time.sleep(3)

frame = page.get_frame('@src:captcha-delivery')
if frame:
    audio_btn = frame.ele('#captcha__audio__button')
    if audio_btn:
        print("Clicking audio captcha button...", flush=True)
        audio_btn.click()
        time.sleep(1)
        
        # Check audio track src
        audio_el = frame.ele('tag:audio')
        print("Audio src:", audio_el.attr('src') if audio_el else "No audio tag")
        
        # Take screenshot
        page.get_screenshot(path=r"f:\ff\free-fire-top-up-boot-with-dashboard\python_worker\audio_captcha.png")
        print("Saved audio_captcha.png")

page.quit()
