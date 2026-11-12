import os
import tempfile
import unittest

from fastapi import WebSocketDisconnect
from fastapi.testclient import TestClient
from starlette.routing import Route, WebSocketRoute

from backend import main


async def _guard_test_websocket(websocket):
    await websocket.accept()
    await websocket.send_text("accepted")


class RequestGuardTests(unittest.TestCase):
    websocket_path = "/__request_guard_test__"

    def setUp(self):
        self.temp_dir = tempfile.TemporaryDirectory()
        self.original_paths = {
            "DB_PATH": main.DB_PATH,
            "FILES_DIR": main.FILES_DIR,
            "CREDENTIALS_DIR": main.CREDENTIALS_DIR,
            "CONVERSATIONS_DIR": main.CONVERSATIONS_DIR,
            "AGENT_MEMORY_PATH": main.AGENT_MEMORY_PATH,
            "TEAM_MEMORY_PATH": main.TEAM_MEMORY_PATH,
            "DAILY_LEARNING_PATH": main.DAILY_LEARNING_PATH,
            "DOTENV_PATH": main.DOTENV_PATH,
        }
        self.original_extra_hosts = os.environ.get("PIN2PIN_EXTRA_ALLOWED_HOSTS")
        os.environ["PIN2PIN_EXTRA_ALLOWED_HOSTS"] = "testserver"
        for name, filename in (
            ("DB_PATH", "team.db"),
            ("FILES_DIR", "files"),
            ("CREDENTIALS_DIR", "credentials"),
            ("CONVERSATIONS_DIR", "conversations"),
            ("AGENT_MEMORY_PATH", "agent_memory.md"),
            ("TEAM_MEMORY_PATH", "agents.md"),
            ("DAILY_LEARNING_PATH", "daily_learning.md"),
            ("DOTENV_PATH", ".env"),
        ):
            setattr(main, name, os.path.join(self.temp_dir.name, filename))
        os.makedirs(main.FILES_DIR, exist_ok=True)
        os.makedirs(main.CREDENTIALS_DIR, exist_ok=True)

        self.websocket_route = WebSocketRoute(
            self.websocket_path, _guard_test_websocket
        )
        main.app.router.routes.append(self.websocket_route)
        async def guard_test_write_route():
            return {"ok": True}

        self.write_route = Route(
            "/__request_guard_write__",
            guard_test_write_route,
            methods=["PUT", "PATCH", "DELETE"],
        )
        main.app.router.routes.append(self.write_route)
        self.client = TestClient(main.app)
        self.client.__enter__()

    def tearDown(self):
        self.client.__exit__(None, None, None)
        main.app.router.routes.remove(self.websocket_route)
        main.app.router.routes.remove(self.write_route)
        for name, path in self.original_paths.items():
            setattr(main, name, path)
        if self.original_extra_hosts is None:
            os.environ.pop("PIN2PIN_EXTRA_ALLOWED_HOSTS", None)
        else:
            os.environ["PIN2PIN_EXTRA_ALLOWED_HOSTS"] = self.original_extra_hosts
        self.temp_dir.cleanup()

    def _post_config(self, headers=None):
        return self.client.post(
            "/api/config",
            headers=headers or {},
            json={"key": "request_guard_test", "value": "ok"},
        )

    def test_allowed_host_can_read_and_write(self):
        host = f"127.0.0.1:{main.APP_PORT}"
        self.assertEqual(self.client.get("/", headers={"host": host}).status_code, 200)
        response = self._post_config(headers={"host": host})
        self.assertEqual(response.status_code, 200, response.text)

    def test_security_headers_cover_dashboard_api_and_static_files(self):
        expected = {
            "x-frame-options": "DENY",
            "content-security-policy": "frame-ancestors 'none'",
            "x-content-type-options": "nosniff",
            "referrer-policy": "no-referrer",
        }
        for path in ("/", "/api/health", "/static/js/app.js"):
            with self.subTest(path=path):
                response = self.client.get(path)
                self.assertEqual(response.status_code, 200, response.text)
                for name, value in expected.items():
                    self.assertEqual(response.headers.get(name), value)

    def test_default_allowlists_exclude_test_host(self):
        os.environ.pop("PIN2PIN_EXTRA_ALLOWED_HOSTS", None)
        hosts, origins = main._local_request_allowlists()
        self.assertEqual(
            hosts,
            {f"127.0.0.1:{main.APP_PORT}", f"localhost:{main.APP_PORT}"},
        )
        self.assertEqual(
            origins,
            {
                f"http://127.0.0.1:{main.APP_PORT}",
                f"http://localhost:{main.APP_PORT}",
            },
        )
        self.assertNotIn("testserver", hosts)

    def test_malformed_extra_hosts_are_ignored(self):
        for value in ("http://evil.example", "evil.example/path"):
            with self.subTest(value=value):
                os.environ["PIN2PIN_EXTRA_ALLOWED_HOSTS"] = value
                hosts, origins = main._local_request_allowlists()
                self.assertEqual(
                    hosts,
                    {f"127.0.0.1:{main.APP_PORT}", f"localhost:{main.APP_PORT}"},
                )
                self.assertEqual(
                    origins,
                    {
                        f"http://127.0.0.1:{main.APP_PORT}",
                        f"http://localhost:{main.APP_PORT}",
                    },
                )

    def test_host_with_wrong_port_is_rejected(self):
        response = self.client.get("/", headers={"host": "127.0.0.1:9999"})
        self.assertEqual(response.status_code, 403)
        self.assertEqual(response.json(), {"detail": "Forbidden"})

    def test_null_origin_is_rejected_for_post(self):
        response = self._post_config(headers={
            "host": "testserver",
            "origin": "null",
        })
        self.assertEqual(response.status_code, 403)
        self.assertEqual(response.json(), {"detail": "Forbidden"})

    def test_all_write_methods_reject_foreign_origin(self):
        for method in ("PUT", "PATCH", "DELETE"):
            with self.subTest(method=method):
                response = self.client.request(
                    method,
                    "/__request_guard_write__",
                    headers={
                        "host": "testserver",
                        "origin": "http://evil.example",
                    },
                )
                self.assertEqual(response.status_code, 403)
                self.assertEqual(response.json(), {"detail": "Forbidden"})

    def test_foreign_origin_get_is_allowed(self):
        # A foreign page cannot read this response; Host validation remains active.
        response = self.client.get(
            "/api/health",
            headers={"host": "testserver", "origin": "http://evil.example"},
        )
        self.assertEqual(response.status_code, 200, response.text)

    def test_uploaded_html_and_svg_download_but_cannot_preview(self):
        fixtures = (
            ("x.html", b"<script>window.__pwned=1</script>", "text/html"),
            (
                "x.svg",
                b'<svg xmlns="http://www.w3.org/2000/svg"><script>window.__pwned=1</script></svg>',
                "image/svg+xml",
            ),
            ("x.png", b"\x89PNG\r\n\x1a\n", "image/png"),
        )
        for filename, content, mime_type in fixtures:
            with self.subTest(filename=filename):
                upload = self.client.post(
                    "/api/files/upload",
                    files={"file": (filename, content, mime_type)},
                )
                self.assertEqual(upload.status_code, 200, upload.text)
                file_id = upload.json()["id"]

                download = self.client.get(f"/api/files/{file_id}/download")
                self.assertEqual(download.status_code, 200)
                self.assertIn("attachment", download.headers["content-disposition"].lower())
                self.assertEqual(download.headers["x-content-type-options"], "nosniff")

                preview = self.client.get(f"/api/files/{file_id}/preview")
                if filename == "x.png":
                    self.assertEqual(preview.status_code, 200, preview.text)
                    self.assertEqual(preview.headers["content-type"], "image/png")
                    self.assertEqual(preview.headers["content-disposition"], "inline")
                else:
                    self.assertEqual(preview.status_code, 415)

    def test_untrusted_host_is_rejected(self):
        response = self.client.get("/", headers={"host": "evil.example"})
        self.assertEqual(response.status_code, 403)
        self.assertEqual(response.json(), {"detail": "Forbidden"})

    def test_foreign_origin_is_rejected_for_json_and_multipart_posts(self):
        headers = {
            "host": "testserver",
            "origin": "http://evil.example",
        }
        self.assertEqual(self._post_config(headers=headers).status_code, 403)
        upload = self.client.post(
            "/api/files/upload",
            headers=headers,
            files={"file": ("safe.txt", b"test", "text/plain")},
        )
        self.assertEqual(upload.status_code, 403)
        self.assertEqual(os.listdir(main.FILES_DIR), [])

    def test_local_origins_are_allowed(self):
        for hostname in ("127.0.0.1", "localhost"):
            host = f"{hostname}:{main.APP_PORT}"
            response = self._post_config(headers={
                "host": host,
                "origin": f"http://{host}",
            })
            self.assertEqual(response.status_code, 200, response.text)

    def test_cross_site_fetch_metadata_without_origin_is_rejected(self):
        for value in ("cross-site", ""):
            response = self._post_config(headers={
                "host": "testserver",
                "sec-fetch-site": value,
            })
            self.assertEqual(response.status_code, 403)

    def test_non_browser_post_without_origin_or_fetch_metadata_is_allowed(self):
        response = self._post_config(headers={"host": "testserver"})
        self.assertEqual(response.status_code, 200, response.text)
        for value in ("same-origin", "none"):
            response = self._post_config(headers={
                "host": "testserver",
                "sec-fetch-site": value,
            })
            self.assertEqual(response.status_code, 200, response.text)

    def test_websocket_origin_policy(self):
        host = f"127.0.0.1:{main.APP_PORT}"
        with self.assertRaises(WebSocketDisconnect) as rejected:
            with self.client.websocket_connect(
                self.websocket_path,
                headers={"host": host, "origin": "http://evil.example"},
            ):
                pass
        self.assertEqual(rejected.exception.code, 1008)

        for origin in (f"http://{host}", None):
            headers = {"host": host}
            if origin is not None:
                headers["origin"] = origin
            with self.client.websocket_connect(self.websocket_path, headers=headers) as websocket:
                self.assertEqual(websocket.receive_text(), "accepted")
