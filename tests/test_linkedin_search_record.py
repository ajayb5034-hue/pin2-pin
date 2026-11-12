import unittest

from backend import main


class LinkedInSearchRecordTests(unittest.TestCase):
    def test_extracts_public_email_from_search_evidence(self):
        record = main._linkedin_search_result_record({
            "title": "John Doe - Prop Trader | LinkedIn",
            "url": "https://www.linkedin.com/in/john-doe/",
            "content": "Proprietary trader. Public contact: john@example.org.",
        }, "trader")

        self.assertIsNotNone(record)
        self.assertEqual(record["public_email"], "john@example.org")

    def test_rejects_ambiguous_or_non_https_profile_urls(self):
        base = {
            "title": "John Doe - Prop Trader | LinkedIn",
            "content": "Proprietary trader.",
        }
        for url in (
            "http://linkedin.com/in/john-doe/",
            "https://linkedin.com.evil.example/in/john-doe/",
            "https://linkedin.com@evil.example/in/john-doe/",
            "https://linkedin.com:443/in/john-doe/",
            "https://linkedin.com/in/john-doe/extra",
        ):
            with self.subTest(url=url):
                self.assertIsNone(main._linkedin_search_result_record({**base, "url": url}, "trader"))


if __name__ == "__main__":
    unittest.main()
