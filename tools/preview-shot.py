"""
Makes assets/preview.png: the picture of the database on the homepage
("Search real outcomes"). It's the real database page (filters + cards),
captured as an image, so nobody can use the filters yet.

    pip install playwright        (once; it needs a Chromium browser)
    python3 tools/preview-shot.py entries.json

entries.json is a list of graduate entries, exactly as the Google script returns
them from  <SHEETS_API_URL>?action=entries  (the "entries" array), e.g.
    [{"study_level": "Bachelor", "course_name": "Bachelor of Nursing",
      "university": "UNSW Sydney", "graduation_year": 2021, "student_type": "Domestic",
      "time_to_first_job": "Under 3 months", "first_role": "Graduate Nurse",
      "starting_salary": 72000, "current_role": "Registered Nurse", "current_salary": 88000}]
The first 4 are shown, the first one opened up. Run node tools/release.mjs afterwards.
"""
import asyncio, functools, http.server, json, pathlib, re, sys, threading
from playwright.async_api import async_playwright

ROOT = pathlib.Path(__file__).resolve().parent.parent
OUT = ROOT / "assets" / "preview.png"
FAKE_API = "https://preview.invalid/exec"
CARDS = 4


def serve():
    class Quiet(http.server.SimpleHTTPRequestHandler):
        def log_message(self, *args):
            pass
    handler = functools.partial(Quiet, directory=str(ROOT))
    srv = http.server.ThreadingHTTPServer(("127.0.0.1", 0), handler)
    threading.Thread(target=srv.serve_forever, daemon=True).start()
    return srv


async def main(entries):
    srv = serve()
    base = f"http://127.0.0.1:{srv.server_port}/"
    async with async_playwright() as p:
        browser = await p.chromium.launch()
        page = await browser.new_page(viewport={"width": 1240, "height": 900}, device_scale_factor=2)

        async def config(route):  # point the site at the fake API below
            r = await route.fetch()
            body = re.sub(r'SHEETS_API_URL:\s*"[^"]*"', f'SHEETS_API_URL: "{FAKE_API}"', await r.text())
            await route.fulfill(response=r, body=body)
        await page.route("**/js/config.js*", config)
        await page.route(FAKE_API + "*", lambda route: route.fulfill(
            status=200, content_type="application/json", body=json.dumps({"ok": True, "entries": entries[:CARDS]})))

        # Unlocked, notice already seen, nothing cached.
        await page.add_init_script("""try { sessionStorage.clear();
            localStorage.setItem('rou_unlocked', 'true'); localStorage.setItem('rou_notice_ok', '1'); } catch (e) {}""")
        await page.goto(base + "database.html")
        await page.wait_for_selector("#entries .entry")
        await page.add_style_tag(content="#status, #more, .entry-age { display: none !important; } .db-panel { border: 0 !important; box-shadow: none !important; }")
        first = page.locator("#entries .entry").first
        await first.locator(".entry-toggle").click()
        await page.wait_for_timeout(300)
        await page.locator(".db-panel").screenshot(path=str(OUT))
        box = await page.locator(".db-panel").bounding_box()
        await browser.close()
    srv.shutdown()

    # Keep the <img> size in index.html in step with the picture (no layout jump).
    w, h = round(box["width"]), round(box["height"])
    index = ROOT / "index.html"
    html = re.sub(r'(src="assets/preview\.png(?:\?v=\w+)?" )width="\d+" height="\d+"',
                  rf'\1width="{w}" height="{h}"', index.read_text())
    index.write_text(html)
    print(f"Saved {OUT.relative_to(ROOT)} ({w}x{h}).")


if __name__ == "__main__":
    if len(sys.argv) != 2:
        sys.exit(__doc__)
    data = json.loads(pathlib.Path(sys.argv[1]).read_text())
    asyncio.run(main(data["entries"] if isinstance(data, dict) else data))
