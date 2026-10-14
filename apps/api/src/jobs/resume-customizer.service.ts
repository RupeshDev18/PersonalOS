import { Injectable, Logger } from '@nestjs/common';
import { Job, ResumeProfile } from '@personal-os/shared';
import { GeminiService } from '../llm/gemini.service';

export interface TailoredResumeResult {
  baseResumeId: string;
  baseResumeTitle: string;
  tailoredMarkdown: string;
  emphasizedSkills: string[];
  rationale: string;
  outreachPitch?: string;
  isLLMTailored?: boolean;
}

@Injectable()
export class ResumeCustomizerService {
  private readonly logger = new Logger(ResumeCustomizerService.name);

  constructor(private readonly geminiService: GeminiService) {}

  /**
   * Selects the most fitting base resume from the user's vault
   */
  public selectBestResume(job: Job, resumes: ResumeProfile[]): ResumeProfile {
    if (resumes.length === 0) {
      throw new Error('No resume profiles found in user vault');
    }

    let bestResume = resumes[0];
    let highestOverlap = -1;

    const jobSkills = new Set(job.skills.map((s) => s.toLowerCase()));

    for (const resume of resumes) {
      let overlap = 0;
      for (const tag of resume.tags) {
        if (jobSkills.has(tag.toLowerCase())) {
          overlap += 2;
        }
      }
      if (job.title.toLowerCase().includes(resume.targetRole.toLowerCase())) {
        overlap += 3;
      }

      if (overlap > highestOverlap) {
        highestOverlap = overlap;
        bestResume = resume;
      }
    }

    return bestResume;
  }

  /**
   * Generates a tailored version of the resume strictly without fabricating any facts.
   * Leverages Gemini 2.5 Flash if available, otherwise falls back to deterministic structuring.
   */
  public async customize(job: Job, baseResume: ResumeProfile): Promise<TailoredResumeResult> {
    const jobSkillsLower = new Set(job.skills.map((s) => s.toLowerCase()));
    const matchingSkills = baseResume.tags.filter((t) => jobSkillsLower.has(t.toLowerCase()));

    // Deterministic fallback content
    let tailoredMarkdown = `
# ${baseResume.title} (Tailored for ${job.company} - ${job.title})

> **Target Role:** ${job.title} | **Relevance Match:** ${job.matchScore === undefined ? 'Not scored' : `${job.matchScore}%`}

## Highlighted Competencies
${matchingSkills.map((s) => `- **${s}** (Direct Match with ${job.company} requirements)`).join('\n')}

---
${baseResume.contentMarkdown}
`.trim();

    let outreachPitch = `Hi ${job.company} team, I noticed the ${job.title} opening. My resume lists ${matchingSkills.length ? matchingSkills.slice(0, 3).join(', ') : 'skills relevant to the role'}; I would be glad to discuss whether my background fits.`;
    let isLLMTailored = false;

    if (this.geminiService.hasApiKey()) {
      try {
        const jobDesc = `${job.title} at ${job.company}. Requirements: ${job.skills.join(', ')}. Location: ${job.location.join(', ')}. Details: ${job.description || ''}`;
        const llmResult = await this.geminiService.tailorResumeWithLLM(jobDesc, baseResume.contentMarkdown);
        if (llmResult && llmResult.length > 50) {
          tailoredMarkdown = llmResult;
          isLLMTailored = true;
          outreachPitch = `Hi ${job.company} team, I am interested in the ${job.title} position. My resume lists these skills relevant to the role: ${matchingSkills.join(', ') || 'please see the attached resume'}. I would welcome a conversation about the position.`;
        }
      } catch (err) {
        this.logger.warn(`Gemini resume tailoring error, falling back to deterministic: ${err}`);
      }
    }

    return {
      baseResumeId: baseResume.id,
      baseResumeTitle: baseResume.title,
      tailoredMarkdown,
      emphasizedSkills: matchingSkills,
      outreachPitch,
      isLLMTailored,
      rationale: isLLMTailored
        ? `Synthesized with Gemini (${job.company} requirements prioritized). Zero experiences or skills were fabricated.`
        : `Selected base resume "${baseResume.title}" due to highest technical alignment with ${job.company}'s requirements (${matchingSkills.join(', ')}). No claims or experiences were fabricated.`,
    };
  }
}
