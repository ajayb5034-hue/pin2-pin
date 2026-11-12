import re
import subprocess
import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
APP_JS = ROOT / "frontend" / "static" / "js" / "app.js"


class FrontendLinkSafetyTests(unittest.TestCase):
    def test_external_url_helper_rejects_non_http_schemes(self):
        source = APP_JS.read_text(encoding="utf-8")
        match = re.search(
            r"function safeExternalUrl\(value\) \{.*?^\}",
            source,
            flags=re.MULTILINE | re.DOTALL,
        )
        self.assertIsNotNone(match, "safeExternalUrl helper is missing")

        checks = """
const assert = require("node:assert/strict");
assert.equal(safeExternalUrl("javascript:alert(1)"), "");
assert.equal(safeExternalUrl("data:text/html,hi"), "");
assert.equal(safeExternalUrl("//example.com/path"), "");
assert.equal(safeExternalUrl("https://example.com/path"), "https://example.com/path");
assert.equal(safeExternalUrl("http://example.com/path"), "http://example.com/path");
"""
        result = subprocess.run(
            ["node", "-e", match.group(0) + "\n" + checks],
            cwd=ROOT,
            capture_output=True,
            text=True,
            check=False,
        )
        self.assertEqual(result.returncode, 0, result.stderr)


if __name__ == "__main__":
    unittest.main()
