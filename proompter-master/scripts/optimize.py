import asyncio, json
import os
import sys
import litellm
import uuid
from dotenv import load_dotenv
from opik import Opik
from opik.evaluation import evaluate_prompt
from opik.evaluation.metrics import AnswerRelevance, Hallucination

# Add the metrics directory to the path
sys.path.append(os.path.join(os.path.dirname(__file__), 'metrics'))
from emotionaltone import EmotionalToneMetric
from calltoaction import CallToActionMetric

load_dotenv()

# Manually load the key from the environment and set it for litellm
litellm.api_key = os.getenv("CHATGPT")

def main():
    # Get input file path from command line arguments
    if len(sys.argv) < 2:
        print(json.dumps({"error": "No input file provided"}))
        return
    
    input_file = sys.argv[1]
    
    try:
        with open(input_file, 'r') as f:
            input_data = json.load(f)
        
        prompts = input_data.get('prompts', [])
        task = input_data.get('task', '')
        expected_output = input_data.get('expectedOutput', '')
    except (json.JSONDecodeError, FileNotFoundError) as e:
        print(json.dumps({"error": f"Error reading input file: {str(e)}"}))
        return
    
    if not prompts or not isinstance(prompts, list):
        print(json.dumps({"error": "Prompts must be a non-empty list"}))
        return

    opik_client = Opik()
    
    # Create a unique dataset name for each run to prevent accumulation
    unique_id = str(uuid.uuid4())[:8]
    dataset_name = f"promptpilot_eval_{unique_id}"
    dataset = opik_client.get_or_create_dataset(dataset_name)

    # Create only ONE dataset entry with the task and expected output
    dataset_entry = {
        "input": task,
        "expected_output": expected_output,
        "context": f"Task: {task}\nExpected Output: {expected_output}"  # Provide comprehensive context for hallucination detection
    }
    
    dataset.insert([dataset_entry])

    all_results = []
    for p in prompts:
        # ✅ Corrected usage — no client param!
        result = evaluate_prompt(
            dataset=dataset,
            messages=[{"role": "user", "content": p.replace("{{input}}", task)}],
            scoring_metrics=[
                AnswerRelevance(require_context=False), 
                Hallucination(),
                EmotionalToneMetric(),
                CallToActionMetric()
            ],
            model="gpt-4o",
            task_threads=1  # Reduce parallel requests to avoid rate limits
        )

        # Calculate average scores for both metrics
        relevance_score = 0
        relevance_count = 0
        hallucination_score = 0
        hallucination_count = 0
        emotional_score = 0
        emotional_count = 0
        cta_score = 0
        cta_count = 0
        cta_reason = ""
        
        if result.test_results:
            for test_res in result.test_results:
                for score_res in test_res.score_results:
                    if score_res.name == 'answer_relevance_metric' and not score_res.scoring_failed:
                        relevance_score += score_res.value
                        relevance_count += 1
                    elif score_res.name == 'hallucination_metric' and not score_res.scoring_failed:
                        hallucination_score += score_res.value
                        hallucination_count += 1
                    elif score_res.name == 'Emotional Tone Match' and not score_res.scoring_failed:
                        emotional_score += score_res.value
                        emotional_count += 1
                    elif score_res.name == 'Call To Action Strength' and not score_res.scoring_failed:
                        cta_score += score_res.value
                        cta_count += 1
                        cta_reason = score_res.reason
        
        avg_relevance = relevance_score / relevance_count if relevance_count > 0 else 0
        avg_hallucination = hallucination_score / hallucination_count if hallucination_count > 0 else 0
        avg_emotional = emotional_score / emotional_count if emotional_count > 0 else 0
        avg_cta = cta_score / cta_count if cta_count > 0 else 0

        
        # Use relevance score as primary, but log both
        all_results.append({
            "prompt": p, 
            "score": avg_relevance,
            "relevance_score": avg_relevance,
            "hallucination_score": avg_hallucination,
            "emotional_score": avg_emotional,
            "cta_score": avg_cta,
            "cta_reason": cta_reason,
        })

    # Find the best prompt based on the relevance score
    if not all_results:
        print(json.dumps({"error": "No results to analyze."}))
        return

    best_result = max(all_results, key=lambda x: x["score"])

    # Output only the JSON result
    final_output = {
        "best_prompt": best_result["prompt"],
        "best_score": best_result["score"],
        "best_hallucination": best_result["hallucination_score"],
        "best_emotional": best_result["emotional_score"],
        "best_cta": best_result["cta_score"],
        "cta_reason": best_result["cta_reason"],
        "trials": all_results
    }

    print(json.dumps(final_output))

if __name__ == '__main__':
    main()
