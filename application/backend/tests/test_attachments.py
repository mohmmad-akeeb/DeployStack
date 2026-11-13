import io

from fastapi.testclient import TestClient

from tests.test_projects import register_and_login


def test_attachment_upload_download_delete_lifecycle(client: TestClient) -> None:
    """Verify file upload to MinIO, streaming download proxy, and S3 purge upon deletion."""
    owner_headers = register_and_login(client, "att_lead@deploystack.local", "Att Lead")

    # 1. Project & Task setup
    proj_id = client.post(
        "/api/v1/projects",
        headers=owner_headers,
        json={"name": "Attachment Project"},
    ).json()["id"]

    task_id = client.post(
        "/api/v1/tasks",
        headers=owner_headers,
        json={"project_id": proj_id, "title": "Architecture Review"},
    ).json()["id"]

    # 2. Upload file attachment
    fake_png_data = b"\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR" + b"sample-bytes" * 50
    upload_res = client.post(
        f"/api/v1/tasks/{task_id}/attachments",
        headers=owner_headers,
        files={"file": ("architecture_diagram.png", io.BytesIO(fake_png_data), "image/png")},
    )
    assert upload_res.status_code == 201
    att_data = upload_res.json()
    att_id = att_data["id"]
    assert att_data["file_name"] == "architecture_diagram.png"
    assert att_data["file_size"] == len(fake_png_data)
    assert att_data["content_type"] == "image/png"
    assert att_data["uploader"]["email"] == "att_lead@deploystack.local"

    # 3. List attachments for task
    list_res = client.get(f"/api/v1/tasks/{task_id}/attachments", headers=owner_headers)
    assert list_res.status_code == 200
    assert len(list_res.json()) == 1

    # 4. Download attachment stream
    download_res = client.get(f"/api/v1/attachments/{att_id}/download", headers=owner_headers)
    assert download_res.status_code == 200
    assert download_res.content == fake_png_data
    assert "architecture_diagram.png" in download_res.headers["Content-Disposition"]
    assert download_res.headers["Content-Type"] == "image/png"

    # 5. Delete attachment
    del_res = client.delete(f"/api/v1/attachments/{att_id}", headers=owner_headers)
    assert del_res.status_code == 204

    # 6. Verify 404 after deletion
    assert (
        client.get(f"/api/v1/attachments/{att_id}/download", headers=owner_headers).status_code
        == 404
    )


def test_attachment_upload_validations(client: TestClient) -> None:
    """Verify empty file rejection and authorization guards."""
    owner_headers = register_and_login(client, "val_lead@deploystack.local", "Val Lead")
    stranger_headers = register_and_login(client, "stranger@deploystack.local", "Stranger")

    proj_id = client.post(
        "/api/v1/projects",
        headers=owner_headers,
        json={"name": "Validation Project"},
    ).json()["id"]

    task_id = client.post(
        "/api/v1/tasks",
        headers=owner_headers,
        json={"project_id": proj_id, "title": "Validation Task"},
    ).json()["id"]

    # 1. Empty file rejected with 400
    empty_res = client.post(
        f"/api/v1/tasks/{task_id}/attachments",
        headers=owner_headers,
        files={"file": ("empty.txt", io.BytesIO(b""), "text/plain")},
    )
    assert empty_res.status_code == 400

    # 2. Non-member cannot upload -> 403 Forbidden
    unauth_upload = client.post(
        f"/api/v1/tasks/{task_id}/attachments",
        headers=stranger_headers,
        files={"file": ("hack.txt", io.BytesIO(b"data"), "text/plain")},
    )
    assert unauth_upload.status_code == 403
