import { Router } from "express";
import { z } from "zod";
import { prisma } from "../../db/prisma";
import { asyncHandler } from "../../middleware/errorHandler";
import { requireAuth } from "../../middleware/auth";

const router = Router();
router.use(requireAuth);

router.get(
  "/",
  asyncHandler(async (_req, res) => {
    const surveys = await prisma.survey.findMany({
      orderBy: { createdAt: "desc" },
      include: { _count: { select: { responses: true } } },
    });
    res.json(surveys);
  })
);

const questionSchema = z.object({
  id: z.string(),
  text: z.string().min(1),
  type: z.enum(["text", "rating", "yes_no"]).default("text"),
});

const upsertSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  questions: z.array(questionSchema),
  active: z.boolean().optional(),
});

router.get(
  "/:id",
  asyncHandler(async (req, res) => {
    const survey = await prisma.survey.findUnique({ where: { id: Number(req.params.id) } });
    if (!survey) return res.status(404).json({ message: "Survey not found" });
    res.json(survey);
  })
);

router.post(
  "/",
  asyncHandler(async (req, res) => {
    const input = upsertSchema.parse(req.body);
    const survey = await prisma.survey.create({ data: { ...input, questions: input.questions as any } });
    res.status(201).json(survey);
  })
);

router.put(
  "/:id",
  asyncHandler(async (req, res) => {
    const input = upsertSchema.partial().parse(req.body);
    const survey = await prisma.survey.update({
      where: { id: Number(req.params.id) },
      data: { ...input, questions: input.questions as any },
    });
    res.json(survey);
  })
);

router.delete(
  "/:id",
  asyncHandler(async (req, res) => {
    await prisma.survey.delete({ where: { id: Number(req.params.id) } });
    res.status(204).send();
  })
);

router.get(
  "/:id/responses",
  asyncHandler(async (req, res) => {
    const responses = await prisma.surveyResponse.findMany({
      where: { surveyId: Number(req.params.id) },
      orderBy: { submittedAt: "desc" },
      include: { appUser: { select: { email: true, firstName: true, lastName: true } } },
    });
    res.json(responses);
  })
);

export default router;
