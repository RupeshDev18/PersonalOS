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
    let roleScore = 50;
    const lowerTitle = job.title.toLowerCase();
    const targetRoleMatch = profile.targetRoles.some((tr) => lowerTitle.includes(tr.toLowerCase()));
    if (targetRoleMatch) {
      roleScore = 95;
      reasons.push(`Target role match: "${job.title}" aligns directly with your preferred career path.`);
    } else if (profile.targetRoles.length > 0) {
      roleScore = 35;
      concerns.push(`Job title "${job.title}" differs slightly from your target roles (${profile.targetRoles.join(', ')}).`);
    } else {
      concerns.push('Add target roles to your career profile for a personalized role match.');
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
    const skillScore = profile.skills.length === 0
      ? 50
      : Math.round(Math.min(100, skillRatio * 100));

    if (matchedSkillsCount > 0) {
      reasons.push(`${matchedSkillsCount}/${totalJobSkills} key technical skills match (${job.skills.filter(s => userSkillsLower.has(s.toLowerCase())).join(', ')}).`);
    }
    if (missingSkills.length > 0 && missingSkills.length <= 3) {
      concerns.push(`Job mentions ${missingSkills.join(', ')}, which are not strongly emphasized in your profile.`);
    }
    if (profile.skills.length === 0) {
      concerns.push('Add skills to your career profile for a personalized skills match.');
    }

    // 3. Location / Remote Match (15 pts max)
    let locationScore = 80;
    if (job.remote && (profile.workModePreference === 'remote' || profile.workModePreference === 'any')) {
      locationScore = 100;
      reasons.push(profile.workModePreference === 'remote'
        ? 'This role is remote, matching your remote preference.'
        : 'This role is remote and your profile accepts remote work.');
    } else if (!job.remote && profile.workModePreference === 'remote') {
      locationScore = 40;
      concerns.push(`Onsite/hybrid position located in ${job.location.join(', ')} conflicts with your remote preference.`);
    }

    // 4. Experience Match (15 pts max)
    let experienceScore = 80;
    const expRegex = /(\d+(?:\.\d+)?)\s*(?:-|to)\s*(\d+(?:\.\d+)?)\s*(?:yrs|years)|(\d+(?:\.\d+)?)\+?\s*(?:yrs|years)/i;
    const expMatch = (job.description || '').match(expRegex);

    if (expMatch) {
      const minExp = parseFloat(expMatch[1] || expMatch[3]);
      const maxExp = expMatch[2] ? parseFloat(expMatch[2]) : undefined;
      const userExp = profile.yearsExperience || 0;

      if (userExp >= minExp && (!maxExp || userExp <= maxExp + 2)) {
        experienceScore = 95;
        reasons.push(`Your ${userExp}+ years of experience directly matches the requirement (${expMatch[0]}).`);
      } else if (userExp < minExp) {
        const gap = minExp - userExp;
        experienceScore = Math.max(40, Math.round(90 - gap * 15));
        concerns.push(`Job asks for ${expMatch[0]}, while your profile indicates ${userExp} years.`);
      } else {
        experienceScore = 85;
        reasons.push(`Your experience (${userExp} yrs) well exceeds the baseline requirement (${expMatch[0]}).`);
      }
    } else {
      experienceScore = 80;
      reasons.push('Experience level is flexible or open to candidates at your seniority level.');
    }

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
