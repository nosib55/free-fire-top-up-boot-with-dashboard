# python_worker/smart_topup.py
import sys
sys.stdout.reconfigure(encoding='utf-8')
import os
import time
from DrissionPage import ChromiumPage, ChromiumOptions

def run_smart_topup():
    uid = "4005814084"
    serial = "UPBD-P-S-04215650"
    pin = "1337-3219-6171-2426"

    print("="*55)
    print("🔥 SMART TOP-UP AUTOMATION ENGINE")
    print(f"UID: {uid}")
    print(f"Voucher: {serial} | PIN: {pin}")
    print("="*55, flush=True)

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
    page.get("https://shop.garena.my/app/100067/idlogin")
    time.sleep(2)

    # 1. Enter Player ID
    inp = page.ele('tag:input')
    if inp:
        print("1. Submitting Player ID...", flush=True)
        inp.click()
        inp.input(f"{uid}\n", clear=True)

    # 2. Monitor Login Success
    print("\n⏳ Monitoring authentication...", flush=True)
    print("👉 If DataDome slider appears on your Chrome screen, please slide it cleanly.", flush=True)
    print("Waiting up to 90 seconds...", flush=True)

    logged_in = False
    for sec in range(90):
        time.sleep(1)
        # Check if login modal closed or user profile visible
        # When logged in, player name appears or section 1 changes
        body_text = page.html
        if 'Proceed to Payment' in body_text or 'পেমেন্ট' in body_text:
            logged_in = True
            print(f"✅ Logged in successfully after {sec}s!", flush=True)
            break
            
        # Check if player ID is acknowledged and no active slider
        frame = page.get_frame('@src:captcha-delivery')
        if frame:
            # Check if captcha passed attribute is true
            passed_el = frame.ele('#analyticsCaptchaPassed')
            if passed_el and passed_el.attr('data-analytics-captcha-passed') == 'true':
                print(f"✅ Captcha solved! (sec {sec})", flush=True)
                time.sleep(2)
                logged_in = True
                break
                
        # Also check if package section is active
        monthly_btn = page.ele('text:Monthly Membership')
        if monthly_btn and not frame:
            logged_in = True
            print("✅ Shop packages active and no captcha!", flush=True)
            break

    # 3. Select Monthly Membership
    print("\n3. Selecting Monthly Membership...", flush=True)
    time.sleep(1)
    pkg = page.ele('text:Monthly Membership') or page.ele('text:Weekly Membership')
    if pkg:
        pkg.click(by_js=True)
        print(f"✅ Clicked: {pkg.text}", flush=True)

    time.sleep(1.5)

    # 4. Click Proceed to Payment
    print("4. Clicking Proceed to Payment...", flush=True)
    proceed = page.ele('text:Proceed to Payment') or page.ele('text:Proceed')
    if proceed:
        proceed.click(by_js=True)
        print("✅ Clicked Proceed to Payment button!", flush=True)
    else:
        # Check all buttons
        for b in page.eles('tag:button'):
            t = b.text.strip().lower()
            if 'proceed' in t or 'payment' in t:
                b.click(by_js=True)
                print(f"✅ Clicked button: {b.text}", flush=True)
                break

    # 5. Handle UniPin Gateway
    print("\n5. Connecting to UniPin UniBox gateway...", flush=True)
    time.sleep(4)

    unipin = None
    for tid in page.tab_ids:
        t = page.get_tab(tid)
        if 'unipin' in t.url.lower() or 'unibox' in t.url.lower():
            unipin = t
            break

    target_tab = unipin if unipin else page
    print(f"Target Gateway URL: {target_tab.url}", flush=True)
    target_tab.get_screenshot(path=r"f:\ff\free-fire-top-up-boot-with-dashboard\python_worker\smart_gateway.png")

    # 6. Fill Voucher
    clean_serial = serial.strip()
    clean_pin = pin.replace("-", "").strip()
    inputs = target_tab.eles('tag:input')
    print(f"Detected {len(inputs)} inputs in gateway.", flush=True)
    
    if len(inputs) >= 2:
        inputs[0].input(clean_serial)
        inputs[1].input(clean_pin)
        print(f"✅ Filled Serial: {clean_serial} | PIN: {clean_pin}", flush=True)
        
        # Submit
        confirm = target_tab.ele('text:Confirm') or target_tab.ele('text:Submit') or target_tab.ele('@type:submit')
        if confirm:
            print("🚀 Submitting payment confirmation...", flush=True)
            confirm.click()
            time.sleep(4)
            target_tab.get_screenshot(path=r"f:\ff\free-fire-top-up-boot-with-dashboard\python_worker\smart_result.png")
            print("📸 Final screenshot saved: smart_result.png", flush=True)

    print("\n🎉 Process completed.", flush=True)

if __name__ == "__main__":
    run_smart_topup()
