"""Local model ownership/readiness without starting a process or using the network."""

from contextlib import nullcontext
import io
import json
import subprocess
from unittest.mock import Mock
import urllib.error

import pytest

from app import local_ai
from app.llm import LLMChain


@pytest.fixture(autouse=True)
def isolated_environment(monkeypatch):
    for name in ("LOCAL_AI_AUTOSTART", "LLM_API_URL", "LLM_API_KEY", "LLAMA_API_KEY", "LLM_MODEL", "NVIDIA_API_KEY"):
        monkeypatch.delenv(name, raising=False)


@pytest.fixture
def runtime(monkeypatch, tmp_path):
    monkeypatch.setattr(local_ai, "PROJECT_ROOT", tmp_path)
    directory = tmp_path / ".local-ai" / "runtime" / "portable"
    directory.mkdir(parents=True)
    executable = directory / "llama-server.exe"
    executable.touch()
    model = tmp_path / ".local-ai" / local_ai.MODEL_FILE
    model.touch()
    monkeypatch.setenv("LOCAL_AI_AUTOSTART", "1")
    monkeypatch.setenv("LLM_API_URL", "http://127.0.0.1:18089/v1")
    monkeypatch.setenv("LLM_MODEL", "test-local-model")

    connect = Mock(side_effect=ConnectionRefusedError())
    monkeypatch.setattr(local_ai.socket, "create_connection", connect)
    process = Mock(pid=12345)
    process.poll.return_value = None
    process.wait.return_value = 0
    spawn = Mock(return_value=process)
    monkeypatch.setattr(local_ai.subprocess, "Popen", spawn)
    return {"executable": executable, "model": model, "connect": connect, "process": process, "spawn": spawn}


@pytest.mark.parametrize("enabled", [None, "0", "true", ""])
def test_local_autostart_requires_explicit_opt_in(runtime, monkeypatch, enabled):
    if enabled is None:
        monkeypatch.delenv("LOCAL_AI_AUTOSTART")
    else:
        monkeypatch.setenv("LOCAL_AI_AUTOSTART", enabled)
    with local_ai.local_runtime() as process:
        assert process is None
    runtime["connect"].assert_not_called()
    runtime["spawn"].assert_not_called()


def test_occupied_local_port_never_takes_ownership(runtime):
    runtime["connect"].side_effect = None
    runtime["connect"].return_value = nullcontext()
    with local_ai.local_runtime() as process:
        assert process is None
    runtime["connect"].assert_called_once_with(("127.0.0.1", 18089), timeout=0.3)
    runtime["spawn"].assert_not_called()
    runtime["process"].terminate.assert_not_called()
    runtime["process"].kill.assert_not_called()


def test_owned_process_uses_project_files_and_loopback_then_closes(runtime):
    with local_ai.local_runtime() as process:
        assert process is runtime["process"]
        runtime["spawn"].assert_called_once()
        arguments = runtime["spawn"].call_args.args[0]
        options = runtime["spawn"].call_args.kwargs
        assert arguments[0] == str(runtime["executable"])
        assert arguments[arguments.index("--model") + 1] == str(runtime["model"])
        assert arguments[arguments.index("--alias") + 1] == "test-local-model"
        assert arguments[arguments.index("--host") + 1] == "127.0.0.1"
        assert arguments[arguments.index("--port") + 1] == "18089"
        assert "--no-ui" in arguments
        assert arguments[arguments.index("--reasoning") + 1] == "off"
        assert json.loads(arguments[arguments.index("--chat-template-kwargs") + 1]) == {"enable_thinking": False}
        assert arguments[arguments.index("--ubatch-size") + 1] == "128"
        assert arguments[arguments.index("--cors-origins") + 1] == "localhost"
        assert options["cwd"] == runtime["executable"].parent
        assert options["stdin"] == subprocess.DEVNULL
        assert options["stdout"] is options["stderr"]
        assert not options["stdout"].closed
        runtime["process"].terminate.assert_not_called()
    runtime["process"].terminate.assert_called_once()
    runtime["process"].wait.assert_called_once_with(timeout=8)
    runtime["process"].kill.assert_not_called()
    assert options["stdout"].closed


