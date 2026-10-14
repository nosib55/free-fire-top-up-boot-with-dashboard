# python_worker/run_topup_live.py
import sys
sys.stdout.reconfigure(encoding='utf-8')
import os
import time
from DrissionPage import ChromiumPage, ChromiumOptions

def execute_live_topup(uid="4005814084", serial="UPBD-P-S-04215650", pin="1337-3219-6171-2426", package="Monthly Membership"):
    print(f"\n==========================================")
    print(f"🚀 Starting Live Top-Up Automation")
    print(f"UID: {uid}")
    print(f"Package: {package}")
    print(f"Voucher Serial: {serial}")
    print(f"Voucher PIN: {pin}")
    print(f"==========================================\n", flush=True)

    profile_dir = os.path.abspath(r"f:\ff\free-fire-top-up-boot-with-dashboard\python_worker\chrome_profile")
    os.makedirs(profile_dir, exist_ok=True)

    co = ChromiumOptions()
    co.set_browser_path(r"C:\Program Files\Google\Chrome\Application\chrome.exe")
    co.set_user_data_path(profile_dir)
    co.set_argument('--no-sandbox')
    co.set_argument('--disable-blink-features=AutomationControlled')
    co.set_argument('--start-maximized')
    co.headless(False)

    page = ChromiumPage(co)
    
    # 1. Open Shop
    print("1. Opening Garena Shop...", flush=True)
    page.get("https://shop.garena.my/app/100067/idlogin")
    time.sleep(2)

    # 2. Fill Player ID
    inp = page.ele('tag:input')
    if inp:
        print(f"2. Entering Player ID: {uid}...", flush=True)
        inp.click()
        inp.input(f"{uid}\n", clear=True)
        time.sleep(1.5)

    # 3. Check for DataDome Challenge
    cf = page.get_frame('@src:captcha-delivery')
    if cf:
        print("\n" + "="*50, flush=True)
        print("⚠️ DataDome Slider Detected!", flush=True)
        print("👉 Please slide the verification slider on Chrome once...", flush=True)
        print("="*50 + "\n", flush=True)
        for _ in range(30):
            time.sleep(1)
            if not page.get_frame('@src:captcha-delivery'):
                print("🎉 Slider verification passed!", flush=True)
                break

    time.sleep(2)
    print(f"3. Authenticated page URL: {page.url}", flush=True)

    # 4. Select Package
    print(f"4. Selecting package '{package}'...", flush=True)
    pkg = page.ele(f'text:{package}') or page.ele('text:Monthly Membership') or page.ele('text:Weekly Membership')
    if pkg:
        pkg.click(by_js=True)
        print(f"✅ Clicked package: {pkg.text}", flush=True)
    else:
        print("⚠️ Package text not found directly!", flush=True)

    time.sleep(1)

    # 5. Click Proceed to Payment
    print("5. Clicking Proceed to Payment...", flush=True)
    proceed = page.ele('text:Proceed to Payment') or page.ele('text:Proceed') or page.ele('text:পেমেন্ট')
    if proceed:
        proceed.click(by_js=True)
        print("✅ Clicked Proceed!", flush=True)
    else:
        # Check primary red button
        for b in page.eles('tag:button'):
            if 'proceed' in b.text.lower() or 'pay' in b.text.lower() or 'red' in b.attr('class'):
                b.click(by_js=True)
                print(f"Clicked button: '{b.text}'", flush=True)
                break

    # 6. Wait for UniPin UniBox gateway tab/frame
    print("6. Waiting for UniPin UniBox window...", flush=True)
    time.sleep(4)

    unipin_context = None
    for tid in page.tab_ids:
        tab = page.get_tab(tid)
        print(f"   Tab: {tab.url} - {tab.title}", flush=True)
        if 'unipin' in tab.url.lower() or 'unibox' in tab.url.lower():
            unipin_context = tab
            print("   👉 Found UniPin UniBox tab!", flush=True)
            break

    if not unipin_context:
        unipin_context = page

    # Screenshot before filling voucher
    unipin_context.get_screenshot(path=r"f:\ff\free-fire-top-up-boot-with-dashboard\python_worker\unibox_screen.png")
    print("Saved unibox_screen.png", flush=True)

    # 7. Fill Voucher Serial & PIN
    clean_serial = serial.strip()
    clean_pin = pin.replace("-", "").strip()
    print(f"7. Filling Serial ({clean_serial}) and PIN ({clean_pin})...", flush=True)

    # Inspect all inputs in UniBox
    inputs = unipin_context.eles('tag:input')
    print(f"Found {len(inputs)} input fields in UniBox.", flush=True)
    
    if len(inputs) >= 2:
        # Standard UniBox has 2 inputs: Serial and PIN
        inputs[0].input(clean_serial)
        inputs[1].input(clean_pin)
        print("✅ Serial and PIN filled into inputs!", flush=True)
        
        # Click Confirm / Submit button
        submit_btn = unipin_context.ele('text:Confirm') or unipin_context.ele('text:Submit') or unipin_context.ele('@type:submit')
        if submit_btn:
            print(f"8. Clicking Submit button: '{submit_btn.text}'...", flush=True)
            submit_btn.click()
            time.sleep(4)
            unipin_context.get_screenshot(path=r"f:\ff\free-fire-top-up-boot-with-dashboard\python_worker\after_voucher_submit.png")
            print("✅ Submitted voucher! Saved after_voucher_submit.png", flush=True)
        else:
            print("⚠️ Submit button not found automatically. Inspect buttons:", flush=True)
            for b in unipin_context.eles('tag:button'):
                print(f"  Button: '{b.text}'", flush=True)
    else:
        print("Could not detect two distinct inputs. Inspecting input attributes:", flush=True)
        for i, inp in enumerate(inputs):
            print(f"  Input {i}: id={inp.attr('id')}, name={inp.attr('name')}, placeholder={inp.attr('placeholder')}", flush=True)

    print("\n🏁 Automation finished.", flush=True)

if __name__ == "__main__":
    execute_live_topup()
