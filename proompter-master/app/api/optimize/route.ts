// File: app/api/optimize/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { exec } from 'child_process';
import path from 'path';
import { promisify } from 'util';
import fs from 'fs';

const execAsync = promisify(exec);

export async function POST(req: NextRequest) {
  try {
    // Get the user's prompts from the request body
    const { prompts, task, expectedOutput } = await req.json();
    
    if (!prompts || !Array.isArray(prompts) || prompts.length === 0) {
      return NextResponse.json(
        { error: 'Please provide at least one prompt to analyze' },
        { status: 400 }
      );
    }

    // Create a temporary file with the input data
    const tempData = { prompts, task: task || '', expectedOutput: expectedOutput || '' };
    const tempFilePath = path.join(process.cwd(), 'temp_input.json');
    fs.writeFileSync(tempFilePath, JSON.stringify(tempData));

    // Run the Python optimizer script with the temp file
    const scriptPath = path.join(process.cwd(), 'scripts', 'optimize.py');
    const { stdout } = await execAsync(`python "${scriptPath}" "${tempFilePath}"`);

    // Clean up the temp file
    try {
      fs.unlinkSync(tempFilePath);
    } catch (e) {
      // Ignore cleanup errors
    }

    // Find the last JSON object in the output
    const lines = stdout.split('\n');
    let jsonString = '';
    
    // Look for the last line that contains valid JSON
    for (let i = lines.length - 1; i >= 0; i--) {
      const line = lines[i].trim();
      if (line.startsWith('{') && line.endsWith('}')) {
        try {
          JSON.parse(line);
          jsonString = line;
          break;
        } catch (e) {
          // Continue searching
        }
      }
    }

    if (!jsonString) {
      throw new Error('No valid JSON found in Python script output');
    }

    const result = JSON.parse(jsonString);

    return NextResponse.json(result);
  } catch (error: any) {
    console.error('❌ Python script execution failed:', error);
    return NextResponse.json(
      { error: error.message || 'Optimization failed' },
      { status: 500 }
    );
  }
}