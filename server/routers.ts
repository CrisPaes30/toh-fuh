import { z } from "zod";
import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import {
  getUserTransactions,
  createTransaction,
  getUserCategories,
  createCategory,
  deleteCategory,
  calculateMonthlyBalance,
  getUserMonthlySummaries,
} from "./firestore-db";
import { initializeDefaultCategories } from "./initCategories";
import { generateAllSuggestions } from "./suggestions";
import { generateMonthlyReportPDF, generateAnnualReportPDF } from "./pdfReports";

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),

  transactions: router({
    list: protectedProcedure.query(async ({ ctx }) => {
      return getUserTransactions(ctx.user.openId, 100);
    }),
    recent: protectedProcedure.query(async ({ ctx }) => {
      return getUserTransactions(ctx.user.openId, 5);
    }),
    create: protectedProcedure
      .input(
        z.object({
          categoryId: z.string(),
          amount: z.number().positive(),
          description: z.string().optional(),
          date: z.date(),
          type: z.enum(["income", "expense"]),
        })
      )
      .mutation(async ({ ctx, input }) => {
        return createTransaction({
          userId: ctx.user.openId,
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
      return getUserCategories(ctx.user.openId);
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
        return createCategory({
          userId: ctx.user.openId,
          name: input.name,
          type: input.type,
          color: input.color,
        });
      }),
    delete: protectedProcedure
      .input(z.object({ id: z.string() }))
      .mutation(async ({ ctx, input }) => {
        return deleteCategory(input.id, ctx.user.openId);
      }),
  }),

  analytics: router({
    monthlyBalance: protectedProcedure
      .input(z.object({ year: z.number(), month: z.number().min(1).max(12) }))
      .query(async ({ ctx, input }) => {
        return calculateMonthlyBalance(ctx.user.openId, input.year, input.month);
      }),
    monthlySummaries: protectedProcedure.query(async ({ ctx }) => {
      return getUserMonthlySummaries(ctx.user.openId);
    }),
    suggestions: protectedProcedure
      .input(z.object({ year: z.number(), month: z.number().min(1).max(12) }))
      .query(async ({ ctx, input }) => {
        const balance = await calculateMonthlyBalance(ctx.user.openId, input.year, input.month);
        return generateAllSuggestions(ctx.user.openId, input.year, input.month, balance?.balance || 0);
      }),
  }),

  setup: router({
    initCategories: protectedProcedure.mutation(async ({ ctx }) => {
      await initializeDefaultCategories(ctx.user.openId);
      return { success: true };
    }),
  }),

  goals: router({
    list: protectedProcedure
      .input(z.object({ year: z.number(), month: z.number().min(1).max(12) }))
      .query(async () => []),
    create: protectedProcedure
      .input(z.object({
        categoryId: z.string(),
        name: z.string(),
        targetAmount: z.number().positive(),
        year: z.number(),
        month: z.number().min(1).max(12),
      }))
      .mutation(async () => ({ success: true })),
    update: protectedProcedure
      .input(z.object({
        id: z.string(),
        status: z.enum(["in_progress", "completed", "failed"]).optional(),
        currentAmount: z.number().optional(),
      }))
      .mutation(async () => ({ success: true })),
  }),

  limits: router({
    list: protectedProcedure.query(async () => []),
    create: protectedProcedure
      .input(z.object({
        categoryId: z.string(),
        monthlyLimit: z.number().positive(),
        alertThreshold: z.number().min(0).max(100).optional(),
      }))
      .mutation(async () => ({ success: true })),
    update: protectedProcedure
      .input(z.object({
        id: z.string(),
        monthlyLimit: z.number().positive().optional(),
        alertThreshold: z.number().min(0).max(100).optional(),
        isActive: z.boolean().optional(),
      }))
      .mutation(async () => ({ success: true })),
    delete: protectedProcedure
      .input(z.object({ id: z.string() }))
      .mutation(async () => ({ success: true })),
    checkLimit: protectedProcedure
      .input(z.object({
        categoryId: z.string(),
        year: z.number(),
        month: z.number().min(1).max(12),
      }))
      .query(async () => null),
  }),

  alerts: router({
    list: protectedProcedure
      .input(z.object({ unreadOnly: z.boolean().optional() }))
      .query(async () => []),
    markAsRead: protectedProcedure
      .input(z.object({ id: z.string() }))
      .mutation(async () => ({ success: true })),
    delete: protectedProcedure
      .input(z.object({ id: z.string() }))
      .mutation(async () => ({ success: true })),
  }),

  reports: router({
    generateMonthlyPDF: protectedProcedure
      .input(z.object({ year: z.number(), month: z.number().min(1).max(12) }))
      .mutation(async ({ ctx, input }) => {
        const pdfBuffer = await generateMonthlyReportPDF(ctx.user.openId, input.year, input.month);
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
        const pdfBuffer = await generateAnnualReportPDF(ctx.user.openId, input.year);
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
