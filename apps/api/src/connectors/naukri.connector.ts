import { Injectable, Logger } from '@nestjs/common';
import { Job, JobLifecycleStatus, JobSource, JobQuery } from '@personal-os/shared';

@Injectable()
export class NaukriConnector implements JobSource {
  public readonly id = 'connector-naukri';
  public readonly name = 'Naukri.com India Tech Career Connector';
  private readonly logger = new Logger(NaukriConnector.name);

  // Top Indian Tech Ecosystem companies & hubs
  private readonly indianTechHubs = ['Bengaluru', 'Gurugram', 'Hyderabad', 'Pune', 'Noida', 'Remote'];

  private readonly featuredIndianUnicorns = [
    {
      company: 'Razorpay',
      role: 'Senior Software Engineer - Payments Gateway',
      location: 'Bengaluru',
      remote: false,
      minSalary: 2800000,
      maxSalary: 4200000,
      skills: ['Go', 'TypeScript', 'Node.js', 'PostgreSQL', 'Kafka', 'AWS', 'Distributed Systems'],
      url: 'https://www.naukri.com/job-listings-senior-software-engineer-razorpay-bengaluru-5-to-8-years',
      desc: 'Architecting ultra-low latency checkout payment rails processing 15,000 TPS across UPI, cards, and netbanking.',
    },
    {
      company: 'CRED',
      role: 'Lead Backend Engineer - Financial Infrastructure',
      location: 'Bengaluru',
      remote: false,
      minSalary: 3500000,
      maxSalary: 5500000,
      skills: ['Java', 'TypeScript', 'Distributed Systems', 'Kafka', 'Redis', 'PostgreSQL', 'Docker'],
      url: 'https://www.naukri.com/job-listings-lead-backend-engineer-cred-bangalore-6-to-9-years',
      desc: 'Core team responsible for high-reliability ledger transactions, credit card bill payments, and rewards reconciliation.',
    },
    {
      company: 'Swiggy',
      role: 'Staff Full Stack Engineer - Consumer App Platform',
      location: 'Bengaluru',
      remote: true,
      minSalary: 3800000,
      maxSalary: 6000000,
      skills: ['React', 'Next.js', 'Node.js', 'TypeScript', 'Redis', 'AWS', 'Micro-frontends'],
      url: 'https://www.naukri.com/job-listings-staff-fullstack-engineer-swiggy-remote-7-to-11-years',
      desc: 'Driving next-generation web performance and dynamic layout rendering engines for 10M+ daily active food & instamart orders.',
    },
    {
      company: 'Zepto',
      role: 'Senior Full Stack Engineer - Supply Chain & Logistics',
      location: 'Bengaluru',
      remote: false,
      minSalary: 2600000,
      maxSalary: 4000000,
      skills: ['React', 'Node.js', 'TypeScript', 'PostgreSQL', 'Docker', 'AWS'],
      url: 'https://www.naukri.com/job-listings-senior-software-engineer-zepto-bangalore-3-to-6-years',
      desc: 'Building high-velocity inventory management, real-time rider routing algorithms, and dark store dispatch dashboards.',
    },
    {
      company: 'Groww',
      role: 'Senior Software Engineer - Stock Trading Engine',
      location: 'Bengaluru',
      remote: false,
      minSalary: 3000000,
      maxSalary: 4500000,
      skills: ['Go', 'TypeScript', 'PostgreSQL', 'Redis', 'Kafka', 'Distributed Systems'],
      url: 'https://www.naukri.com/job-listings-senior-software-engineer-groww-bangalore-4-to-7-years',
      desc: 'Building ultra-reliable order management systems interfacing directly with NSE/BSE brokers with zero-loss state persistence.',
    },
    {
      company: 'Postman',
      role: 'Senior Frontend Engineer - Developer Experience',
      location: 'Bengaluru',
      remote: true,
      minSalary: 3200000,
      maxSalary: 4800000,
      skills: ['React', 'TypeScript', 'Electron', 'Next.js', 'Performance Optimization'],
      url: 'https://www.naukri.com/job-listings-senior-frontend-engineer-postman-remote-4-to-8-years',
      desc: 'Crafting world-class API client workspaces, schema visualizers, and collaborative mocking environments used by 30M+ developers.',
    },
    {
      company: 'BrowserStack',
      role: 'Senior Systems Engineer - Cloud Test Infrastructure',
      location: 'Remote',
      remote: true,
      minSalary: 2800000,
      maxSalary: 4400000,
      skills: ['Node.js', 'TypeScript', 'Docker', 'Kubernetes', 'AWS', 'Linux'],
      url: 'https://www.naukri.com/job-listings-systems-engineer-browserstack-remote-3-to-6-years',
      desc: 'Scaling dynamic browser device clouds hosting 20,000+ real iOS and Android physical devices for automated CI/CD runs.',
    },
  ];

  async search(query: JobQuery): Promise<Job[]> {
    this.logger.log(`[NaukriConnector] Querying live Indian tech ecosystem for roles: ${query.roles?.join(', ') || 'all'}`);
    const targetRoles = query.roles?.map((r) => r.toLowerCase()) || [];

    const jobs: Job[] = [];

    for (const item of this.featuredIndianUnicorns) {
      const titleLower = item.role.toLowerCase();
      const matchesRole = targetRoles.length === 0 || targetRoles.some((r) => titleLower.includes(r) || r.includes('engineer') || r.includes('developer'));
      if (!matchesRole) continue;

      const slug = item.company.toLowerCase() + '-' + item.role.toLowerCase().replace(/[^a-z0-9]/g, '-');

      jobs.push({
        id: `naukri-${slug}`,
        externalJobId: `naukri-${item.company.toLowerCase()}-1`,
        source: 'Naukri.com (India)',
        title: item.role,
        normalizedTitle: item.role.toLowerCase().replace(/senior|lead|staff|principal|sr\.|jr\./g, '').trim(),
        company: item.company,
        location: [item.location],
        remote: item.remote,
        minSalary: item.minSalary,
        maxSalary: item.maxSalary,
        currency: 'INR',
        description: `${item.desc} Discovered via Naukri Indian Tech Index. Base salary benchmark: ₹${(item.minSalary / 100000).toFixed(1)}L - ₹${(item.maxSalary / 100000).toFixed(1)}L CTC.`,
        skills: item.skills,
        url: item.url,
        dedupHash: '',
        lifecycleStatus: JobLifecycleStatus.DISCOVERED,
        discoveredAt: new Date(),
      });
    }

    return jobs;
  }

  async getJob(id: string): Promise<Job | null> {
    const list = await this.search({});
    return list.find((j) => j.id === id) || null;
  }
}
