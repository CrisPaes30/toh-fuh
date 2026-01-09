import { z } from "zod";
import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return {
        success: true,
      } as const;
    }),
  }),

  transactions: router({
    list: protectedProcedure.query(async ({ ctx }) => {
      const { getUserTransactions } = await import("./db");
      return getUserTransactions(ctx.user.id, 100);
    }),
    recent: protectedProcedure.query(async ({ ctx }) => {
      const { getUserTransactions } = await import("./db");
      return getUserTransactions(ctx.user.id, 5);
    }),
    create: protectedProcedure
      .input(
        z.object({
          categoryId: z.number(),
          amount: z.number().positive(),
          description: z.string().optional(),
          date: z.date(),
          type: z.enum(["income", "expense"]),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const { createTransaction } = await import("./db");
        return createTransaction({
          userId: ctx.user.id,
          categoryId: input.categoryId,
          amount: Math.round(input.amount * 100),
          description: input.description,
          date: input.date,
          type: input.type,
        });
      }),
  }),

  categories: router({
    list: protectedProcedure.query(async ({ ctx }) => {
      const { getUserCategories } = await import("./db");
      return getUserCategories(ctx.user.id);
    }),
    create: protectedProcedure
      .input(
        z.object({
          name: z.string(),
          type: z.enum(["income", "expense"]),
          color: z.string().optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const { createCategory } = await import("./db");
        return createCategory({
          userId: ctx.user.id,
          ...input,
        });
      }),
  }),

  analytics: router({
    monthlyBalance: protectedProcedure
      .input(
        z.object({
          year: z.number(),
          month: z.number().min(1).max(12),
        })
      )
      .query(async ({ ctx, input }) => {
        const { calculateMonthlyBalance } = await import("./db");
        return calculateMonthlyBalance(ctx.user.id, input.year, input.month);
      }),
    monthlySummaries: protectedProcedure.query(async ({ ctx }) => {
      const { getUserMonthlySummaries } = await import("./db");
      return getUserMonthlySummaries(ctx.user.id);
    }),
    suggestions: protectedProcedure
      .input(
        z.object({
          year: z.number(),
          month: z.number().min(1).max(12),
        })
      )
      .query(async ({ ctx, input }) => {
        const { calculateMonthlyBalance } = await import("./db");
        const { generateAllSuggestions } = await import("./suggestions");
        const balance = await calculateMonthlyBalance(ctx.user.id, input.year, input.month);
        return generateAllSuggestions(
          ctx.user.id,
          input.year,
          input.month,
          balance?.balance || 0
        );
      }),
  }),

  setup: router({
    initCategories: protectedProcedure.mutation(async ({ ctx }) => {
      const { initializeDefaultCategories } = await import("./initCategories");
      await initializeDefaultCategories(ctx.user.id);
      return { success: true };
    }),
  }),

  goals: router({
    list: protectedProcedure
      .input(
        z.object({
          year: z.number(),
          month: z.number().min(1).max(12),
        })
      )
      .query(async ({ ctx, input }) => {
        const { getUserFinancialGoals } = await import("./db");
        return getUserFinancialGoals(ctx.user.id, input.year, input.month);
      }),
    create: protectedProcedure
      .input(
        z.object({
          categoryId: z.number(),
          name: z.string(),
          targetAmount: z.number().positive(),
          year: z.number(),
          month: z.number().min(1).max(12),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const { createFinancialGoal } = await import("./db");
        return createFinancialGoal({
          userId: ctx.user.id,
          categoryId: input.categoryId,
          name: input.name,
          targetAmount: Math.round(input.targetAmount * 100),
          year: input.year,
          month: input.month,
        });
      }),
    update: protectedProcedure
      .input(
        z.object({
          id: z.number(),
          status: z.enum(["in_progress", "completed", "failed"]).optional(),
          currentAmount: z.number().optional(),
        })
      )
      .mutation(async ({ input }) => {
        const { updateFinancialGoal } = await import("./db");
        return updateFinancialGoal(input.id, {
          status: input.status,
          currentAmount: input.currentAmount ? Math.round(input.currentAmount * 100) : undefined,
        });
      }),
  }),

  limits: router({
    list: protectedProcedure.query(async ({ ctx }) => {
      const { getUserCategoryLimits } = await import("./db");
      return getUserCategoryLimits(ctx.user.id);
    }),
    create: protectedProcedure
      .input(
        z.object({
          categoryId: z.number(),
          monthlyLimit: z.number().positive(),
          alertThreshold: z.number().min(0).max(100).optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const { createCategoryLimit } = await import("./db");
        return createCategoryLimit({
          userId: ctx.user.id,
          categoryId: input.categoryId,
          monthlyLimit: Math.round(input.monthlyLimit * 100),
          alertThreshold: input.alertThreshold || 80,
        });
      }),
    update: protectedProcedure
      .input(
        z.object({
          id: z.number(),
          monthlyLimit: z.number().positive().optional(),
          alertThreshold: z.number().min(0).max(100).optional(),
          isActive: z.boolean().optional(),
        })
      )
      .mutation(async ({ input }) => {
        const { updateCategoryLimit } = await import("./db");
        return updateCategoryLimit(input.id, {
          monthlyLimit: input.monthlyLimit ? Math.round(input.monthlyLimit * 100) : undefined,
          alertThreshold: input.alertThreshold,
          isActive: input.isActive ? 1 : 0,
        });
      }),
    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        const { deleteCategoryLimit } = await import("./db");
        return deleteCategoryLimit(input.id);
      }),
    checkLimit: protectedProcedure
      .input(
        z.object({
          categoryId: z.number(),
          year: z.number(),
          month: z.number().min(1).max(12),
        })
      )
      .query(async ({ ctx, input }) => {
        const { checkCategoryLimitExceeded } = await import("./db");
        return checkCategoryLimitExceeded(
          ctx.user.id,
          input.categoryId,
          input.year,
          input.month
        );
      }),
  }),

  alerts: router({
    list: protectedProcedure
      .input(z.object({ unreadOnly: z.boolean().optional() }))
      .query(async ({ ctx, input }) => {
        const { getUserAlerts } = await import("./db");
        return getUserAlerts(ctx.user.id, input.unreadOnly || false);
      }),
    markAsRead: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        const { markAlertAsRead } = await import("./db");
        return markAlertAsRead(input.id);
      }),
    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        const { deleteAlert } = await import("./db");
        return deleteAlert(input.id);
      }),
  }),

  reports: router({
    generateMonthlyPDF: protectedProcedure
      .input(
        z.object({
          year: z.number(),
          month: z.number().min(1).max(12),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const { generateMonthlyReportPDF } = await import("./pdfReports");
        const pdfBuffer = await generateMonthlyReportPDF(
          ctx.user.id,
          input.year,
          input.month
        );
        return {
          success: true,
          fileName: `relatorio-mensal-${input.year}-${String(input.month).padStart(2, "0")}.pdf`,
          size: pdfBuffer.length,
          data: pdfBuffer.toString("base64"),
        };
      }),
    generateAnnualPDF: protectedProcedure
      .input(z.object({ year: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const { generateAnnualReportPDF } = await import("./pdfReports");
        const pdfBuffer = await generateAnnualReportPDF(ctx.user.id, input.year);
        return {
          success: true,
          fileName: `relatorio-anual-${input.year}.pdf`,
          size: pdfBuffer.length,
          data: pdfBuffer.toString("base64"),
        };
      }),
  }),
});

export type AppRouter = typeof appRouter;
