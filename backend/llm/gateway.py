from __future__ import annotations

import json
import os
import urllib.request
from dataclasses import dataclass


@dataclass(frozen=True)
class LLMRequest:
    task: str
    prompt: str
    context: dict | None = None
    model: str | None = None


class LLMGateway:
    """Small provider-neutral HTTP gateway.

    The MVP keeps AI optional. Configure `PROJECT_BI_LLM_ENDPOINT`,
    `PROJECT_BI_LLM_API_KEY`, and `PROJECT_BI_LLM_MODEL` to enable calls.
    """

    def __init__(self) -> None:
        self.endpoint = os.environ.get("PROJECT_BI_LLM_ENDPOINT", "")
        self.api_key = os.environ.get("PROJECT_BI_LLM_API_KEY", "")
        self.default_model = os.environ.get("PROJECT_BI_LLM_MODEL", "")

    def enabled(self) -> bool:
        return bool(self.endpoint and self.api_key)

    def complete(self, request: LLMRequest) -> dict:
        if not self.enabled():
            return {
                "enabled": False,
                "task": request.task,
                "message": "LLM gateway is not configured.",
                "result": None,
            }
        payload = {
            "model": request.model or self.default_model,
            "messages": [
                {"role": "system", "content": "你是经营管理系统中的业务分析和数据导入助手。"},
                {"role": "user", "content": request.prompt},
            ],
            "metadata": {"task": request.task, "context": request.context or {}},
        }
        body = json.dumps(payload, ensure_ascii=False).encode("utf-8")
        http_request = urllib.request.Request(
            self.endpoint,
            data=body,
            headers={
                "Authorization": f"Bearer {self.api_key}",
                "Content-Type": "application/json",
            },
            method="POST",
        )
        with urllib.request.urlopen(http_request, timeout=60) as response:
            return json.loads(response.read().decode("utf-8"))


def llm_status() -> dict:
    gateway = LLMGateway()
    return {
        "enabled": gateway.enabled(),
        "endpointConfigured": bool(gateway.endpoint),
        "model": gateway.default_model,
        "capabilities": ["batch_import_mapping", "data_quality_diagnosis", "business_issue_analysis", "agent_semantic_context"],
    }