def test_exited_owned_process_is_not_terminated_again(runtime):
    runtime["process"].poll.return_value = 1
    with local_ai.local_runtime():
        output = runtime["spawn"].call_args.kwargs["stdout"]
    runtime["process"].terminate.assert_not_called()
    runtime["process"].kill.assert_not_called()
    assert output.closed


def test_owned_process_is_killed_only_if_termination_times_out(runtime):
    runtime["process"].wait.side_effect = [subprocess.TimeoutExpired("llama-server", 8), 0]
    with local_ai.local_runtime():
        output = runtime["spawn"].call_args.kwargs["stdout"]
    runtime["process"].terminate.assert_called_once()
    runtime["process"].kill.assert_called_once()
    assert [call.kwargs["timeout"] for call in runtime["process"].wait.call_args_list] == [8, 3]
    assert output.closed


def test_owned_process_is_cleaned_up_when_application_fails(runtime):
    with pytest.raises(RuntimeError, match="application failure"):
        with local_ai.local_runtime():
            output = runtime["spawn"].call_args.kwargs["stdout"]
            raise RuntimeError("application failure")
    runtime["process"].terminate.assert_called_once()
    assert output.closed


@pytest.mark.parametrize("failure", ["terminate", "kill", "wait"])
def test_cleanup_errors_do_not_escape_or_leave_log_open(runtime, failure):
    process = runtime["process"]
    if failure == "terminate":
        process.terminate.side_effect = ProcessLookupError("already exited")
    elif failure == "kill":
        process.wait.side_effect = subprocess.TimeoutExpired("llama-server", 8)
        process.kill.side_effect = OSError("already exited")
    else:
        process.wait.side_effect = subprocess.TimeoutExpired("llama-server", 8)
    with local_ai.local_runtime():
        output = runtime["spawn"].call_args.kwargs["stdout"]
    assert output.closed


def test_local_runtime_key_is_passed_via_environment_not_arguments(runtime, monkeypatch):
    monkeypatch.setenv("LLM_API_KEY", "test-local-private-key")
    monkeypatch.setenv("LLAMA_API_KEY", "unrelated-inherited-key")
    with local_ai.local_runtime():
        call = runtime["spawn"].call_args
        assert call.kwargs["env"]["LLAMA_API_KEY"] == "test-local-private-key"
        assert all("test-local-private-key" not in str(value) for value in call.args[0])


def test_runtime_without_local_key_clears_inherited_llama_auth(runtime, monkeypatch):
    monkeypatch.setenv("LLAMA_API_KEY", "unrelated-inherited-key")
    with local_ai.local_runtime():
        assert runtime["spawn"].call_args.kwargs["env"]["LLAMA_API_KEY"] == ""


@pytest.mark.parametrize("endpoint", [
    "https://example.com:18089/v1", "http://192.168.1.5:18089/v1",
    "http://0.0.0.0:18089/v1", "http://127.0.0.1/v1", "http://localhost:invalid/v1",
])
def test_unsafe_or_incomplete_endpoint_does_not_start_runtime(runtime, monkeypatch, endpoint):
    monkeypatch.setenv("LLM_API_URL", endpoint)
    with local_ai.local_runtime() as process:
        assert process is None
    runtime["connect"].assert_not_called()
    runtime["spawn"].assert_not_called()


@pytest.mark.parametrize("missing", ["executable", "model"])
def test_missing_local_files_do_not_break_application_startup(runtime, missing):
    runtime[missing].unlink()
    with local_ai.local_runtime() as process:
        assert process is None
    runtime["spawn"].assert_not_called()


def test_process_creation_failure_does_not_break_startup_or_leave_log_open(runtime):
    runtime["spawn"].side_effect = OSError("could not launch runtime")
    with local_ai.local_runtime() as process:
        assert process is None
    assert runtime["spawn"].call_args.kwargs["stdout"].closed


