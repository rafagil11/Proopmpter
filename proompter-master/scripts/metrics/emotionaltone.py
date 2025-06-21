from opik.evaluation.metrics import base_metric, score_result
from opik.evaluation import models
from typing import Any
import json
import re

class EmotionalToneMetric(base_metric.BaseMetric):
    def __init__(self, name: str = "Emotional Tone Match", model_name: str = "gpt-4o"):
        self.name = name
        self.llm_client = models.LiteLLMChatModel(model_name=model_name)
        self.prompt_template = """
You are an expert marketing evaluator. Score the emotional tone match between the following user prompt and the intended task.

TASK: {task}
PROMPT: {prompt}

Evaluate how well the emotional tone of the PROMPT fits the goal of the TASK.

Emotional tone includes things like: friendly, persuasive, urgent, inspiring, calming, etc.

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
                # Fallback: try to parse the entire response
                response_dict = json.loads(response)
            
            score = response_dict.get("score", 0.5)
            reason = response_dict.get("reason", "No reason provided")
            
        except (json.JSONDecodeError, KeyError, Exception) as e:
            # Fallback to a default score if parsing fails
            score = 0.5
            reason = f"Error parsing response: {str(e)}"

        return score_result.ScoreResult(
            name=self.name,
            value=score,
            reason=reason
        )
