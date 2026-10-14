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

print("Waiting for popup...", flush=True)
time.sleep(3)

# Check iframes
iframes = page.eles('tag:iframe')
print(f"Total iframes: {len(iframes)}", flush=True)
for i, f in enumerate(iframes):
    print(f"iframe {i}: src={f.attr('src')}, id={f.attr('id')}, class={f.attr('class')}", flush=True)

# Check elements with slider or datadome
all_eles = page.eles('@class:slider')
print("Class slider elements:", len(all_eles), flush=True)

# Also check text "Slide right"
slide_text = page.ele('text:Slide right to secure your access')
if slide_text:
    print("Found text el:", slide_text.tag, slide_text.parent().html, flush=True)

page.quit()
