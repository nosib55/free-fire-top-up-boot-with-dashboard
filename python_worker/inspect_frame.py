from DrissionPage import ChromiumPage, ChromiumOptions
import time

co = ChromiumOptions()
co.set_browser_path(r"C:\Program Files\Google\Chrome\Application\chrome.exe")
co.set_argument('--no-sandbox')
co.set_argument('--lang=en-US')
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
    print("Found captcha frame!", flush=True)
    print("Frame HTML length:", len(frame.html), flush=True)
    # Save frame HTML
    with open(r"f:\ff\free-fire-top-up-boot-with-dashboard\python_worker\datadome_frame.html", "w", encoding="utf-8") as f:
        f.write(frame.html)
    print("Saved datadome_frame.html", flush=True)
else:
    print("Frame NOT found!", flush=True)

page.quit()
