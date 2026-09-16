"""Standalone browser checks; requires Playwright Python and Chromium."""
from pathlib import Path
import json
import os
import shutil
from playwright.sync_api import sync_playwright
root = Path(__file__).resolve().parents[1]
results = []
with sync_playwright() as p:
    executable = os.environ.get("CHROMIUM_EXECUTABLE") or shutil.which("chromium")
    options = {"headless": True}
    if executable:
        options["executable_path"] = executable
    browser = p.chromium.launch(**options)
    for width, height in [(1280, 900), (390, 844), (320, 568)]:
        page = browser.new_page(viewport={"width": width, "height": height}, accept_downloads=True)
        errors, requests = [], []
        page.on("pageerror", lambda e: errors.append(str(e)))
        page.on("request", lambda r: requests.append(r.url))
        page.evaluate("""() => { const RealDate=Date; globalThis.Date=class extends RealDate { constructor(...args){super(...(args.length?args:['2026-09-16T12:00:00Z']));} static now(){return new RealDate('2026-09-16T12:00:00Z').getTime();} }; }""")
        page.set_content((root / "public/router-demo.html").read_text())
        page.locator("#plan").click()
        assert "Granite 4.2 3B" in page.locator("#decision").inner_text()
        page.locator("#compare").click()
        assert "B: route" in page.locator("#decision").inner_text()
        page.select_option("#scenario", "micro-local")
        page.locator("#plan").click()
        assert "blocked" in page.locator("#decision").inner_text()
        page.select_option("#scenario", "embedding")
        page.locator("#plan").click()
        assert "needs_evaluation" in page.locator("#decision").inner_text()
        page.select_option("#scenario", "exact-parser")
        page.locator("#plan").click()
        assert "ABC123" in page.locator("#decision").inner_text()
        page.select_option("#sample", "3")
        page.locator("#plan").click()
        assert "abstain" in page.locator("#decision").inner_text()
        page.locator("#prompt").fill("<img src=x onerror='window.injected=true'>")
        page.locator("#plan").click()
        assert page.evaluate("window.injected === undefined")
        page.select_option("#scenario", "extraction")
        page.locator("#budgetUsd").fill("")
        page.locator("#plan").click()
        assert "finite nonnegative" in page.locator("#error").inner_text()
        page.select_option("#scenario", "preferences")
        page.locator("#compare").click()
        assert "Claude Fable" in page.locator("#decision").inner_text()
        assert "GLM-5.3 Flash" in page.locator("#decision").inner_text()
        with page.expect_download() as event:
            page.locator("#export").click()
        data = json.loads(Path(event.value.path()).read_text())
        assert len(data["examples"]) == 116
        page.locator("#suite").click()
        assert "29 scenario plans" in page.locator("#decision").inner_text()
        assert page.evaluate("document.documentElement.scrollWidth <= innerWidth"), "Horizontal page overflow"
        assert not errors, errors
        assert not [url for url in requests if url.startswith(("http:", "https:"))], requests
        results.append({"viewport": [width, height], "checks": 14, "page_errors": errors, "network_requests": 0})
        page.close()
    browser.close()
print(json.dumps(results, indent=2))
