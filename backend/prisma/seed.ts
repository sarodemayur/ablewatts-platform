import bcrypt from "bcryptjs";
import fs from "fs";
import path from "path";
import { PrismaClient, AdminType, RateStatus, LookupCategory, HomepageContentKey } from "@prisma/client";
import { UrdbRateData } from "../src/modules/urdb/urdb.types";

const prisma = new PrismaClient();

const GREEN_DATA_DIR = process.env.GREEN_DATA_DIR ?? path.join(__dirname, "..", "uploads", "green-data");

async function main() {
  fs.mkdirSync(GREEN_DATA_DIR, { recursive: true });

  const passwordHash = await bcrypt.hash("admin123", 10);
  const admin = await prisma.admin.upsert({
    where: { email: "admin@ablewatts.local" },
    update: {},
    create: {
      type: AdminType.super_admin,
      firstName: "Admin",
      lastName: "User",
      email: "admin@ablewatts.local",
      username: "admin",
      accessLevel: 99,
      active: true,
      passwordHash,
    },
  });
  console.log(`Seeded admin: ${admin.email} / password: admin123`);

  const zero24 = Array.from({ length: 24 }, () => 0);
  const schedule12x24 = Array.from({ length: 12 }, () => [...zero24]);

  const rateData: UrdbRateData = {
    energyratestructure: {
      "energyratestructure/period0/tier0max": 0,
      "energyratestructure/period0/tier0rate": 0.15,
      "energyratestructure/period0/tier0adj": 0,
      "energyratestructure/period0/tier0unit": "kWh",
    },
    energyweekdayschedule: schedule12x24,
    energyweekendschedule: schedule12x24,
  };

  const rate = await prisma.urdbRate.upsert({
    where: { id: 1 },
    update: {},
    create: {
      label: "test-residential-rate",
      name: "Test Residential Rate",
      utility: "Test Utility Co",
      sector: "ssc_re",
      state: "CA",
      description: "Flat $0.15/kWh residential rate for local development/testing.",
      status: RateStatus.approved,
      startDate: new Date(Date.UTC(2015, 0, 1)),
      endDate: new Date(Date.UTC(2025, 11, 31)),
      fixedMonthlyCharge: 10,
      minMonthlyCharge: 0,
      rateData: rateData as any,
      createdByAdminId: admin.id,
    },
  });
  console.log(`Seeded URDB rate: ${rate.name} (${rate.utility}/${rate.sector})`);

  // Sample green-data fixtures are bundled in the repo itself (backend/sample-data)
  // so seeding works the same on the host and inside the backend container,
  // regardless of where GREEN_DATA_DIR's volume actually lives.
  const sampleDataDir = path.join(__dirname, "..", "sample-data");
  const sampleFiles = ["Test_One_day_27_mar.csv", "Test_01_jan_2015_TO_31_dec_2015.csv"];

  for (const fileName of sampleFiles) {
    const src = path.join(sampleDataDir, fileName);
    if (!fs.existsSync(src)) continue;
    const dest = path.join(GREEN_DATA_DIR, fileName);
    fs.copyFileSync(src, dest);

    await prisma.greenDataFile.upsert({
      where: { id: sampleFiles.indexOf(fileName) + 1 },
      update: {},
      create: {
        adminId: admin.id,
        fileName,
        realFileName: fileName,
        storagePath: fileName,
        isSample: true,
      },
    });
    console.log(`Seeded sample green-data file: ${fileName}`);
  }

  const lookups: Array<{ category: LookupCategory; code: string; label: string }> = [
    { category: LookupCategory.sector, code: "ssc_re", label: "Residential" },
    { category: LookupCategory.sector, code: "ssc_com", label: "Commercial" },
    { category: LookupCategory.sector, code: "ssc_ind", label: "Industrial" },
    { category: LookupCategory.unit, code: "kW", label: "Kilowatt (kW)" },
    { category: LookupCategory.unit, code: "kVA", label: "Kilovolt-ampere (kVA)" },
    { category: LookupCategory.unit, code: "hp", label: "Horsepower (hp)" },
    { category: LookupCategory.service_type, code: "bundled", label: "Bundled" },
    { category: LookupCategory.service_type, code: "delivery_only", label: "Delivery Only" },
    { category: LookupCategory.voltage_category, code: "secondary", label: "Secondary" },
    { category: LookupCategory.voltage_category, code: "primary", label: "Primary" },
    { category: LookupCategory.voltage_category, code: "transmission", label: "Transmission" },
    { category: LookupCategory.phase_wire, code: "1_2", label: "Single Phase (2-wire)" },
    { category: LookupCategory.phase_wire, code: "3_3", label: "Three Phase (3-wire)" },
    { category: LookupCategory.phase_wire, code: "3_4", label: "Three Phase (4-wire)" },
  ];
  for (const lookup of lookups) {
    await prisma.lookup.upsert({
      where: { category_code: { category: lookup.category, code: lookup.code } },
      update: {},
      create: lookup,
    });
  }
  console.log(`Seeded ${lookups.length} lookup values`);

  const homepageContent: Array<{ key: HomepageContentKey; content: string }> = [
    { key: HomepageContentKey.about_us, content: "AbleWatts helps utilities and customers understand electric rate structures." },
    { key: HomepageContentKey.contact_us, content: "Contact us at support@ablewatts.local." },
    { key: HomepageContentKey.terms_of_service, content: "Terms of service placeholder text." },
    { key: HomepageContentKey.privacy_policy, content: "Privacy policy placeholder text." },
  ];
  for (const page of homepageContent) {
    await prisma.homepageContent.upsert({ where: { key: page.key }, update: {}, create: page });
  }
  console.log(`Seeded ${homepageContent.length} homepage content pages`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
