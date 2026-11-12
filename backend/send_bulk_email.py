"""Send one personalized email at a time to contacts in a Google Sheet.

The script defaults to a preview. To send, provide --send and confirm the
recipient count at the prompt. SMTP credentials are read from environment
variables; they are never stored in this file.
"""

from __future__ import annotations

import argparse
import csv
import io
import os
import ssl
import smtplib
import sys
import time
from email.message import EmailMessage
from urllib.error import HTTPError, URLError
from urllib.parse import urlencode
from urllib.request import Request, urlopen

from dotenv import load_dotenv


DEFAULT_GID = "0"
DOTENV_PATH = os.path.join(os.path.dirname(__file__), ".env")

# Accept the app's canonical EMAIL_* keys and the older standalone SMTP_* keys.
ENV_ALIASES = {
    "SMTP_HOST": ("EMAIL_HOST", "SMTP_HOST"),
    "SMTP_PORT": ("EMAIL_PORT", "SMTP_PORT"),
    "SMTP_USER": ("EMAIL_SENDER_ADDRESS", "SMTP_USER"),
    "SMTP_PASSWORD": ("EMAIL_APP_PASSWORD", "SMTP_PASSWORD", "SMTP_PASS"),
    "EMAIL_FROM": ("EMAIL_SENDER_ADDRESS", "EMAIL_FROM"),
}


def smtp_configuration(environ: dict[str, str] | None = None) -> dict[str, str]:
    """Resolve canonical app settings, retaining support for SMTP_* settings."""
    values = os.environ if environ is None else environ
    config = {}
    for setting, aliases in ENV_ALIASES.items():
        config[setting] = next((values[key].strip() for key in aliases if values.get(key, "").strip()), "")
    return config


def load_recipients(
    sheet_id: str,
    tab: str | None = None,
    row_number: int | None = None,
    gid: str | None = None,
) -> list[tuple[str, str]]:
    """Load name and email from a publicly accessible sheet.

    Prefer columns identified by their header names. Older sheets without a
    header row retain the documented name/email columns C and D.
    """
    query_values = {"tqx": "out:csv", "range": "A:Z"}
    if gid is not None:
        query_values["gid"] = str(gid)
    elif tab:
        query_values["sheet"] = tab
    query = urlencode(query_values)
    url = f"https://docs.google.com/spreadsheets/d/{sheet_id}/gviz/tq?{query}"
    request = Request(url, headers={"User-Agent": "PreemptionBulkEmail/1.0"})
    try:
        with urlopen(request, timeout=30) as response:
            data = response.read().decode("utf-8-sig")
    except (HTTPError, URLError, TimeoutError) as exc:
        raise RuntimeError(
            "Could not read the sheet. Confirm it is accessible to this script "
            "or export the tab as CSV and adapt the input source."
        ) from exc

    rows = list(csv.reader(io.StringIO(data)))
    if not rows:
        return []

    def normalize_header(value: str) -> str:
        return " ".join(value.strip().casefold().replace("_", " ").split())

    header = [normalize_header(value) for value in rows[0]]
    email_index = next(
        (index for index, value in enumerate(header)
         if value in {"email", "email address", "e mail", "e mail address"}),
        None,
    )
    name_index = next(
        (index for index, value in enumerate(header)
         if value in {"name", "prospect name", "contact name", "full name"}),
        None,
    )
    has_header = email_index is not None
    if email_index is None:
        # Keep compatibility with the previous C:D schema when the export has
        # no recognizable header row.
        if any("email" in value or "e mail" in value for value in header):
            raise RuntimeError("The sheet has an email-related header, but no recognized email address column.")
        if name_index is not None:
            raise RuntimeError("The sheet has a name column but no email address column; add a verified email column before sending.")
        email_index, name_index = 3, 2
        data_rows = rows
    else:
        data_rows = rows[1:]
        if name_index is None:
            name_index = 0

    if row_number is not None:
        if row_number < 1:
            raise ValueError("Row numbers are 1-based and must be positive.")
        source_index = row_number - 1
        if has_header and row_number == 1:
            raise RuntimeError("The requested row is the header, not a contact.")
        if source_index >= len(rows):
            raise RuntimeError(f"The sheet does not contain row {row_number}.")
        row = rows[source_index]
        if max(email_index, name_index) >= len(row):
            raise RuntimeError(f"Row {row_number} does not contain both name and email columns.")
        name, address = row[name_index].strip(), row[email_index].strip()
        if not address or "@" not in address:
            raise RuntimeError(f"Row {row_number} does not contain a usable email address.")
        return [(name, address)]

    contacts: list[tuple[str, str]] = []
    seen: set[str] = set()
    for row in data_rows:
        if max(email_index, name_index) >= len(row):
            continue
        name, address = row[name_index].strip(), row[email_index].strip()
        if not address or "@" not in address:
            continue  # skips the header and incomplete rows
        key = address.casefold()
        if key in seen:
            continue
        seen.add(key)
        contacts.append((name, address))
    return contacts


