#!/usr/bin/env python3
"""Turn public search result JSON into a sourced LinkedIn prospect CSV.

This utility deliberately does not log in to LinkedIn, fetch profile pages, or
invent rows. Feed it search results from an authorized public search provider.
Email addresses are included only when the provider's public result snippet
contains one; an empty value means no public email was found.
"""

import argparse
import csv
import json
import os
import re
from html.parser import HTMLParser
import urllib.error
import urllib.request
from collections.abc import Callable
from pathlib import Path
from urllib.parse import parse_qs, urlencode, urlsplit


CSV_HEADERS = (
    "name",
    "linkedin_profile_link",
    "public_email",
    "source_url",
    "search_evidence",
    "verification_status",
)
DEFAULT_LIMIT = 100
SEARCH_URL_ENV = "PREEMPTION_LINKEDIN_SEARCH_URL"
SEARCH_KEY_ENV = "PREEMPTION_LINKEDIN_SEARCH_API_KEY"
PUBLIC_SEARCH_URL = "https://html.duckduckgo.com/html/"
REQUEST_TIMEOUT_SECONDS = 12
MAX_PUBLIC_QUERIES = 4
EMAIL_RE = re.compile(r"\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b", re.IGNORECASE)


class PublicSearchParser(HTMLParser):
    def __init__(self):
        super().__init__()
        self.results = []
        self.active = None
        self.field = None
        self.snippet_target = None

    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        classes = set((attrs.get("class") or "").split())
        if tag == "a" and "result__a" in classes:
            self.active = {"title": "", "url": attrs.get("href", ""), "snippet": ""}
            self.field = "title"
        elif tag in ("a", "div") and "result__snippet" in classes:
            self.field = "snippet"
            self.snippet_target = self.active or (self.results[-1] if self.results else None)

    def handle_data(self, data):
        if self.active is not None and self.field == "title":
            self.active["title"] += data
        elif self.field == "snippet" and self.snippet_target is not None:
            self.snippet_target["snippet"] += data

    def handle_endtag(self, tag):
        if self.active is not None and self.field == "title" and tag == "a":
            self.results.append(self.active)
            self.active = None
            self.field = None
        elif self.field == "snippet" and tag in ("a", "div"):
            self.field = None
            self.snippet_target = None


class PublicSearchError(RuntimeError):
    """A public search failure, retaining any valid results gathered so far."""

    def __init__(self, message: str, partial_results: list[dict] | None = None):
        super().__init__(message)
        self.partial_results = partial_results or []


def candidate_from_result(result: dict) -> dict | None:
    """Return one eligible individual profile candidate from a search result."""
    profile_url = str(result.get("url") or result.get("link") or "").strip()
    try:
        parsed = urlsplit(profile_url)
        profile_host = parsed.hostname
        profile_port = parsed.port
    except ValueError:
        # Malformed IPv6 authorities and non-numeric/out-of-range ports should
        # discard only this search result, not abort processing of the batch.
        return None
    # Accept only an unambiguous HTTPS LinkedIn URL. In particular, reject
    # credentials, ports, and lookalike hosts before canonicalizing the path.
    if (
        parsed.scheme.lower() != "https"
        or profile_host not in {"linkedin.com", "www.linkedin.com"}
        or parsed.username is not None
        or parsed.password is not None
        or profile_port is not None
    ):
        return None
    match = re.fullmatch(r"/(?:in|pub)/([^/]+)/?", parsed.path, re.IGNORECASE)
    if not match:
        return None

    title = str(result.get("title") or "").strip()
    title = re.sub(r"\s*(?:\||-)\s*LinkedIn\s*$", "", title, flags=re.IGNORECASE)
    # Search providers commonly separate names from headlines with Unicode
    # en/em dashes. Split only on spaced separators so hyphenated names stay intact.
    name = re.split(r"\s+(?:\||[\u2013\u2014-])\s+", title, maxsplit=1)[0].strip()
    if len(name.split()) < 2 or name.casefold() in {"linkedin member", "linkedin user", "profile"}:
        return None

    evidence = re.sub(r"\s+", " ", str(result.get("content") or result.get("snippet") or "")).strip()
    if not evidence:
        return None
    source_url = str(result.get("source_url") or result.get("source") or profile_url).strip()
    try:
        source_parts = urlsplit(source_url)
        source_host = source_parts.hostname
    except ValueError:
        return None
    if (
        source_parts.scheme.lower() not in {"http", "https"}
        or not source_host
        or source_parts.username is not None
        or source_parts.password is not None
    ):
        return None

    return {
        "name": name,
        "linkedin_profile_link": f"https://www.linkedin.com{parsed.path.rstrip('/')}/",
        "public_email": next(iter(EMAIL_RE.findall(evidence)), ""),
        "source_url": source_url,
        "search_evidence": evidence[:700],
        "verification_status": "Public search candidate; manually confirm identity and email before outreach",
    }


