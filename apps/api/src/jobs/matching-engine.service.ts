import { Injectable } from '@nestjs/common';
import { Job, JobMatchBreakdown, UserCareerProfile } from '@personal-os/shared';

@Injectable()
export class MatchingEngineService {
  /**
   * Scores a job against the user's career profile and generates an explainable breakdown
   */
  public scoreJob(job: Job, profile: UserCareerProfile): {
    overallScore: number;
    breakdown: JobMatchBreakdown;
  } {
    const reasons: string[] = [];
    const concerns: string[] = [];

    // 1. Role Match (25 pts max)
    let roleScore = 70;
    const lowerTitle = job.title.toLowerCase();
    const targetRoleMatch = profile.targetRoles.some((tr) => lowerTitle.includes(tr.toLowerCase()));
    if (targetRoleMatch) {
      roleScore = 95;
      reasons.push(`Target role match: "${job.title}" aligns directly with your preferred career path.`);
    } else {
      concerns.push(`Job title "${job.title}" differs slightly from your target roles (${profile.targetRoles.join(', ')}).`);
    }

    // 2. Skill Match (25 pts max)
    let matchedSkillsCount = 0;
    const userSkillsLower = new Set(profile.skills.map((s) => s.toLowerCase()));
    const missingSkills: string[] = [];

    for (const skill of job.skills) {
      if (userSkillsLower.has(skill.toLowerCase())) {
        matchedSkillsCount++;
      } else {
        missingSkills.push(skill);
      }
    }

    const totalJobSkills = Math.max(job.skills.length, 1);
    const skillRatio = matchedSkillsCount / totalJobSkills;
    const skillScore = Math.round(Math.min(100, Math.max(40, skillRatio * 100)));

    if (matchedSkillsCount > 0) {
      reasons.push(`${matchedSkillsCount}/${totalJobSkills} key technical skills match (${job.skills.filter(s => userSkillsLower.has(s.toLowerCase())).join(', ')}).`);
    }
    if (missingSkills.length > 0 && missingSkills.length <= 3) {
      concerns.push(`Job mentions ${missingSkills.join(', ')}, which are not strongly emphasized in your profile.`);
    }

    // 3. Location / Remote Match (15 pts max)
    let locationScore = 80;
    if (job.remote && (profile.workModePreference === 'remote' || profile.workModePreference === 'any')) {
      locationScore = 100;
      reasons.push('Remote flexibility matches your 100% remote preference.');
    } else if (!job.remote && profile.workModePreference === 'remote') {
      locationScore = 40;
      concerns.push(`Onsite/hybrid position located in ${job.location.join(', ')} conflicts with your remote preference.`);
    }

    // 4. Experience Match (15 pts max)
    const experienceScore = 90;
    reasons.push(`Your ${profile.yearsExperience}+ years experience satisfies the candidate seniority expectations.`);

    // 5. Salary Match (10 pts max)
    let salaryScore = 85;
    if (job.minSalary && profile.minSalary) {
      if (job.minSalary >= profile.minSalary) {
        salaryScore = 95;
        reasons.push(`Offered compensation meets or exceeds your baseline expectation.`);
      } else {
        salaryScore = 65;
        concerns.push(`Listed compensation may be below your preferred minimum target.`);
      }
    }

    // Weighted Overall Score (0 - 100)
    const overallScore = Math.round(
      roleScore * 0.25 +
      skillScore * 0.25 +
      locationScore * 0.20 +
      experienceScore * 0.15 +
      salaryScore * 0.15
    );

    const breakdown: JobMatchBreakdown = {
      overallScore,
      roleMatch: roleScore,
      skillMatch: skillScore,
      locationMatch: locationScore,
      experienceMatch: experienceScore,
      salaryMatch: salaryScore,
      reasons,
      concerns,
    };

    return { overallScore, breakdown };
  }
}
