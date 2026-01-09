import { describe, it, expect } from "vitest";
import {
  generateBehavioralSuggestions,
  generateInvestmentSuggestions,
  generateAllSuggestions,
} from "./suggestions";

describe("Financial Suggestions Engine", () => {
  describe("generateBehavioralSuggestions", () => {
    it("should generate warning when balance is negative", async () => {
      const suggestions = await generateBehavioralSuggestions(
        1,
        2026,
        1,
        -50000 // -R$ 500
      );

      expect(suggestions.length).toBeGreaterThan(0);
      expect(suggestions.some((s) => s.type === "warning")).toBe(true);
      expect(suggestions.some((s) => s.priority === "high")).toBe(true);
    });

    it("should not generate warnings when balance is positive", async () => {
      const suggestions = await generateBehavioralSuggestions(
        1,
        2026,
        1,
        100000 // R$ 1000
      );

      // Positive balance should not generate behavioral warnings
      expect(suggestions.filter((s) => s.type === "warning").length).toBe(0);
    });

    it("should include advice about budget planning for negative balance", async () => {
      const suggestions = await generateBehavioralSuggestions(
        1,
        2026,
        1,
        -100000 // -R$ 1000
      );

      const budgetAdvice = suggestions.find(
        (s) =>
          s.title.toLowerCase().includes("orçamento") ||
          s.description.toLowerCase().includes("orçamento")
      );
      expect(budgetAdvice).toBeDefined();
    });
  });

  describe("generateInvestmentSuggestions", () => {
    it("should generate opportunity when balance is positive", async () => {
      const suggestions = await generateInvestmentSuggestions(
        1,
        2026,
        1,
        100000 // R$ 1000
      );

      expect(suggestions.length).toBeGreaterThan(0);
      expect(suggestions.some((s) => s.type === "opportunity")).toBe(true);
    });

    it("should not generate opportunities when balance is negative", async () => {
      const suggestions = await generateInvestmentSuggestions(
        1,
        2026,
        1,
        -50000 // -R$ 500
      );

      // Negative balance should not generate investment suggestions
      expect(suggestions.filter((s) => s.type === "opportunity").length).toBe(
        0
      );
    });

    it("should include emergency fund advice for positive balance", async () => {
      const suggestions = await generateInvestmentSuggestions(
        1,
        2026,
        1,
        200000 // R$ 2000
      );

      const emergencyAdvice = suggestions.find(
        (s) =>
          s.title.toLowerCase().includes("emergência") ||
          s.description.toLowerCase().includes("emergência")
      );
      expect(emergencyAdvice).toBeDefined();
    });

    it("should suggest diversification for large surplus", async () => {
      const suggestions = await generateInvestmentSuggestions(
        1,
        2026,
        1,
        600000 // R$ 6000
      );

      const diversificationAdvice = suggestions.find(
        (s) =>
          s.title.toLowerCase().includes("diversif") ||
          s.description.toLowerCase().includes("diversif")
      );
      expect(diversificationAdvice).toBeDefined();
    });
  });

  describe("generateAllSuggestions", () => {
    it("should combine behavioral and investment suggestions", async () => {
      const suggestions = await generateAllSuggestions(
        1,
        2026,
        1,
        100000 // R$ 1000 positive
      );

      expect(suggestions.length).toBeGreaterThan(0);
      expect(suggestions.some((s) => s.type === "opportunity")).toBe(true);
    });

    it("should sort suggestions by priority (high > medium > low)", async () => {
      const suggestions = await generateAllSuggestions(
        1,
        2026,
        1,
        -100000 // -R$ 1000
      );

      const priorityOrder = { high: 0, medium: 1, low: 2 };
      for (let i = 1; i < suggestions.length; i++) {
        expect(
          priorityOrder[suggestions[i - 1].priority] <=
            priorityOrder[suggestions[i].priority]
        ).toBe(true);
      }
    });

    it("should handle zero balance", async () => {
      const suggestions = await generateAllSuggestions(1, 2026, 1, 0);

      expect(Array.isArray(suggestions)).toBe(true);
    });
  });

  describe("Suggestion structure validation", () => {
    it("should have all required fields in suggestions", async () => {
      const suggestions = await generateBehavioralSuggestions(
        1,
        2026,
        1,
        -50000
      );

      suggestions.forEach((suggestion) => {
        expect(suggestion).toHaveProperty("type");
        expect(suggestion).toHaveProperty("title");
        expect(suggestion).toHaveProperty("description");
        expect(suggestion).toHaveProperty("priority");
        expect(["warning", "opportunity", "advice"]).toContain(suggestion.type);
        expect(["high", "medium", "low"]).toContain(suggestion.priority);
      });
    });

    it("should have non-empty title and description", async () => {
      const suggestions = await generateAllSuggestions(1, 2026, 1, -100000);

      suggestions.forEach((suggestion) => {
        expect(suggestion.title.length).toBeGreaterThan(0);
        expect(suggestion.description.length).toBeGreaterThan(0);
      });
    });

    it("should have valid suggestion types", async () => {
      const negSuggestions = await generateBehavioralSuggestions(
        1,
        2026,
        1,
        -50000
      );
      const posSuggestions = await generateInvestmentSuggestions(
        1,
        2026,
        1,
        100000
      );

      const allSuggestions = [...negSuggestions, ...posSuggestions];
      const validTypes = ["warning", "opportunity", "advice"];

      allSuggestions.forEach((s) => {
        expect(validTypes).toContain(s.type);
      });
    });
  });

  describe("Balance analysis", () => {
    it("should identify negative balance correctly", async () => {
      const suggestions = await generateBehavioralSuggestions(
        1,
        2026,
        1,
        -1 // Even 1 cent negative
      );

      expect(suggestions.length).toBeGreaterThan(0);
    });

    it("should not generate behavioral warnings for zero balance", async () => {
      const suggestions = await generateBehavioralSuggestions(1, 2026, 1, 0);

      expect(suggestions.filter((s) => s.type === "warning").length).toBe(0);
    });

    it("should generate investment suggestions for any positive balance", async () => {
      const suggestions = await generateInvestmentSuggestions(1, 2026, 1, 1); // Even 1 cent

      expect(suggestions.length).toBeGreaterThan(0);
    });
  });
});
