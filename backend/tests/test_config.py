from app.core.config import Settings


def test_settings_load_values_from_env_file(tmp_path):
    env_file = tmp_path / ".env"
    env_file.write_text(
        "JWT_SECRET_KEY=env-file-secret-with-at-least-32-characters\n"
        "ACCESS_TOKEN_EXPIRE_MINUTES=45\n",
        encoding="utf-8",
    )

    settings = Settings(_env_file=env_file)

    assert settings.jwt_secret_key == "env-file-secret-with-at-least-32-characters"
    assert settings.access_token_expire_minutes == 45


def test_process_environment_overrides_env_file(tmp_path, monkeypatch):
    env_file = tmp_path / ".env"
    env_file.write_text(
        "JWT_SECRET_KEY=env-file-secret-with-at-least-32-characters\n",
        encoding="utf-8",
    )
    monkeypatch.setenv("JWT_SECRET_KEY", "process-env-secret-with-at-least-32-characters")

    settings = Settings(_env_file=env_file)

    assert settings.jwt_secret_key == "process-env-secret-with-at-least-32-characters"
