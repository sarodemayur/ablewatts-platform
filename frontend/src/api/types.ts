export interface AdminProfile {
  id: number;
  email: string;
  username: string;
  firstName: string;
  lastName: string;
  type: string;
  accessLevel: number;
}

export interface LoginResponse {
  token: string;
  admin: AdminProfile;
}

export type RateStatus = "approved" | "unapproved";

export type FlattenedTierStructure = Record<string, number | string>;
export type ScheduleMatrix = number[][];

export interface UrdbRateData {
  flatdemandunit?: string;
  flatdemandstructure?: FlattenedTierStructure;
  flatdemandmonths?: Record<string, number>;
  demandrateunit?: string;
  demandratestructure?: FlattenedTierStructure;
  demandweekdayschedule?: ScheduleMatrix;
  demandweekendschedule?: ScheduleMatrix;
  demandratchetpercentage?: Record<string, number>;
  demandcomments?: string;
  coincidentrateunit?: string;
  coincidentratestructure?: FlattenedTierStructure;
  coincidentrateschedule?: ScheduleMatrix;
  energyratestructure: FlattenedTierStructure;
  energyweekdayschedule: ScheduleMatrix;
  energyweekendschedule: ScheduleMatrix;
  energyfueladjustments?: Record<string, number>;
  energycomments?: string;

  demandattrs?: CustomAttribute[];
  energyattrs?: CustomAttribute[];
  fixedattrs?: CustomAttribute[];
}

export interface CustomAttribute {
  attribute: string;
  value: string;
}

export interface UrdbRate {
  id: number;
  label: string | null;
  name: string;
  utility: string;
  sector: string;
  state: string | null;
  description: string | null;
  source: string | null;
  status: RateStatus;
  startDate: string;
  endDate: string | null;

  supersedesLabel: string | null;
  serviceType: string | null;
  sourceParent: string | null;
  compensationForDistributionGeneration: string | null;
  assumeNetMetering: boolean;
  basicComments: string | null;

  demandApplicabilityMin: number | null;
  demandApplicabilityMax: number | null;
  demandApplicabilityUnit: string;
  demandApplicabilityHistoryMonths: number | null;
  energyApplicabilityMin: number | null;
  energyApplicabilityMax: number | null;
  energyApplicabilityHistoryMonths: number | null;
  serviceVoltageMin: number | null;
  serviceVoltageMax: number | null;
  voltageCategory: string | null;
  phaseWiring: string | null;

  fixedDailyCharge: number;
  fixedMonthlyCharge: number;
  minMonthlyCharge: number;
  annualMinCharge: number;
  rateData: UrdbRateData;
  createdAt: string;
  updatedAt: string;
  createdBy?: { firstName: string; lastName: string; username: string };
}

export interface UrdbRateListResponse {
  rows: UrdbRate[];
  total: number;
  page: number;
  limit: number;
}

export interface UrdbRevision {
  id: number;
  action: string;
  note: string | null;
  createdAt: string;
  admin: { firstName: string; lastName: string; username: string };
}

export interface GreenDataFile {
  id: number;
  fileName: string;
  realFileName: string;
  isSample: boolean;
  uploadedAt: string;
}

export interface MonthlyBillLine {
  year: number;
  month: number;
  daysInMonth: number;
  energy: { consumptionTotal: number; contributionTotal: number; perPeriod: Record<string, number> };
  demand: { consumptionTotal: number; contributionTotal: number; perPeriod: Record<string, number> };
  flatDemand: { consumptionTotal: number; contributionTotal: number };
  fixedCharge: number;
  total: number;
}

export interface DailyBillLine {
  year: number;
  month: number;
  day: number;
  energy: { consumptionTotal: number; contributionTotal: number; perPeriod: Record<string, number> };
  demand: { consumptionTotal: number; contributionTotal: number; perPeriod: Record<string, number> };
  total: number;
}

export interface CalculateBillResponse {
  rate: { id: number; name: string; utility: string; sector: string; label: string | null };
  greenDataDurationMinutes: number;
  greenDataRange: { start: string; end: string };
  monthly?: MonthlyBillLine[];
  daily?: DailyBillLine[];
}

// ---------------------------------------------------------------------------
// Phase 2
// ---------------------------------------------------------------------------

export type LookupCategory = "sector" | "unit" | "service_type" | "voltage_category" | "phase_wire";

export interface Lookup {
  id: number;
  category: LookupCategory;
  code: string;
  label: string;
  active: boolean;
  createdAt: string;
}

export type AdminType = "super_admin" | "admin" | "editor";

export interface AdminUser {
  id: number;
  type: AdminType;
  firstName: string;
  lastName: string;
  email: string;
  username: string;
  accessLevel: number;
  active: boolean;
  createdAt: string;
  lastLoginAt: string | null;
  temporaryPassword?: string;
}

export type AppUserType = "registered" | "demo" | "beta" | "guest" | "invite";

export interface AppUser {
  id: number;
  type: AppUserType;
  email: string;
  firstName: string | null;
  lastName: string | null;
  isConverted: boolean;
  active: boolean;
  createdAt: string;
}

export interface AppUserListResponse {
  rows: AppUser[];
  total: number;
  page: number;
  limit: number;
}

export interface SurveyQuestion {
  id: string;
  text: string;
  type: "text" | "rating" | "yes_no";
}

export interface Survey {
  id: number;
  title: string;
  description: string | null;
  questions: SurveyQuestion[];
  active: boolean;
  createdAt: string;
  _count?: { responses: number };
}

export interface SurveyResponse {
  id: number;
  surveyId: number;
  appUserId: number | null;
  answers: Record<string, string>;
  submittedAt: string;
  appUser?: { email: string; firstName: string | null; lastName: string | null } | null;
}

export interface Feedback {
  id: number;
  appUserId: number | null;
  name: string | null;
  email: string | null;
  message: string;
  createdAt: string;
  appUser?: { email: string; firstName: string | null; lastName: string | null } | null;
}

export interface FeedbackListResponse {
  rows: Feedback[];
  total: number;
  page: number;
  limit: number;
}

export type HomepageContentKey = "about_us" | "contact_us" | "terms_of_service" | "privacy_policy";

export interface HomepageContent {
  key: HomepageContentKey;
  content: string;
  updatedAt: string;
}

export interface CsvImportResult {
  created: number;
  skipped: number;
  errors: string[];
}

export interface OtherAttributeRow {
  rateId: number;
  attribute: string;
  value: string;
  attributeGroup: "demand" | "energy" | "fixed";
  state: string | null;
  utility: string;
  sector: string;
  name: string;
  status: RateStatus;
  updatedAt: string;
}