def make_message(sender: str, recipient: str, name: str, subject: str, body: str) -> EmailMessage:
    message = EmailMessage()
    message["From"] = sender
    message["To"] = recipient  # one recipient per message; no CC/BCC
    message["Subject"] = subject.format(name=name)
    message.set_content(body.format(name=name))
    return message


def open_smtp_connection(host: str, port: int) -> smtplib.SMTP:
    """Open a secure SMTP connection for Gmail's submission ports."""
    if port == 465:
        return smtplib.SMTP_SSL(host, port, timeout=30, context=ssl.create_default_context())
    if port == 587:
        smtp = smtplib.SMTP(host, port, timeout=30)
        try:
            smtp.ehlo()
            smtp.starttls(context=ssl.create_default_context())
            smtp.ehlo()
        except Exception:
            smtp.close()
            raise
        return smtp
    raise ValueError("Unsupported SMTP port; use 465 (implicit TLS) or 587 (STARTTLS)")


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--sheet-id", required=True, help="Google Sheets spreadsheet ID to read")
    parser.add_argument("--tab", default=None, help="Tab name (use --gid when targeting a sheet by its Google Sheets ID)")
    parser.add_argument("--gid", default=DEFAULT_GID, help="Google Sheets tab ID (default: 0)")
    parser.add_argument("--row", type=int, help="Send only to this 1-based physical sheet row")
    parser.add_argument("--subject", required=True, help="Supports {name} personalization")
    parser.add_argument("--body-file", required=True, help="UTF-8 plain-text template; supports {name}")
    parser.add_argument("--send", action="store_true", help="Send after the interactive count confirmation")
    parser.add_argument(
        "--yes",
        action="store_true",
        help="Skip the prompt for an explicitly authorized single-row send; requires --send and --row",
    )
    parser.add_argument("--first-only", action="store_true", help="Send only to the first usable contact")
    parser.add_argument("--delay", type=float, default=2.0, help="Seconds between messages (default: 2)")
    args = parser.parse_args()

    # The app stores the verified Gmail connection here. Existing process
    # environment values take precedence over the file.
    load_dotenv(DOTENV_PATH, override=False)

    if args.delay < 0:
        parser.error("--delay must be zero or greater")
    if args.yes and (not args.send or args.row is None):
        parser.error("--yes requires both --send and --row to constrain automated delivery to one row")
    try:
        with open(args.body_file, encoding="utf-8") as body_file:
            body = body_file.read()
        contacts = load_recipients(
            args.sheet_id,
            args.tab,
            args.row,
            None if args.tab else args.gid,
        )
    except (OSError, RuntimeError, ValueError) as exc:
        print(f"Error: {exc}", file=sys.stderr)
        return 1
    if not contacts:
        print("No usable email addresses found.", file=sys.stderr)
        return 1

    if args.first_only:
        contacts = contacts[:1]

    if not args.send:
        print(f"Preview only: {len(contacts)} unique recipients. No email was sent.")
        print(f"Subject: {args.subject.format(name='[name]')}")
        print(f"Body: {body.format(name='[name]').splitlines()[0] if body else ''}")
        print("Pass --send to send, then confirm the recipient count interactively.")
        return 0

    config = smtp_configuration()
    missing = [key for key, value in config.items() if not value]
    if missing:
        print(f"Missing SMTP environment variables: {', '.join(missing)}", file=sys.stderr)
        return 1

    if not args.yes:
        confirmation = input(f"Send individual emails to {len(contacts)} recipients? Type {len(contacts)} to confirm: ")
        if confirmation != str(len(contacts)):
            print("Cancelled. No email was sent.")
            return 0

    try:
        host = config["SMTP_HOST"]
        port = int(config["SMTP_PORT"])
        if port not in {465, 587}:
            raise ValueError("Unsupported SMTP port; use 465 (implicit TLS) or 587 (STARTTLS)")
        sender = config["EMAIL_FROM"]
        if sender.casefold() != config["SMTP_USER"].casefold():
            raise ValueError("EMAIL_FROM must match the authenticated Gmail sender address")
        with open_smtp_connection(host, port) as smtp:
            smtp.login(config["SMTP_USER"], config["SMTP_PASSWORD"])
            for index, (name, address) in enumerate(contacts):
                message = make_message(sender, address, name, args.subject, body)
                smtp.send_message(message)
                print(f"Sent {index + 1}/{len(contacts)}")
                if index + 1 < len(contacts):
                    time.sleep(args.delay)
    except (OSError, smtplib.SMTPException, ValueError) as exc:
        print(f"Sending stopped: {exc}", file=sys.stderr)
        if "4.7.28" in str(exc):
            print(
                "Gmail temporarily rate-limited sending. Stop for at least 10 minutes, "
                "then retry at a lower volume; increasing --delay does not increase Gmail quota.",
                file=sys.stderr,
            )
        return 1
    print(f"Completed: {len(contacts)} individual emails sent.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
