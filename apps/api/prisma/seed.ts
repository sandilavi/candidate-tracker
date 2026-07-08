import { PrismaClient } from '@prisma/client';
import { randomUUID } from 'crypto';

const prisma = new PrismaClient();

const statuses = ["applied", "screening", "interview", "offer", "hired", "rejected"];
const jobTitles = ["Frontend Engineer", "Backend Developer", "Product Manager", "Data Scientist", "DevOps Engineer"];
const companies = ["TechCorp", "Innovate LLC", "CloudSystems", "DataFlow Inc", "WebWorks"];
const sources = ["LinkedIn", "Referral", "Indeed", "Company Website", "Hired.com"];

function getRandomInt(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function getRandomItem(arr: any[]) {
  return arr[getRandomInt(0, arr.length - 1)];
}

async function main() {
  console.log("Starting database seed...");

  // Clean up existing data to prevent duplicates on re-seed
  await prisma.application.deleteMany();
  await prisma.candidate.deleteMany();

  // Generate 10 Candidates
  for (let i = 1; i <= 10; i++) {
    const candidateId = randomUUID();
    const candidate = await prisma.candidate.create({
      data: {
        id: candidateId,
        name: `Candidate ${i}`,
        email: `candidate${i}@example.com`,
        phone: `+1-555-010${i}`,
        location: `City ${i}, State`,
        linkedin_url: `https://linkedin.com/in/candidate${i}`,
        notes: `Initial notes for Candidate ${i}`,
      },
    });

    console.log(`Created candidate: ${candidate.name}`);

    // Generate 2-4 Applications for each Candidate
    const appCount = getRandomInt(2, 4);
    for (let j = 1; j <= appCount; j++) {
      await prisma.application.create({
        data: {
          candidate_id: candidate.id,
          job_title: getRandomItem(jobTitles),
          company: getRandomItem(companies),
          status: getRandomItem(statuses),
          applied_at: new Date(Date.now() - getRandomInt(1, 60) * 24 * 60 * 60 * 1000), // Random date within last 60 days
          salary_expectation: getRandomInt(80, 150) * 1000,
          source: getRandomItem(sources),
          notes: `Application ${j} notes for ${candidate.name}`,
        },
      });
    }
  }

  console.log("Seeding finished successfully.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
