"""
Makes assets/preview.png: the picture of the database on the homepage
("Search real outcomes"). It's the real database page (filters + cards),
captured as an image, so nobody can use the filters yet.

    pip install playwright        (once; it needs a Chromium browser)
    python3 tools/preview-shot.py entries.json

entries.json is a list of graduate entries in the shape the database function
public_entries() returns (its "entries" array), e.g.
    [{"study_level": "Bachelor", "course_name": "Bachelor of Nursing",
      "university": "UNSW Sydney", "graduation_year": 2021, "student_type": "Domestic",
      "time_to_first_job": "Under 3 months", "first_role": "Graduate Nurse",
      "starting_salary": 72000, "current_role": "Registered Nurse", "current_salary": 88000}]
The first 4 are shown, the first one opened up, each with a fresh-looking
"Submitted … ago" label (see AGO_MINUTES). Run node tools/release.mjs afterwards.
"""
import asyncio, time, functools, http.server, json, pathlib, re, sys, threading
from playwright.async_api import async_playwright

ROOT = pathlib.Path(__file__).resolve().parent.parent
OUT = ROOT / "assets" / "preview.png"
CARDS = 4
# The picture is frozen, so its "Submitted … ago" labels are too. Entries without a
# "submitted" time (ms) get these, in minutes before now: 2 min, 18 min, 1 hour, 3 hours.
AGO_MINUTES = [2, 18, 60, 180]


def serve():
    class Quiet(http.server.SimpleHTTPRequestHandler):
        def log_message(self, *args):
            pass
    handler = functools.partial(Quiet, directory=str(ROOT))
    srv = http.server.ThreadingHTTPServer(("127.0.0.1", 0), handler)
    threading.Thread(target=srv.serve_forever, daemon=True).start()
    return srv


async def main(entries):
    now = int(time.time() * 1000)
    entries = [dict(e, submitted=e.get("submitted") or now - AGO_MINUTES[i % len(AGO_MINUTES)] * 60_000)
               for i, e in enumerate(entries[:CARDS])]
    srv = serve()
    base = f"http://127.0.0.1:{srv.server_port}/"
    async with async_playwright() as p:
        browser = await p.chromium.launch()
        page = await browser.new_page(viewport={"width": 1240, "height": 900}, device_scale_factor=2)

        # Stand-in database: a signed-in contributor, and these entries.
        answers = {
            "my_profile": {"signed_in": True, "contributed": True, "email": "preview@example.com"},
            "filter_options": [{"level": e["study_level"], "course": e["course_name"]} for e in entries],
            "public_entries": {"total": len(entries), "entries": entries},
        }
        async def rpc(route):
            name = route.request.url.rsplit("/", 1)[-1]
            await route.fulfill(status=200, content_type="application/json", body=json.dumps(answers.get(name)))
        await page.route("**/rest/v1/rpc/*", rpc)

        # Signed in (a fake session that never expires), notice already seen.
        session = json.dumps({"access_token": "preview", "refresh_token": "preview", "expires_at": 9_999_999_999,
                              "user": {"id": "preview", "email": "preview@example.com", "name": "Preview"}})
        await page.add_init_script(f"""try {{ localStorage.setItem('rou_session', {json.dumps(session)});
            localStorage.setItem('rou_notice_ok', '1'); }} catch (e) {{}}""")
        await page.goto(base + "database.html")
        await page.wait_for_selector("#entries .entry")
        await page.add_style_tag(content=".site-header, #status, #more { display: none !important; } .db-panel { border: 0 !important; box-shadow: none !important; }")
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
