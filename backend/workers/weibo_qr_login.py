import base64
import json
import os
import sys
import time
from pathlib import Path
from urllib.parse import urlencode

from playwright.sync_api import sync_playwright


LOGIN_TIMEOUT_SECONDS = 180
POLL_INTERVAL_SECONDS = 2


def emit(payload):
    print(json.dumps(payload, ensure_ascii=False), flush=True)


def cookie_header(cookies):
    selected = {}
    for item in cookies:
        domain = item.get("domain", "").lstrip(".")
        if domain == "weibo.cn" or domain.endswith(".weibo.cn"):
            selected[item["name"]] = item["value"]
    return "; ".join(f"{name}={value}" for name, value in sorted(selected.items()))


def read_login_state(context):
    response = context.request.get("https://m.weibo.cn/api/config", timeout=15000)
    if not response.ok:
        return None
    payload = response.json()
    data = payload.get("data", {})
    if not data.get("login"):
        return None
    cookie = cookie_header(context.cookies("https://m.weibo.cn/"))
    if not cookie:
        return None
    return {
        "event": "authenticated",
        "accountId": str(data.get("uid", "")),
        "cookie": cookie,
    }


def main():
    request = json.loads(sys.stdin.read() or "{}")
    profile_dir = Path(request["profileDir"])
    profile_dir.mkdir(parents=True, exist_ok=True)
    os.chmod(profile_dir, 0o700)

    login_url = "https://passport.weibo.com/visitor/visitor?" + urlencode({
        "entry": "miniblog",
        "a": "enter",
        "domain": ".weibo.com",
        "ua": "php-sso_sdk_client-0.6.29",
        "url": "https://s.weibo.com/weibo?q=notification-manager",
    })

    with sync_playwright() as playwright:
        context = playwright.chromium.launch_persistent_context(
            str(profile_dir),
            executable_path=os.environ.get("CHROMIUM_PATH", "/usr/bin/chromium"),
            headless=True,
            locale="zh-CN",
            viewport={"width": 1280, "height": 900},
            args=["--no-sandbox", "--disable-dev-shm-usage"],
        )
        try:
            # QR login is also the account-switch/recovery path, so start clean.
            context.clear_cookies()
            page = context.pages[0] if context.pages else context.new_page()
            page.goto(login_url, wait_until="domcontentloaded", timeout=30000)
            qr = page.locator('img[src*="qr.weibo.cn"]').first
            qr.wait_for(state="visible", timeout=30000)
            qr.evaluate(
                "img => img.complete && img.naturalWidth > 20"
                " ? true"
                " : new Promise((resolve, reject) => {"
                "     img.addEventListener('load', () => resolve(true), {once: true});"
                "     img.addEventListener('error', () => reject(new Error('QR image failed to load')), {once: true});"
                "   })"
            )

            started_at = time.time()
            expires_at = started_at + LOGIN_TIMEOUT_SECONDS
            scanned_emitted = False
            qr_page_url = page.url

            current_qr_src = qr.get_attribute("src") or ""
            image_response = context.request.get(current_qr_src, timeout=15000)
            if image_response.ok and image_response.body():
                image_bytes = image_response.body()
            else:
                image_bytes = qr.screenshot(type="png")
            image = base64.b64encode(image_bytes).decode("ascii")
            emit({
                "event": "qr",
                "imageDataUrl": f"data:image/png;base64,{image}",
                "expiresAt": time.strftime(
                    "%Y-%m-%dT%H:%M:%SZ", time.gmtime(expires_at)
                ),
            })

            while time.time() < expires_at:
                login_state = read_login_state(context)
                if login_state:
                    emit(login_state)
                    return

                # A successful scan navigates the official page and destroys its old DOM.
                # Reading only the frame URL keeps that expected navigation out of the
                # login-state polling path.
                if not scanned_emitted and page.url != qr_page_url:
                    emit({"event": "scanned"})
                    scanned_emitted = True

                time.sleep(POLL_INTERVAL_SECONDS)

            emit({"event": "expired"})
        finally:
            context.close()


if __name__ == "__main__":
    try:
        main()
    except Exception as error:
        emit({"event": "error", "error": str(error)})
        sys.exit(1)
