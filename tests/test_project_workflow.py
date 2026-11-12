import asyncio
import json
import os
import sqlite3
import tempfile
import unittest
from datetime import datetime, timedelta, timezone
from unittest import mock
from urllib.parse import parse_qs, urlsplit

from fastapi.testclient import TestClient

from backend import main


class ProjectWorkflowTests(unittest.TestCase):
    def setUp(self):
        self.temp_dir = tempfile.TemporaryDirectory()
        self.original_preemption_env = {
            key: value for key, value in os.environ.items() if key.startswith("PREEMPTION_")
        }
        self.original_email_env = {
            key: value for key, value in os.environ.items() if key.startswith("EMAIL_")
        }
        for key in self.original_preemption_env:
            os.environ.pop(key, None)
        for key in self.original_email_env:
            os.environ.pop(key, None)
        self.original_db_path = main.DB_PATH
        self.original_files_dir = main.FILES_DIR
        self.original_conversations_dir = main.CONVERSATIONS_DIR
        self.original_daily_learning_path = main.DAILY_LEARNING_PATH
        self.original_team_memory_path = main.TEAM_MEMORY_PATH
        self.original_dotenv_path = main.DOTENV_PATH
        main.DB_PATH = os.path.join(self.temp_dir.name, "team.db")
        main.FILES_DIR = os.path.join(self.temp_dir.name, "files")
        main.CONVERSATIONS_DIR = os.path.join(self.temp_dir.name, "conversations")
        main.DAILY_LEARNING_PATH = os.path.join(self.temp_dir.name, "daily_learning.md")
        main.TEAM_MEMORY_PATH = os.path.join(self.temp_dir.name, "agents.md")
        main.DOTENV_PATH = os.path.join(self.temp_dir.name, ".env")
        os.makedirs(main.FILES_DIR, exist_ok=True)
        main.init_db()
        self.client = TestClient(main.app)
        self.client.__enter__()

    def tearDown(self):
        self.client.__exit__(None, None, None)
        main.DB_PATH = self.original_db_path
        main.FILES_DIR = self.original_files_dir
        main.CONVERSATIONS_DIR = self.original_conversations_dir
        main.DAILY_LEARNING_PATH = self.original_daily_learning_path
        main.TEAM_MEMORY_PATH = self.original_team_memory_path
        main.DOTENV_PATH = self.original_dotenv_path
        for key in [key for key in os.environ if key.startswith("PREEMPTION_")]:
            os.environ.pop(key, None)
        for key in [key for key in os.environ if key.startswith("EMAIL_")]:
            os.environ.pop(key, None)
        os.environ.update(self.original_preemption_env)
        os.environ.update(self.original_email_env)
        self.temp_dir.cleanup()

    def _workspace(self):
        workspace = os.path.join(self.temp_dir.name, "project")
        os.makedirs(workspace, exist_ok=True)
        return workspace

    def _insert_project_task(self, status="in_progress"):
        conn = main.get_conn()
        try:
            agent = conn.execute("SELECT id FROM agents WHERE role='Software Engineering'").fetchone()
            task_id = "task_test_project"
            created = (datetime.now(timezone.utc) - timedelta(seconds=30)).isoformat()
            conn.execute(
                "INSERT INTO tasks (id,title,description,assigned_agent_id,status,priority,execution_mode,"
                "created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?)",
                (task_id, "Add a regression test", "Implement and run tests.", agent["id"], status,
                 "medium", "project", created, created),
            )
            conn.execute(
                "UPDATE agents SET status='working', current_task_id=? WHERE id=?",
                (task_id, agent["id"]),
            )
            conn.commit()
            return task_id
        finally:
            conn.close()

    def test_gmail_credentials_are_verified_before_saving_to_ignored_env_file(self):
        credentials = {
            "sender_address": "traderdesk.pms.software@gmail.com",
            "app_password": "abcd efgh ijkl mnop",
        }
        with mock.patch.object(main, "_verify_gmail_credentials") as verify:
            response = self.client.post("/api/resources/gmail/connect", json=credentials)
        self.assertEqual(response.status_code, 200)
        verify.assert_called_once_with(credentials["sender_address"], "abcdefghijklmnop")
        self.assertNotIn(credentials["app_password"], response.text)
        with open(main.DOTENV_PATH, encoding="utf-8") as env_file:
            dotenv_text = env_file.read()
        self.assertIn("EMAIL_HOST='smtp.gmail.com'", dotenv_text)
        self.assertIn("EMAIL_SENDER_ADDRESS='traderdesk.pms.software@gmail.com'", dotenv_text)
        self.assertIn("EMAIL_APP_PASSWORD='abcdefghijklmnop'", dotenv_text)
        main.init_db()
        account = next(item for item in self.client.get("/api/accounts").json() if item["platform"] == "gmail")
        self.assertEqual(account["status"], "connected")
        self.assertTrue(account["verified"])
        self.assertNotIn("app_password", json.dumps(account).lower())

    def test_gmail_credentials_are_not_saved_when_provider_verification_fails(self):
        with mock.patch.object(
            main, "_verify_gmail_credentials",
            side_effect=main.HTTPException(status_code=400, detail="Gmail rejected these credentials."),
        ):
            response = self.client.post("/api/resources/gmail/connect", json={
                "sender_address": "user@gmail.com",
                "app_password": "abcd efgh ijkl mnop",
            })
        self.assertEqual(response.status_code, 400)
        self.assertFalse(os.path.exists(main.DOTENV_PATH))
        self.assertEqual(self.client.get("/api/accounts").json(), [])

    def test_google_sheet_links_are_saved_as_unverified_resources(self):
        url = "https://docs.google.com/spreadsheets/d/pin2pin-test-sheet-1/edit?resourcekey=&gid=123456789#gid=123456789"
        response = self.client.post("/api/resources/google-sheets/connect", json={"url": url})
        self.assertEqual(response.status_code, 200)
        accounts = self.client.get("/api/accounts").json()
        self.assertEqual(len(accounts), 1)
        sheet = accounts[0]
        self.assertEqual(sheet["platform"], "google_sheets")
        self.assertEqual(sheet["status"], "setup_required")
        self.assertFalse(sheet["verified"])
        self.assertEqual(sheet["resource_details"]["spreadsheet_id"], "pin2pin-test-sheet-1")
        self.assertEqual(sheet["resource_details"]["gid"], "123456789")
        self.client.post("/api/resources/google-sheets/connect", json={"url": url})
        self.assertEqual(len(self.client.get("/api/accounts").json()), 1)

    def test_google_sheet_url_rejects_non_google_hosts(self):
        response = self.client.post("/api/resources/google-sheets/connect", json={
            "url": "https://example.com/spreadsheets/d/abcdefgh/edit",
        })
        self.assertEqual(response.status_code, 422)

    def test_google_sheet_save_upgrades_and_deduplicates_legacy_url_resources(self):
        url = "https://docs.google.com/spreadsheets/d/pin2pin-test-sheet-2/edit?gid=0#gid=0"
        conn = main.get_conn()
        try:
            conn.execute(
                "INSERT INTO accounts (id,platform,username,status,connected_at) VALUES (?,?,?,?,?)",
                ("acct_legacy_sheet", "google_sheets", url, "setup_required", main.now_iso()),
            )
            conn.commit()
        finally:
            conn.close()
        response = self.client.post("/api/resources/google-sheets/connect", json={"url": url})
        self.assertEqual(response.status_code, 200)
        sheets = [item for item in self.client.get("/api/accounts").json() if item["platform"] == "google_sheets"]
        self.assertEqual(len(sheets), 1)
        self.assertEqual(sheets[0]["id"], "acct_legacy_sheet")
        self.assertEqual(sheets[0]["resource_details"]["gid"], "0")

    def test_google_oauth_rejects_invalid_client_configuration(self):
        response = self.client.post("/api/resources/google-oauth/start", json={
            "client_id": "not-a-google-client",
            "client_secret": "local-test-secret",
        })
        self.assertEqual(response.status_code, 422)
        self.assertFalse(os.path.exists(main.DOTENV_PATH))

    def test_google_oauth_callback_rejects_invalid_state(self):
        started = self.client.post("/api/resources/google-oauth/start", json={
            "client_id": "test.apps.googleusercontent.com",
            "client_secret": "local-test-secret",
        })
        self.assertEqual(started.status_code, 200)
        with mock.patch.object(main.httpx, "post") as token_exchange:
            response = self.client.get(
                "/api/resources/google-oauth/callback",
                params={"code": "test-code", "state": "forged-state"},
            )
        self.assertEqual(response.status_code, 400)
        token_exchange.assert_not_called()

    def test_google_oauth_callback_saves_only_validated_read_only_grant(self):
        started = self.client.post("/api/resources/google-oauth/start", json={
            "client_id": "test.apps.googleusercontent.com",
            "client_secret": "local-test-secret",
        })
        authorization = parse_qs(urlsplit(started.json()["authorization_url"]).query)
        token_response = mock.Mock()
        token_response.json.return_value = {
            "access_token": "local-access-token",
            "refresh_token": "local-refresh-token",
            "scope": "openid email https://www.googleapis.com/auth/spreadsheets.readonly "
                     "https://www.googleapis.com/auth/analytics.readonly",
        }
        identity_response = mock.Mock()
        identity_response.json.return_value = {"email": "owner@example.com"}
        with mock.patch.object(main.httpx, "post", return_value=token_response), \
             mock.patch.object(main.httpx, "get", return_value=identity_response) as identity_request:
            response = self.client.get(
                "/api/resources/google-oauth/callback",
                params={"code": "test-code", "state": authorization["state"][0]},
            )
        self.assertEqual(response.status_code, 200)
        self.assertIn("Google connected", response.text)
        self.assertEqual(
            identity_request.call_args.kwargs["headers"]["Authorization"],
            "Bearer local-access-token",
        )
        self.assertEqual(main._get_secret("google_oauth_refresh_token"), "local-refresh-token")
        self.assertEqual(main._get_secret("google_oauth_account_email"), "owner@example.com")
        oauth_account = next(
            account for account in self.client.get("/api/accounts").json()
            if account["platform"] == "google_oauth"
        )
        self.assertTrue(oauth_account["verified"])

    def test_google_sheet_read_is_read_only_and_range_is_validated(self):
        saved = self.client.post("/api/resources/google-sheets/connect", json={
            "url": "https://docs.google.com/spreadsheets/d/sheet123/edit",
        })
        account_id = saved.json()["id"]
        os.environ["PREEMPTION_GOOGLE_OAUTH_REFRESH_TOKEN"] = "local-refresh-token"
        with mock.patch.object(main, "_read_google_sheet_values", return_value=[["Name"], ["Ada"]]) as read_values:
            response = self.client.get(
                f"/api/resources/google-sheets/{account_id}/values",
                params={"cell_range": "Leads!A1:A2"},
            )
        self.assertEqual(response.status_code, 200)
        self.assertTrue(response.json()["read_only"])
        self.assertEqual(response.json()["values"], [["Name"], ["Ada"]])
        read_values.assert_called_once_with("sheet123", "Leads!A1:A2")
        invalid = self.client.get(
            f"/api/resources/google-sheets/{account_id}/values",
            params={"cell_range": "A1:A2;DROP"},
        )
        self.assertEqual(invalid.status_code, 422)

    def test_google_sheets_api_uses_encoded_range_and_bearer_token(self):
        response = mock.Mock()
        response.json.return_value = {"values": [["Leads"], ["Ada"]]}
        with mock.patch.object(main, "_google_access_token", return_value="local-access-token"), \
             mock.patch.object(main.httpx, "get", return_value=response) as request:
            values = main._read_google_sheet_values("sheet/123", "Leads!A1:B2")
        self.assertEqual(values, [["Leads"], ["Ada"]])
        request_args = request.call_args
        self.assertIn("sheet%2F123/values/Leads!A1:B2", request_args.args[0])
        self.assertEqual(request_args.kwargs["headers"]["Authorization"], "Bearer local-access-token")

    def test_explicit_sheet_tasks_receive_bounded_read_only_sheet_context(self):
        self.client.post("/api/resources/google-sheets/connect", json={
            "url": "https://docs.google.com/spreadsheets/d/sheet123/edit",
        })
        os.environ["PREEMPTION_GOOGLE_OAUTH_REFRESH_TOKEN"] = "local-refresh-token"
        self.assertTrue(main._task_requires_google_sheet({
            "title": "Summarize leads from Google Sheets",
        }))
        self.assertFalse(main._task_requires_google_sheet({
            "title": "Write code for a spreadsheet exporter",
        }))
        with mock.patch.object(main, "_read_google_sheet_values", return_value=[["Name"], ["Ada"]]) as read_values:
            context = main._google_sheet_task_context({"title": "Summarize leads from Google Sheets"})
        self.assertIn('"Ada"', context)
        read_values.assert_called_once_with("sheet123", "A1:Z50")

    def test_google_analytics_property_and_report_are_read_only(self):
        saved = self.client.post("/api/resources/google-analytics/connect", json={"property_id": "properties/123456789"})
        self.assertEqual(saved.status_code, 200)
        self.assertEqual(
            self.client.post("/api/resources/google-analytics/connect", json={"property_id": "bad-id"}).status_code,
            422,
        )
        os.environ["PREEMPTION_GOOGLE_OAUTH_REFRESH_TOKEN"] = "local-refresh-token"
        os.environ["PREEMPTION_GOOGLE_OAUTH_CLIENT_ID"] = "test.apps.googleusercontent.com"
        os.environ["PREEMPTION_GOOGLE_OAUTH_CLIENT_SECRET"] = "local-client-secret"
        token_response = mock.Mock()
        token_response.json.return_value = {"access_token": "local-access-token"}
        report_response = mock.Mock()
        report_response.json.return_value = {
            "dimensionHeaders": [{"name": "date"}],
            "metricHeaders": [{"name": "sessions"}],
            "rows": [{"dimensionValues": [{"value": "20260101"}], "metricValues": [{"value": "17"}]}],
        }
        with mock.patch.object(main.httpx, "post", side_effect=[token_response, report_response]) as post:
            response = self.client.get(
                f"/api/resources/google-analytics/{saved.json()['id']}/report"
            )
        self.assertEqual(response.status_code, 200)
        self.assertTrue(response.json()["read_only"])
        self.assertEqual(len(response.json()["rows"]), 1)
        self.assertEqual(post.call_count, 2)
        analytics_authorization = post.call_args_list[-1].kwargs["headers"]["Authorization"]
        self.assertTrue(analytics_authorization.startswith("Bearer "), "Analytics request omitted the Bearer scheme.")
        self.assertTrue(analytics_authorization.endswith("local-access-token"), "Analytics request did not use the refreshed token.")

    def test_explicit_analytics_tasks_receive_report_context(self):
        saved = self.client.post("/api/resources/google-analytics/connect", json={"property_id": "123456789"})
        os.environ["PREEMPTION_GOOGLE_OAUTH_REFRESH_TOKEN"] = "local-refresh-token"
        self.assertTrue(main._task_requires_google_analytics({
            "title": "Review Google Analytics traffic and sessions",
        }))
        self.assertFalse(main._task_requires_google_analytics({
            "title": "Build an analytics dashboard component",
        }))
        with mock.patch.object(main, "read_google_analytics_report", return_value={
            "rows": [{"metricValues": [{"value": "17"}]}],
        }) as read_report:
            context = main._google_analytics_task_context()
        self.assertIn('"17"', context)
        read_report.assert_called_once_with(saved.json()["id"])

    def test_email_draft_requires_review_and_sends_only_once_after_confirmation(self):
        created = self.client.post("/api/emails", json={
            "recipient": "client@example.com",
            "subject": "Follow-up",
            "body": "Hello, this is a reviewed draft.",
        })
        self.assertEqual(created.status_code, 200)
        email_id = created.json()["id"]
        os.environ["EMAIL_SENDER_ADDRESS"] = "owner@gmail.com"
        os.environ["EMAIL_APP_PASSWORD"] = "test-app-password"
        smtp = mock.MagicMock()
        smtp.__enter__.return_value = smtp
        smtp.send_message.return_value = {}
        with mock.patch.object(main.smtplib, "SMTP", return_value=smtp):
            sent = self.client.post(f"/api/emails/{email_id}/send")
            duplicate = self.client.post(f"/api/emails/{email_id}/send")
        self.assertEqual(sent.status_code, 200)
        self.assertEqual(sent.json()["status"], "sent")
        self.assertEqual(duplicate.status_code, 409)
        smtp.send_message.assert_called_once()
        listed = self.client.get("/api/emails").json()
        self.assertEqual(listed[0]["status"], "sent")
        self.assertEqual(listed[0]["recipient"], "client@example.com")

    def test_email_draft_validation_and_smtp_failure_are_visible(self):
        invalid = self.client.post("/api/emails", json={
            "recipient": "not-an-email",
            "subject": "Hi",
            "body": "Hello",
        })
        self.assertEqual(invalid.status_code, 422)
        created = self.client.post("/api/emails", json={
            "recipient": "client@example.com",
            "subject": "Follow-up",
            "body": "Hello.",
        })
        email_id = created.json()["id"]
        os.environ["EMAIL_SENDER_ADDRESS"] = "owner@gmail.com"
        os.environ["EMAIL_APP_PASSWORD"] = "test-app-password"
        smtp = mock.MagicMock()
        smtp.send_message.side_effect = main.smtplib.SMTPAuthenticationError(535, b"Rejected")
        with mock.patch.object(main.smtplib, "SMTP", return_value=smtp):
            failed = self.client.post(f"/api/emails/{email_id}/send")
        self.assertEqual(failed.status_code, 502)
        draft = next(item for item in self.client.get("/api/emails").json() if item["id"] == email_id)
        self.assertEqual(draft["status"], "failed")
        self.assertEqual(self.client.post(f"/api/emails/{email_id}/send").status_code, 409)

    def test_gmail_inbox_reads_recent_messages_without_marking_them_read(self):
        os.environ["EMAIL_SENDER_ADDRESS"] = "owner@gmail.com"
        os.environ["EMAIL_APP_PASSWORD"] = "test-app-password"
        headers = (
            b"From: Jane Doe <jane@example.com>\r\n"
            b"Subject: Project update\r\n"
            b"Date: Tue, 10 Nov 2026 10:00:00 +0000\r\n"
            b"Message-ID: <update@example.com>\r\n\r\n"
        )

        class FakeInbox:
            def __enter__(self):
                return self

            def __exit__(self, *_args):
                return None

            def login(self, _sender, _password):
                return "OK", []

            def select(self, mailbox, readonly=False):
                self.selected = (mailbox, readonly)
                return "OK", [b"2"]

            def uid(self, command, *args):
                if command == "search":
                    return "OK", [b"101 102"]
                if "HEADER.FIELDS" in args[1]:
                    return "OK", [(b"BODY[HEADER]", headers), b")"]
                return "OK", [(b"BODY[TEXT]", b"Status update for your review."), b")"]

            def logout(self):
                return "BYE", []

        fake_inbox = FakeInbox()
        with mock.patch.object(main.imaplib, "IMAP4_SSL", return_value=fake_inbox) as connect:
            response = self.client.get("/api/emails/inbox?limit=2")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["count"], 2)
        self.assertEqual(response.json()["messages"][0]["from_address"], "jane@example.com")
        self.assertEqual(response.json()["messages"][0]["subject"], "Project update")
        self.assertEqual(response.json()["messages"][0]["snippet"], "Status update for your review.")
        self.assertEqual(fake_inbox.selected, ("INBOX", True))
        connect.assert_called_once_with("imap.gmail.com", 993, timeout=20)

    def test_only_explicit_email_inbox_tasks_receive_mail_context(self):
        self.assertTrue(main._task_requires_email_inbox(
            {"title": "Check the latest Gmail messages", "description": ""},
            "Email Sender & Receiver",
        ))
        self.assertTrue(main._task_requires_email_inbox(
            {"title": "Reply to the latest email", "description": ""},
            "Email Sender & Receiver",
        ))
        self.assertFalse(main._task_requires_email_inbox(
            {"title": "Write an email campaign", "description": ""},
            "Email Sender & Receiver",
        ))
        self.assertFalse(main._task_requires_email_inbox(
            {"title": "Check the latest Gmail messages", "description": ""},
            "Lead Generation",
        ))

    def test_email_agent_output_becomes_owner_approved_draft(self):
        output = (
            "I prepared the follow-up.\n\n"
            "[EMAIL_DRAFT]\n"
            "To: client@example.com\n"
            "Subject: Follow-up\n"
            "Body:\nThanks for speaking with us.\n[/EMAIL_DRAFT]"
        )
        clean_output, notice = main._save_email_draft_from_agent_output("task_email_agent", output)
        self.assertNotIn("[EMAIL_DRAFT]", clean_output)
        self.assertIn("saved in Resources", notice)
        draft = next(
            item for item in self.client.get("/api/emails").json()
            if item["task_id"] == "task_email_agent"
        )
        self.assertEqual(draft["status"], "draft")
        self.assertEqual(draft["body"], "Thanks for speaking with us.")
        malformed, malformed_notice = main._save_email_draft_from_agent_output(
            "task_email_invalid", "[EMAIL_DRAFT]\nTo: missing fields"
        )
        self.assertNotIn("[EMAIL_DRAFT]", malformed)
        self.assertIn("incomplete or malformed", malformed_notice)

    def test_email_send_task_waits_for_owner_approval_then_completes_after_gmail_accepts(self):
        conn = main.get_conn()
        try:
            agent = conn.execute("SELECT id FROM agents WHERE role='Email Sender & Receiver'").fetchone()
            now = main.now_iso()
            conn.execute(
                "INSERT INTO tasks (id,title,description,assigned_agent_id,status,priority,execution_mode,"
                "output,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?)",
                (
                    "task_email_approval",
                    "Send follow-up email",
                    "Send an email to the client after approval.",
                    agent["id"],
                    "review",
                    "medium",
                    "task",
                    "Email draft prepared for owner review.",
                    now,
                    now,
                ),
            )
            conn.commit()
        finally:
            conn.close()
        _, notice = main._save_email_draft_from_agent_output(
            "task_email_approval",
            "[EMAIL_DRAFT]\nTo: client@example.com\nSubject: Follow-up\n"
            "Body:\nThanks for speaking with us.\n[/EMAIL_DRAFT]",
        )
        self.assertIn("It has not been sent", notice)
        conn = main.get_conn()
        try:
            task = dict(conn.execute("SELECT * FROM tasks WHERE id='task_email_approval'").fetchone())
        finally:
            conn.close()
        review = asyncio.run(main._review_task_output(task))
        self.assertEqual(review["decision"], "pending")
        self.assertIn("owner's approval", review["feedback"])

        os.environ["EMAIL_SENDER_ADDRESS"] = "owner@gmail.com"
        os.environ["EMAIL_APP_PASSWORD"] = "test-app-password"
        smtp = mock.MagicMock()
        smtp.__enter__.return_value = smtp
        smtp.send_message.return_value = {}
        draft = next(
            item for item in self.client.get("/api/emails").json()
            if item["task_id"] == "task_email_approval"
        )
        with mock.patch.object(main.smtplib, "SMTP", return_value=smtp):
            sent = self.client.post(f"/api/emails/{draft['id']}/send")
        self.assertEqual(sent.status_code, 200)
        conn = main.get_conn()
        try:
            task = conn.execute("SELECT status,result FROM tasks WHERE id='task_email_approval'").fetchone()
            history = conn.execute(
                "SELECT status FROM task_history WHERE task_id='task_email_approval' ORDER BY created_at DESC LIMIT 1"
            ).fetchone()
        finally:
            conn.close()
        self.assertEqual(task["status"], "done")
        self.assertIn("Gmail accepted", task["result"])
        self.assertEqual(history["status"], "done")

    def test_archiving_task_hides_it_from_board_without_deleting_history(self):
        task_id = self._insert_project_task(status="done")
        response = self.client.delete(f"/api/tasks/{task_id}")
        self.assertEqual(response.status_code, 200)
        self.assertNotIn(task_id, [task["id"] for task in self.client.get("/api/tasks").json()])
        archived = self.client.get("/api/tasks?include_archived=true").json()
        self.assertIsNotNone(next(task for task in archived if task["id"] == task_id)["archived_at"])
        restored = self.client.post(f"/api/tasks/{task_id}/restore")
        self.assertEqual(restored.status_code, 200)
        self.assertIn(task_id, [task["id"] for task in self.client.get("/api/tasks").json()])
        conn = main.get_conn()
        try:
            agent = conn.execute("SELECT id FROM agents WHERE role='Software Engineering'").fetchone()
            active_id = "task_active_archive"
            conn.execute(
                "INSERT INTO tasks (id,title,description,assigned_agent_id,status,priority,execution_mode,"
                "created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?)",
                (active_id, "Active task", "", agent["id"], "in_progress", "medium", "project",
                 main.now_iso(), main.now_iso()),
            )
            conn.commit()
        finally:
            conn.close()
        self.assertEqual(self.client.delete(f"/api/tasks/{active_id}").status_code, 409)

    def test_agent_profile_rename_updates_saved_conversation_identity(self):
        agent = next(
            item for item in self.client.get("/api/agents").json()
            if item["role"] == "Software Engineering"
        )
        conn = main.get_conn()
        try:
            conn.execute(
                "INSERT INTO messages (id,sender,receiver,content,timestamp) VALUES (?,?,?,?,?)",
                ("msg_profile_test", agent["name"], "user", "Completed a code change.", main.now_iso()),
            )
            conn.commit()
        finally:
            conn.close()
        response = self.client.put(f"/api/agents/{agent['id']}", json={
            "name": "Engineering Partner",
            "display_icon": "🧰",
            "job_profile": "Build and test project changes.",
            "voice_profile": "Microsoft David Desktop",
        })
        self.assertEqual(response.status_code, 200)
        updated = next(
            item for item in self.client.get("/api/agents").json()
            if item["id"] == agent["id"]
        )
        self.assertEqual(updated["appreciation_stars"], 0)
        self.assertEqual(updated["voice_profile"], "Microsoft David Desktop")
        message = next(item for item in self.client.get("/api/messages").json() if item["id"] == "msg_profile_test")
        self.assertEqual(message["sender"], "Engineering Partner")

    def test_appreciation_is_counted_on_agent_profile(self):
        agent = next(
            item for item in self.client.get("/api/agents").json()
            if item["role"] == "Software Engineering"
        )
        now = main.now_iso()
        conn = main.get_conn()
        try:
            conn.execute(
                "INSERT INTO tasks (id,title,description,assigned_agent_id,status,priority,created_at,updated_at) "
                "VALUES (?,?,?,?,?,?,?,?)",
                ("task_appreciation", "Completed work", "", agent["id"], "done", "medium", now, now),
            )
            conn.commit()
        finally:
            conn.close()
        response = self.client.post("/api/messages", json={
            "sender": "user",
            "receiver": agent["name"],
            "content": "Thank you, excellent work!",
        })
        self.assertEqual(response.status_code, 200)
        updated = next(
            item for item in self.client.get("/api/agents").json()
            if item["id"] == agent["id"]
        )
        self.assertEqual(updated["appreciation_stars"], 1)

    def test_reply_targets_are_saved_and_task_messages_are_not_in_team_chat(self):
        first = self.client.post("/api/messages", json={
            "sender": "user", "receiver": "CEO", "content": "Can you check this?"
        })
        self.assertEqual(first.status_code, 200)
        first_id = self.client.get("/api/messages").json()[-1]["id"]
        reply = self.client.post("/api/messages", json={
            "sender": "user", "receiver": "CEO", "content": "Replying with more detail.",
            "reply_to_id": first_id,
        })
        self.assertEqual(reply.status_code, 200, reply.text)
        messages = self.client.get("/api/messages").json()
        self.assertEqual(messages[-1]["reply_to_id"], first_id)
        invalid = self.client.post("/api/messages", json={
            "sender": "user", "receiver": "CEO", "content": "Wrong thread.",
            "reply_to_id": "missing-message",
        })
        self.assertEqual(invalid.status_code, 400)

    def test_task_board_limits_only_terminal_statuses(self):
        conn = main.get_conn()
        try:
            now = datetime.now(timezone.utc)
            for status in ("done", "blocked", "rejected"):
                for index in range(9):
                    stamp = (now + timedelta(seconds=index)).isoformat()
                    conn.execute(
                        "INSERT INTO tasks (id,title,description,status,priority,created_at,updated_at) "
                        "VALUES (?,?,?,?,?,?,?)",
                        (f"{status}_{index}", f"{status} task {index}", "", status, "low", stamp, stamp),
                    )
            conn.execute(
                "INSERT INTO tasks (id,title,description,status,priority,created_at,updated_at) "
                "VALUES (?,?,?,?,?,?,?)",
                ("active_kept", "Active task", "", "in_progress", "medium", now.isoformat(), now.isoformat()),
            )
            conn.commit()
        finally:
            conn.close()
        tasks = self.client.get("/api/tasks").json()
        for status in ("done", "blocked", "rejected"):
            self.assertEqual(sum(task["status"] == status for task in tasks), 7)
        self.assertIn("active_kept", {task["id"] for task in tasks})
        self.assertEqual(len(self.client.get("/api/tasks?include_archived=true").json()), 28)

    def test_accepted_engineering_collaboration_awards_one_peer_star_once(self):
        conn = main.get_conn()
        try:
            owner = conn.execute("SELECT id,name FROM agents WHERE role='Lead Generation'").fetchone()
            engineer = conn.execute(
                "SELECT id,name,appreciation_stars FROM agents WHERE role='Software Engineering'"
            ).fetchone()
            now = main.now_iso()
            conn.execute(
                "INSERT INTO tasks (id,title,description,assigned_agent_id,status,priority,execution_mode,"
                "created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?)",
                ("task_peer_star", "Complete researched deliverable", "Verify and finish.", owner["id"],
                 "done", "high", "deliverable", now, now),
            )
            conn.execute(
                "INSERT INTO tasks (id,title,description,assigned_agent_id,status,priority,execution_mode,"
                "created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?)",
                ("task_peer_star_engineering", "Engineering support", "Implement helper.", engineer["id"],
                 "done", "high", "project", now, now),
            )
            conn.execute(
                "INSERT INTO engineering_handoffs "
                "(parent_task_id,engineering_task_id,return_agent_id,status,created_at,completed_at) "
                "VALUES (?,?,?,?,?,?)",
                ("task_peer_star", "task_peer_star_engineering", owner["id"], "completed", now, now),
            )
            self.assertTrue(main._award_verified_engineering_collaboration(conn, "task_peer_star"))
            self.assertFalse(main._award_verified_engineering_collaboration(conn, "task_peer_star"))
            conn.commit()
            updated = conn.execute(
                "SELECT appreciation_stars FROM agents WHERE id=?", (engineer["id"],)
            ).fetchone()
            count = conn.execute(
                "SELECT COUNT(*) FROM agent_appreciations WHERE task_id='task_peer_star'"
            ).fetchone()[0]
            message = conn.execute(
                "SELECT sender,receiver,content FROM messages WHERE sender=? AND receiver=? "
                "AND content LIKE '%Peer appreciation%'",
                (owner["name"], engineer["name"]),
            ).fetchone()
        finally:
            conn.close()
        self.assertEqual(updated["appreciation_stars"], engineer["appreciation_stars"] + 1)
        self.assertEqual(count, 1)
        self.assertIsNotNone(message)
        self.assertIn("accepted task", message["content"])

    def test_strategy_question_does_not_create_an_unrequested_task(self):
        message = (
            "Hi Lead Gen, what is your future plan to promote our product? "
            "How are you supposed to work? Give me your suggestions and planning."
        )
        self.assertTrue(main._is_strategy_question(message))
        with mock.patch.object(
            main, "call_llm", new=mock.AsyncMock(
                return_value="I would first review prior outcomes, then outline channels and measurable tests."
            )
        ) as call_llm:
            response = self.client.post(
                "/api/agent-reply",
                json={"sender": "user", "receiver": "Lead Gen", "content": message},
            )
        self.assertEqual(response.status_code, 200, response.text)
        self.assertEqual(response.json()["created_tasks"], [])
        self.assertIn("outline channels", response.json()["content"])
        call_llm.assert_awaited_once()
        conn = main.get_conn()
        try:
            count = conn.execute("SELECT COUNT(*) FROM tasks").fetchone()[0]
        finally:
            conn.close()
        self.assertEqual(count, 0)

    def test_first_party_customer_requests_require_customer_source_data(self):
        task = {
            "title": "Generate detailed client and customer report",
            "description": "Identify our clients and customers and report their details.",
        }
        self.assertTrue(main._task_requests_first_party_customer_data(task))
        self.assertFalse(main._task_requires_web_research(task, "Data Scraping"))

    def test_future_prospect_strategy_does_not_read_sheets_or_require_web_search(self):
        task = {
            "title": "Predict future clients based on product",
            "description": (
                "We don't need any Google Sheet or data; predict future clients based on our product "
                "and provide a detailed PDF or text report."
            ),
        }
        self.assertTrue(main._task_is_prospect_strategy(task))
        self.assertFalse(main._task_requests_first_party_customer_data(task))
        self.assertFalse(main._task_requires_google_sheet(task))
        self.assertFalse(main._task_requires_web_research(task, "Lead Generation"))
        extension, content, media_type = main._task_export(
            "## Market-fit hypotheses\n\nPriority trader segments.", task
        )
        self.assertEqual(extension, "pdf")
        self.assertEqual(media_type, "application/pdf")
        self.assertTrue(content.startswith(b"%PDF-"))

    def test_future_prospect_strategy_runs_without_customer_sources_and_sets_grounding_rules(self):
        conn = main.get_conn()
        try:
            agent = conn.execute("SELECT id FROM agents WHERE role='Lead Generation'").fetchone()
            old = (datetime.now(timezone.utc) - timedelta(seconds=30)).isoformat()
            conn.execute(
                "INSERT INTO tasks (id,title,description,assigned_agent_id,status,priority,output,result,"
                "execution_mode,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?)",
                ("task_future_prospects", "Predict future clients based on product",
                 "We don't need any Google Sheet or data. Predict ideal future client segments for Sample Product.",
                 agent["id"], "in_progress", "high", "", "", "deliverable", old, old),
            )
            conn.commit()
        finally:
            conn.close()

        with (
            mock.patch.object(main, "_has_any_provider_key", return_value=True),
            mock.patch.object(main, "_google_sheet_task_context", side_effect=AssertionError("unexpected Sheets read")),
            mock.patch.object(main, "_google_sheet_customer_report", side_effect=AssertionError("unexpected customer report")),
            mock.patch.object(main, "_collect_task_web_context", new=mock.AsyncMock(
                side_effect=AssertionError("unexpected web research")
            )),
            mock.patch.object(main, "call_llm", new=mock.AsyncMock(return_value=(
                "## Priority segments\n\n"
                "1. Multi-account active traders — strong product-fit hypothesis; validate through interviews."
            ))) as call_llm,
        ):
            asyncio.run(main._process_workers())

        conn = main.get_conn()
        try:
            task = conn.execute(
                "SELECT status,output,result FROM tasks WHERE id='task_future_prospects'"
            ).fetchone()
        finally:
            conn.close()
        self.assertEqual(task["status"], "review")
        self.assertIn("strong product-fit hypothesis", task["output"])
        self.assertEqual(task["result"], "")
        prompt = call_llm.await_args.args[1]
        self.assertIn("PROSPECT STRATEGY MODE", prompt)
        self.assertIn("Do not invent named real prospects", prompt)
        self.assertIn("VERIFIED PRODUCT FEATURE LIST", prompt)

    def test_conversation_archive_is_daily_json_and_redacts_credentials(self):
        self.client.post("/api/messages", json={
            "sender": "user",
            "receiver": "CEO",
            "content": "My app password is abcd efgh ijkl mnop",
        })
        self.client.post("/api/messages", json={
            "sender": "user",
            "receiver": "CEO",
            "content": "A second app password: abcdefghijklmnop",
        })
        archive_name = datetime.now().astimezone().date().isoformat() + ".json"
        with open(os.path.join(main.CONVERSATIONS_DIR, archive_name), encoding="utf-8") as archive_file:
            archive = json.load(archive_file)
        self.assertTrue(any("[REDACTED]" in item["content"] for item in archive))
        self.assertNotIn("abcd efgh ijkl mnop", json.dumps(archive))
        self.assertNotIn("abcdefghijklmnop", json.dumps(archive))

    def test_daily_team_learning_runs_once_only_when_idle_and_persists_short_memory(self):
        async def fake_call_llm(*_args, **_kwargs):
            return "Owner prefers direct execution, accurate status, and saved outputs."

        with (
            mock.patch.object(main, "_idle_suggestion_queue_is_clear", return_value=True),
            mock.patch.object(main, "_has_any_provider_key", return_value=True),
            mock.patch.object(main, "call_llm", side_effect=fake_call_llm) as call_llm,
        ):
            asyncio.run(main._run_daily_team_learning())
            asyncio.run(main._run_daily_team_learning())
        self.assertEqual(call_llm.call_count, 1)
        today = datetime.now().astimezone().date().isoformat()
        conn = main.get_conn()
        try:
            row = conn.execute(
                "SELECT status,summary FROM daily_team_learning WHERE local_date=?",
                (today,),
            ).fetchone()
        finally:
            conn.close()
        self.assertEqual(row["status"], "complete")
        self.assertIn("accurate status", row["summary"])
        with open(main.DAILY_LEARNING_PATH, encoding="utf-8") as memory_file:
            self.assertIn("direct execution", memory_file.read())

    def test_daily_team_learning_waits_until_queue_is_clear(self):
        with (
            mock.patch.object(main, "_idle_suggestion_queue_is_clear", return_value=False),
            mock.patch.object(main, "_has_any_provider_key", return_value=True),
            mock.patch.object(main, "call_llm") as call_llm,
        ):
            asyncio.run(main._run_daily_team_learning())
        call_llm.assert_not_called()
        conn = main.get_conn()
        try:
            count = conn.execute("SELECT COUNT(*) AS count FROM daily_team_learning").fetchone()["count"]
        finally:
            conn.close()
        self.assertEqual(count, 0)

    def test_workspace_settings_validate_and_persist_folder(self):
        workspace = self._workspace()
        response = self.client.post("/api/project/settings", json={"workspace_path": workspace})
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["workspace_path"], os.path.realpath(workspace))
        health = self.client.get("/health")
        self.assertEqual(health.status_code, 200)
        self.assertEqual(health.json()["agents"], 8)

        invalid = self.client.post(
            "/api/project/settings",
            json={"workspace_path": os.path.join(workspace, "missing")},
        )
        self.assertEqual(invalid.status_code, 400)

    def test_project_workspace_chat_can_queue_engineering_from_a_log_line(self):
        workspace = self._workspace()
        main.set_config("project_workspace", workspace)
        main._append_engineering_log("task_log_context", "stderr", "pytest failed: test parser")
        with mock.patch.object(main.shutil, "which", return_value="C:\\tools\\codex.exe"):
            response = self.client.post("/api/project/chat", json={
                "content": "Please fix the parser issue shown in the latest log line."
            })
        self.assertEqual(response.status_code, 200, response.text)
        self.assertIn("queued project task", response.json()["reply"])
        project_chat = self.client.get("/api/project/chat").json()
        self.assertEqual([message["sender"] for message in project_chat], ["user", "Engineering"])
        self.assertFalse(any(message["scope"] == "project" for message in self.client.get("/api/messages").json()))
        conn = main.get_conn()
        try:
            task = conn.execute(
                "SELECT execution_mode,assigned_agent_id,description FROM tasks "
                "WHERE title LIKE 'Engineering follow-up:%' ORDER BY created_at DESC LIMIT 1"
            ).fetchone()
            engineering = conn.execute(
                "SELECT id FROM agents WHERE name='Engineering'"
            ).fetchone()
        finally:
            conn.close()
        self.assertEqual(task["execution_mode"], "project")
        self.assertEqual(task["assigned_agent_id"], engineering["id"])
        self.assertIn("pytest failed: test parser", task["description"])
        logs = self.client.get("/api/project/logs").json()
        self.assertEqual(logs[0]["content"], "pytest failed: test parser")

    def test_task_export_chooses_structured_format(self):
        conn = main.get_conn()
        try:
            now = main.now_iso()
            conn.execute(
                "INSERT INTO tasks (id,title,description,status,priority,output,created_at,updated_at) "
                "VALUES (?,?,?,?,?,?,?,?)",
                ("task_csv_export", "Lead list", "", "done", "medium", "Name,Email\nAda,ada@example.com\n", now, now),
            )
            conn.execute(
                "INSERT INTO tasks (id,title,description,status,priority,output,created_at,updated_at) "
                "VALUES (?,?,?,?,?,?,?,?)",
                ("task_text_export", "Notes", "", "done", "medium", "A short plain-text note.", now, now),
            )
            conn.execute(
                "INSERT INTO tasks (id,title,description,status,priority,output,created_at,updated_at) "
                "VALUES (?,?,?,?,?,?,?,?)",
                ("task_script_text_export", "Instagram reel script",
                 "Write a detailed script and provide the output in a text file.",
                 "done", "medium", "# Hook\n\nA detailed script.", now, now),
            )
            conn.execute(
                "INSERT INTO tasks (id,title,description,status,priority,output,created_at,updated_at) "
                "VALUES (?,?,?,?,?,?,?,?)",
                ("task_pdf_export", "Customer report PDF",
                 "Prepare the report in a PDF file.", "blocked", "high",
                 "First-party customer records are required.", now, now),
            )
            conn.execute(
                "INSERT INTO tasks (id,title,description,status,priority,output,created_at,updated_at) "
                "VALUES (?,?,?,?,?,?,?,?)",
                ("task_docx_export", "Market research Word document",
                 "Export the report as a Word document.",
                 "done", "medium", "# Summary\n\n| Name | Segment |\n|---|---|\n| Ada | Trading |\n", now, now),
            )
            conn.commit()
        finally:
            conn.close()

        tasks = {task["id"]: task for task in self.client.get("/api/tasks").json()}
        self.assertEqual(tasks["task_csv_export"]["export_extension"], "csv")
        self.assertEqual(tasks["task_text_export"]["export_extension"], "txt")
        self.assertEqual(tasks["task_script_text_export"]["export_extension"], "txt")
        self.assertEqual(tasks["task_docx_export"]["export_extension"], "docx")
        exported = self.client.get("/api/tasks/task_csv_export/export")
        self.assertEqual(exported.status_code, 200)
        self.assertEqual(exported.headers["content-type"], "text/csv; charset=utf-8")
        self.assertIn("Ada,ada@example.com", exported.text)
        script_export = self.client.get("/api/tasks/task_script_text_export/export")
        self.assertEqual(script_export.headers["content-type"], "text/plain; charset=utf-8")
        self.assertIn("# Hook", script_export.text)
        pdf_export = self.client.get("/api/tasks/task_pdf_export/export")
        self.assertEqual(pdf_export.headers["content-type"], "application/pdf")
        self.assertTrue(pdf_export.content.startswith(b"%PDF-"))
        word_export = self.client.get("/api/tasks/task_docx_export/export")
        self.assertEqual(word_export.status_code, 200)
        self.assertEqual(
            word_export.headers["content-type"],
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        )
        with main.zipfile.ZipFile(main.io.BytesIO(word_export.content)) as document:
            xml = document.read("word/document.xml").decode("utf-8")
        self.assertIn("Ada", xml)
        self.assertIn("<w:tbl>", xml)

    def test_pdf_task_output_is_saved_as_pdf_file(self):
        saved = main._save_agent_output_file(
            "task_saved_pdf", "Customer report", "Data Scraping", "blocked",
            "First-party customer records are required.", task={"description": "Save as PDF."},
        )
        self.assertIsNotNone(saved)
        self.assertTrue(saved["name"].endswith(".pdf"))
        with open(saved["stored_path"], "rb") as file:
            self.assertTrue(file.read().startswith(b"%PDF-"))

    def test_internal_customer_report_without_first_party_data_is_blocked_with_pdf_explanation(self):
        conn = main.get_conn()
        try:
            agent = conn.execute("SELECT id FROM agents WHERE role='Data Scraping'").fetchone()
            old = (datetime.now(timezone.utc) - timedelta(seconds=30)).isoformat()
            conn.execute(
                "INSERT INTO tasks (id,title,description,assigned_agent_id,status,priority,output,result,"
                "execution_mode,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?)",
                ("task_customer_report_source", "Generate detailed client and customer report in PDF",
                 "Identify our clients and customers and provide the properly sourced data in a PDF report.",
                 agent["id"], "in_progress", "high", "", "", "deliverable", old, old),
            )
            conn.commit()
        finally:
            conn.close()

        with (
            mock.patch.object(main, "_has_any_provider_key", return_value=True),
            mock.patch.object(main, "_tavily_search", new=mock.AsyncMock()) as search,
            mock.patch.object(main, "call_llm", new=mock.AsyncMock()) as call_llm,
        ):
            asyncio.run(main._process_workers())

        conn = main.get_conn()
        try:
            task = conn.execute(
                "SELECT status,output,result FROM tasks WHERE id='task_customer_report_source'"
            ).fetchone()
            file = conn.execute(
                "SELECT name,mime_type,stored_path FROM files WHERE task_id='task_customer_report_source'"
            ).fetchone()
            handoff_count = conn.execute(
                "SELECT COUNT(*) FROM engineering_handoffs WHERE parent_task_id='task_customer_report_source'"
            ).fetchone()[0]
        finally:
            conn.close()
        self.assertEqual(task["status"], "blocked")
        self.assertIn("First-party customer records are required", task["result"])
        self.assertIn("Resources → Google Sheets", task["result"])
        self.assertEqual(task["output"], task["result"])
        self.assertIsNotNone(file)
        self.assertTrue(file["name"].endswith(".pdf"))
        self.assertEqual(file["mime_type"], "application/pdf")
        with open(file["stored_path"], "rb") as saved_pdf:
            self.assertTrue(saved_pdf.read().startswith(b"%PDF-"))
        self.assertEqual(handoff_count, 0)
        search.assert_not_awaited()
        call_llm.assert_not_awaited()

    def test_customer_rows_are_reported_locally_and_skipped_by_cloud_review(self):
        conn = main.get_conn()
        try:
            agent = conn.execute("SELECT id FROM agents WHERE role='Data Scraping'").fetchone()
            old = (datetime.now(timezone.utc) - timedelta(seconds=30)).isoformat()
            conn.execute(
                "INSERT INTO accounts (id,platform,username,status,connected_at,notes,config_json) "
                "VALUES (?,?,?,?,?,?,?)",
                ("acct_customer_report", "google_sheets", "Customer roster", "connected",
                 main.now_iso(), "Read-only source.", json.dumps({"spreadsheet_id": "test-sheet-id"})),
            )
            conn.execute(
                "INSERT INTO tasks (id,title,description,assigned_agent_id,status,priority,output,result,"
                "execution_mode,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?)",
                ("task_customer_report_local", "Generate client and customer report in PDF",
                 "Identify our clients and customers in a PDF report.",
                 agent["id"], "in_progress", "high", "", "", "deliverable", old, old),
            )
            conn.commit()
        finally:
            conn.close()

        with (
            mock.patch.object(main, "_has_any_provider_key", return_value=True),
            mock.patch.object(main, "_get_secret", return_value="refresh-token"),
            mock.patch.object(
                main, "_read_google_sheet_values",
                return_value=[
                    ["Customer Name", "Company", "Email", "Status"],
                    ["Ada Lovelace", "Analytical Engines", "ada@example.test", "Active"],
                    ["Grace Hopper", "Compiler Labs", "grace@example.test", "Prospect"],
                ],
            ),
            mock.patch.object(main, "_tavily_search", new=mock.AsyncMock()) as search,
            mock.patch.object(main, "call_llm", new=mock.AsyncMock()) as call_llm,
        ):
            asyncio.run(main._process_workers())
            conn = main.get_conn()
            try:
                task = dict(conn.execute(
                    "SELECT * FROM tasks WHERE id='task_customer_report_local'"
                ).fetchone())
            finally:
                conn.close()
            output = task["output"]
            review = asyncio.run(main._review_task_output(task))

        self.assertIn("Ada Lovelace", output)
        self.assertNotIn("Grace Hopper", output)
        self.assertIn("were not sent to the configured AI provider", output)
        self.assertEqual(task["status"], "review")
        self.assertEqual(review["decision"], "accept")
        search.assert_not_awaited()
        call_llm.assert_not_awaited()
        saved = main._save_agent_output_file(
            "task_customer_report_local", "Customer report", "Data Scraping", "done",
            output, task={"description": "Prepare a PDF report."},
        )
        self.assertTrue(saved["name"].endswith(".pdf"))
        with open(saved["stored_path"], "rb") as pdf_file:
            self.assertTrue(pdf_file.read().startswith(b"%PDF-"))

    def test_requested_text_file_is_saved_as_txt_even_when_output_uses_markdown(self):
        task = {
            "title": "Instagram reel script",
            "description": "Write the script and provide the output in a text file.",
        }
        saved = main._save_agent_output_file(
            "task_requested_text_file", task["title"], "Content", "review",
            "# Hook\n\nWrite the script.", task=task,
        )
        self.assertIsNotNone(saved)
        self.assertTrue(saved["name"].endswith(".txt"))
        with open(saved["stored_path"], encoding="utf-8") as file:
            self.assertIn("# Hook", file.read())

    def test_agent_outputs_are_saved_as_team_files_with_task_metadata(self):
        task_id = "task_agent_file"
        result = main._save_agent_output_file(
            task_id, "Todays lead list", "Lead Generation", "done", "Name,Email\nAda,ada@example.com\n"
        )
        self.assertIsNotNone(result)
        self.assertRegex(
            result["name"],
            r"^Todays-lead-list-Lead-Generation-done-\d{8}\.csv$",
        )
        files = self.client.get("/api/files").json()
        saved = next(file for file in files if file["id"] == result["id"])
        self.assertEqual(saved["origin"], "agent")
        self.assertEqual(saved["task_id"], task_id)
        self.assertEqual(saved["agent_name"], "Lead Generation")

    def test_large_text_upload_is_compressed_and_downloads_in_original_format(self):
        content = b"agent output,repeatable text\n" * ((main.FILE_COMPRESSION_THRESHOLD // 28) + 10)
        uploaded = self.client.post(
            "/api/files/upload",
            files={"file": ("large-output.txt", content, "text/plain")},
        )
        self.assertEqual(uploaded.status_code, 200)
        result = uploaded.json()
        self.assertTrue(result["compressed"])
        self.assertLess(result["stored_size"], result["size"])

        listed = next(item for item in self.client.get("/api/files").json() if item["id"] == result["id"])
        self.assertTrue(listed["compressed"])
        self.assertTrue(listed["stored_path"].endswith(".gz"))
        self.assertLess(os.path.getsize(listed["stored_path"]), len(content))
        download = self.client.get(f"/api/files/{result['id']}/download")
        self.assertEqual(download.status_code, 200)
        self.assertIn("large-output.txt", download.headers["content-disposition"])
        self.assertEqual(download.content, content)

    def test_large_media_and_uncompressible_files_remain_usable(self):
        media = b"\x00" * (main.FILE_COMPRESSION_THRESHOLD + 1)
        with tempfile.TemporaryDirectory() as output_dir:
            path = os.path.join(output_dir, "large-video.mp4")
            stored_path, compressed, stored_size = main._store_file_content(path, media, "video/mp4")
            self.assertFalse(compressed)
            self.assertEqual(stored_size, len(media))
            self.assertEqual(stored_path, path)
            self.assertEqual(os.path.getsize(path), len(media))
            random_path = os.path.join(output_dir, "uncompressible.bin")
            random_data = os.urandom(main.FILE_COMPRESSION_THRESHOLD + 1)
            stored_random_path, random_compressed, random_size = main._store_file_content(
                random_path, random_data, "application/octet-stream"
            )
            self.assertFalse(random_compressed)
            self.assertEqual(random_size, len(random_data))
            self.assertEqual(stored_random_path, random_path)

    def test_shared_agent_memory_persists_short_outcome_and_redacts_keys(self):
        main._remember_agent_work(
            "Prepare campaign",
            "Content",
            "done",
            "Draft saved with token sk-test-placeholder password=not-a-real-password "
            "123456:ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghi and tags.",
        )
        with open(main.TEAM_MEMORY_PATH, encoding="utf-8") as memory_file:
            memory = memory_file.read()
        self.assertIn("Content | done | Prepare campaign", memory)
        self.assertIn("[redacted]", memory)
        self.assertNotIn("sk-test-placeholder", memory)
        self.assertNotIn("not-a-real-password", memory)
        self.assertNotIn("ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghi", memory)

    def test_secret_config_and_telegram_tokens_migrate_from_sqlite_to_env(self):
        names = ["openrouter_api_key", "telegram_bot_token_acct_test"]
        env_keys = [main._secret_env_key(name) for name in names]
        old_values = {key: os.environ.pop(key, None) for key in env_keys}
        try:
            conn = main.get_conn()
            try:
                conn.execute(
                    "INSERT OR REPLACE INTO config (key,value,updated_at) VALUES (?,?,?)",
                    ("openrouter_api_key", "legacy-api-secret", main.now_iso()),
                )
                conn.execute(
                    "INSERT INTO accounts (id,platform,username,status,connected_at,access_token,config_json) "
                    "VALUES (?,?,?,?,?,?,?)",
                    ("acct_test", "telegram", "@test_bot", "connected", main.now_iso(),
                     "123456:legacy-telegram-secret", "{}"),
                )
                conn.commit()
            finally:
                conn.close()

            main.init_db()
            self.assertEqual(main.get_config("openrouter_api_key"), "legacy-api-secret")
            self.assertEqual(main._get_secret("telegram_bot_token_acct_test"), "123456:legacy-telegram-secret")
            self.assertTrue(os.path.isfile(main.DOTENV_PATH))
            with open(main.DOTENV_PATH, encoding="utf-8") as dotenv_file:
                self.assertIn("PREEMPTION_OPENROUTER_API_KEY", dotenv_file.read())
            config_response = self.client.get("/api/config")
            openrouter = next(item for item in config_response.json() if item["key"] == "openrouter_api_key")
            self.assertTrue(openrouter["has_value"])
            self.assertEqual(openrouter["value"], "")
            self.assertNotIn("legacy-api-secret", config_response.text)
            conn = main.get_conn()
            try:
                self.assertIsNone(conn.execute("SELECT 1 FROM config WHERE key='openrouter_api_key'").fetchone())
                token = conn.execute("SELECT access_token FROM accounts WHERE id='acct_test'").fetchone()["access_token"]
            finally:
                conn.close()
            self.assertEqual(token, "")
        finally:
            for key, value in old_values.items():
                if value is not None:
                    os.environ[key] = value
                else:
                    os.environ.pop(key, None)

    def test_tavily_search_uses_secret_header_and_caps_result_count(self):
        response = mock.Mock(status_code=200)
        response.json.return_value = {"results": [{"title": "Official source", "url": "https://example.com"}]}

        class FakeClient:
            def __init__(self, timeout):
                self.timeout = timeout

            async def __aenter__(self):
                return self

            async def __aexit__(self, *_args):
                return None

            async def post(self, url, headers, json):
                self.request = {"url": url, "headers": headers, "json": json}
                return response

        clients = []

        def fake_client(*args, **kwargs):
            client = FakeClient(*args, **kwargs)
            clients.append(client)
            return client

        with mock.patch.object(main.httpx, "AsyncClient", side_effect=fake_client):
            results = asyncio.run(
                main._tavily_search("test query", api_key="tvly-test-secret", max_results=100)
            )
        self.assertEqual(len(results), 1)
        request = clients[0].request
        self.assertEqual(request["url"], "https://api.tavily.com/search")
        self.assertEqual(request["headers"]["Authorization"], "Bearer tvly-test-secret")
        self.assertEqual(request["json"]["max_results"], 20)
        self.assertNotIn("api_key", request["json"])

    def test_search_uses_public_no_key_search_when_no_key_is_configured(self):
        with mock.patch.object(
            main, "_search_public_web", new=mock.AsyncMock(return_value=[
                {"title": "Public source", "url": "https://example.com", "snippet": "Evidence"}
            ]),
        ) as public_search, mock.patch.object(main, "_tavily_search_with_key") as tavily_search:
            results = asyncio.run(main._tavily_search("test query"))
        self.assertEqual(results, [
            {"title": "Public source", "url": "https://example.com", "content": "Evidence"}
        ])
        public_search.assert_awaited_once_with("test query", max_results=10)
        tavily_search.assert_not_called()

    def test_public_html_search_parses_redirected_source_urls_and_snippets(self):
        response = mock.Mock(status_code=200)
        response.text = (
            '<a class="result__a" href="//duckduckgo.com/l/?uddg=https%3A%2F%2Fexample.com%2Fsource">'
            'Public source</a><a class="result__snippet">Useful evidence</a>'
        )

        class FakeClient:
            def __init__(self, **_kwargs):
                pass

            async def __aenter__(self):
                return self

            async def __aexit__(self, *_args):
                return None

            async def get(self, _url):
                return response

        with mock.patch.object(main.httpx, "AsyncClient", FakeClient):
            results = asyncio.run(main._search_public_web("test query", max_results=5))
        self.assertEqual(results, [{
            "title": "Public source",
            "url": "https://example.com/source",
            "snippet": "Useful evidence",
        }])

    def test_optional_tavily_quota_failure_falls_back_to_public_search(self):
        with mock.patch.object(
            main,
            "_tavily_search_with_key",
            new=mock.AsyncMock(side_effect=main.WebSearchError("Provider quota reached.")),
        ), mock.patch.object(
            main, "_search_public_web", new=mock.AsyncMock(return_value=[
                {"title": "Public source", "url": "https://example.com", "snippet": "Evidence"}
            ]),
        ) as public_search:
            results = asyncio.run(main._tavily_search("test query", api_key="tvly-test-secret"))
        self.assertEqual(results[0]["url"], "https://example.com")
        public_search.assert_awaited_once_with("test query", max_results=10)

    def test_public_search_outage_reports_source_failure_without_false_engineering_escalation(self):
        with mock.patch.object(
            main, "_search_public_web", new=mock.AsyncMock(return_value=[])
        ):
            with self.assertRaises(main.WebSearchError) as error:
                asyncio.run(main._tavily_search("test query"))
        self.assertIn("no usable sources", str(error.exception))
        self.assertNotIn("Engineering", str(error.exception))
        self.assertNotIn("app.tavily.com", str(error.exception))
        self.assertNotIn("API key", str(error.exception))

    def test_web_search_test_rejects_bad_key_and_does_not_save_it(self):
        with mock.patch.object(
            main, "_tavily_search", new=mock.AsyncMock(side_effect=main.WebSearchError("Invalid key."))
        ):
            response = self.client.post("/api/research/test", json={"api_key": "tvly-invalid"})
        self.assertEqual(response.status_code, 200)
        self.assertFalse(response.json()["ok"])
        self.assertFalse(main.get_config("web_search_api_key"))

    def test_web_search_test_supports_keyless_without_saving_a_key(self):
        with mock.patch.object(main, "_tavily_search", new=mock.AsyncMock(return_value=[])) as search:
            response = self.client.post("/api/research/test", json={"api_key": ""})
        self.assertEqual(response.status_code, 200)
        self.assertTrue(response.json()["ok"])
        self.assertEqual(response.json()["mode"], "public")
        self.assertIn("No search API account or key", response.json()["message"])
        search.assert_awaited_once_with(
            "public web search connectivity test", api_key="", max_results=1
        )
        self.assertFalse(main.get_config("web_search_api_key"))

    def test_web_search_key_is_stored_in_env_and_masked_from_config(self):
        secret = "tvly-secret-test-value"
        response = self.client.post(
            "/api/config",
            json={"key": "web_search_api_key", "value": secret},
        )
        self.assertEqual(response.status_code, 200)
        config = self.client.get("/api/config")
        key_row = next(row for row in config.json() if row["key"] == "web_search_api_key")
        self.assertTrue(key_row["has_value"])
        self.assertEqual(key_row["value"], "")
        self.assertNotIn(secret, config.text)
        with open(main.DOTENV_PATH, encoding="utf-8") as dotenv_file:
            self.assertIn("PREEMPTION_WEB_SEARCH_API_KEY", dotenv_file.read())
        conn = main.get_conn()
        try:
            self.assertIsNone(
                conn.execute("SELECT 1 FROM config WHERE key='web_search_api_key'").fetchone()
            )
        finally:
            conn.close()

    def test_research_agent_context_contains_live_sources(self):
        async def fake_search(query, api_key=None, max_results=10):
            return [{
                "title": "Official market data documentation",
                "url": "https://example.com/docs",
                "content": "The official documentation describes the product API.",
            }]

        task = {"title": "Research broker market data APIs"}
        with mock.patch.object(main, "_tavily_search", side_effect=fake_search):
            context = asyncio.run(main._collect_task_web_context(task))
        self.assertIn("https://example.com/docs", context)
        self.assertIn("official documentation", context)

    def test_linkedin_search_builds_csv_from_distinct_indexed_profile_results(self):
        task = {
            "title": "Find 2 LinkedIn profiles",
            "description": "Find US prop traders and educators with public profile URLs.",
            "context": "",
        }

        async def fake_search(query, api_key=None, max_results=10):
            return [
                {
                    "title": "John Doe - Proprietary Trader | LinkedIn",
                    "url": "https://www.linkedin.com/in/john-doe/",
                    "content": "Proprietary trader focused on futures and options.",
                    "score": 0.9,
                },
                {
                    "title": "Jane Smith - Trading Educator | LinkedIn",
                    "url": "https://www.linkedin.com/in/jane-smith/",
                    "content": '=HYPERLINK("https://example.com") options trading educator.',
                    "score": 0.8,
                },
                {
                    "title": "LinkedIn search results",
                    "url": "https://www.linkedin.com/search/results/people/?keywords=trader",
                    "content": "Search results",
                },
            ]

        with mock.patch.object(main, "_tavily_search", side_effect=fake_search):
            output, blocker = asyncio.run(main._run_linkedin_profile_search(task))
        rows = list(main.csv.DictReader(main.io.StringIO(output)))
        self.assertEqual(blocker, "")
        self.assertEqual([row["name"] for row in rows], ["John Doe", "Jane Smith"])
        self.assertIn("manual", rows[0]["verification_status"])
        self.assertTrue(rows[1]["search_evidence"].startswith("'="))
        self.assertTrue(all("/in/" in row["linkedin_profile_link"] for row in rows))

    def test_500_profile_search_is_capped_and_uses_multiple_audiences_and_locations(self):
        queries = main._linkedin_search_queries({
            "title": "Find 500 verified individual LinkedIn profiles",
            "description": "United States",
            "context": "",
        })
        self.assertEqual(len(queries), 40)
        self.assertEqual(len(set(queries)), 40)
        self.assertIn("prop trading", " ".join(queries))
        self.assertIn("Chicago", " ".join(queries))
        self.assertIn("Miami", " ".join(queries))

    def test_linkedin_search_does_not_claim_search_index_candidates_are_verified(self):
        task = {
            "title": "Find 2 verified LinkedIn profiles",
            "description": "Include verified profile names and links.",
            "context": "",
        }

        async def fake_search(query, api_key=None, max_results=10):
            return [
                {
                    "title": "John Doe - Proprietary Trader | LinkedIn",
                    "url": "https://www.linkedin.com/in/john-doe/",
                    "content": "Proprietary trader focused on futures.",
                },
                {
                    "title": "Jane Smith - Trading Educator | LinkedIn",
                    "url": "https://www.linkedin.com/in/jane-smith/",
                    "content": "Options trading educator.",
                },
            ]

        with mock.patch.object(main, "_tavily_search", side_effect=fake_search):
            output, blocker = asyncio.run(main._run_linkedin_profile_search(task))
        self.assertIn("requires verified profiles", blocker)
        self.assertIn("approved LinkedIn/Sales Navigator integration", blocker)
        self.assertEqual(len(list(main.csv.DictReader(main.io.StringIO(output)))), 2)

    def test_linkedin_public_search_failure_does_not_create_irrelevant_engineering_task(self):
        conn = main.get_conn()
        try:
            agent = conn.execute("SELECT id FROM agents WHERE name='LinkedIn'").fetchone()
            engineer = conn.execute("SELECT id,name FROM agents WHERE role='Software Engineering'").fetchone()
            old = (datetime.now(timezone.utc) - timedelta(seconds=30)).isoformat()
            conn.execute(
                "INSERT INTO tasks (id,title,description,assigned_agent_id,status,priority,output,result,"
                "execution_mode,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?)",
                ("task_search_not_configured", "Find 2 LinkedIn profiles",
                 "Find two relevant US trading professionals.", agent["id"], "in_progress", "high",
                 "", "", "deliverable", old, old),
            )
            conn.execute(
                "INSERT INTO tasks (id,title,description,assigned_agent_id,status,priority,output,result,"
                "execution_mode,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?)",
                ("task_search_engineering_return", "Engineering support: public search",
                 "Improve local public search safely.", engineer["id"], "in_progress", "high",
                 "", "", "project", old, old),
            )
            conn.execute(
                "INSERT INTO engineering_handoffs "
                "(parent_task_id,engineering_task_id,return_agent_id,status,created_at) VALUES (?,?,?,?,?)",
                ("task_search_not_configured", "task_search_engineering_return", agent["id"], "pending", old),
            )
            conn.commit()
        finally:
            conn.close()

        conn = main.get_conn()
        try:
            engineering_task = conn.execute(
                "SELECT t.*,a.name AS agent_name FROM tasks t JOIN agents a "
                "ON a.id=t.assigned_agent_id WHERE t.id='task_search_engineering_return'"
            ).fetchone()
        finally:
            conn.close()
        self.assertTrue(main._return_engineering_result(
            engineering_task, "Updated the standalone collector; dashboard search remains unverified.", False
        ))

        conn = main.get_conn()
        try:
            old = (datetime.now(timezone.utc) - timedelta(seconds=30)).isoformat()
            conn.execute(
                "UPDATE tasks SET status='in_progress',created_at=?,updated_at=? "
                "WHERE id='task_search_not_configured'",
                (old, old),
            )
            conn.commit()
        finally:
            conn.close()

        with mock.patch.object(
            main, "_tavily_search",
            new=mock.AsyncMock(side_effect=main.WebSearchError(
                "No-key public web search returned no usable sources."
            )),
        ):
            asyncio.run(main._process_workers())
        conn = main.get_conn()
        try:
            task = conn.execute(
                "SELECT status,output,result FROM tasks WHERE id='task_search_not_configured'"
            ).fetchone()
            handoff_count = conn.execute(
                "SELECT COUNT(*) FROM engineering_handoffs WHERE parent_task_id=?",
                ("task_search_not_configured",),
            ).fetchone()[0]
        finally:
            conn.close()
        self.assertEqual(task["status"], "blocked")
        self.assertIn("no usable sources", task["result"])
        self.assertIn("linkedin_profile_link", task["output"])
        self.assertNotIn("Engineering will be asked", task["result"])
        self.assertEqual(handoff_count, 1)

    def test_linkedin_search_task_runs_without_an_llm_provider(self):
        conn = main.get_conn()
        try:
            agent = conn.execute("SELECT id FROM agents WHERE name='LinkedIn'").fetchone()
            old = (datetime.now(timezone.utc) - timedelta(seconds=30)).isoformat()
            conn.execute(
                "INSERT INTO tasks (id,title,description,assigned_agent_id,status,priority,output,result,"
                "execution_mode,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?)",
                ("task_search_without_llm", "Find 2 LinkedIn profiles",
                 "Find two relevant US trading professionals.", agent["id"], "in_progress", "high",
                 "", "", "deliverable", old, old),
            )
            conn.commit()
        finally:
            conn.close()

        async def fake_search(query, api_key=None, max_results=10):
            return [
                {
                    "title": "John Doe - Proprietary Trader | LinkedIn",
                    "url": "https://www.linkedin.com/in/john-doe/",
                    "content": "Proprietary trader focused on futures.",
                },
                {
                    "title": "Jane Smith - Trading Educator | LinkedIn",
                    "url": "https://www.linkedin.com/in/jane-smith/",
                    "content": "Options trading educator.",
                },
            ]

        with mock.patch.object(main, "_tavily_search", side_effect=fake_search):
            asyncio.run(main._process_workers())
        conn = main.get_conn()
        try:
            task = conn.execute(
                "SELECT status,output FROM tasks WHERE id='task_search_without_llm'"
            ).fetchone()
        finally:
            conn.close()
        self.assertEqual(task["status"], "review")
        self.assertIn("John Doe", task["output"])
        self.assertIn("Jane Smith", task["output"])

    def test_linkedin_requirements_reject_search_result_urls(self):
        task = {
            "title": "Find 500 LinkedIn client profiles and export to Excel",
            "description": "Include names and individual profile links.",
            "context": "",
        }
        short_output = (
            "client_name,linkedin_profile_link,source_url\n"
            "Alex Mercer,https://www.linkedin.com/search/results/people/?keywords=Alex+Mercer,https://example.com/alex\n"
            "Sarah Jenkins,https://www.linkedin.com/search/results/people/?keywords=Sarah+Jenkins,https://example.com/sarah\n"
        )
        problems = main._validate_task_output(task, short_output)
        self.assertTrue(any("canonical LinkedIn profile URL" in problem for problem in problems))
        self.assertEqual(
            main._requested_record_count({
                "title": "Find 500 verified individual LinkedIn profiles",
                "description": "Include direct profile URLs.",
            }),
            500,
        )

    def test_linkedin_contract_accepts_complete_spreadsheet_with_profile_urls(self):
        task = {
            "title": "Find 500 LinkedIn client profiles and export to Excel",
            "description": "Include names and individual profile links.",
            "context": "",
        }
        rows = ["client_name,linkedin_profile_link"]
        rows[0] = "client_name,linkedin_profile_link,source_url"
        rows.extend(
            f"Client {index},https://www.linkedin.com/in/client-{index}/,https://example.com/team/{index}"
            for index in range(500)
        )
        self.assertEqual(main._validate_task_output(task, "\n".join(rows)), [])

    def test_chat_task_parser_preserves_requested_count_and_format(self):
        async def parser(_system, _prompt):
            return '{"create_tasks":[{"title":"Find prospects","description":"Find some LinkedIn prospects","assign_to":"LinkedIn","execution_mode":"deliverable"}]}'

        with mock.patch.object(main, "call_llm", side_effect=parser):
            specs = asyncio.run(
                main._plan_tasks_from_message(
                    "Find 500 LinkedIn client profiles with names and profile links, and export to Excel.",
                    "No current tasks",
                )
            )
        self.assertEqual(len(specs), 1)
        self.assertIn("500 LinkedIn client profiles", specs[0]["description"])
        self.assertIn("export to Excel", specs[0]["description"])

    def test_project_code_output_is_not_mistaken_for_requested_profile_dataset(self):
        project_task = {
            "title": "Build a LinkedIn profile research tool for 100 candidates",
            "description": "Create a local program that processes approved public search data.",
            "execution_mode": "project",
        }
        issues = main._validate_task_output(
            project_task,
            "Implemented the local research tool and added tests. All 4 focused tests pass.",
        )
        self.assertEqual(issues, [])

    def test_ceo_returns_incomplete_linkedin_output_to_todo_with_feedback(self):
        conn = main.get_conn()
        try:
            agent = conn.execute("SELECT id,name FROM agents WHERE name='LinkedIn'").fetchone()
            now = main.now_iso()
            task_id = "task_ceo_rework"
            output = (
                "client_name,linkedin_profile_link\n"
                "Alex Mercer,https://www.linkedin.com/search/results/people/?keywords=Alex\n"
            )
            conn.execute(
                "INSERT INTO tasks (id,title,description,context,assigned_agent_id,status,priority,output,result,"
                "created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?)",
                (task_id, "Find 500 LinkedIn client profiles and export to Excel",
                 "Include names and individual profile links.", "", agent["id"], "review", "high",
                 output, "", now, now),
            )
            conn.execute(
                "INSERT INTO task_history (id,task_id,title,agent_name,status,output,created_at,finished_at) "
                "VALUES (?,?,?,?,?,?,?,?)",
                ("history_ceo_rework", task_id, "Find 500 LinkedIn client profiles and export to Excel",
                 agent["name"], "review", output, now, now),
            )
            conn.commit()
        finally:
            conn.close()

        asyncio.run(main._ceo_review_and_plan())
        conn = main.get_conn()
        try:
            task = conn.execute("SELECT status,result,context FROM tasks WHERE id=?", (task_id,)).fetchone()
            feedback_message = conn.execute(
                "SELECT content FROM messages WHERE sender='CEO' AND receiver='LinkedIn' ORDER BY timestamp DESC LIMIT 1"
            ).fetchone()
            agent = conn.execute("SELECT status,current_task_id FROM agents WHERE name='LinkedIn'").fetchone()
        finally:
            conn.close()
        self.assertEqual(task["status"], "assigned")
        self.assertIn("source/evidence column", task["result"])
        self.assertIn("CEO REVIEW FEEDBACK", task["context"])
        self.assertIn("corrections", feedback_message["content"])
        self.assertEqual(agent["status"], "assigned")
        self.assertEqual(agent["current_task_id"], task_id)

    def test_ceo_blocks_unchanged_output_after_corrections(self):
        conn = main.get_conn()
        try:
            agent = conn.execute("SELECT id,name FROM agents WHERE name='LinkedIn'").fetchone()
            now = main.now_iso()
            task_id = "task_unchanged_rework"
            output = (
                "client_name,linkedin_profile_link\n"
                "Alex Mercer,https://www.linkedin.com/search/results/people/?keywords=Alex\n"
            )
            conn.execute(
                "INSERT INTO tasks (id,title,description,context,assigned_agent_id,status,priority,output,result,"
                "created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?)",
                (task_id, "Find 500 LinkedIn client profiles and export to Excel",
                 "Include names and individual profile links.",
                 "CEO REVIEW FEEDBACK (latest): Add 500 distinct verified profiles.",
                 agent["id"], "review", "high", output, "", now, now),
            )
            for history_id in ("history_unchanged_old", "history_unchanged_current"):
                conn.execute(
                    "INSERT INTO task_history (id,task_id,title,agent_name,status,output,created_at,finished_at) "
                    "VALUES (?,?,?,?,?,?,?,?)",
                    (history_id, task_id, "Find 500 LinkedIn client profiles and export to Excel",
                     agent["name"], "review", output, now, now),
                )
            conn.commit()
        finally:
            conn.close()

        asyncio.run(main._ceo_review_and_plan())
        conn = main.get_conn()
        try:
            task = conn.execute("SELECT status,result FROM tasks WHERE id=?", (task_id,)).fetchone()
        finally:
            conn.close()
        self.assertEqual(task["status"], "blocked")
        self.assertIn("same output", task["result"])
        self.assertIn("source/access blocker", task["result"])

    def test_blocked_task_duplicate_is_reported_instead_of_recreated(self):
        conn = main.get_conn()
        try:
            agent = conn.execute("SELECT id FROM agents WHERE name='LinkedIn'").fetchone()
            now = main.now_iso()
            conn.execute(
                "INSERT INTO tasks (id,title,description,assigned_agent_id,status,priority,result,created_at,updated_at) "
                "VALUES (?,?,?,?,?,?,?,?,?)",
                ("task_blocked_duplicate", "Find 500 LinkedIn client profiles and export to Excel",
                 "Find 500 profiles.", agent["id"], "blocked", "high",
                 "No authorized source is connected.", now, now),
            )
            conn.commit()
        finally:
            conn.close()

        result = main._create_task_from_chat(
            {
                "title": "Find 500 LinkedIn client profiles and export to Excel",
                "description": "Find 500 profiles.",
                "assign_to": "LinkedIn",
                "execution_mode": "deliverable",
            },
            actor="CEO",
        )
        self.assertTrue(result["duplicate"])
        self.assertEqual(result["id"], "task_blocked_duplicate")
        self.assertEqual(result["status"], "blocked")
        self.assertIn("No authorized source", result["reason"])
        conn = main.get_conn()
        try:
            count = conn.execute(
                "SELECT COUNT(*) AS count FROM tasks WHERE title=?",
                ("Find 500 LinkedIn client profiles and export to Excel",),
            ).fetchone()["count"]
        finally:
            conn.close()
        self.assertEqual(count, 1)

    def test_equivalent_active_linkedin_project_is_not_queued_twice(self):
        conn = main.get_conn()
        try:
            agent = conn.execute("SELECT id FROM agents WHERE name='Engineering'").fetchone()
            now = main.now_iso()
            conn.execute(
                "INSERT INTO tasks (id,title,description,assigned_agent_id,status,priority,execution_mode,"
                "created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?)",
                ("task_existing_linkedin_code", "Build custom LinkedIn scraping code/app/extension",
                 "Build compliant code to gather 100 LinkedIn profile candidates from authorized public sources.",
                 agent["id"], "in_progress", "high", "project", now, now),
            )
            conn.commit()
        finally:
            conn.close()
        result = main._create_task_from_chat({
            "title": "Build LinkedIn user profile scraping code for 100 potential clients",
            "description": "Create a linked coding programme to fetch 100 LinkedIn user profiles.",
            "assign_to": "Engineering",
            "execution_mode": "project",
        }, actor="CEO")
        self.assertTrue(result["duplicate"])
        self.assertEqual(result["id"], "task_existing_linkedin_code")
        conn = main.get_conn()
        try:
            count = conn.execute(
                "SELECT COUNT(*) FROM tasks WHERE execution_mode='project' AND "
                "lower(title) LIKE '%linkedin%' AND status IN ('assigned','in_progress')"
            ).fetchone()[0]
        finally:
            conn.close()
        self.assertEqual(count, 1)

    def test_why_failure_question_reports_blocker_without_creating_task(self):
        conn = main.get_conn()
        try:
            agent = conn.execute("SELECT id FROM agents WHERE name='LinkedIn'").fetchone()
            now = main.now_iso()
            conn.execute(
                "INSERT INTO tasks (id,title,description,assigned_agent_id,status,priority,result,created_at,updated_at) "
                "VALUES (?,?,?,?,?,?,?,?,?)",
                ("task_explain_failure", "Find 500 LinkedIn client profiles and export to Excel",
                 "Find 500 profiles.", agent["id"], "blocked", "high",
                 "Only 5 distinct profiles were verified.", now, now),
            )
            conn.commit()
        finally:
            conn.close()

        with mock.patch.object(main, "call_llm") as call_llm:
            response = self.client.post(
                "/api/agent-reply",
                json={"sender": "user", "receiver": "CEO", "content": "Why is this work failing?"},
            )
        self.assertEqual(response.status_code, 200, response.text)
        self.assertIn("Only 5 distinct profiles", response.json()["content"])
        self.assertIn("blocked", response.json()["content"])
        call_llm.assert_not_called()

    def test_retry_resets_ceo_review_attempt_limit(self):
        conn = main.get_conn()
        try:
            agent = conn.execute("SELECT id,name FROM agents WHERE name='LinkedIn'").fetchone()
            old = (datetime.now(timezone.utc) - timedelta(minutes=2)).isoformat()
            conn.execute(
                "INSERT INTO tasks (id,title,description,assigned_agent_id,status,priority,output,result,"
                "execution_mode,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?)",
                ("task_review_retry", "Build verified prospect list", "Include sources.", agent["id"],
                 "blocked", "high", "", "Resolve the data-source blocker.", "deliverable", old, old),
            )
            for index in range(3):
                conn.execute(
                    "INSERT INTO task_history (id,task_id,title,agent_name,status,output,created_at,finished_at) "
                    "VALUES (?,?,?,?,?,?,?,?)",
                    (f"history_before_retry_{index}", "task_review_retry", "Build verified prospect list",
                     agent["name"], "review", "", old, old),
                )
            conn.commit()
        finally:
            conn.close()

        retry = self.client.post("/api/tasks/task_review_retry/retry")
        self.assertEqual(retry.status_code, 200, retry.text)
        conn = main.get_conn()
        try:
            now = main.now_iso()
            conn.execute(
                "UPDATE tasks SET status='review',output='A revised sourced deliverable.',updated_at=? "
                "WHERE id='task_review_retry'",
                (now,),
            )
            conn.execute(
                "INSERT INTO task_history (id,task_id,title,agent_name,status,output,created_at,finished_at) "
                "VALUES (?,?,?,?,?,?,?,?)",
                ("history_after_retry", "task_review_retry", "Build verified prospect list",
                 "LinkedIn", "review", "A revised sourced deliverable.", now, now),
            )
            conn.commit()
        finally:
            conn.close()

        with mock.patch.object(
            main, "_review_task_output", new=mock.AsyncMock(
                return_value={"decision": "rework", "feedback": "Add the missing source details."}
            )
        ):
            asyncio.run(main._ceo_review_and_plan())
        conn = main.get_conn()
        try:
            task = conn.execute(
                "SELECT status,context FROM tasks WHERE id='task_review_retry'"
            ).fetchone()
        finally:
            conn.close()
        self.assertEqual(task["status"], "assigned")
        self.assertIn("CEO REVIEW FEEDBACK", task["context"])

    def test_agent_handoff_directive_targets_a_peer(self):
        self.assertEqual(
            main._extract_team_handoffs(
                "Deliverable complete.\n[TEAM HANDOFF TO: SEO]\nReview the target keyword for this prospect."
            ),
            [("SEO", "Review the target keyword for this prospect.")],
        )

    def test_worker_sends_handoff_to_peer_and_submits_output_to_ceo(self):
        task_id = "task_agent_handoff"
        conn = main.get_conn()
        try:
            agent = conn.execute("SELECT id FROM agents WHERE name='Lead Gen'").fetchone()
            old = (datetime.now(timezone.utc) - timedelta(seconds=30)).isoformat()
            conn.execute(
                "INSERT INTO tasks (id,title,description,assigned_agent_id,status,priority,output,result,"
                "execution_mode,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?)",
                (task_id, "Qualify prospect list", "Summarize qualified prospects.", agent["id"],
                 "in_progress", "medium", "", "", "deliverable", old, old),
            )
            conn.commit()
        finally:
            conn.close()

        async def fake_output(_system, _prompt):
            return (
                "Found three qualified company leads.\n"
                "[TEAM HANDOFF TO: SEO]\nCheck the keywords for this audience."
            )

        with mock.patch.object(main, "_has_any_provider_key", return_value=True), \
                mock.patch.object(main, "_collect_task_web_context", new=mock.AsyncMock(return_value="Source evidence.")), \
                mock.patch.object(main, "call_llm", side_effect=fake_output):
            asyncio.run(main._process_workers())

        conn = main.get_conn()
        try:
            task = conn.execute("SELECT status FROM tasks WHERE id=?", (task_id,)).fetchone()
            handoff = conn.execute(
                "SELECT content FROM messages WHERE sender='Lead Gen' AND receiver='SEO' "
                "AND content LIKE '%Check the keywords%'"
            ).fetchone()
            ceo_note = conn.execute(
                "SELECT content FROM messages WHERE sender='Lead Gen' AND receiver='CEO' "
                "AND content LIKE '%Qualify prospect list%'"
            ).fetchone()
        finally:
            conn.close()
        self.assertEqual(task["status"], "review")
        self.assertIsNotNone(handoff)
        self.assertIsNotNone(ceo_note)

    def test_ceo_does_not_accept_work_without_a_review_model(self):
        conn = main.get_conn()
        try:
            agent = conn.execute("SELECT id FROM agents WHERE name='Lead Gen'").fetchone()
            now = main.now_iso()
            conn.execute(
                "INSERT INTO tasks (id,title,description,assigned_agent_id,status,priority,output,result,"
                "execution_mode,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?)",
                ("task_review_wait", "Prepare prospect summary", "Write a concise summary.", agent["id"],
                 "review", "medium", "Completed the requested prospect summary.", "", "deliverable", now, now),
            )
            conn.commit()
        finally:
            conn.close()

        asyncio.run(main._ceo_review_and_plan())
        conn = main.get_conn()
        try:
            task = conn.execute("SELECT status,result FROM tasks WHERE id='task_review_wait'").fetchone()
        finally:
            conn.close()
        self.assertEqual(task["status"], "review")
        self.assertIn("CEO review pending", task["result"])

    def test_team_and_explicit_multi_agent_requests_fan_out(self):
        self.assertIsNone(main._multi_agent_task_specs("All agents are busy right now."))
        team_specs = main._multi_agent_task_specs(
            "CEO, give today's work to all agents except engineering"
        )
        self.assertEqual(len(team_specs), 6)
        self.assertNotIn("Engineering", [spec["assign_to"] for spec in team_specs])
        selected_specs = main._multi_agent_task_specs(
            "Assign today's work to Lead Gen, SEO, Data Scraper, LinkedIn, Email, Engineering, and Content"
        )
        self.assertEqual(len(selected_specs), 7)
        self.assertEqual(len({spec["assign_to"] for spec in selected_specs}), 7)
        self.assertIn("Engineering", [spec["assign_to"] for spec in selected_specs])

    def test_suggestion_status_explains_blocked_work_and_rejects_manual_run(self):
        conn = main.get_conn()
        try:
            agent = conn.execute("SELECT id FROM agents WHERE role='Lead Generation'").fetchone()
            now = main.now_iso()
            conn.execute(
                "INSERT INTO tasks (id,title,description,assigned_agent_id,status,priority,created_at,updated_at) "
                "VALUES (?,?,?,?,?,?,?,?)",
                ("task_blocked_suggestions", "Blocked test work", "Test the blocked queue state.",
                 agent["id"], "blocked", "medium", now, now),
            )
            conn.commit()
        finally:
            conn.close()
        status = self.client.get("/api/suggestions/status")
        self.assertEqual(status.status_code, 200)
        self.assertFalse(status.json()["can_run"])
        self.assertIn("blocked", status.json()["blocking_tasks"])
        response = self.client.post("/api/suggestions/run")
        self.assertEqual(response.status_code, 409)

    def test_telegram_posts_are_verified_and_require_approval(self):
        class FakeResponse:
            status_code = 200

            def __init__(self, data):
                self.data = data

            def json(self):
                return self.data

        class FakeTelegramClient:
            def __init__(self):
                self.post_calls = []

            async def __aenter__(self):
                return self

            async def __aexit__(self, *args):
                return None

            async def get(self, url):
                self.verify_url = url
                return FakeResponse({"ok": True, "result": {"username": "preemption_test_bot"}})

            async def post(self, url, json):
                self.post_calls.append((url, json))
                return FakeResponse({"ok": True, "result": {"message_id": 424}})

        fake_client = FakeTelegramClient()
        with mock.patch.object(main.httpx, "AsyncClient", return_value=fake_client):
            connected = self.client.post(
                "/api/resources/telegram/connect",
                json={"bot_token": "123456:secret-token", "chat_id": "-100123"},
            )
            self.assertEqual(connected.status_code, 200, connected.text)
            account_id = connected.json()["id"]
            account_list = self.client.get("/api/accounts").json()
            self.assertNotIn("access_token", account_list[0])
            self.assertNotIn("secret-token", connected.text)

            draft = self.client.post(
                "/api/content-posts",
                json={"account_id": account_id, "caption": "A reviewed test post", "hashtags": "#Trading"},
            )
            self.assertEqual(draft.status_code, 200, draft.text)
            self.assertEqual(draft.json()["status"], "pending_approval")
            self.assertEqual(fake_client.post_calls, [])

            published = self.client.post(f"/api/content-posts/{draft.json()['id']}/approve", json={})
            self.assertEqual(published.status_code, 200, published.text)
            self.assertEqual(published.json()["status"], "posted")
            self.assertEqual(len(fake_client.post_calls), 1)

            repeated = self.client.post(f"/api/content-posts/{draft.json()['id']}/approve", json={})
            self.assertEqual(repeated.status_code, 409)

    def test_provider_model_discovery_uses_the_supplied_key(self):
        class FakeResponse:
            status_code = 200

            def json(self):
                return {"data": [{"id": "test/model"}]}

        class FakeClient:
            def __init__(self):
                self.headers = None

            async def __aenter__(self):
                return self

            async def __aexit__(self, *args):
                return None

            async def get(self, url, headers):
                self.headers = headers
                return FakeResponse()

        fake_client = FakeClient()
        with mock.patch.object(main.httpx, "AsyncClient", return_value=fake_client):
            status, models, error = asyncio.run(main._fetch_provider_models("groq", "test-api-key"))
        self.assertEqual(status, 200)
        self.assertEqual(models, ["test/model"])
        self.assertEqual(error, "")
        self.assertEqual(fake_client.headers["Authorization"], "Bearer test-api-key")

    def test_weekly_report_saves_briefing_data_and_visual_pdf(self):
        now = main.now_iso()
        conn = main.get_conn()
        try:
            agent = conn.execute("SELECT id,name FROM agents WHERE name='Content'").fetchone()
            conn.execute(
                "INSERT INTO tasks (id,title,description,assigned_agent_id,status,priority,output,created_at,updated_at) "
                "VALUES (?,?,?,?,?,?,?,?,?)",
                ("task_report", "Draft launch post", "", agent["id"], "done", "medium", "Draft saved.", now, now),
            )
            conn.execute(
                "INSERT INTO task_history (id,task_id,title,agent_name,status,output,created_at,finished_at) "
                "VALUES (?,?,?,?,?,?,?,?)",
                ("history_report", "task_report", "Draft launch post", agent["name"], "done", "Draft saved.", now, now),
            )
            conn.commit()
        finally:
            conn.close()

        response = self.client.post("/api/weekly-reports/generate", json={})
        self.assertEqual(response.status_code, 200, response.text)
        report = response.json()
        self.assertEqual(report["data"]["weekly_completed_count"], 1)
        content_report = next(agent for agent in report["data"]["agents"] if agent["name"] == "Content")
        self.assertIn("task_summary", content_report)
        self.assertIn("progress_summary", content_report)
        self.assertIn("future_plan", content_report)
        self.assertEqual(content_report["weekly_tasks"][0]["title"], "Draft launch post")
        pdf_path = os.path.join(
            main.FILES_DIR,
            f"weekly_report_{report['week_start']}_to_{report['week_end']}_{report['id']}.pdf",
        )
        self.assertTrue(os.path.exists(pdf_path))
        with open(pdf_path, "rb") as pdf_file:
            self.assertTrue(pdf_file.read(5).startswith(b"%PDF-"))
        saved = self.client.get(f"/api/weekly-reports/{report['id']}/briefing")
        self.assertEqual(saved.status_code, 200)
        self.assertEqual(saved.json()["agents"][0]["id"], report["data"]["agents"][0]["id"])

    def test_project_task_is_assigned_to_engineering(self):
        workspace = self._workspace()
        self.client.post("/api/project/settings", json={"workspace_path": workspace})
        with mock.patch.object(main.shutil, "which", return_value="C:\\tools\\codex.exe"):
            response = self.client.post(
                "/api/tasks",
                json={
                    "title": "Fix a project bug",
                    "description": "Add a regression test.",
                    "execution_mode": "project",
                },
            )
        self.assertEqual(response.status_code, 200, response.text)
        conn = main.get_conn()
        try:
            task = conn.execute(
                "SELECT t.execution_mode, t.status, a.role FROM tasks t "
                "JOIN agents a ON t.assigned_agent_id=a.id WHERE t.id=?",
                (response.json()["id"],),
            ).fetchone()
        finally:
            conn.close()
        self.assertEqual(task["execution_mode"], "project")
        self.assertEqual(task["status"], "assigned")
        self.assertEqual(task["role"], "Software Engineering")

    def test_project_task_requires_a_saved_workspace(self):
        with mock.patch.object(main.shutil, "which", return_value="C:\\tools\\codex.exe"):
            response = self.client.post(
                "/api/tasks",
                json={
                    "title": "Fix a project bug",
                    "description": "Implement the fix.",
                    "execution_mode": "project",
                },
            )
        self.assertEqual(response.status_code, 409)

    def test_project_chat_request_is_routed_to_engineering(self):
        specs = main._task_intent_fallback("Find bugs and fix them in this project")
        self.assertEqual(specs[0]["execution_mode"], "project")
        self.assertEqual(specs[0]["assign_to"], "Engineering")

    def test_social_post_tasks_route_to_content_agent_before_linkedin_scraping(self):
        self.assertEqual(main._guess_assignee("Write a LinkedIn post with hashtags"), "Content")
        self.assertEqual(main._guess_assignee("Find LinkedIn prospects"), "LinkedIn")

    def test_idle_research_waits_until_blocked_work_is_cleared(self):
        conn = main.get_conn()
        try:
            conn.execute("UPDATE tasks SET status='blocked'")
            conn.commit()
        finally:
            conn.close()
        with (
            mock.patch.object(main, "_has_any_provider_key", return_value=True),
            mock.patch.object(main, "_search_public_web", new_callable=mock.AsyncMock) as search,
        ):
            asyncio.run(main._run_idle_suggestions())
        search.assert_not_awaited()

    def test_existing_database_migrates_to_project_tasks(self):
        migration_db = os.path.join(self.temp_dir.name, "old-schema.db")
        connection = sqlite3.connect(migration_db)
        try:
            connection.execute(
                "CREATE TABLE tasks (id TEXT PRIMARY KEY, title TEXT NOT NULL, description TEXT NOT NULL, "
                "assigned_agent_id TEXT, status TEXT NOT NULL DEFAULT 'backlog', "
                "priority TEXT NOT NULL DEFAULT 'medium', output TEXT, result TEXT, "
                "needs_approval INTEGER NOT NULL DEFAULT 0, approved_by_user INTEGER NOT NULL DEFAULT 0, "
                "created_at TEXT NOT NULL, updated_at TEXT NOT NULL, due_at TEXT)"
            )
            connection.commit()
        finally:
            connection.close()

        current_db = main.DB_PATH
        main.DB_PATH = migration_db
        try:
            main.init_db()
            conn = main.get_conn()
            try:
                columns = {row["name"] for row in conn.execute("PRAGMA table_info(tasks)")}
                history_columns = {row["name"] for row in conn.execute("PRAGMA table_info(task_history)")}
                engineering = conn.execute(
                    "SELECT 1 FROM agents WHERE role='Software Engineering'"
                ).fetchone()
            finally:
                conn.close()
        finally:
            main.DB_PATH = current_db
        self.assertIn("execution_mode", columns)
        self.assertIn("started_at", columns)
        self.assertIn("progress_percent", columns)
        self.assertIn("progress_summary", columns)
        self.assertIn("progress_eta_seconds", columns)
        self.assertIn("duration_seconds", history_columns)
        self.assertIsNotNone(engineering)

    def test_in_progress_task_exposes_progress_and_estimated_remaining_time(self):
        started = (datetime.now(timezone.utc) - timedelta(seconds=45)).isoformat()
        conn = main.get_conn()
        try:
            agent = conn.execute("SELECT id,name FROM agents WHERE role='Lead Generation'").fetchone()
            conn.execute(
                "INSERT INTO tasks (id,title,description,assigned_agent_id,status,priority,execution_mode,"
                "started_at,progress_percent,progress_summary,progress_updated_at,created_at,updated_at) "
                "VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)",
                ("task_progress_api", "Research prospects", "Find prospects.", agent["id"], "in_progress",
                 "medium", "deliverable", started, 40, "Found 100 of 500 prospects; 400 still needed.",
                 main.now_iso(), started, main.now_iso()),
            )
            conn.execute(
                "INSERT INTO task_history (id,task_id,title,agent_name,status,output,created_at,finished_at,duration_seconds) "
                "VALUES (?,?,?,?,?,?,?,?,?)",
                ("history_progress_api", "prior", "Prior lead research", agent["name"], "done", "Completed.",
                 started, main.now_iso(), 240),
            )
            conn.commit()
        finally:
            conn.close()

        task = next(item for item in self.client.get("/api/tasks").json() if item["id"] == "task_progress_api")
        self.assertEqual(task["progress_percent"], 40)
        self.assertIn("100 of 500", task["progress_summary"])
        self.assertGreater(task["estimated_remaining_seconds"], 150)
        self.assertLess(task["estimated_remaining_seconds"], 210)
        self.assertEqual(task["estimated_duration_seconds"], 240)
        self.assertGreater(task["elapsed_seconds"], 40)

    def test_linked_local_image_is_attached_to_task_and_previewable(self):
        filename = "task-image-output.png"
        image_path = os.path.join(main.FILES_DIR, filename)
        with open(image_path, "wb") as image_file:
            image_file.write(b"\x89PNG\r\n\x1a\nimage")
        now = main.now_iso()
        conn = main.get_conn()
        try:
            agent = conn.execute("SELECT id,name FROM agents WHERE role='Software Engineering'").fetchone()
            output = f"Image created: [task-image-output.png]({image_path})"
            conn.execute(
                "INSERT INTO tasks (id,title,description,assigned_agent_id,status,priority,execution_mode,"
                "output,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?)",
                ("task_local_image", "Create a promotional image", "Create an image.", agent["id"], "done",
                 "high", "deliverable", output, now, now),
            )
            conn.commit()
        finally:
            conn.close()

        task = next(item for item in self.client.get("/api/tasks").json() if item["id"] == "task_local_image")
        self.assertEqual(len(task["media_files"]), 1)
        media = task["media_files"][0]
        self.assertEqual(media["name"], filename)
        preview = self.client.get(f"/api/files/{media['id']}/preview")
        self.assertEqual(preview.status_code, 200)
        self.assertEqual(preview.headers["content-type"], "image/png")
        registered = next(
            item for item in self.client.get("/api/files").json()
            if item["id"] == media["id"]
        )
        self.assertEqual(registered["task_id"], "task_local_image")

    def test_status_question_uses_full_persisted_task_board(self):
        now = main.now_iso()
        conn = main.get_conn()
        try:
            agent = conn.execute("SELECT id FROM agents WHERE name='LinkedIn'").fetchone()
            conn.execute(
                "INSERT INTO tasks (id,title,description,assigned_agent_id,status,priority,progress_summary,"
                "created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?)",
                ("task_grounded_status", "Find 50 LinkedIn profiles", "Find prospects.", agent["id"],
                 "blocked", "medium", "Partial delivery: saved 20 of 50; 30 remain.", now, now),
            )
            conn.commit()
        finally:
            conn.close()

        response = self.client.post(
            "/api/agent-reply",
            json={"sender": "user", "receiver": "CEO", "content": "What is the status of work?"},
        )
        self.assertEqual(response.status_code, 200)
        reply = response.json()["content"]
        self.assertIn("Find 50 LinkedIn profiles — blocked", reply)
        self.assertIn("saved 20 of 50", reply)
        self.assertNotIn("There are currently no tasks", reply)

    def test_status_question_selects_the_task_the_owner_is_asking_about(self):
        now = main.now_iso()
        conn = main.get_conn()
        try:
            agent = conn.execute("SELECT id FROM agents WHERE name='Engineering'").fetchone()
            conn.execute(
                "INSERT INTO tasks (id,title,description,assigned_agent_id,status,priority,result,created_at,updated_at) "
                "VALUES (?,?,?,?,?,?,?,?,?)",
                ("task_profile_code_status", "Build custom LinkedIn profile research code",
                 "Fetch 100 LinkedIn profile candidates using authorized sources.", agent["id"],
                 "in_progress", "high", "Found 12; 88 remain.", now, now),
            )
            conn.execute(
                "INSERT INTO tasks (id,title,description,assigned_agent_id,status,priority,result,created_at,updated_at) "
                "VALUES (?,?,?,?,?,?,?,?,?)",
                ("task_unrelated_status", "Improve website SEO", "Audit website meta tags.", agent["id"],
                 "blocked", "medium", "Waiting for website access.", now, now),
            )
            conn.commit()
        finally:
            conn.close()
        reply = main._team_status_reply("What is the status of scraping 100 profiles LinkedIn?")
        self.assertIn("Build custom LinkedIn profile research code — in progress", reply)
        self.assertIn("Found 12; 88 remain", reply)
        self.assertNotIn("Improve website SEO", reply)

    def test_chat_pause_and_resume_controls_agent_work_instead_of_claiming_it_stopped(self):
        paused = self.client.post(
            "/api/agent-reply",
            json={"sender": "user", "receiver": "CEO", "content": "stop all the work for now"},
        )
        self.assertEqual(paused.status_code, 200)
        self.assertTrue(paused.json()["operations"]["paused"])
        self.assertIn("queue is paused", paused.json()["content"].lower())
        self.assertIn("does not forcibly cancel", paused.json()["content"].lower())
        self.assertTrue(self.client.get("/api/operations/status").json()["paused"])
        with mock.patch.object(main, "_has_any_provider_key", side_effect=AssertionError("workers must stay paused")):
            asyncio.run(main._process_workers())
            asyncio.run(main._ceo_review_and_plan())
        resumed = self.client.post(
            "/api/agent-reply",
            json={"sender": "user", "receiver": "CEO", "content": "resume all work"},
        )
        self.assertEqual(resumed.status_code, 200)
        self.assertFalse(resumed.json()["operations"]["paused"])
        self.assertFalse(self.client.get("/api/operations/status").json()["paused"])

    def test_request_router_separates_code_work_from_media_deliverables(self):
        code_task = main._task_intent_fallback("Write a Python script to normalize my local CSV files.")
        image_task = main._task_intent_fallback("Generate a promotional image for Instagram.")
        self.assertEqual(code_task[0]["execution_mode"], "project")
        self.assertEqual(code_task[0]["assign_to"], "Engineering")
        self.assertEqual(image_task[0]["execution_mode"], "deliverable")
        self.assertEqual(image_task[0]["assign_to"], "Content")
        self.assertEqual(main._task_intent_fallback("What is the status of the current tasks?"), [])

    def test_partial_linkedin_deliverable_is_accepted_transparently(self):
        output = (
            "name,linkedin_profile_link,source_url\n"
            "Ada Lovelace,https://www.linkedin.com/in/ada-lovelace/,https://www.linkedin.com/in/ada-lovelace/\n"
            "Grace Hopper,https://www.linkedin.com/in/grace-hopper/,https://www.linkedin.com/in/grace-hopper/\n"
        )
        task = {
            "title": "Find 3 LinkedIn profiles",
            "description": "Return 3 profiles in a CSV.",
            "result": "Partial delivery: saved 2 of 3 requested profiles; 1 remains. Search limit reached.",
            "output": output,
        }
        self.assertEqual(main._validate_task_output(task, output), [])
        review = asyncio.run(main._review_task_output(task))
        self.assertEqual(review["decision"], "accept")
        self.assertIn("partial deliverable", review["feedback"])

    def test_partial_linkedin_search_saves_available_rows_instead_of_blocking_them(self):
        task_id = "task_partial_linkedin_search"
        started = (datetime.now(timezone.utc) - timedelta(seconds=30)).isoformat()
        conn = main.get_conn()
        try:
            agent = conn.execute("SELECT id FROM agents WHERE role='LinkedIn Data Scraping'").fetchone()
            conn.execute(
                "INSERT INTO tasks (id,title,description,assigned_agent_id,status,priority,execution_mode,"
                "started_at,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?)",
                (task_id, "Find 3 LinkedIn profiles", "Find 3 profiles.", agent["id"], "in_progress",
                 "medium", "deliverable", started, started, started),
            )
            conn.commit()
        finally:
            conn.close()

        async def limited_search(query, api_key=None, max_results=10):
            return [{
                "title": "Ada Lovelace - Quant Trader | LinkedIn",
                "url": "https://www.linkedin.com/in/ada-lovelace/",
                "content": "Quant trader and futures markets professional.",
            }]

        with mock.patch.object(main, "_tavily_search", side_effect=limited_search):
            output, outcome = asyncio.run(main._run_linkedin_profile_search({
                "id": task_id,
                "title": "Find 3 LinkedIn profiles",
                "description": "Find 3 profiles.",
                "context": "",
            }))
        self.assertTrue(outcome.startswith("PARTIAL_DELIVERY:"))
        self.assertIn("1 of 3", outcome)
        self.assertEqual(len(list(main.csv.DictReader(main.io.StringIO(output)))), 1)

    def test_partial_linkedin_review_moves_task_to_done_and_keeps_partial_label(self):
        output = (
            "name,linkedin_profile_link,source_url\n"
            "Ada Lovelace,https://www.linkedin.com/in/ada-lovelace/,https://www.linkedin.com/in/ada-lovelace/\n"
        )
        partial = "Partial delivery: saved 1 of 3 requested LinkedIn profile candidates; 2 remain."
        now = main.now_iso()
        conn = main.get_conn()
        try:
            agent = conn.execute("SELECT id FROM agents WHERE role='LinkedIn Data Scraping'").fetchone()
            conn.execute(
                "INSERT INTO tasks (id,title,description,assigned_agent_id,status,priority,execution_mode,output,"
                "result,progress_percent,progress_summary,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)",
                ("task_partial_review", "Find 3 LinkedIn profiles", "Find 3 profiles.", agent["id"], "review",
                 "medium", "deliverable", output, partial, 100, partial, now, now),
            )
            conn.commit()
        finally:
            conn.close()

        asyncio.run(main._ceo_review_and_plan())
        task = next(
            item for item in self.client.get("/api/tasks").json()
            if item["id"] == "task_partial_review"
        )
        self.assertEqual(task["status"], "done")
        self.assertIn("saved 1 of 3", task["progress_summary"])
        self.assertIn("saved 1 of 3", task["result"])

    def test_content_media_request_generates_and_saves_real_image(self):
        task = {"title": "Generate a promotional image for Instagram", "description": ""}
        self.assertEqual(main._requested_media_types(task), ["image"])
        self.assertEqual(main._guess_assignee(task["title"]), "Content")
        env_key = main._secret_env_key("gemini_api_key")
        original_key = os.environ.get(env_key)
        os.environ[env_key] = "test-gemini-key"
        image_bytes = b"\x89PNG\r\n\x1a\nvalid-test-png"
        response_body = {
            "status": "completed",
            "steps": [{
                "type": "model_output",
                "content": [{
                    "type": "image",
                    "mime_type": "image/png",
                    "data": main.base64.b64encode(image_bytes).decode("ascii"),
                }],
            }],
        }

        class FakeAsyncClient:
            def __init__(self, **kwargs):
                self.request = None

            async def __aenter__(self):
                return self

            async def __aexit__(self, exc_type, exc_value, traceback):
                return False

            async def post(self, url, headers, json):
                self.request = (url, headers, json)
                return main.httpx.Response(200, json=response_body, request=main.httpx.Request("POST", url))

        try:
            with mock.patch.object(main.httpx, "AsyncClient", FakeAsyncClient):
                content, extension, mime_type = asyncio.run(main._generate_gemini_media("image", "Create a graphic"))
            self.assertEqual(content, image_bytes)
            self.assertEqual(extension, "png")
            self.assertEqual(mime_type, "image/png")
            saved = main._save_agent_media_file(
                "task_generated_media", task["title"], "Content", "review",
                content, extension, mime_type,
            )
            task_row = {
                "id": "task_generated_media",
                "title": task["title"],
                "description": task["description"],
                "output": "Generated image file attached.",
            }
            conn = main.get_conn()
            try:
                agent = conn.execute("SELECT id FROM agents WHERE name='Content'").fetchone()
                now = main.now_iso()
                conn.execute(
                    "INSERT INTO tasks (id,title,description,assigned_agent_id,status,priority,output,created_at,updated_at) "
                    "VALUES (?,?,?,?,?,?,?,?,?)",
                    (task_row["id"], task_row["title"], "", agent["id"], "review", "medium",
                     task_row["output"], now, now),
                )
                conn.commit()
            finally:
                conn.close()
            listed = next(
                item for item in self.client.get("/api/tasks").json()
                if item["id"] == "task_generated_media"
            )
            self.assertEqual(listed["media_files"][0]["id"], saved["id"])
            preview = self.client.get(f"/api/files/{saved['id']}/preview")
            self.assertEqual(preview.status_code, 200)
            self.assertEqual(preview.content, image_bytes)
            self.assertIn("inline", preview.headers["content-disposition"])
        finally:
            if original_key is None:
                os.environ.pop(env_key, None)
            else:
                os.environ[env_key] = original_key

    def test_text_script_and_explicit_media_negation_do_not_request_video(self):
        task = {
            "title": "Create Instagram reel script for algo trading",
            "description": (
                "Write a detailed script covering strategy backtesting, multi-account live execution, "
                "and position management. Provide the output in a text file. Do not generate any video files."
            ),
        }
        self.assertEqual(main._requested_media_types(task), [])
        self.assertEqual(
            main._requested_media_types(
                {"title": "Write a storyboard for a promotional video", "description": ""}
            ),
            [],
        )
        self.assertEqual(
            main._requested_media_types(
                {"title": "Create an image prompt for Instagram", "description": ""}
            ),
            [],
        )
        self.assertEqual(
            main._requested_media_types({
                "title": "Prepare a Word report",
                "description": "Include a data summary.",
                "context": "Earlier conversation: create a video and generate an image.",
            }),
            [],
        )

    def test_media_provider_failure_keeps_the_requested_text_deliverable(self):
        agent = next(
            item for item in self.client.get("/api/agents").json()
            if item["role"] == "Content Creation"
        )
        now = (datetime.now(timezone.utc) - timedelta(seconds=30)).isoformat()
        conn = main.get_conn()
        try:
            conn.execute(
                "INSERT INTO tasks (id,title,description,assigned_agent_id,status,priority,execution_mode,"
                "created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?)",
                ("task_text_with_media", "Create a promotional video and a Word report",
                 "Write the report and generate an actual promotional video file.",
                 agent["id"], "in_progress", "medium", "deliverable", now, now),
            )
            conn.commit()
        finally:
            conn.close()
        with (
            mock.patch.object(main, "_has_any_provider_key", return_value=True),
            mock.patch.object(
                main, "call_llm",
                new=mock.AsyncMock(side_effect=["The requested Word report content.", "A detailed video prompt."]),
            ),
            mock.patch.object(
                main, "_generate_requested_media",
                new=mock.AsyncMock(side_effect=main.MediaGenerationError("account quota reached")),
            ),
        ):
            asyncio.run(main._process_workers())
        conn = main.get_conn()
        try:
            task = conn.execute(
                "SELECT status,output,result FROM tasks WHERE id='task_text_with_media'"
            ).fetchone()
        finally:
            conn.close()
        self.assertEqual(task["status"], "blocked")
        self.assertIn("The requested Word report content.", task["output"])
        self.assertIn("MEDIA GENERATION INCOMPLETE (text deliverable retained)", task["output"])
        self.assertNotEqual(task["output"].strip(), "account quota reached")

    def test_video_generation_uses_gemini_video_api_and_returns_mp4(self):
        task = {"title": "Create a promotional video reel"}
        self.assertEqual(main._requested_media_types(task), ["video"])
        self.assertEqual(
            main._requested_video_duration_seconds({"description": "Make a 10-second video."}),
            10,
        )
        with self.assertRaises(main.MediaGenerationError):
            main._requested_video_duration_seconds({"description": "Make a 20-second video."})
        env_key = main._secret_env_key("gemini_api_key")
        original_key = os.environ.get(env_key)
        os.environ[env_key] = "test-gemini-key"
        video_bytes = b"\x00\x00\x00\x18ftypisomfake-mp4"
        response_body = {
            "status": "completed",
            "steps": [{
                "type": "model_output",
                "content": [{
                    "type": "video",
                    "mime_type": "video/mp4",
                    "data": main.base64.b64encode(video_bytes).decode("ascii"),
                }],
            }],
        }

        class FakeAsyncClient:
            last_request = None

            def __init__(self, **kwargs):
                pass

            async def __aenter__(self):
                return self

            async def __aexit__(self, exc_type, exc_value, traceback):
                return False

            async def post(self, url, headers, json):
                FakeAsyncClient.last_request = (url, headers, json)
                return main.httpx.Response(200, json=response_body, request=main.httpx.Request("POST", url))

        try:
            with mock.patch.object(main.httpx, "AsyncClient", FakeAsyncClient):
                content, extension, mime_type = asyncio.run(
                    main._generate_gemini_media("video", "Create a vertical trading promo, 10-second video")
                )
            self.assertEqual(content, video_bytes)
            self.assertEqual(extension, "mp4")
            self.assertEqual(mime_type, "video/mp4")
            self.assertEqual(FakeAsyncClient.last_request[2]["response_format"]["duration"], "10s")
        finally:
            if original_key is None:
                os.environ.pop(env_key, None)
            else:
                os.environ[env_key] = original_key

    def test_deapi_model_selection_submits_and_downloads_real_image(self):
        model = {
            "slug": "deapi-test-image",
            "name": "Test image model",
            "inference_types": ["txt2img"],
            "info": {
                "defaults": {"width": 512, "height": 640, "steps": 6},
                "limits": {
                    "min_width": 256, "max_width": 1024, "min_height": 256,
                    "max_height": 1024, "dimension_multiple": 64,
                },
                "features": {"supports_steps": True},
            },
        }
        main.set_config("deapi_api_key", "test-deapi-key")
        main.set_config("deapi_models", json.dumps([model]))
        selection = self.client.post("/api/media/select-model", json={
            "media_type": "image", "model": model["slug"],
        })
        self.assertEqual(selection.status_code, 200, selection.text)
        image_bytes = b"\x89PNG\r\n\x1a\ntest-image"

        class FakeResponse:
            def __init__(self, status_code, payload=None):
                self.status_code = status_code
                self._payload = payload or {}

            def json(self):
                return self._payload

        class FakeStream:
            status_code = 200
            headers = {"content-type": "image/png", "content-length": str(len(image_bytes))}

            async def __aenter__(self):
                return self

            async def __aexit__(self, exc_type, exc_value, traceback):
                return False

            async def aiter_bytes(self):
                yield image_bytes

        class FakeAsyncClient:
            submitted_body = None

            def __init__(self, **kwargs):
                pass

            async def __aenter__(self):
                return self

            async def __aexit__(self, exc_type, exc_value, traceback):
                return False

            async def post(self, url, headers, json):
                FakeAsyncClient.submitted_body = json
                return FakeResponse(200, {"data": {"request_id": "job-test"}})

            async def get(self, url, headers):
                return FakeResponse(200, {
                    "data": {"status": "done", "result_url": "https://media.example/image.png"}
                })

            def stream(self, method, url):
                return FakeStream()

        with (
            mock.patch.object(main.httpx, "AsyncClient", FakeAsyncClient),
            mock.patch.object(main, "_assert_public_result_url"),
            mock.patch.object(main.asyncio, "sleep", new=mock.AsyncMock()),
        ):
            content, extension, mime_type = asyncio.run(
                main._generate_deapi_media("image", "Detailed test prompt")
            )
        self.assertEqual(content, image_bytes)
        self.assertEqual(extension, "png")
        self.assertEqual(mime_type, "image/png")
        self.assertEqual(FakeAsyncClient.submitted_body["model"], model["slug"])
        self.assertEqual(FakeAsyncClient.submitted_body["width"], 512)
        self.assertEqual(FakeAsyncClient.submitted_body["height"], 640)
        self.assertEqual(FakeAsyncClient.submitted_body["steps"], 6)

    def test_blocked_task_keeps_last_progress_and_downloadable_output(self):
        output = "name,linkedin_profile_link\nAda Lovelace,https://www.linkedin.com/in/ada-lovelace/\n"
        summary = "Found 208 of 500 LinkedIn profiles; 292 still needed. CSV saved for review."
        now = main.now_iso()
        conn = main.get_conn()
        try:
            agent = conn.execute("SELECT id FROM agents WHERE role='LinkedIn Data Scraping'").fetchone()
            conn.execute(
                "INSERT INTO tasks (id,title,description,assigned_agent_id,status,priority,execution_mode,"
                "output,progress_percent,progress_summary,created_at,updated_at) "
                "VALUES (?,?,?,?,?,?,?,?,?,?,?,?)",
                ("task_blocked_progress", "Find 500 profiles", "Find 500 profiles.", agent["id"], "blocked",
                 "medium", "deliverable", output, 90, summary, now, now),
            )
            conn.commit()
        finally:
            conn.close()

        task = next(
            item for item in self.client.get("/api/tasks").json()
            if item["id"] == "task_blocked_progress"
        )
        self.assertEqual(task["status"], "blocked")
        self.assertEqual(task["progress_percent"], 90)
        self.assertEqual(task["progress_summary"], summary)
        self.assertEqual(task["export_extension"], "csv")
        exported = self.client.get("/api/tasks/task_blocked_progress/export")
        self.assertEqual(exported.status_code, 200)
        self.assertIn("Ada Lovelace", exported.text)

    def test_linkedin_search_persists_batch_count_and_remaining_target(self):
        task_id = "task_linkedin_progress"
        started = (datetime.now(timezone.utc) - timedelta(seconds=30)).isoformat()
        conn = main.get_conn()
        try:
            agent = conn.execute("SELECT id FROM agents WHERE role='LinkedIn Data Scraping'").fetchone()
            conn.execute(
                "INSERT INTO tasks (id,title,description,assigned_agent_id,status,priority,execution_mode,"
                "started_at,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?)",
                (task_id, "Find 2 LinkedIn profiles", "Find 2 profiles.", agent["id"], "in_progress",
                 "medium", "deliverable", started, started, started),
            )
            conn.commit()
        finally:
            conn.close()

        async def fake_search(query, api_key=None, max_results=10):
            return [
                {"title": "John Doe - Prop Trader | LinkedIn", "url": "https://www.linkedin.com/in/john-doe/",
                 "content": "Proprietary trader. Public contact: john@example.org."},
                {"title": "Jane Smith - Trading Educator | LinkedIn", "url": "https://www.linkedin.com/in/jane-smith/",
                 "content": "Trading educator."},
            ]

        with mock.patch.object(main, "_tavily_search", side_effect=fake_search):
            output, blocker = asyncio.run(main._run_linkedin_profile_search({
                "id": task_id,
                "title": "Find 2 LinkedIn profiles",
                "description": "Find 2 profiles.",
                "context": "",
            }))
        self.assertEqual(blocker, "")
        rows = list(main.csv.DictReader(main.io.StringIO(output)))
        self.assertEqual(len(rows), 2)
        self.assertIn("public_email", rows[0])
        self.assertEqual(rows[0]["public_email"], "john@example.org")
        self.assertEqual(rows[1]["public_email"], "")
        task = next(item for item in self.client.get("/api/tasks").json() if item["id"] == task_id)
        self.assertEqual(task["progress_percent"], 90)
        self.assertIn("Found 2 of 2", task["progress_summary"])
        self.assertIn("0 still needed", task["progress_summary"])
        self.assertEqual(task["estimated_remaining_seconds"], 0)

    def test_linkedin_search_rejects_ambiguous_profile_urls(self):
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

    def test_successful_project_run_finishes_and_writes_short_memory(self):
        workspace = self._workspace()
        main.set_config("project_workspace", workspace)
        memory_path = os.path.join(self.temp_dir.name, "agent_memory.md")
        with open(memory_path, "w", encoding="utf-8") as memory_file:
            memory_file.write(
                "# Project agent memory (latest work; keep concise)\n"
                "- No completed project tasks yet.\n"
            )
        task_id = self._insert_project_task()

        async def fake_run(_row):
            return "Updated the parser and added regression coverage. Tests passed: 4."

        with mock.patch.object(main, "AGENT_MEMORY_PATH", memory_path), \
                mock.patch.object(main, "_run_project_task", side_effect=fake_run):
            asyncio.run(main._process_workers())

        conn = main.get_conn()
        try:
            task = conn.execute("SELECT status, output FROM tasks WHERE id=?", (task_id,)).fetchone()
        finally:
            conn.close()
        self.assertEqual(task["status"], "review")
        with mock.patch.object(main, "AGENT_MEMORY_PATH", memory_path), \
                mock.patch.object(
                    main,
                    "_review_task_output",
                    new=mock.AsyncMock(return_value={"decision": "accept", "feedback": "All requirements pass."}),
                ):
            asyncio.run(main._ceo_review_and_plan())
        conn = main.get_conn()
        try:
            task = conn.execute("SELECT status, output FROM tasks WHERE id=?", (task_id,)).fetchone()
            agent = conn.execute(
                "SELECT status, current_task_id FROM agents WHERE role='Software Engineering'"
            ).fetchone()
        finally:
            conn.close()
        self.assertEqual(task["status"], "done")
        self.assertIn("Tests passed: 4", task["output"])
        self.assertEqual(agent["status"], "idle")
        self.assertIsNone(agent["current_task_id"])
        with open(memory_path, encoding="utf-8") as memory_file:
            memory = memory_file.read()
        self.assertIn("Add a regression test", memory)
        self.assertNotIn("No completed project tasks yet.", memory)

    def test_codex_runner_uses_workspace_write_and_returns_final_message(self):
        workspace = self._workspace()
        main.set_config("project_workspace", workspace)
        task_id = self._insert_project_task()
        conn = main.get_conn()
        try:
            row = conn.execute("SELECT * FROM tasks WHERE id=?", (task_id,)).fetchone()
        finally:
            conn.close()
        call = {}

        class FakeProcess:
            def __init__(self):
                self.returncode = 0
                self.stdout = asyncio.StreamReader()
                self.stderr = asyncio.StreamReader()
                self.stdout.feed_eof()
                self.stderr.feed_eof()

            async def wait(self):
                return self.returncode

        async def fake_create_subprocess(*args, **kwargs):
            call["args"] = args
            call["cwd"] = kwargs["cwd"]
            output_path = args[args.index("--output-last-message") + 1]
            with open(output_path, "w", encoding="utf-8") as result_file:
                result_file.write("Changed the code. Tests passed: 4.")
            return FakeProcess()

        with mock.patch.object(main.shutil, "which", return_value="C:\\tools\\codex.exe"), \
                mock.patch.object(main.asyncio, "create_subprocess_exec", side_effect=fake_create_subprocess):
            output = asyncio.run(main._run_project_task(row))

        self.assertIn("Tests passed: 4", output)
        self.assertEqual(call["cwd"], workspace)
        self.assertIn("--sandbox", call["args"])
        self.assertIn("workspace-write", call["args"])
        self.assertIn("--ephemeral", call["args"])
        self.assertIn("Task: Add a regression test", call["args"][-1])
        logs = self.client.get("/api/project/logs").json()
        self.assertTrue(any("completed successfully" in entry["content"] for entry in logs))

    def test_failed_project_run_blocks_task_and_retry_requeues_it(self):
        workspace = self._workspace()
        main.set_config("project_workspace", workspace)
        task_id = self._insert_project_task()

        async def fake_run(_row):
            return "❌ Codex could not start."

        with mock.patch.object(main, "_run_project_task", side_effect=fake_run):
            asyncio.run(main._process_workers())

        with mock.patch.object(main.shutil, "which", return_value="C:\\tools\\codex.exe"):
            retry = self.client.post(f"/api/tasks/{task_id}/retry")
        self.assertEqual(retry.status_code, 200, retry.text)
        conn = main.get_conn()
        try:
            task = conn.execute("SELECT status FROM tasks WHERE id=?", (task_id,)).fetchone()
            retry_history = conn.execute(
                "SELECT COUNT(*) AS count FROM task_history WHERE task_id=? AND status='retry'",
                (task_id,),
            ).fetchone()["count"]
        finally:
            conn.close()
        self.assertEqual(task["status"], "assigned")
        self.assertEqual(retry_history, 1)

    def test_terminal_task_chat_resumes_same_task_and_preserves_previous_output(self):
        agent = next(
            item for item in self.client.get("/api/agents").json()
            if item["role"] == "Lead Generation"
        )
        now = main.now_iso()
        conn = main.get_conn()
        try:
            conn.execute(
                "INSERT INTO tasks (id,title,description,assigned_agent_id,status,priority,output,result,"
                "execution_mode,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?)",
                ("task_resume_chat", "Create a prospect report", "Build the report.", agent["id"],
                 "blocked", "high", "Previous verified output.", "Search provider unavailable.",
                 "deliverable", now, now),
            )
            conn.commit()
        finally:
            conn.close()

        response = self.client.post(
            "/api/tasks/task_resume_chat/chat",
            json={"content": "Please resume from last and convert the result to Word."},
        )
        self.assertEqual(response.status_code, 200, response.text)
        self.assertTrue(response.json()["resumed"])
        conn = main.get_conn()
        try:
            task = conn.execute(
                "SELECT status,description,output,result FROM tasks WHERE id='task_resume_chat'"
            ).fetchone()
            history = conn.execute(
                "SELECT status,output FROM task_history WHERE task_id='task_resume_chat'"
            ).fetchone()
        finally:
            conn.close()
        self.assertEqual(task["status"], "assigned")
        self.assertIn("convert the result to Word", task["description"])
        self.assertEqual(task["output"], "")
        self.assertEqual(history["status"], "blocked")
        self.assertIn("Previous verified output.", history["output"])
        chat = self.client.get("/api/tasks/task_resume_chat/chat").json()
        self.assertTrue(any("Previous run output is preserved" in message["content"] for message in chat))
        self.assertFalse(any(message.get("task_id") == "task_resume_chat" for message in self.client.get("/api/messages").json()))

    def test_specialist_escalates_to_engineering_and_gets_result_back(self):
        conn = main.get_conn()
        try:
            specialist = conn.execute(
                "SELECT id,name FROM agents WHERE role='Lead Generation'"
            ).fetchone()
            created = (datetime.now(timezone.utc) - timedelta(seconds=30)).isoformat()
            conn.execute(
                "INSERT INTO tasks (id,title,description,assigned_agent_id,status,priority,execution_mode,"
                "created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?)",
                ("task_parent_handoff", "Research qualified prospects", "Find qualified prospects.", specialist["id"],
                 "in_progress", "high", "deliverable", created, created),
            )
            conn.execute(
                "UPDATE agents SET status='working',current_task_id=? WHERE id=?",
                ("task_parent_handoff", specialist["id"]),
            )
            conn.commit()
        finally:
            conn.close()

        with (
            mock.patch.object(main, "_has_any_provider_key", return_value=True),
            mock.patch.object(main, "_task_requires_web_research", return_value=False),
            mock.patch.object(
                main,
                "call_llm",
                new=mock.AsyncMock(return_value=(
                    "A local browser workflow could help with user-authorized research.\n"
                    "[ENGINEERING PROJECT REQUEST]\n"
                    "Build a user-invoked local browser helper for an approved data source.\n"
                    "[/ENGINEERING PROJECT REQUEST]"
                )),
            ),
        ):
            asyncio.run(main._process_workers())

        conn = main.get_conn()
        try:
            parent = conn.execute(
                "SELECT status,result FROM tasks WHERE id='task_parent_handoff'"
            ).fetchone()
            child = conn.execute(
                "SELECT id,status,execution_mode,assigned_agent_id FROM tasks "
                "WHERE id IN (SELECT engineering_task_id FROM engineering_handoffs "
                "WHERE parent_task_id='task_parent_handoff')"
            ).fetchone()
            self.assertEqual(parent["status"], "waiting_engineering")
            self.assertIn("Engineering is working locally", parent["result"])
            self.assertIsNotNone(child)
            self.assertEqual(child["status"], "assigned")
            self.assertEqual(child["execution_mode"], "project")
            child_id = child["id"]
            conn.execute(
                "UPDATE tasks SET status='in_progress',created_at=?,updated_at=? WHERE id=?",
                ((datetime.now(timezone.utc) - timedelta(seconds=30)).isoformat(),
                 main.now_iso(), child_id),
            )
            conn.commit()
        finally:
            conn.close()

        with (
            mock.patch.object(main, "_has_any_provider_key", return_value=True),
            mock.patch.object(
                main,
                "_run_project_task",
                new=mock.AsyncMock(return_value="Implemented locally; targeted checks passed."),
            ),
        ):
            asyncio.run(main._process_workers())

        conn = main.get_conn()
        try:
            parent = conn.execute(
                "SELECT status,context FROM tasks WHERE id='task_parent_handoff'"
            ).fetchone()
            child = conn.execute("SELECT status,output FROM tasks WHERE id=?", (child_id,)).fetchone()
            handoff = conn.execute(
                "SELECT status FROM engineering_handoffs WHERE parent_task_id='task_parent_handoff'"
            ).fetchone()
            messages = conn.execute(
                "SELECT sender,receiver,content FROM messages WHERE receiver=?",
                (specialist["name"],),
            ).fetchall()
        finally:
            conn.close()
        self.assertEqual(parent["status"], "assigned")
        self.assertIn("ENGINEERING IMPLEMENTATION RESULT", parent["context"])
        self.assertIn("targeted checks passed", parent["context"])
        self.assertEqual(child["status"], "done")
        self.assertIn("targeted checks passed", child["output"])
        self.assertEqual(handoff["status"], "completed")
        self.assertTrue(any(message["sender"] == "Engineering" for message in messages))

    def test_worker_queue_dispatches_only_one_backlog_task(self):
        conn = main.get_conn()
        try:
            now = main.now_iso()
            for task_id in ("task_serial_one", "task_serial_two"):
                conn.execute(
                    "INSERT INTO tasks (id,title,description,status,priority,created_at,updated_at) "
                    "VALUES (?,?,?,?,?,?,?)",
                    (task_id, task_id, "Run this task.", "backlog", "medium", now, now),
                )
            conn.commit()
        finally:
            conn.close()

        with mock.patch.object(main, "_has_any_provider_key", return_value=True):
            asyncio.run(main._process_workers())

        conn = main.get_conn()
        try:
            assigned = conn.execute(
                "SELECT COUNT(*) FROM tasks WHERE status IN ('assigned','in_progress')"
            ).fetchone()[0]
            backlog = conn.execute("SELECT COUNT(*) FROM tasks WHERE status='backlog'").fetchone()[0]
        finally:
            conn.close()
        self.assertEqual(assigned, 1)
        self.assertEqual(backlog, 1)

    def test_agent_schedule_enqueues_once_and_keeps_agent_assignment(self):
        agent = self.client.get("/api/agents").json()[1]
        local_time = datetime.now().astimezone().strftime("%H:%M")
        response = self.client.post(
            f"/api/agents/{agent['id']}/schedules",
            json={
                "title": "Scheduled review",
                "description": "Review the latest company work.",
                "frequency": "daily",
                "local_time": local_time,
            },
        )
        self.assertEqual(response.status_code, 200, response.text)

        main._enqueue_due_agent_schedules()
        main._enqueue_due_agent_schedules()
        conn = main.get_conn()
        try:
            tasks = conn.execute(
                "SELECT assigned_agent_id,status FROM tasks WHERE title='Scheduled review'"
            ).fetchall()
        finally:
            conn.close()
        self.assertEqual(len(tasks), 1)
        self.assertEqual(tasks[0]["assigned_agent_id"], agent["id"])
        self.assertEqual(tasks[0]["status"], "backlog")

    def test_custom_agents_are_editable_and_deactivated_without_losing_history(self):
        response = self.client.post(
            "/api/agents",
            json={
                "name": "Research Partner",
                "job_title": "Market Research Specialist",
                "display_icon": "🔎",
                "job_profile": "Analyze public market evidence and cite sources.",
            },
        )
        self.assertEqual(response.status_code, 200, response.text)
        agent_id = response.json()["id"]
        listed = self.client.get("/api/agents").json()
        custom = next(agent for agent in listed if agent["id"] == agent_id)
        self.assertEqual(custom["role"], "Market Research Specialist")
        updated = self.client.put(
            f"/api/agents/{agent_id}",
            json={
                "name": "Research Partner",
                "job_title": "Market Analyst",
                "display_icon": "🔎",
                "job_profile": "Analyze public market evidence and cite every source.",
                "voice_profile": "",
            },
        )
        self.assertEqual(updated.status_code, 200, updated.text)
        deleted = self.client.delete(f"/api/agents/{agent_id}")
        self.assertEqual(deleted.status_code, 200, deleted.text)
        self.assertNotIn(agent_id, [agent["id"] for agent in self.client.get("/api/agents").json()])
        builtin = next(
            agent for agent in self.client.get("/api/agents").json()
            if agent["role"] == "Chief Executive Officer"
        )
        self.assertEqual(self.client.delete(f"/api/agents/{builtin['id']}").status_code, 409)

    def test_local_profile_is_required_and_grounded(self):
        initial = self.client.get("/api/profile").json()
        self.assertEqual(initial["dashboard_name"], "Pin2Pin")
        self.assertFalse(initial["complete"])
        response = self.client.post(
            "/api/profile",
            json={
                "owner_name": "A. Owner",
                "company_name": "Example Studio",
                "company_description": "Builds reporting software for small retailers.",
                "company_website": "https://example.test",
            },
        )
        self.assertEqual(response.status_code, 200, response.text)
        self.assertTrue(response.json()["complete"])
        context = main._company_prompt_context()
        self.assertIn("Example Studio", context)
        self.assertIn("small retailers", context)
        self.assertEqual(
            self.client.post("/api/profile", json={
                "owner_name": "A. Owner",
                "company_name": "Example Studio",
                "company_website": "javascript:alert(1)",
            }).status_code,
            422,
        )

    def test_new_provider_formats_are_registered(self):
        self.assertEqual(main.PROVIDER_CONFIG["anthropic"]["format"], "anthropic")
        self.assertEqual(main.PROVIDER_CONFIG["openai"]["format"], "openai")
        self.assertEqual(main.PROVIDER_CONFIG["xai"]["format"], "openai")
        self.assertEqual(main.PROVIDER_CONFIG["codex"]["format"], "openai_responses")
        self.assertIn("nousresearch/hermes-4-405b", main.PROVIDER_MODELS["openrouter"])

    def test_console_output_is_safe_for_legacy_windows_encodings(self):
        class Cp1252Stream:
            encoding = "cp1252"

            def __init__(self):
                self.value = ""

            def write(self, text):
                self.value += text.encode(self.encoding).decode(self.encoding)

        stream = Cp1252Stream()
        with mock.patch.object(main.sys, "stdout", stream):
            main._console_print("model ✅")
        self.assertEqual(stream.value, r"model \u2705" + "\n")

    def test_anthropic_and_codex_responses_are_parsed(self):
        class FakeResponse:
            status_code = 200
            text = "ok"

            def __init__(self, data):
                self.data = data

            def json(self):
                return self.data

        class FakeClient:
            def __init__(self, response):
                self.response = response
                self.request = None

            async def __aenter__(self):
                return self

            async def __aexit__(self, *_args):
                return None

            async def post(self, url, headers, json):
                self.request = {"url": url, "headers": headers, "json": json}
                return self.response

        cases = (
            ("anthropic", {"content": [{"type": "text", "text": "Claude result"}], "stop_reason": "end_turn"}),
            ("codex", {"output_text": "Codex result", "status": "completed"}),
        )
        for provider, response_data in cases:
            with self.subTest(provider=provider):
                fake_client = FakeClient(FakeResponse(response_data))

                def config_value(key, default=""):
                    if key == f"{provider}_api_key":
                        return "test-key"
                    if key == "auto_failover":
                        return "0"
                    return default

                with (
                    mock.patch.object(main, "_models_for_provider", return_value=["test-model"]),
                    mock.patch.object(main, "get_config", side_effect=config_value),
                    mock.patch.object(main, "set_config"),
                    mock.patch.object(main.httpx, "AsyncClient", return_value=fake_client),
                ):
                    result = asyncio.run(main._call_provider(provider, "system", "user"))

                self.assertIn("result", result.lower())
                self.assertEqual(fake_client.request["url"], main.PROVIDER_CONFIG[provider]["url"])
                self.assertEqual(fake_client.request["json"]["model"], "test-model")
                if provider == "anthropic":
                    self.assertIn("x-api-key", fake_client.request["headers"])
                    self.assertEqual(fake_client.request["json"]["system"], "system")
                else:
                    self.assertIn("Authorization", fake_client.request["headers"])
                    self.assertEqual(fake_client.request["json"]["instructions"], "system")


if __name__ == "__main__":
    unittest.main()
