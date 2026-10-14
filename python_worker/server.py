# python_worker/server.py
"""
Flask Topup Microservice
Listens on http://127.0.0.1:5050/api/topup
Allows Next.js web application to execute direct 2-second topups.
"""

from flask import Flask, request, jsonify
from topup_engine import FastTopupWorker
import threading

app = Flask(__name__)
worker = None
worker_lock = threading.Lock()

def get_worker():
    global worker
    if worker is None:
        worker = FastTopupWorker(headless=False)
    return worker

@app.route('/health', methods=['GET'])
def health():
    return jsonify({"status": "ok", "service": "Python Topup Worker"})

@app.route('/api/topup', methods=['POST'])
def handle_topup():
    data = request.get_json() or {}
    uid = data.get('uid')
    package_name = data.get('package', 'MONTHLY_MEMBERSHIP')
    voucher_serial = data.get('voucher_serial')
    voucher_pin = data.get('voucher_pin')
    
    if not uid or not voucher_serial or not voucher_pin:
        return jsonify({"success": False, "error": "Missing required fields (uid, voucher_serial, voucher_pin)"}), 400
        
    with worker_lock:
        w = get_worker()
        result = w.execute_topup(
            uid=uid,
            package_name=package_name,
            voucher_serial=voucher_serial,
            voucher_pin=voucher_pin
        )
        return jsonify(result)

if __name__ == '__main__':
    print("🚀 Starting Python Top-up Server on http://127.0.0.1:5050...", flush=True)
    app.run(host='127.0.0.1', port=5050, debug=False)
