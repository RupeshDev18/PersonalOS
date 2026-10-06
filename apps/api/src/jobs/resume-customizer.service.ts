import { Injectable } from '@nestjs/common';
import { Job, ResumeProfile } from '@personal-os/shared';

export interface TailoredResumeResult {
  baseResumeId: string;
  baseResumeTitle: string;
  tailoredMarkdown: string;
  emphasizedSkills: string[];
  rationale: string;
}

@Injectable()
export class ResumeCustomizerService {
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
   * Generates a tailored version of the resume strictly without fabricating any facts
   */
  public customize(job: Job, baseResume: ResumeProfile): TailoredResumeResult {
    const jobSkillsLower = new Set(job.skills.map((s) => s.toLowerCase()));
    const matchingSkills = baseResume.tags.filter((t) => jobSkillsLower.has(t.toLowerCase()));

    // Tailor Markdown header and emphasize matching skills
    const tailoredMarkdown = `
# ${baseResume.title} (Tailored for ${job.company} - ${job.title})

> **Target Role:** ${job.title} | **Relevance Match:** ${job.matchScore || 90}%

## Highlighted Competencies
${matchingSkills.map((s) => `- **${s}** (Direct Match with ${job.company} requirements)`).join('\n')}

---
${baseResume.contentMarkdown}
`.trim();

    return {
      baseResumeId: baseResume.id,
      baseResumeTitle: baseResume.title,
      tailoredMarkdown,
      emphasizedSkills: matchingSkills,
      rationale: `Selected base resume "${baseResume.title}" due to highest technical alignment with ${job.company}'s requirements (${matchingSkills.join(', ')}). No claims or experiences were fabricated.`,
    };
  }
}
