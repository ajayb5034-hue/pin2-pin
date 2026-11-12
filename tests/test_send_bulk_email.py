import unittest
from unittest.mock import patch

from backend.send_bulk_email import load_recipients, open_smtp_connection, smtp_configuration


class SmtpConfigurationTests(unittest.TestCase):
    def test_reads_the_apps_email_environment_names(self):
        config = smtp_configuration({
            "EMAIL_HOST": "smtp.gmail.com",
            "EMAIL_PORT": "587",
            "EMAIL_SENDER_ADDRESS": "sender@example.com",
            "EMAIL_APP_PASSWORD": "placeholder",
        })

        self.assertEqual(config["SMTP_HOST"], "smtp.gmail.com")
        self.assertEqual(config["SMTP_PORT"], "587")
        self.assertEqual(config["SMTP_USER"], "sender@example.com")
        self.assertEqual(config["SMTP_PASSWORD"], "placeholder")
        self.assertEqual(config["EMAIL_FROM"], "sender@example.com")

    @patch("backend.send_bulk_email.ssl.create_default_context")
    @patch("backend.send_bulk_email.smtplib.SMTP_SSL")
    def test_port_465_uses_implicit_tls(self, smtp_ssl, ssl_context):
        connection = open_smtp_connection("smtp.gmail.com", 465)
        self.assertIs(connection, smtp_ssl.return_value)
        smtp_ssl.assert_called_once_with(
            "smtp.gmail.com", 465, timeout=30, context=ssl_context.return_value
        )

    @patch("backend.send_bulk_email.ssl.create_default_context")
    @patch("backend.send_bulk_email.smtplib.SMTP")
    def test_port_587_upgrades_to_starttls(self, smtp_factory, ssl_context):
        connection = open_smtp_connection("smtp.gmail.com", 587)
        smtp = smtp_factory.return_value
        self.assertIs(connection, smtp)
        smtp.ehlo.assert_called()
        smtp.starttls.assert_called_once_with(context=ssl_context.return_value)

    def test_rejects_unsupported_port(self):
        with self.assertRaisesRegex(ValueError, "use 465.*587"):
            open_smtp_connection("smtp.gmail.com", 25)

    def test_process_environment_aliases_override_legacy_names(self):
        config = smtp_configuration({
            "EMAIL_HOST": "smtp.gmail.com",
            "SMTP_HOST": "legacy.example.com",
            "SMTP_PORT": "465",
            "SMTP_USER": "legacy@example.com",
            "SMTP_PASS": "placeholder",
            "EMAIL_FROM": "legacy@example.com",
        })

        self.assertEqual(config["SMTP_HOST"], "smtp.gmail.com")
        self.assertEqual(config["SMTP_PASSWORD"], "placeholder")


class RecipientLoadingTests(unittest.TestCase):
    @patch("backend.send_bulk_email.urlopen")
    def test_finds_name_and_email_columns_by_header(self, urlopen):
        import io

        urlopen.return_value = io.BytesIO(
            b"Prospect Name,Company,Email Address\nAlex Mercer,Apex Capital,alex@example.com\n"
        )
        self.assertEqual(
            load_recipients("sheet", "tab"),
            [("Alex Mercer", "alex@example.com")],
        )

    @patch("backend.send_bulk_email.urlopen")
    def test_reports_missing_email_column(self, urlopen):
        import io

        urlopen.return_value = io.BytesIO(
            b"Prospect Name,Company,Company Type\nAlex Mercer,Apex Capital,Trading Firm\n"
        )
        with self.assertRaisesRegex(RuntimeError, "no email address column"):
            load_recipients("sheet", "tab")

    @patch("backend.send_bulk_email.urlopen")
    def test_selects_exact_physical_row_by_headers(self, urlopen):
        import io

        urlopen.return_value = io.BytesIO(
            b"Prospect Name,Company,Email Address\nFirst Contact,Acme,first@example.com\n"
            b"Second Contact,Flex Trade,second@example.com\n"
        )
        self.assertEqual(
            load_recipients("sheet", row_number=2, gid="0"),
            [("First Contact", "first@example.com")],
        )
        request = urlopen.call_args.args[0]
        self.assertIn("gid=0", request.full_url)

    @patch("backend.send_bulk_email.urlopen")
    def test_fails_when_selected_row_has_no_email(self, urlopen):
        import io

        urlopen.return_value = io.BytesIO(
            b"Name,Email\nFirst Contact,first@example.com\nSecond Contact,\n"
        )
        with self.assertRaisesRegex(RuntimeError, "Row 3.*usable email"):
            load_recipients("sheet", row_number=3, gid="0")


if __name__ == "__main__":
    unittest.main()
