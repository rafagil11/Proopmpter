"use client"
import Image from "next/image";
import React, { useState } from 'react';

export default function Home() {
  const [task, setTask] = useState('Write an email to my boss requesting a day off next Friday.');
  const [expectedOutput, setExpectedOutput] = useState('Subject: Request for Day Off - Friday\n\nDear [Boss Name],\n\nI hope this email finds you well. I am writing to formally request a day off on Friday, [date].\n\nI have ensured that all my current tasks are up to date and will make arrangements to cover any urgent matters that may arise during my absence.\n\nThank you for considering my request. I look forward to hearing from you.\n\nBest regards,\n[Your Name]');
  const [prompt1, setPrompt1] = useState('Draft a polite email to my boss asking for a day off next Friday.');
  const [prompt2, setPrompt2] = useState('Write a professional message to my manager to request leave for next Friday.');
  const [prompt3, setPrompt3] = useState('Compose a formal email to my supervisor explaining I need next Friday off and asking for approval.');
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [optResult, setOptResult] = useState<any>(null);
  const [optLoading, setOptLoading] = useState(false);
  const [optError, setOptError] = useState('');

  const handleAnalyze = async () => {
    setOptLoading(true);
    setOptError('');
    setOptResult(null);
    setResults([]);
    setError('');
    
    try {
      const prompts = [prompt1, prompt2, prompt3].filter(Boolean);
      if (prompts.length === 0) {
        throw new Error('Please enter at least one prompt to analyze');
      }
      
      // First, run the prompts to get outputs
      const runRes = await fetch('/api/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          task,
          prompts,
        }),
      });
      const runData = await runRes.json();
      if (!runRes.ok) throw new Error(runData.error || 'Failed to run prompts');
      setResults(runData);
      
      // Then, analyze the prompts
      const analyzeRes = await fetch('/api/optimize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompts,
          task,
          expectedOutput,
        }),
      });
      const analyzeData = await analyzeRes.json();
      if (!analyzeRes.ok) throw new Error(analyzeData.error || 'Failed to analyze prompts');
      setOptResult(analyzeData);
      
    } catch (err: any) {
      setOptError(err.message);
    } finally {
      setOptLoading(false);
    }
  };

  return (
    <div className="">
    
        <main className="p-8 max-w-2xl mx-auto">
          <h1 className="text-2xl font-bold mb-4">PromptPilot Test UI</h1>
          <form className="space-y-4">
            <div>
              <label className="block font-medium mb-1">Task</label>
              <textarea
                className="w-full border rounded p-2"
                rows={2}
                value={task}
                onChange={e => setTask(e.target.value)}
                required
              />
            </div>
            <div>
              <label className="block font-medium mb-1">Expected Output</label>
              <textarea
                className="w-full border rounded p-2"
                rows={4}
                value={expectedOutput}
                onChange={e => setExpectedOutput(e.target.value)}
                placeholder="Enter what you expect the AI to generate..."
              />
            </div>
            <div>
              <label className="block font-medium mb-1">Prompt 1</label>
              <textarea
                className="w-full border rounded p-2"
                rows={2}
                value={prompt1}
                onChange={e => setPrompt1(e.target.value)}
                required
              />
            </div>
            <div>
              <label className="block font-medium mb-1">Prompt 2</label>
              <textarea
                className="w-full border rounded p-2"
                rows={2}
                value={prompt2}
                onChange={e => setPrompt2(e.target.value)}
                required
              />
            </div>
            <div>
              <label className="block font-medium mb-1">Prompt 3</label>
              <textarea
                className="w-full border rounded p-2"
                rows={2}
                value={prompt3}
                onChange={e => setPrompt3(e.target.value)}
                required
              />
            </div>
            <button
              type="button"
              className="bg-green-600 text-white px-4 py-2 rounded disabled:opacity-50"
              onClick={handleAnalyze}
              disabled={optLoading}
            >
              {optLoading ? 'Running & Analyzing...' : 'Run & Analyze Prompts'}
            </button>
          </form>
          {error && <div className="mt-4 text-red-600">Error: {error}</div>}
          {optError && <div className="mt-4 text-red-600">Error: {optError}</div>}
          {results.length > 0 && (
            <div className="mt-8">
              <h2 className="text-xl font-semibold mb-2">Results</h2>
              <ul className="space-y-4">
                {results.map((r, i) => (
                  <li key={i} className="border rounded p-3">
                    <div><strong>Prompt:</strong> {r.prompt}</div>
                    <div><strong>Output:</strong> <pre className="whitespace-pre-wrap">{r.output}</pre></div>
                    <div><strong>Latency:</strong> {r.latency} ms</div>
                    <div><strong>Tokens:</strong> {r.tokens}</div>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {optResult && (
            <div className="mt-6">
              <h2 className="text-lg font-semibold mb-2">Analysis Results</h2>
              <div className="bg-gray-100 rounded p-3 mb-4">
                <div><strong>Best Prompt:</strong></div>
                <pre className="whitespace-pre-wrap">{optResult.best_prompt}</pre>
                <div><strong>Relevance Score:</strong> {optResult.best_score}</div>
                <div><strong>Hallucination Score:</strong> {optResult.best_hallucination || 'N/A'}</div>
                <div><strong>Emotional Tone Score:</strong> {optResult.best_emotional || 'N/A'}</div>
                <div><strong>Call to Action Score:</strong> {optResult.best_cta || 'N/A'}</div>
                {optResult.cta_reason && (
                  <div><strong>CTA Reason:</strong> {optResult.cta_reason}</div>
                )}
              </div>
              <h3 className="font-medium mb-1">All Prompt Scores</h3>
              <ul className="space-y-2">
                {optResult.trials.map((trial: any, i: number) => (
                  <li key={i} className="border rounded p-2">
                    <div><strong>Prompt:</strong> {trial.prompt}</div>
                    <div><strong>Relevance Score:</strong> {trial.relevance_score || trial.score}</div>
                    <div><strong>Hallucination Score:</strong> {trial.hallucination_score || 'N/A'}</div>
                    <div><strong>Emotional Tone Score:</strong> {trial.emotional_score || 'N/A'}</div>
                    <div><strong>Call to Action Score:</strong> {trial.cta_score || 'N/A'}</div>
                    {trial.cta_reason && (
                      <div><strong>CTA Reason:</strong> {trial.cta_reason}</div>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </main>
      
     
    </div>
  );
}