def build_candidates(results: list[dict], limit: int = DEFAULT_LIMIT) -> list[dict]:
    """Filter and deduplicate sourced people; never synthesize missing results."""
    if limit < 1:
        raise ValueError("limit must be positive")
    candidates = {}
    for result in results:
        if not isinstance(result, dict):
            continue
        candidate = candidate_from_result(result)
        if candidate:
            candidates.setdefault(candidate["linkedin_profile_link"].casefold(), candidate)
            if len(candidates) >= limit:
                break
    return list(candidates.values())


def export_csv(candidates: list[dict], output_path: str | Path) -> None:
    """Write an Excel-friendly CSV, neutralizing spreadsheet formula cells."""
    with open(output_path, "w", newline="", encoding="utf-8-sig") as handle:
        writer = csv.DictWriter(handle, fieldnames=CSV_HEADERS)
        writer.writeheader()
        for candidate in candidates:
            # Search snippets are external input. Excel may execute cells whose
            # first non-whitespace character is a formula marker when opened.
            row = {
                field: _spreadsheet_safe(candidate.get(field, ""))
                for field in CSV_HEADERS
            }
            writer.writerow(row)


def fetch_public_results(
    query: str,
    limit: int = DEFAULT_LIMIT,
    api_key: str = "",
    endpoint: str = "",
    progress: Callable[[str], None] | None = None,
) -> list[dict]:
    """Fetch public search-index results without requiring an API account or key.

    An explicitly configured endpoint accepts JSON POST bodies containing
    ``query`` and ``max_results``. By default, public HTML search results are
    parsed locally.
    """
    if limit < 1:
        raise ValueError("limit must be positive")
    search_endpoint = endpoint or os.environ.get(SEARCH_URL_ENV, "")
    key = api_key or os.environ.get(SEARCH_KEY_ENV, "")
    queries = [
        f"site:linkedin.com/in {query} {area}"
        for area in ("United States", "New York", "Chicago", "Miami")
    ][:MAX_PUBLIC_QUERIES]
    found: dict[str, dict] = {}
    failures: list[str] = []
    for index, search_query in enumerate(queries, 1):
        if progress:
            progress(f"Searching public source {index}/{len(queries)}; {len(found)} distinct candidates so far.")
        headers = {}
        if search_endpoint:
            payload = json.dumps({
                "query": search_query,
                "max_results": min(20, limit),
            }).encode("utf-8")
            headers = {"Content-Type": "application/json"}
        if key:
            headers["Authorization"] = f"Bearer {key}"
        if search_endpoint:
            request = urllib.request.Request(
                search_endpoint, data=payload, headers=headers, method="POST"
            )
        else:
            request = urllib.request.Request(
                PUBLIC_SEARCH_URL + "?" + urlencode({"q": search_query}),
                headers={"User-Agent": "Pin2Pin/1.0"},
            )
        try:
            with urllib.request.urlopen(request, timeout=REQUEST_TIMEOUT_SECONDS) as response:
                response_body = response.read()
            if search_endpoint:
                data = json.loads(response_body.decode("utf-8"))
                results = data.get("results", []) if isinstance(data, dict) else data
            else:
                parser = PublicSearchParser()
                parser.feed(response_body.decode("utf-8", errors="replace"))
                results = []
                for item in parser.results:
                    result_url = item.get("url", "")
                    parsed_url = urlsplit(result_url)
                    if parsed_url.hostname and parsed_url.hostname.endswith("duckduckgo.com"):
                        result_url = parse_qs(parsed_url.query).get("uddg", [""])[0]
                    results.append({
                        "title": item.get("title", ""),
                        "url": result_url,
                        "source_url": result_url,
                        "content": item.get("snippet", ""),
                    })
        except urllib.error.HTTPError as exc:
            # Surface rate limits and other HTTP responses precisely while
            # keeping the same bounded, no-retry behavior.
            status = int(exc.code)
            label = "HTTP 429 rate limit" if status == 429 else f"HTTP {status}"
            failures.append(f"query {index}: {label}")
            if progress:
                progress(
                    f"Public search source {index}/{len(queries)} failed ({label}); "
                    "continuing within the request limit without retrying."
                )
            continue
        except (urllib.error.URLError, TimeoutError, json.JSONDecodeError, OSError) as exc:
            # Do not retry or rotate providers: continue only through this
            # bounded query set and preserve any candidates already found.
            failures.append(f"query {index}: {type(exc).__name__}")
            if progress:
                progress(f"Public search source {index}/{len(queries)} failed ({type(exc).__name__}); continuing within the request limit.")
            continue
        if not isinstance(results, list):
            continue
        for result in results:
            candidate = candidate_from_result(result) if isinstance(result, dict) else None
            if candidate:
                found.setdefault(candidate["linkedin_profile_link"].casefold(), candidate)
                if len(found) >= limit:
                    if progress:
                        progress(f"Reached requested limit of {limit} distinct candidates.")
                    return list(found.values())
        if progress:
            progress(f"Completed source {index}/{len(queries)}; {len(found)} distinct candidates so far.")
    if failures and not found:
        raise PublicSearchError(
            "Public search produced no usable results (" + "; ".join(failures) + "). "
            "The local no-key route depends on reachable public search pages and does not bypass rate limits."
        )
    if failures and progress:
        progress(f"Returning {len(found)} partial candidates; {len(failures)} source request(s) failed.")
    return list(found.values())


