"""
Integration tests for HTTP routes.

Uses Flask's test client – no real network calls, no agents started.
"""

import json
import pytest


class TestHealthEndpoint:
    def test_returns_200(self, client):
        resp = client.get("/health")
        assert resp.status_code == 200

    def test_returns_ok_status(self, client):
        resp = client.get("/health")
        data = resp.get_json()
        assert data == {"status": "ok"}

    def test_content_type_json(self, client):
        resp = client.get("/health")
        assert "application/json" in resp.content_type


class TestIndexEndpoint:
    def test_returns_200(self, client):
        resp = client.get("/")
        assert resp.status_code == 200

    def test_contains_zirak(self, client):
        resp = client.get("/")
        assert b"Zirak" in resp.data


class TestQueryEndpoint:
    def test_returns_workflow_id(self, client):
        resp = client.post(
            "/api/query",
            data=json.dumps({"message": "Build a Python CLI tool"}),
            content_type="application/json",
        )
        assert resp.status_code == 200
        data = resp.get_json()
        assert "workflow_id" in data
        assert len(data["workflow_id"]) > 0

    def test_rejects_empty_message(self, client):
        resp = client.post(
            "/api/query",
            data=json.dumps({"message": ""}),
            content_type="application/json",
        )
        assert resp.status_code == 400
        data = resp.get_json()
        assert "error" in data

    def test_rejects_missing_body(self, client):
        resp = client.post("/api/query", content_type="application/json")
        assert resp.status_code == 400

    def test_rejects_whitespace_only_message(self, client):
        resp = client.post(
            "/api/query",
            data=json.dumps({"message": "   "}),
            content_type="application/json",
        )
        assert resp.status_code == 400

    def test_workflow_id_is_uuid_format(self, client):
        import re
        resp = client.post(
            "/api/query",
            data=json.dumps({"message": "Do something"}),
            content_type="application/json",
        )
        data = resp.get_json()
        uuid_re = re.compile(
            r"^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$"
        )
        assert uuid_re.match(data["workflow_id"])

    def test_unique_workflow_ids(self, client):
        ids = set()
        for _ in range(5):
            resp = client.post(
                "/api/query",
                data=json.dumps({"message": "hello"}),
                content_type="application/json",
            )
            ids.add(resp.get_json()["workflow_id"])
        assert len(ids) == 5  # all unique


class TestCORSHeaders:
    def test_cors_header_present(self, client):
        resp = client.get("/health", headers={"Origin": "http://localhost:3000"})
        # CORS middleware should add this
        assert resp.headers.get("Access-Control-Allow-Origin") is not None

    def test_options_preflight(self, client):
        resp = client.options(
            "/api/query",
            headers={
                "Origin": "http://localhost:3000",
                "Access-Control-Request-Method": "POST",
            },
        )
        # Flask-CORS should handle the preflight
        assert resp.status_code in (200, 204)
