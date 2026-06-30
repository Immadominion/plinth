import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import type { CreatePlanGroupService, CreatePlanService, UpdatePlanService } from '../../services/catalog.service.js';
import type { PlanGroupRepo, PlanRepo } from '../../db/catalog.repo.js';

const CreatePlanGroupSchema = z.object({
  name:        z.string().min(1).max(100),
  description: z.string().max(500).optional(),
});

const CreatePlanSchema = z.object({
  plan_group_id:          z.string().min(1),
  name:                   z.string().min(1).max(100),
  amount_minor:           z.number().int().nonnegative(),
  billing_interval:       z.enum(['day', 'week', 'month', 'year']),
  billing_interval_count: z.number().int().positive().default(1),
  trial_period_days:      z.number().int().nonnegative().default(0),
});

const UpdatePlanSchema = z.object({
  name:                   z.string().min(1).max(100).optional(),
  amount_minor:           z.number().int().nonnegative().optional(),
  billing_interval:       z.enum(['day', 'week', 'month', 'year']).optional(),
  billing_interval_count: z.number().int().positive().optional(),
  trial_period_days:      z.number().int().nonnegative().optional(),
  active:                 z.boolean().optional(),
});

export function makePlanGroupsRouter(createPlanGroupService: CreatePlanGroupService, planGroupRepo: PlanGroupRepo): Hono {
  const router = new Hono();

  router.get('/', async (c) => {
    const tenantId = c.get('tenantId');
    const list = await planGroupRepo.findAll(tenantId);
    return c.json({
      object: 'list',
      data: list.map((g) => ({ object: 'plan_group', id: g.id, name: g.name, description: g.description, created_at: g.createdAt.toISOString() })),
    });
  });

  router.post('/', zValidator('json', CreatePlanGroupSchema), async (c) => {
    const tenantId = c.get('tenantId');
    const body = c.req.valid('json');

    const input: Parameters<typeof createPlanGroupService.execute>[0] = { tenantId, name: body.name };
    if (body.description !== undefined) input.description = body.description;
    const result = await createPlanGroupService.execute(input);

    return c.json(
      { object: 'plan_group', id: result.planGroupId, name: result.name, created_at: result.createdAt.toISOString() },
      201,
    );
  });

  return router;
}

export function makePlansRouter(createPlanService: CreatePlanService, updatePlanService: UpdatePlanService, planRepo: PlanRepo): Hono {
  const router = new Hono();

  router.get('/', async (c) => {
    const tenantId = c.get('tenantId');
    const list = await planRepo.findAll(tenantId);
    return c.json({
      object: 'list',
      data: list.map((p) => ({
        object:        'plan',
        id:            p.id,
        plan_group_id: p.planGroupId,
        name:          p.name,
        amount_minor:  p.amountMinor.toString(),
        interval:      p.billingInterval,
        interval_count: p.billingIntervalCount,
        trial_period_days: p.trialPeriodDays,
        created_at:    p.createdAt.toISOString(),
      })),
    });
  });

  router.post('/', zValidator('json', CreatePlanSchema), async (c) => {
    const tenantId = c.get('tenantId');
    const body = c.req.valid('json');

    const result = await createPlanService.execute({
      tenantId,
      planGroupId:          body.plan_group_id,
      name:                 body.name,
      amountMinor:          BigInt(body.amount_minor),
      billingInterval:      body.billing_interval,
      billingIntervalCount: body.billing_interval_count,
      trialPeriodDays:      body.trial_period_days,
    });

    return c.json(
      {
        object:       'plan',
        id:           result.planId,
        name:         result.name,
        amount_minor: result.amountMinor.toString(),
        created_at:   result.createdAt.toISOString(),
      },
      201,
    );
  });

  router.patch('/:id', zValidator('json', UpdatePlanSchema), async (c) => {
    const tenantId = c.get('tenantId');
    const body = c.req.valid('json');
    try {
      const p = await updatePlanService.execute({
        tenantId,
        planId:               c.req.param('id'),
        name:                 body.name,
        amountMinor:          body.amount_minor !== undefined ? BigInt(body.amount_minor) : undefined,
        billingInterval:      body.billing_interval,
        billingIntervalCount: body.billing_interval_count,
        trialPeriodDays:      body.trial_period_days,
        active:               body.active,
      });
      return c.json({
        object:            'plan',
        id:                p.id,
        plan_group_id:     p.planGroupId,
        name:              p.name,
        amount_minor:      p.amountMinor.toString(),
        interval:          p.billingInterval,
        interval_count:    p.billingIntervalCount,
        trial_period_days: p.trialPeriodDays,
        active:            p.active,
        created_at:        p.createdAt.toISOString(),
      });
    } catch (err: any) {
      return c.json({ error: err.message }, 400);
    }
  });

  return router;
}