@pytest.fixture
def local_chain(monkeypatch):
    monkeypatch.setenv("LLM_API_URL", "http://127.0.0.1:18089/v1")
    monkeypatch.setenv("LLM_MODEL", "test-local-model")
    return LLMChain()


def models_reply(data):
    return io.BytesIO(json.dumps(data).encode("utf-8"))


def test_readiness_requires_configured_model_without_generating_tokens(local_chain, monkeypatch):
    request = Mock(return_value=models_reply({"data": [{"id": "other"}, {"id": "test-local-model"}]}))
    monkeypatch.setattr("urllib.request.urlopen", request)
    assert local_chain.probe_available() is True
    request.assert_called_once()
    assert request.call_args.args[0].full_url == "http://127.0.0.1:18089/v1/models"
    assert request.call_args.args[0].get_method() == "GET"
    assert request.call_args.kwargs["timeout"] <= 2


def test_local_readiness_uses_configured_key_in_authorization_header(local_chain, monkeypatch):
    monkeypatch.setenv("LLM_API_KEY", "test-local-private-key")
    monkeypatch.setenv("NVIDIA_API_KEY", "different-cloud-key")
    chain = LLMChain()
    request = Mock(return_value=models_reply({"data": [{"id": "test-local-model"}]}))
    monkeypatch.setattr("urllib.request.urlopen", request)
    assert chain.probe_available() is True
    request.assert_called_once()
    probe = request.call_args.args[0]
    assert probe.get_header("Authorization") == "Bearer test-local-private-key"
    assert "test-local-private-key" not in probe.full_url


@pytest.mark.parametrize("body", [
    {"data": [{"id": "unrelated-model"}]}, {"data": []}, {"data": None},
    {"data": [None, "test-local-model", 17]}, {"data": 17}, {}, [], None,
])
def test_wrong_model_or_malformed_readiness_is_unavailable(local_chain, monkeypatch, body):
    monkeypatch.setattr("urllib.request.urlopen", Mock(return_value=models_reply(body)))
    assert local_chain.probe_available() is False


@pytest.mark.parametrize("failure", [
    ConnectionRefusedError(), TimeoutError(), urllib.error.URLError("offline"),
    urllib.error.HTTPError("http://127.0.0.1:18089/v1/models", 503, "Loading model", {}, None),
])
def test_unreachable_local_provider_is_not_ready(local_chain, monkeypatch, failure):
    monkeypatch.setattr("urllib.request.urlopen", Mock(side_effect=failure))
    assert local_chain.probe_available() is False


def test_non_json_local_service_is_not_mistaken_for_model(local_chain, monkeypatch):
    monkeypatch.setattr("urllib.request.urlopen", Mock(return_value=io.BytesIO(b"<html>other service</html>")))
    assert local_chain.probe_available() is False


def test_no_configured_provider_is_unavailable_without_network(monkeypatch):
    request = Mock(side_effect=AssertionError("must not make network requests"))
    monkeypatch.setattr("urllib.request.urlopen", request)
    assert LLMChain().probe_available() is False
    request.assert_not_called()


def test_remote_readiness_is_unknown_and_never_probed(monkeypatch):
    monkeypatch.setenv("LLM_API_URL", "https://example.com/v1")
    request = Mock(side_effect=AssertionError("must not probe cloud providers"))
    monkeypatch.setattr("urllib.request.urlopen", request)
    assert LLMChain().probe_available() is None
    request.assert_not_called()


def test_local_unavailable_with_cloud_fallback_reports_unknown(monkeypatch, local_chain):
    monkeypatch.setenv("NVIDIA_API_KEY", "test-fallback-key")
    chain = LLMChain()
    request = Mock(side_effect=ConnectionRefusedError())
    monkeypatch.setattr("urllib.request.urlopen", request)
    assert chain.probe_available() is None
    request.assert_called_once()
    assert request.call_args.args[0].full_url.startswith("http://127.0.0.1:")
