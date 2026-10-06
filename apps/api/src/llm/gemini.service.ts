import { Injectable, Logger } from '@nestjs/common';
import { GoogleGenerativeAI } from '@google/generative-ai';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class GeminiService {
  private readonly logger = new Logger(GeminiService.name);
  private genAI: GoogleGenerativeAI | null = null;
  private apiKey: string | null = null;
  private modelName: string = 'gemini-2.5-flash';

  constructor() {
    this.initGemini();
  }

  private initGemini() {
    const key = process.env.GEMINI_API_KEY?.trim();
    if (key && key.length > 10) {
      this.apiKey = key;
      this.genAI = new GoogleGenerativeAI(key);
      this.logger.log(`Google Gemini SDK initialized with API key.`);
    } else {
      this.logger.warn('No GEMINI_API_KEY detected in .env. Running in deterministic fallback mode.');
    }
  }

  public setApiKey(apiKey: string): boolean {
    if (apiKey && apiKey.trim().length > 10) {
      this.apiKey = apiKey.trim();
      this.genAI = new GoogleGenerativeAI(this.apiKey);
      process.env.GEMINI_API_KEY = this.apiKey;
      this.persistKeyToEnv(this.apiKey);
      this.logger.log('Gemini API Key updated dynamically and saved to .env.');
      return true;
    }
    return false;
  }

  public persistKeyToEnv(key: string) {
    try {
      const candidates = [
        path.resolve(process.cwd(), '.env'),
        path.resolve(process.cwd(), '../../.env'),
        path.resolve(__dirname, '../../../../.env'),
      ];
      for (const envFile of candidates) {
        if (fs.existsSync(envFile)) {
          let content = fs.readFileSync(envFile, 'utf8');
          if (content.includes('GEMINI_API_KEY=')) {
            content = content.replace(/GEMINI_API_KEY=.*/g, `GEMINI_API_KEY="${key}"`);
          } else {
            content += `\nGEMINI_API_KEY="${key}"\n`;
          }
          fs.writeFileSync(envFile, content, 'utf8');
          this.logger.log(`Persisted GEMINI_API_KEY to ${envFile}`);
          break;
        }
      }
    } catch (e) {
      this.logger.warn(`Could not persist key to .env: ${e}`);
    }
  }

  /**
   * Discovers which models are enabled for this API key via Google's ModelService
   */
  public async discoverBestModel(): Promise<string> {
    if (!this.apiKey) return this.modelName;

    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${this.apiKey}`;
      const res = await fetch(url);
      if (res.ok) {
        const data: any = await res.json();
        const available: string[] = (data.models || [])
          .filter((m: any) => m.supportedGenerationMethods?.includes('generateContent'))
          .map((m: any) => m.name.replace(/^models\//, ''));

        this.logger.log(`Available Gemini models for this key: ${available.join(', ')}`);

        // Priority preference for active generation models
        const preferences = [
          'gemini-2.5-flash',
          'gemini-flash-latest',
          'gemini-2.5-flash-lite',
          'gemini-3.5-flash',
          'gemini-2.5-pro',
          'gemini-pro-latest',
          'gemini-2.0-flash',
        ];

        for (const pref of preferences) {
          if (available.includes(pref)) {
            this.modelName = pref;
            this.logger.log(`Auto-selected Gemini model: "${this.modelName}"`);
            return this.modelName;
          }
        }

        if (available.length > 0) {
          this.modelName = available[0];
          return this.modelName;
        }
      }
    } catch (err) {
      this.logger.warn(`Model discovery query failed: ${err}`);
    }

    // Default candidate fallback
    return this.modelName;
  }

  public async testConnection(): Promise<{ success: boolean; message: string; model?: string }> {
    if (!this.genAI || !this.apiKey) {
      return { success: false, message: 'No GEMINI_API_KEY configured. Please provide your Google AI Studio key.' };
    }

    // 1. Try to auto-discover the active model
    await this.discoverBestModel();

    // 2. Candidate list to probe
    const candidates = [
      this.modelName,
      'gemini-2.5-flash',
      'gemini-flash-latest',
      'gemini-2.5-flash-lite',
      'gemini-2.5-pro',
      'gemini-pro-latest',
      'gemini-3.5-flash',
    ];

    const uniqueCandidates = Array.from(new Set(candidates));
    let lastError = '';

    for (const cand of uniqueCandidates) {
      try {
        this.logger.log(`Testing Gemini model: "${cand}"...`);
        const model = this.genAI.getGenerativeModel({ model: cand });
        const res = await model.generateContent('Reply with "CONNECTED" only.');
        const text = res.response.text();
        this.modelName = cand;
        return {
          success: true,
          message: `Connected successfully to Gemini (${cand})! Model responded: ${text.trim()}`,
          model: cand,
        };
      } catch (err: unknown) {
        lastError = err instanceof Error ? err.message : String(err);
      }
    }

    return { success: false, message: `Gemini API test failed: ${lastError}` };
  }

  public async diagnoseKey(): Promise<any> {
    if (!this.apiKey) return { configured: false, message: 'No API key configured.' };
    const prefix = this.apiKey.slice(0, 7);
    const length = this.apiKey.length;
    let googleHttpResult: any = null;
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${this.apiKey}`;
      const res = await fetch(url);
      const text = await res.text();
      googleHttpResult = {
        status: res.status,
        statusText: res.statusText,
        body: text.slice(0, 1000),
      };
    } catch (e: any) {
      googleHttpResult = { error: e.message };
    }
    return {
      prefix,
      length,
      isTypicalGoogleKey: prefix.startsWith('AIzaSy'),
      googleHttpResult,
    };
  }

  public hasApiKey(): boolean {
    return !!this.genAI;
  }

  /**
   * Use Gemini to understand user intent and break it down into execution steps
   */
  public async understandIntentWithLLM(prompt: string): Promise<{
    taskType: 'immediate' | 'scheduled' | 'recurring';
    primaryAgent: string;
    requiredAgents: string[];
    summary: string;
    steps: Array<{ agent: string; action: string; description: string }>;
    rawLLMOutput?: string;
  } | null> {
    if (!this.genAI) return null;

    try {
      const model = this.genAI.getGenerativeModel({ model: this.modelName });
      const systemPrompt = `You are the Chief Agent in a personal AI Operating System.
Deconstruct the user prompt into a structured multi-agent workflow.
Available specialists: "job", "finance", "shopping", "research", "communication".

Respond strictly with valid JSON conforming to this schema:
{
  "taskType": "immediate" | "scheduled" | "recurring",
  "primaryAgent": "job" | "finance" | "shopping" | "research" | "communication",
  "requiredAgents": ["job", "research", ...],
  "summary": "Brief 1-sentence goal",
  "steps": [
    { "agent": "shopping", "action": "search_prices", "description": "Search product prices" }
  ]
}

User prompt: "${prompt}"`;

      const response = await model.generateContent(systemPrompt);
      const text = response.response.text();
      const cleanJson = text.replace(/```json/g, '').replace(/```/g, '').trim();
      const parsed = JSON.parse(cleanJson);

      return {
        ...parsed,
        rawLLMOutput: text,
      };
    } catch (err) {
      this.logger.error(`Gemini intent extraction failed: ${err}`);
      return null;
    }
  }

  /**
   * Use Gemini to synthesize cross-specialist outputs into a unified verdict
   */
  public async synthesizeResponseWithLLM(
    prompt: string,
    specialistData: Record<string, unknown>
  ): Promise<string | null> {
    if (!this.genAI) return null;

    try {
      const model = this.genAI.getGenerativeModel({ model: this.modelName });
      const promptText = `You are the Chief Agent in a Personal AI OS.
The user asked: "${prompt}"

Specialist Agents provided the following verified data:
${JSON.stringify(specialistData, null, 2)}

Provide a concise, direct, personalized recommendation to the user.
Explain the rationale clearly (e.g. price vs affordability vs benchmarks) and give a clear verdict. Keep it conversational and friendly.`;

      const response = await model.generateContent(promptText);
      return response.response.text().trim();
    } catch (err) {
      this.logger.error(`Gemini synthesis failed: ${err}`);
      return null;
    }
  }

  /**
   * Use Gemini to tailor a resume for a job without fabricating facts
   */
  public async tailorResumeWithLLM(
    jobDescription: string,
    baseResumeMarkdown: string
  ): Promise<string | null> {
    if (!this.genAI) return null;

    try {
      const model = this.genAI.getGenerativeModel({ model: this.modelName });
      const promptText = `You are a Resume Specialist Agent.
Tailor the user's base resume for the following job description.

RULES:
1. NEVER invent or fabricate employment, skills, degrees, or metrics that are not in the base resume.
2. Re-order bullet points and emphasize genuine competencies that match the target job.
3. Add a "Highlighted Target Competencies" section at the top.

Target Job:
${jobDescription}

Base Resume:
${baseResumeMarkdown}`;

      const response = await model.generateContent(promptText);
      return response.response.text().trim();
    } catch (err) {
      this.logger.error(`Gemini resume tailoring failed: ${err}`);
      return null;
    }
  }
}
