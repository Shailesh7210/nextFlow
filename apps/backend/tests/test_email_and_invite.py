import pytest
from unittest.mock import patch, MagicMock
from httpx import AsyncClient, ASGITransport
from app.main import app
from app.core.email import send_email, send_invite_email
from app.core.config import settings

@pytest.mark.asyncio
async def test_send_email_disabled_when_no_host():
    with patch.object(settings, "SMTP_HOST", ""):
        result = send_email("test@example.com", "Subject", "<h1>Test</h1>")
        assert result is False

@pytest.mark.asyncio
async def test_send_email_with_mock_smtp():
    with patch.object(settings, "SMTP_HOST", "smtp.test.com"), \
         patch.object(settings, "SMTP_PORT", 587), \
         patch.object(settings, "SMTP_USER", "user@test.com"), \
         patch.object(settings, "SMTP_PASSWORD", "secret"), \
         patch("smtplib.SMTP") as mock_smtp_cls:
        
        mock_server = MagicMock()
        mock_smtp_cls.return_value = mock_server

        result = send_email("recipient@example.com", "Test Subject", "<p>Hello World</p>", "Hello World")
        assert result is True
        mock_server.starttls.assert_called_once()
        mock_server.login.assert_called_once_with("user@test.com", "secret")
        mock_server.sendmail.assert_called_once()
        mock_server.quit.assert_called_once()

@pytest.mark.asyncio
async def test_send_invite_email_format():
    with patch("app.core.email.send_email") as mock_send_email:
        mock_send_email.return_value = True

        res = send_invite_email(
            to_email="invited@example.com",
            workspace_name="Engineering Workspace",
            inviter_name="Alice Owner",
            role="editor",
            temp_password="Nex_TempPass123!"
        )
        assert res is True
        mock_send_email.assert_called_once()
        args, kwargs = mock_send_email.call_args
        assert args[0] == "invited@example.com"
        assert "Engineering Workspace" in args[1]
        assert "Nex_TempPass123!" in args[2]  # HTML contains temp password

@pytest.mark.asyncio
async def test_workspace_invite_triggers_email_background_task(db_session):
    import uuid
    db = db_session
    from app.models.user import User
    from app.models.workspace import Workspace
    from app.models.workspace_member import WorkspaceMember
    from app.core.security import get_password_hash, create_access_token

    uid = uuid.uuid4().hex[:8]
    owner_email = f"owner_{uid}@example.com"
    target_email = f"invited_{uid}@example.com"

    # Setup owner & workspace
    owner = User(email=owner_email, hashed_password=get_password_hash("pass123"), full_name="Owner User")
    db.add(owner)
    await db.flush()

    workspace = Workspace(name="Invite Test Workspace")
    db.add(workspace)
    await db.flush()

    member = WorkspaceMember(workspace_id=workspace.id, user_id=owner.id, role="owner")
    db.add(member)
    await db.commit()

    token = create_access_token(subject=owner.id)

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        with patch("app.api.v1.workspaces.send_invite_email") as mock_send_invite:
            response = await ac.post(
                "/api/v1/workspaces/members/invite",
                headers={
                    "Authorization": f"Bearer {token}",
                    "X-Workspace-Id": workspace.id
                },
                json={
                    "email": target_email,
                    "role": "admin"
                }
            )
            assert response.status_code == 201
            data = response.json()
            assert data["email"] == target_email
            assert data["role"] == "admin"
            assert data["email_queued"] is True
            mock_send_invite.assert_called_once()
            _, kwargs = mock_send_invite.call_args
            assert kwargs["to_email"] == target_email
            assert kwargs["workspace_name"] == "Invite Test Workspace"
            assert kwargs["temp_password"] is not None
            assert kwargs["temp_password"].startswith("Nex_")
