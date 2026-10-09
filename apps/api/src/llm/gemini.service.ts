import { Injectable, Logger } from '@nestjs/common';
import { GoogleGenerativeAI } from '@google/generative-ai';

// ---------------------------------------------------------------------------
// Real Gemini model names as of October 2026.
// Ordered by preference: fastest + most capable first.
// discoverBestModel() will refine this list at runtime by querying the API.
// ---------------------------------------------------------------------------
const MODEL_PREFERENCE_ORDER = [
  'gemini-2.5-flash',
  'gemini-2.5-flash-preview-05-20',
  'gemini-2.0-flash',
  'gemini-2.0-flash-lite',
  'gemini-1.5-flash',
  'gemini-1.5-flash-latest',
  'gemini-1.5-pro',
  'gemini-1.5-pro-latest',
];

@Injectable()
export class GeminiService {
  private readonly logger = new Logger(GeminiService.name);
  private genAI: GoogleGenerativeAI | null = null;
  private apiKey: string | null = null;
  private modelName: string = MODEL_PREFERENCE_ORDER[0];

  constructor() {
    this.initGemini();
    if (this.apiKey) {
      this.discoverBestModel().catch(() => {});
    }
  }

  // ---------------------------------------------------------------------------
  // Initialisation
  // ---------------------------------------------------------------------------

  private initGemini(): void {
    const key = process.env.GEMINI_API_KEY?.trim();
    if (key && key.length > 10) {
      this.apiKey = key;
      this.genAI = new GoogleGenerativeAI(key);
      this.logger.log('Google Gemini SDK initialised.');
    } else {
      this.logger.warn(
        'No GEMINI_API_KEY found. Running in deterministic fallback mode. ' +
          'Set GEMINI_API_KEY in .env to enable LLM features.',
      );
    }
  }

  /**
   * Dynamically update the API key at runtime (e.g. from the Connectors UI).
   * The key is stored only in memory + process.env — never written to disk.
   */
  public setApiKey(apiKey: string): boolean {
    const trimmed = apiKey?.trim();
    if (!trimmed || trimmed.length <= 10) return false;

    this.apiKey = trimmed;
    this.genAI = new GoogleGenerativeAI(trimmed);
    process.env.GEMINI_API_KEY = trimmed;
    this.discoverBestModel().catch(() => {});
    this.logger.log('Gemini API key updated at runtime.');
    return true;
  }

  public hasApiKey(): boolean {
    return !!this.genAI;
  }

  // ---------------------------------------------------------------------------
  // Model discovery
  // ---------------------------------------------------------------------------

