from opik.evaluation.metrics import base_metric, score_result
from opik.evaluation import models
from typing import Any
import json
import re

class CallToActionMetric(base_metric.BaseMetric):
    def __init__(self, name: str = "Call To Action Strength", model_name: str = "gpt-4o"):
        self.name = name
        self.llm_client = models.LiteLLMChatModel(model_name=model_name)
        self.prompt_template = """
You are an expert marketing evaluator. Score how compelling the Call-To-Action (CTA) is in the following prompt, given the intended task.

TASK: {task}
PROMPT: {prompt}

Evaluate how strong, clear, and motivating the CTA is. Consider if it encourages the user to take action, is specific, and is likely to drive engagement.

Respond with a JSON object with no extra text:

{{
  "score": <score from 0 to 1>,
  "reason": "<brief justification>"
}}
"""

    def score(self, input: str, output: str, **kwargs: Any):
        task = kwargs.get("task", "")
        prompt = kwargs.get("prompt", output)

        full_prompt = self.prompt_template.format(task=task, prompt=prompt)

        try:
            response = self.llm_client.generate_string(input=full_prompt)
            # Try to extract JSON from the response
            json_match = re.search(r'\{.*\}', response, re.DOTALL)
            if json_match:
                json_str = json_match.group()
                response_dict = json.loads(json_str)
            else:
                response_dict = json.loads(response)
            score = response_dict.get("score", 0.5)
            reason = response_dict.get("reason", "No reason provided")
        except (json.JSONDecodeError, KeyError, Exception) as e:
            score = 0.5
            reason = f"Error parsing response: {str(e)}"

        return score_result.ScoreResult(
            name=self.name,
            value=score,
            reason=reason
        )
