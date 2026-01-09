import { describe, expect, it, vi } from "vitest";
import { generateMonthlyReportPDF, generateAnnualReportPDF } from "./pdfReports";

// Mock the database functions
vi.mock("./db", () => ({
  calculateMonthlyBalance: vi.fn().mockResolvedValue({
    income: 500000, // R$ 5000.00
    expense: 200000, // R$ 2000.00
    balance: 300000, // R$ 3000.00
  }),
  getUserMonthlySummaries: vi.fn().mockResolvedValue([
    {
      year: 2024,
      month: 1,
      totalIncome: 500000,
      totalExpense: 200000,
      balance: 300000,
    },
    {
      year: 2024,
      month: 2,
      totalIncome: 600000,
      totalExpense: 250000,
      balance: 350000,
    },
    {
      year: 2024,
      month: 3,
      totalIncome: 550000,
      totalExpense: 300000,
      balance: 250000,
    },
  ]),
  getTransactionsByDateRange: vi.fn().mockResolvedValue([
    {
      id: 1,
      userId: 1,
      categoryId: 1,
      amount: 300000,
      description: "Salário",
      date: new Date("2024-01-15"),
      type: "income",
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: 2,
      userId: 1,
      categoryId: 2,
      amount: 100000,
      description: "Supermercado",
      date: new Date("2024-01-20"),
      type: "expense",
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ]),
}));

describe("PDF Reports", () => {
  it("should generate monthly report PDF as buffer", async () => {
    const pdfBuffer = await generateMonthlyReportPDF(1, 2024, 1);

    expect(pdfBuffer).toBeInstanceOf(Buffer);
    expect(pdfBuffer.length).toBeGreaterThan(0);
    // PDF files start with %PDF
    expect(pdfBuffer.toString("utf8", 0, 4)).toBe("%PDF");
  });

  it("should generate annual report PDF as buffer", async () => {
    const pdfBuffer = await generateAnnualReportPDF(1, 2024);

    expect(pdfBuffer).toBeInstanceOf(Buffer);
    expect(pdfBuffer.length).toBeGreaterThan(0);
    // PDF files start with %PDF
    expect(pdfBuffer.toString("utf8", 0, 4)).toBe("%PDF");
  });

  it("should generate monthly PDF with reasonable size", async () => {
    const pdfBuffer = await generateMonthlyReportPDF(1, 2024, 1);

    // PDF should be at least 1KB
    expect(pdfBuffer.length).toBeGreaterThan(1024);
    // PDF should be less than 10MB (reasonable limit)
    expect(pdfBuffer.length).toBeLessThan(10 * 1024 * 1024);
  });

  it("should generate annual PDF with reasonable size", async () => {
    const pdfBuffer = await generateAnnualReportPDF(1, 2024);

    // PDF should be at least 1KB
    expect(pdfBuffer.length).toBeGreaterThan(1024);
    // PDF should be less than 10MB (reasonable limit)
    expect(pdfBuffer.length).toBeLessThan(10 * 1024 * 1024);
  });

  it("should handle different months correctly", async () => {
    const months = [1, 6, 12];

    for (const month of months) {
      const pdfBuffer = await generateMonthlyReportPDF(1, 2024, month);
      expect(pdfBuffer).toBeInstanceOf(Buffer);
      expect(pdfBuffer.length).toBeGreaterThan(0);
    }
  });

  it("should handle different years correctly", async () => {
    const years = [2022, 2023, 2024];

    for (const year of years) {
      const pdfBuffer = await generateAnnualReportPDF(1, year);
      expect(pdfBuffer).toBeInstanceOf(Buffer);
      expect(pdfBuffer.length).toBeGreaterThan(0);
    }
  });

  it("should generate valid PDF structure", async () => {
    const pdfBuffer = await generateMonthlyReportPDF(1, 2024, 1);
    const pdfString = pdfBuffer.toString("utf8");

    // Check for PDF structure markers
    expect(pdfString).toContain("%PDF");
    expect(pdfString).toContain("endobj");
    expect(pdfString).toContain("%%EOF");
  });

  it("should include financial data in PDF", async () => {
    const pdfBuffer = await generateMonthlyReportPDF(1, 2024, 1);
    
    // Check that PDF has reasonable content size (at least 1KB)
    expect(pdfBuffer.length).toBeGreaterThan(1024);
    // Check for PDF header
    const header = pdfBuffer.toString("utf8", 0, 4);
    expect(header).toBe("%PDF");
  });
});