  /**
   * Queries the Google Generative Language API to find which models are
   * actually enabled for this key, then picks the best available one.
   */
  public async discoverBestModel(): Promise<string> {
    if (!this.apiKey) return this.modelName;

    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${this.apiKey}`;
      const res = await fetch(url);
      if (!res.ok) return this.modelName;

      const data = (await res.json()) as {
        models?: Array<{
          name: string;
          supportedGenerationMethods?: string[];
        }>;
      };

      const available = (data.models ?? [])
        .filter((m) => m.supportedGenerationMethods?.includes('generateContent'))
        .map((m) => m.name.replace(/^models\//, ''));

      this.logger.log(`Gemini models available for this key: ${available.join(', ')}`);

      for (const pref of MODEL_PREFERENCE_ORDER) {
        if (available.includes(pref)) {
          this.modelName = pref;
          this.logger.log(`Auto-selected model: ${this.modelName}`);
          return this.modelName;
        }
      }

      // Fall back to whatever is first in the API-reported list
      if (available.length > 0) {
        this.modelName = available[0];
        this.logger.log(`Fallback model: ${this.modelName}`);
      }
    } catch (err) {
      this.logger.warn(`Model discovery failed: ${err}`);
    }

    return this.modelName;
  }

  // ---------------------------------------------------------------------------
  // Connection test / diagnostics (used by Connectors UI)
  // ---------------------------------------------------------------------------

  public async testConnection(): Promise<{
    success: boolean;
    message: string;
    model?: string;
  }> {
    if (!this.genAI || !this.apiKey) {
      return {
        success: false,
        message:
          'No GEMINI_API_KEY configured. Get a free key at https://aistudio.google.com and set it in .env.',
      };
    }

    await this.discoverBestModel();

    const candidates = [this.modelName, ...MODEL_PREFERENCE_ORDER].filter(
      (v, i, a) => a.indexOf(v) === i,
    );
    let lastError = '';

    for (const cand of candidates) {
      try {
        this.logger.log(`Testing model "${cand}"…`);
        const model = this.genAI.getGenerativeModel({ model: cand });
        const res = await model.generateContent('Reply with "CONNECTED" only.');
        const text = res.response.text();
        this.modelName = cand;
        return {
          success: true,
          message: `Connected to Gemini (${cand}). Response: ${text.trim()}`,
          model: cand,
        };
      } catch (err: unknown) {
        lastError = err instanceof Error ? err.message : String(err);
      }
    }

    return { success: false, message: `Gemini test failed: ${lastError}` };
  }

  public async diagnoseKey(): Promise<{
    configured: boolean;
    prefix?: string;
    length?: number;
    isTypicalGoogleKey?: boolean;
    apiResponse?: unknown;
    message?: string;
  }> {
    if (!this.apiKey) return { configured: false, message: 'No API key configured.' };

    const prefix = this.apiKey.slice(0, 7);
    let apiResponse: unknown = null;

    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${this.apiKey}`;
      const res = await fetch(url);
      const text = await res.text();
      apiResponse = {
        status: res.status,
        statusText: res.statusText,
        body: text.slice(0, 800),
      };
    } catch (e: unknown) {
      apiResponse = { error: e instanceof Error ? e.message : String(e) };
    }

