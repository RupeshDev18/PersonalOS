import { Injectable, Logger } from '@nestjs/common';
import { GoogleGenerativeAI } from '@google/generative-ai';

@Injectable()
export class GeminiService {
  private readonly logger = new Logger(GeminiService.name);
  private genAI: GoogleGenerativeAI | null = null;
  private readonly modelName = 'gemini-1.5-flash';

  constructor() {
    this.initGemini();
  }

  private initGemini() {
    const apiKey = process.env.GEMINI_API_KEY?.trim();
    if (apiKey && apiKey.length > 10) {
      this.genAI = new GoogleGenerativeAI(apiKey);
      this.logger.log(`Google Gemini SDK initialized with model "${this.modelName}".`);
    } else {
      this.logger.warn('No GEMINI_API_KEY detected in .env. Running in deterministic fallback mode.');
    }
  }

  public setApiKey(apiKey: string): boolean {
    if (apiKey && apiKey.trim().length > 10) {
      this.genAI = new GoogleGenerativeAI(apiKey.trim());
      process.env.GEMINI_API_KEY = apiKey.trim();
      this.logger.log('Gemini API Key updated dynamically.');
      return true;
    }
    return false;
  }

  public async testConnection(): Promise<{ success: boolean; message: string }> {
    if (!this.genAI) {
      return { success: false, message: 'No GEMINI_API_KEY configured. Please provide your Google AI Studio key.' };
    }
    try {
      const model = this.genAI.getGenerativeModel({ model: this.modelName });
      const res = await model.generateContent('Reply with the word "CONNECTED" only.');
      const text = res.response.text();
      return { success: true, message: `Connected successfully to Gemini! Response: ${text.trim()}` };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      return { success: false, message: `Gemini API test failed: ${msg}` };
    }
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
