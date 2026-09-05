import { Router } from "express";
import { z } from "zod";
import { RateStatus } from "@prisma/client";
import * as urdbService from "./urdb.service";
import { asyncHandler } from "../../middleware/errorHandler";
import { requireAuth } from "../../middleware/auth";

const router = Router();
router.use(requireAuth);

const tierStructureSchema = z.record(z.union([z.number(), z.string()]));
const scheduleMatrixSchema = z.array(z.array(z.number())).length(12);

const attributeSchema = z.array(z.object({ attribute: z.string(), value: z.string() }));

const rateDataSchema = z.object({
  flatdemandunit: z.string().optional(),
  flatdemandstructure: tierStructureSchema.optional(),
  flatdemandmonths: z.record(z.number()).optional(),
  demandrateunit: z.string().optional(),
  demandratestructure: tierStructureSchema.optional(),
  demandweekdayschedule: scheduleMatrixSchema.optional(),
  demandweekendschedule: scheduleMatrixSchema.optional(),
  demandratchetpercentage: z.record(z.number()).optional(),
  demandcomments: z.string().optional(),
  coincidentrateunit: z.string().optional(),
  coincidentratestructure: tierStructureSchema.optional(),
  coincidentrateschedule: scheduleMatrixSchema.optional(),
  energyratestructure: tierStructureSchema,
  energyweekdayschedule: scheduleMatrixSchema,
  energyweekendschedule: scheduleMatrixSchema,
  energyfueladjustments: z.record(z.number()).optional(),
  energycomments: z.string().optional(),
  demandattrs: attributeSchema.optional(),
  energyattrs: attributeSchema.optional(),
  fixedattrs: attributeSchema.optional(),
});

const createRateSchema = z.object({
  label: z.string().optional(),
  name: z.string().min(1),
  utility: z.string().min(1),
  sector: z.string().min(1),
  state: z.string().optional(),
  description: z.string().optional(),
  source: z.string().optional(),
  startDate: z.string(),
  endDate: z.string().nullable().optional(),

  supersedesLabel: z.string().optional(),
  serviceType: z.string().optional(),
  sourceParent: z.string().optional(),
  compensationForDistributionGeneration: z.string().optional(),
  assumeNetMetering: z.boolean().optional(),
  basicComments: z.string().optional(),

  demandApplicabilityMin: z.number().nullable().optional(),
  demandApplicabilityMax: z.number().nullable().optional(),
  demandApplicabilityUnit: z.string().optional(),
  demandApplicabilityHistoryMonths: z.number().nullable().optional(),
  energyApplicabilityMin: z.number().nullable().optional(),
  energyApplicabilityMax: z.number().nullable().optional(),
  energyApplicabilityHistoryMonths: z.number().nullable().optional(),
  serviceVoltageMin: z.number().nullable().optional(),
  serviceVoltageMax: z.number().nullable().optional(),
  voltageCategory: z.string().optional(),
  phaseWiring: z.string().optional(),

  fixedDailyCharge: z.number().optional(),
  fixedMonthlyCharge: z.number().optional(),
  minMonthlyCharge: z.number().optional(),
  annualMinCharge: z.number().optional(),
  rateData: rateDataSchema,
});

router.get(
  "/",
  asyncHandler(async (req, res) => {
    const { utility, sector, state, status, effectiveAsOf, orderBy, direction, page, limit } = req.query;
    const result = await urdbService.listRates({
      utility: utility as string | undefined,
      sector: sector as string | undefined,
      state: state as string | undefined,
      status: status as RateStatus | undefined,
      effectiveAsOf: effectiveAsOf as string | undefined,
      orderBy: orderBy as "updatedAt" | "utility" | "name" | "startDate" | undefined,
      direction: direction as "asc" | "desc" | undefined,
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
    });
    res.json(result);
  })
);

router.get(
  "/filters/utilities",
  asyncHandler(async (req, res) => {
    const utilities = await urdbService.listDistinctUtilities(
      req.query.sector as string | undefined,
      req.query.state as string | undefined
    );
    res.json(utilities);
  })
);

router.get(
  "/filters/names",
  asyncHandler(async (req, res) => {
    const { utility, sector } = req.query;
    const names = await urdbService.listDistinctNames(String(utility), String(sector));
    res.json(names);
  })
);

router.get(
  "/other-attributes",
  asyncHandler(async (req, res) => {
    const { state, utility, sector, name, attributeGroup, orderBy, direction } = req.query;
    const rows = await urdbService.searchOtherAttributes({
      state: state as string | undefined,
      utility: utility as string | undefined,
      sector: sector as string | undefined,
      name: name as string | undefined,
      attributeGroup: attributeGroup as "demand" | "energy" | "fixed" | undefined,
      orderBy: orderBy as "attribute" | "utility" | "sector" | "name" | "updatedAt" | undefined,
      direction: direction as "asc" | "desc" | undefined,
    });
    res.json(rows);
  })
);

router.get(
  "/:id",
  asyncHandler(async (req, res) => {
    const rate = await urdbService.getRateById(Number(req.params.id));
    res.json(rate);
  })
);

router.post(
  "/",
  asyncHandler(async (req, res) => {
    const input = createRateSchema.parse(req.body);
    const rate = await urdbService.createRate(req.admin!.id, input);
    res.status(201).json(rate);
  })
);

router.put(
  "/:id",
  asyncHandler(async (req, res) => {
    const input = createRateSchema.partial().parse(req.body);
    const rate = await urdbService.updateRate(req.admin!.id, Number(req.params.id), input);
    res.json(rate);
  })
);

router.post(
  "/:id/approve",
  asyncHandler(async (req, res) => {
    const rate = await urdbService.setApprovalStatus(req.admin!.id, Number(req.params.id), RateStatus.approved);
    res.json(rate);
  })
);

router.post(
  "/:id/unapprove",
  asyncHandler(async (req, res) => {
    const rate = await urdbService.setApprovalStatus(req.admin!.id, Number(req.params.id), RateStatus.unapproved);
    res.json(rate);
  })
);

router.delete(
  "/:id",
  asyncHandler(async (req, res) => {
    await urdbService.deleteRate(Number(req.params.id));
    res.status(204).send();
  })
);

router.get(
  "/:id/revisions",
  asyncHandler(async (req, res) => {
    const revisions = await urdbService.listRevisions(Number(req.params.id));
    res.json(revisions);
  })
);

export default router;