    return {
      configured: true,
      prefix,
      length: this.apiKey.length,
      isTypicalGoogleKey: prefix.startsWith('AIzaSy'),
      apiResponse,
    };
  }

  // ---------------------------------------------------------------------------
  // Core generation (with automatic model fallback)
  // ---------------------------------------------------------------------------

  /**
   * Tries to generate content using each model in the preference list until
   * one succeeds. Returns null if all fail or no key is configured.
   */
  public async generateContentWithFallback(
    promptText: string,
  ): Promise<string | null> {
    if (!this.genAI) return null;

    const candidates = [this.modelName, ...MODEL_PREFERENCE_ORDER].filter(
      (v, i, a) => a.indexOf(v) === i,
    );

    for (const candidate of candidates) {
      try {
        const model = this.genAI.getGenerativeModel({ model: candidate });
        const response = await model.generateContent(promptText);
        const text = response.response.text();
        if (text) {
          if (candidate !== this.modelName) {
            this.modelName = candidate;
            this.logger.log(`Switched to model: ${candidate}`);
          }
          return text;
        }
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        this.logger.warn(`Model "${candidate}" failed: ${msg}. Trying next…`);
      }
    }

    return null;
  }

  // ---------------------------------------------------------------------------
  // Higher-level LLM operations
  // ---------------------------------------------------------------------------

  /**
   * Classify user intent and return a structured routing decision.
   */
  public async understandIntentWithLLM(prompt: string): Promise<{
    taskType: 'immediate' | 'scheduled' | 'recurring';
    primaryAgent: string;
    requiredAgents: string[];
    summary: string;
    steps: Array<{ agent: string; action: string; description: string }>;
  } | null> {
    if (!this.genAI) return null;

    const systemPrompt = `You are the Chief Coordinator Agent in a personal AI Operating System.
Classify whether the user prompt requires specialist agents or is a direct conversational message.

ROUTING RULES:
1. GREETINGS & CASUAL TALK → primaryAgent: "chief", requiredAgents: [], steps: []
2. JOBS & CAREERS → primaryAgent: "job", requiredAgents: ["job"]
3. SHOPPING & PURCHASES → primaryAgent: "shopping", requiredAgents: ["shopping","research","finance"]
4. FINANCE & BUDGET → primaryAgent: "finance", requiredAgents: ["finance"]
5. RESEARCH (explicit web search needed) → primaryAgent: "research", requiredAgents: ["research"]
6. COMMUNICATION & EMAILS → primaryAgent: "communication", requiredAgents: ["communication"]

Respond ONLY with valid JSON:
{
  "taskType": "immediate" | "scheduled" | "recurring",
  "primaryAgent": "chief" | "job" | "finance" | "shopping" | "research" | "communication",
  "requiredAgents": string[],
  "summary": "Brief 1-sentence goal",
  "steps": [{ "agent": string, "action": string, "description": string }]
}

User prompt: "${prompt}"`;

    try {
      const text = await this.generateContentWithFallback(systemPrompt);
      if (!text) return null;

      const cleanJson = text.replace(/```json\n?/g, '').replace(/```/g, '').trim();
      return JSON.parse(cleanJson);
    } catch (err) {
      this.logger.error(`Intent extraction failed: ${err}`);
      return null;
    }
  }

  /**
   * Synthesise cross-specialist data into a human-readable response.
   */
  public async synthesizeResponseWithLLM(
    prompt: string,
    specialistData: Record<string, unknown>,
  ): Promise<string | null> {
    if (!this.genAI) return null;

    const hasData = Object.keys(specialistData ?? {}).length > 0;

    const promptText = hasData
      ? `You are Chief Ghost, a personal AI OS coordinator.
The user asked: "${prompt}"

Specialist agents provided:
${JSON.stringify(specialistData, null, 2)}

Give a concise, direct, friendly recommendation with clear rationale.`
      : `You are Chief Ghost, a personal AI OS coordinator.
The user said: "${prompt}"
Reply warmly and briefly. Introduce yourself as the central coordinator with specialist agents (Jobs, Finance, Shopping, Research, Communication). Ask how you can help.`;

    try {
      const text = await this.generateContentWithFallback(promptText);
      return text?.trim() ?? null;
    } catch (err) {
      this.logger.error(`Synthesis failed: ${err}`);
      return null;
    }
  }

  /**
   * Tailor a resume for a job description without fabricating any facts.
   */
  public async tailorResumeWithLLM(
    jobDescription: string,
    baseResumeMarkdown: string,
  ): Promise<string | null> {
    if (!this.genAI) return null;

    const promptText = `You are a Resume Specialist Agent.
Tailor the resume below for the target job. 

STRICT RULES:
- NEVER invent employment, skills, degrees, certifications, or metrics not already in the resume.
- Re-order and emphasise genuine competencies that match the job.
- Add a short "Targeted Competencies" section at the top.

Target Job:
${jobDescription}

Base Resume:
${baseResumeMarkdown}`;

    try {
      const text = await this.generateContentWithFallback(promptText);
      return text?.trim() ?? null;
    } catch (err) {
      this.logger.error(`Resume tailoring failed: ${err}`);
      return null;
    }
  }

  /**
   * Generates a tailored, persuasive cover letter without hallucinated facts.
   */
  public async generateCoverLetterWithLLM(
    company: string,
    role: string,
    jobDescription: string,
    candidateProfile: string,
  ): Promise<string | null> {
    if (!this.genAI) return null;

    const promptText = `You are an elite Career Strategist and Executive Headhunter.
Write an ATS-optimized, high-converting, tailored cover letter for the following opportunity.

STRICT CONSTRAINTS:
1. Candidate: ${candidateProfile}
2. Target Company: ${company}
3. Target Role: ${role}
4. Job Requirements & Context: ${jobDescription}
5. Do NOT invent companies worked at or fake credentials. Anchor strictly on the candidate's real stack and impact.
6. Tone: Confident, articulate, outcome-oriented, engineering-minded.
7. Format cleanly with standard formal business layout:
   - Header with Candidate Details & Date
   - Hiring Team / Engineering Leadership Address
   - Compelling Hook / Opener demonstrating knowledge of ${company}
   - Core Value Proposition & 2-3 specific technical achievements matching their stack
   - Collaborative alignment & cultural resonance
   - Professional closing with proactive next steps call-to-action`;

    try {
      const text = await this.generateContentWithFallback(promptText);
      return text?.trim() ?? null;
    } catch (err) {
      this.logger.error(`Cover letter generation failed: ${err}`);
      return null;
    }
  }
}
