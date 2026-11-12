import csv
import importlib.util
import json
import tempfile
import unittest
import urllib.error
from unittest.mock import patch
from pathlib import Path


SCRIPT = Path(__file__).parents[1] / "backend" / "files" / "lets-start-Engineering-rework-20261110.py"
SPEC = importlib.util.spec_from_file_location("linkedin_csv_export", SCRIPT)
exporter = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(exporter)


class LinkedInCsvExportTests(unittest.TestCase):
    def test_public_search_fetch_uses_provider_results_without_visiting_linkedin(self):
        class FakeResponse:
            def __enter__(self):
                return self

            def __exit__(self, *_args):
                return False

            def read(self):
                return b'{"results":[{"title":"Jane Doe - Trader","url":"https://www.linkedin.com/in/jane-doe/","content":"Public profile result."}]}'

        endpoint = "https://search.example/api/search"
        with patch.object(exporter.urllib.request, "urlopen", return_value=FakeResponse()) as request:
            candidates = exporter.fetch_public_results(
                "trader", limit=1, api_key="test-key", endpoint=endpoint
            )

        self.assertEqual([item["name"] for item in candidates], ["Jane Doe"])
        self.assertEqual(request.call_args.args[0].full_url, endpoint)
        self.assertEqual(request.call_args.args[0].get_header("Authorization"), "Bearer test-key")

    def test_defaults_to_no_key_public_html_search(self):
        class FakeResponse:
            def __enter__(self):
                return self

            def __exit__(self, *_args):
                return False

            def read(self):
                return (
                    b'<a class="result__a" href="https://www.linkedin.com/in/jane-doe/">'
                    b'Jane Doe - Trader</a>'
                    b'<a class="result__snippet">Public profile result.</a>'
                )

        with patch.dict("os.environ", {}, clear=True):
            with patch.object(exporter.urllib.request, "urlopen", return_value=FakeResponse()) as request:
                candidates = exporter.fetch_public_results("trader", limit=1)

        self.assertEqual([item["name"] for item in candidates], ["Jane Doe"])
        public_request = request.call_args.args[0]
        self.assertTrue(public_request.full_url.startswith(exporter.PUBLIC_SEARCH_URL))
        self.assertIn("site%3Alinkedin.com%2Fin", public_request.full_url)
        self.assertIsNone(public_request.data)
        self.assertEqual(public_request.get_header("User-agent"), "PreemptionAI/1.0")

    def test_public_html_results_include_a_citation_and_bounded_timeout(self):
        class FakeResponse:
            def __enter__(self):
                return self

            def __exit__(self, *_args):
                return False

            def read(self):
                return (
                    b'<a class="result__a" href="https://www.linkedin.com/in/jane-doe/">'
                    b'Jane Doe - Trader</a>'
                    b'<a class="result__snippet">Public profile result.</a>'
                )

        with patch.dict("os.environ", {}, clear=True):
            with patch.object(exporter.urllib.request, "urlopen", return_value=FakeResponse()) as request:
                candidates = exporter.fetch_public_results("trader", limit=1)

        self.assertEqual(candidates[0]["source_url"], candidates[0]["linkedin_profile_link"])
        self.assertEqual(candidates[0]["search_evidence"], "Public profile result.")
        self.assertEqual(request.call_args.kwargs["timeout"], exporter.REQUEST_TIMEOUT_SECONDS)
        self.assertLessEqual(exporter.REQUEST_TIMEOUT_SECONDS * exporter.MAX_PUBLIC_QUERIES, 60)

    def test_empty_public_results_return_empty_list(self):
        class FakeResponse:
            def __enter__(self):
                return self

            def __exit__(self, *_args):
                return False

            def read(self):
                return b"<html><body>No indexed results</body></html>"

        with patch.dict("os.environ", {}, clear=True):
            with patch.object(exporter.urllib.request, "urlopen", return_value=FakeResponse()):
                self.assertEqual(exporter.fetch_public_results("trader", limit=1), [])

    def test_network_and_rate_limit_failures_are_reported_without_retrying(self):
        for error in (
            urllib.error.URLError("offline"),
            urllib.error.HTTPError(exporter.PUBLIC_SEARCH_URL, 429, "Too Many Requests", {}, None),
        ):
            with self.subTest(error=type(error).__name__):
                with patch.dict("os.environ", {}, clear=True):
                    with patch.object(exporter.urllib.request, "urlopen", side_effect=error) as request:
                        with self.assertRaises(exporter.PublicSearchError) as raised:
                            progress = []
                            exporter.fetch_public_results("trader", limit=1, progress=progress.append)
                self.assertIn("no usable results", str(raised.exception))
                self.assertEqual(raised.exception.partial_results, [])
                self.assertLessEqual(request.call_count, exporter.MAX_PUBLIC_QUERIES)
                if isinstance(error, urllib.error.HTTPError):
                    self.assertIn("HTTP 429 rate limit", str(raised.exception))
                    self.assertTrue(any("HTTP 429 rate limit" in line for line in progress))

    def test_partial_candidates_survive_later_network_error(self):
        class FakeResponse:
            def __enter__(self):
                return self

            def __exit__(self, *_args):
                return False

            def read(self):
                return (
                    b'<a class="result__a" href="https://www.linkedin.com/in/jane-doe/">'
                    b'Jane Doe - Trader</a>'
                    b'<a class="result__snippet">Public profile result.</a>'
                )

        def respond(request, timeout):
            if "United+States" in request.full_url:
                return FakeResponse()
            raise urllib.error.URLError("offline")

        progress = []
        with patch.dict("os.environ", {}, clear=True):
            with patch.object(exporter.urllib.request, "urlopen", side_effect=respond):
                candidates = exporter.fetch_public_results("trader", progress=progress.append)

        self.assertEqual([item["name"] for item in candidates], ["Jane Doe"])
        self.assertTrue(any("partial candidates" in line for line in progress))

    def test_custom_search_endpoint_remains_supported(self):
        with patch.dict("os.environ", {}, clear=True):
            with patch.object(exporter.urllib.request, "urlopen") as request:
                request.side_effect = RuntimeError("test should not reach configured endpoint")
                with self.assertRaisesRegex(RuntimeError, "test should not reach configured endpoint"):
                    exporter.fetch_public_results("trader", limit=1, endpoint="https://search.example/api")
                request.assert_called_once()

    def test_default_candidate_limit_is_100(self):
        results = [
            {
                "title": f"Person {index} - Options Trader | LinkedIn",
                "url": f"https://www.linkedin.com/in/person-{index}/",
                "snippet": "Public search result for an options trader.",
            }
            for index in range(101)
        ]

        self.assertEqual(len(exporter.build_candidates(results)), 100)

    def test_parses_unicode_title_separator_without_truncating_hyphenated_name(self):
        candidate = exporter.candidate_from_result({
            "title": "Mary Smith-Jones \u2013 Options Trader | LinkedIn",
            "url": "https://www.linkedin.com/in/mary-smith-jones/",
            "snippet": "Public profile result for an options trader.",
        })

        self.assertIsNotNone(candidate)
        self.assertEqual(candidate["name"], "Mary Smith-Jones")
        self.assertEqual(candidate["linkedin_profile_link"], "https://www.linkedin.com/in/mary-smith-jones/")

    def test_filters_deduplicates_and_extracts_only_publicly_indexed_email(self):
        results = [
            {
                "title": "Alex Rivera - Options Trader | LinkedIn",
                "url": "https://www.linkedin.com/in/alex-rivera/?trk=search",
                "snippet": "Options trader. Contact alex@example.org for speaking inquiries.",
            },
            {
                "title": "Alex Rivera - Options Trader | LinkedIn",
                "url": "https://linkedin.com/in/alex-rivera/",
                "snippet": "Duplicate result.",
            },
            {
                "title": "LinkedIn people search",
                "url": "https://www.linkedin.com/search/results/people/?keywords=trader",
                "snippet": "Results page, not an individual profile.",
            },
            {
                "title": "Jane Smith - Fund Manager | LinkedIn",
                "url": "https://www.linkedin.com/in/jane-smith/",
                "snippet": "Fund manager; no email published in this result.",
            },
        ]

        candidates = exporter.build_candidates(results)

        self.assertEqual(len(candidates), 2)
        self.assertEqual(candidates[0]["linkedin_profile_link"], "https://www.linkedin.com/in/alex-rivera/")
        self.assertEqual(candidates[0]["public_email"], "alex@example.org")
        self.assertEqual(candidates[1]["public_email"], "")
        self.assertIn("manually confirm", candidates[0]["verification_status"])

    def test_export_is_excel_compatible_and_shortfall_does_not_add_filler(self):
        candidates = exporter.build_candidates([{
            "title": "Jordan Lee - Prop Trader",
            "url": "https://www.linkedin.com/in/jordan-lee/",
            "snippet": "Public search snippet about proprietary trading.",
        }], limit=2)
        self.assertEqual(len(candidates), 1)

        with tempfile.TemporaryDirectory(dir=Path(__file__).parents[1]) as temp_dir:
            path = Path(temp_dir) / "leads.csv"
            exporter.export_csv(candidates, path)
            with path.open(encoding="utf-8-sig", newline="") as handle:
                rows = list(csv.DictReader(handle))

        self.assertEqual(list(rows[0]), list(exporter.CSV_HEADERS))
        self.assertEqual(rows[0]["name"], "Jordan Lee")
        self.assertEqual(len(rows), 1)

    def test_export_neutralizes_spreadsheet_formulas_in_external_text(self):
        candidate = {
            "name": "=HYPERLINK(\"https://evil.example\",\"click\")",
            "search_evidence": "  @SUM(1,1)",
            "linkedin_profile_link": "https://www.linkedin.com/in/jane-smith/",
        }
        with tempfile.TemporaryDirectory(dir=Path(__file__).parents[1]) as temp_dir:
            path = Path(temp_dir) / "leads.csv"
            exporter.export_csv([candidate], path)
            with path.open(encoding="utf-8-sig", newline="") as handle:
                row = next(csv.DictReader(handle))

        self.assertTrue(row["name"].startswith("'="))
        self.assertEqual(row["search_evidence"], "'  @SUM(1,1)")
        self.assertEqual(row["linkedin_profile_link"], candidate["linkedin_profile_link"])

    def test_rejects_lookalike_or_ambiguous_profile_hosts(self):
        base = {
            "title": "Alex Rivera - Options Trader",
            "snippet": "Public search snippet about options trading.",
        }
        for url in (
            "https://linkedin.com.evil.example/in/alex-rivera/",
            "https://linkedin.com@evil.example/in/alex-rivera/",
            "http://linkedin.com/in/alex-rivera/",
            "https://linkedin.com:443/in/alex-rivera/",
        ):
            with self.subTest(url=url):
                self.assertIsNone(exporter.candidate_from_result({**base, "url": url}))

    def test_rejects_source_url_with_embedded_credentials(self):
        candidate = exporter.candidate_from_result({
            "title": "Alex Rivera - Options Trader",
            "url": "https://linkedin.com/in/alex-rivera/",
            "source_url": "https://user:password@search.example/result",
            "snippet": "Public search snippet about options trading.",
        })

        self.assertIsNone(candidate)

    def test_malformed_profile_urls_are_skipped_without_aborting_batch(self):
        malformed_results = [
            {
                "title": "Alex Rivera - Options Trader | LinkedIn",
                "url": "https://www.linkedin.com:99999/in/alex-rivera/",
                "snippet": "Public profile result.",
            },
            {
                "title": "Alex Rivera - Options Trader | LinkedIn",
                "url": "https://[broken/in/alex-rivera/",
                "snippet": "Public profile result.",
            },
            {
                "title": "Jane Doe - Trading Educator | LinkedIn",
                "url": "https://www.linkedin.com/in/jane-doe/",
                "snippet": "Public profile result.",
            },
        ]

        candidates = exporter.build_candidates(malformed_results)

        self.assertEqual([candidate["name"] for candidate in candidates], ["Jane Doe"])

    def test_malformed_source_url_is_rejected(self):
        candidate = exporter.candidate_from_result({
            "title": "Jane Doe - Trading Educator | LinkedIn",
            "url": "https://www.linkedin.com/in/jane-doe/",
            "source_url": "https://[broken/source",
            "snippet": "Public profile result.",
        })

        self.assertIsNone(candidate)


if __name__ == "__main__":
    unittest.main()