def _spreadsheet_safe(value: object) -> str:
    text = "" if value is None else str(value)
    if text.lstrip().startswith(("=", "+", "-", "@")):
        return "'" + text
    return text


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("input_json", nargs="?", help="JSON list of public search result objects")
    parser.add_argument("output_csv", nargs="?", default="linkedin_prospects.csv")
    parser.add_argument("--limit", type=int, default=DEFAULT_LIMIT)
    parser.add_argument("--fetch", action="store_true", help="fetch candidates from a configured API or public no-key search page")
    parser.add_argument("--query", default="professional OR founder OR trader", help="prospect topic for --fetch")
    args = parser.parse_args()

    if args.fetch:
        try:
            candidates = fetch_public_results(args.query, args.limit, progress=print)
        except PublicSearchError as exc:
            parser.error(str(exc))
    else:
        if not args.input_json:
            parser.error("provide input_json or use --fetch")
        with open(args.input_json, encoding="utf-8") as handle:
            payload = json.load(handle)
        results = payload.get("results", []) if isinstance(payload, dict) else payload
        if not isinstance(results, list):
            parser.error("input JSON must be a list or an object with a results list")
        candidates = build_candidates(results, args.limit)
    export_csv(candidates, args.output_csv)
    print(f"Exported {len(candidates)} sourced candidates to {args.output_csv}; requested limit: {args.limit}.")
    if len(candidates) < args.limit:
        print(f"Only {len(candidates)} eligible distinct profiles were provided; no filler rows were added.")
        return 2
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
