import json
import os
import sys
from pathlib import Path

from playwright.sync_api import sync_playwright


def parse_cookie_header(raw_cookie):
    cookies = []
    for item in raw_cookie.split(";"):
        name, separator, value = item.strip().partition("=")
        if separator and name:
            cookies.append({
                "name": name,
                "value": value,
                "domain": ".weibo.cn",
                "path": "/",
                "secure": True,
            })
    return cookies


def cookie_header(cookies):
    selected = {}
    for item in cookies:
        domain = item.get("domain", "").lstrip(".")
        if domain == "weibo.cn" or domain.endswith(".weibo.cn"):
            selected[item["name"]] = item["value"]
    return "; ".join(f"{name}={value}" for name, value in sorted(selected.items()))


def main():
    request = json.loads(sys.stdin.read() or "{}")
    profile_dir = Path(request["profileDir"])
    profile_dir.mkdir(parents=True, exist_ok=True)
    os.chmod(profile_dir, 0o700)

    with sync_playwright() as playwright:
        context = playwright.chromium.launch_persistent_context(
            str(profile_dir),
            executable_path=os.environ.get("CHROMIUM_PATH", "/usr/bin/chromium"),
            headless=True,
            locale="zh-CN",
            args=["--no-sandbox", "--disable-dev-shm-usage"],
        )
        try:
            existing = context.cookies("https://m.weibo.cn/")
            if not any(item.get("name") == "SUB" for item in existing):
                initial_cookie = request.get("initialCookie", "")
                if initial_cookie:
                    context.add_cookies(parse_cookie_header(initial_cookie))

            page = context.pages[0] if context.pages else context.new_page()
            response = page.goto(
                "https://m.weibo.cn/api/config",
                wait_until="domcontentloaded",
                timeout=30000,
            )
            payload = json.loads(page.locator("body").inner_text())
            data = payload.get("data", {})
            authenticated = bool(response and response.ok and data.get("login"))
            cookies = context.cookies("https://m.weibo.cn/")
            result = {
                "authenticated": authenticated,
                "accountId": str(data.get("uid", "")),
                "cookie": cookie_header(cookies) if authenticated else "",
                "httpStatus": response.status if response else None,
            }
            print(json.dumps(result, ensure_ascii=False))
        finally:
            context.close()


if __name__ == "__main__":
    try:
        main()
    except Exception as error:
        print(json.dumps({"error": str(error)}, ensure_ascii=False))
        sys.exit(1)
