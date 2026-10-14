from DrissionPage import ChromiumPage, ChromiumOptions
from DrissionPage.common import Actions
import time
import random
import math

def generate_human_tracks(distance):
    tracks = []
    current = 0
    # Add slight human overshoot (2-4px)
    target = distance + random.randint(2, 5)
    v = 0
    dt = 0.015
    
    while current < target:
        remaining = target - current
        if current < target * 0.6:
            # Acceleration phase
            a = random.uniform(1500, 2200)
        else:
            # Deceleration phase
            a = -random.uniform(1800, 2600)
        
        v += a * dt
        if v < 15: v = 15
        dx = v * dt
        current += dx
        
        # Human natural hand tremor on Y axis
        dy = random.choice([0, 0, 1, -1, 0])
        tracks.append((dx, dy, random.uniform(0.01, 0.02)))
    
    # Correction step (pulling back from overshoot)
    overshoot = current - distance
    if overshoot > 0:
        steps = random.randint(3, 5)
        for _ in range(steps):
            tracks.append((-overshoot / steps, 0, random.uniform(0.02, 0.035)))
            
    return tracks

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
    inp.input("4005814084\n", clear=True)

print("Waiting for captcha frame...", flush=True)
time.sleep(3)

frame = page.get_frame('@src:captcha-delivery')
if frame:
    print("Found captcha frame! Searching for slider...", flush=True)
    slider = frame.ele('.slider')
    target = frame.ele('.sliderTarget')
    
    if slider and target:
        offset = target.rect.location[0] - slider.rect.location[0]
        print(f"Slider at: {slider.rect.location}, Target at: {target.rect.location}, Offset: {offset}", flush=True)
        
        tracks = generate_human_tracks(offset)
        print(f"Generated {len(tracks)} human trajectory points.", flush=True)
        
        # Perform human action
        ac = Actions(frame)
        ac.hold(slider)
        time.sleep(random.uniform(0.1, 0.25))
        
        for dx, dy, pause in tracks:
            ac.move(int(round(dx)), dy)
            time.sleep(pause)
            
        time.sleep(random.uniform(0.15, 0.3))
        ac.release()
        print("Human drag released! Waiting 4s to check verification...", flush=True)
        time.sleep(4)
        
        page.get_screenshot(path=r"f:\ff\free-fire-top-up-boot-with-dashboard\python_worker\after_human_drag.png")
        print("Saved after_human_drag.png!")
        
        # Check if captcha frame is gone
        frame_after = page.get_frame('@src:captcha-delivery')
        print("Is captcha frame still present?:", bool(frame_after))
        print("Page URL:", page.url)

page.quit()
