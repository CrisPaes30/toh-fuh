import PDFDocument from "pdfkit";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  calculateMonthlyBalance,
  getUserMonthlySummaries,
  getTransactionsByDateRange,
} from "./firestore-db";

export async function generateMonthlyReportPDF(
  userId: string,
  year: number,
  month: number
): Promise<Buffer> {
  const doc = new PDFDocument({
    size: "A4",
    margin: 40,
  });

  const balance = await calculateMonthlyBalance(userId, year, month);
  const startDate = new Date(year, month - 1, 1);
  const endDate = new Date(year, month, 0, 23, 59, 59);
  const transactions = await getTransactionsByDateRange(userId, startDate, endDate);

  const monthName = format(new Date(year, month - 1), "MMMM yyyy", { locale: ptBR });
  const generatedDate = format(new Date(), "dd/MM/yyyy HH:mm", { locale: ptBR });

  const incomeTransactions = transactions.filter((t: any) => t.type === "income");
  const expenseTransactions = transactions.filter((t: any) => t.type === "expense");

  // Header
  doc.fontSize(24).font("Helvetica-Bold").text("To Fuhh - Relatório Mensal", { align: "center" });
  doc.fontSize(12).font("Helvetica").text(monthName, { align: "center" });
  doc.fontSize(10).fillColor("#666").text(`Gerado em ${generatedDate}`, { align: "center" });
  doc.moveDown();

  // Summary Cards
  const summaryY = doc.y;
  const cardWidth = (doc.page.width - 80 - 20) / 3;

  // Income Card
  doc.rect(40, summaryY, cardWidth, 80).stroke("#e5e7eb");
  doc.fontSize(10).fillColor("#666").text("Entradas", 50, summaryY + 10);
  doc
    .fontSize(16)
    .fillColor("#10b981")
    .font("Helvetica-Bold")
    .text(`R$ ${(balance.income / 100).toFixed(2).replace(".", ",")}`, 50, summaryY + 30);

  // Expense Card
  doc.rect(40 + cardWidth + 10, summaryY, cardWidth, 80).stroke("#e5e7eb");
  doc.fontSize(10).fillColor("#666").text("Saídas", 50 + cardWidth + 10, summaryY + 10);
  doc
    .fontSize(16)
    .fillColor("#ef4444")
    .font("Helvetica-Bold")
    .text(`R$ ${(balance.expense / 100).toFixed(2).replace(".", ",")}`, 50 + cardWidth + 10, summaryY + 30);

  // Balance Card
  const balanceColor = balance.balance >= 0 ? "#10b981" : "#ef4444";
  doc.rect(40 + (cardWidth + 10) * 2, summaryY, cardWidth, 80).stroke("#e5e7eb");
  doc.fontSize(10).fillColor("#666").text("Saldo", 50 + (cardWidth + 10) * 2, summaryY + 10);
  doc
    .fontSize(16)
    .fillColor(balanceColor)
    .font("Helvetica-Bold")
    .text(`R$ ${(balance.balance / 100).toFixed(2).replace(".", ",")}`, 50 + (cardWidth + 10) * 2, summaryY + 30);

  doc.moveDown(6);

  // Entradas Section
  doc.fontSize(14).fillColor("#000").font("Helvetica-Bold").text("Entradas", { underline: true });
  doc.moveDown(0.5);

  if (incomeTransactions.length > 0) {
    // Table Header
    const tableTop = doc.y;
    const col1 = 50;
    const col2 = 150;
    const col3 = 450;

    doc.fontSize(10).font("Helvetica-Bold").fillColor("#374151");
    doc.text("Data", col1, tableTop);
    doc.text("Descrição", col2, tableTop);
    doc.text("Valor", col3, tableTop, { align: "right" });

    // Horizontal line
    doc.moveTo(40, tableTop + 15).lineTo(550, tableTop + 15).stroke("#d1d5db");

    // Table Rows
    let rowY = tableTop + 20;
    doc.fontSize(9).fillColor("#1f2937");

    incomeTransactions.forEach((t: any) => {
      if (rowY > 700) {
        doc.addPage();
        rowY = 40;
      }

      doc.text(format(new Date(t.date), "dd/MM/yyyy", { locale: ptBR }), col1, rowY);
      doc.text(t.description || "Sem descrição", col2, rowY, { width: 300 });
      doc.fillColor("#10b981").text(`R$ ${(t.amount / 100).toFixed(2).replace(".", ",")}`, col3, rowY, {
        align: "right",
      });

      rowY += 20;
      doc.fillColor("#1f2937");
    });
  } else {
    doc.fontSize(9).fillColor("#9ca3af").text("Nenhuma entrada registrada");
  }

  doc.moveDown(2);

  // Saídas Section
  doc.fontSize(14).fillColor("#000").font("Helvetica-Bold").text("Saídas", { underline: true });
  doc.moveDown(0.5);

  if (expenseTransactions.length > 0) {
    // Table Header
    const tableTop = doc.y;
    const col1 = 50;
    const col2 = 150;
    const col3 = 450;

    doc.fontSize(10).font("Helvetica-Bold").fillColor("#374151");
    doc.text("Data", col1, tableTop);
    doc.text("Descrição", col2, tableTop);
    doc.text("Valor", col3, tableTop, { align: "right" });

    // Horizontal line
    doc.moveTo(40, tableTop + 15).lineTo(550, tableTop + 15).stroke("#d1d5db");

    // Table Rows
    let rowY = tableTop + 20;
    doc.fontSize(9).fillColor("#1f2937");

    expenseTransactions.forEach((t: any) => {
      if (rowY > 700) {
        doc.addPage();
        rowY = 40;
      }

      doc.text(format(new Date(t.date), "dd/MM/yyyy", { locale: ptBR }), col1, rowY);
      doc.text(t.description || "Sem descrição", col2, rowY, { width: 300 });
      doc.fillColor("#ef4444").text(`R$ ${(t.amount / 100).toFixed(2).replace(".", ",")}`, col3, rowY, {
        align: "right",
      });

      rowY += 20;
      doc.fillColor("#1f2937");
    });
  } else {
    doc.fontSize(9).fillColor("#9ca3af").text("Nenhuma saída registrada");
  }

  // Footer
  doc.fontSize(9).fillColor("#9ca3af");
  doc.text("To Fuhh © 2024 - Seu Gerenciador Financeiro Pessoal", 40, doc.page.height - 40, {
    align: "center",
  });

  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    doc.on("data", (chunk: Buffer) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);
    doc.end();
  });
}

export async function generateAnnualReportPDF(userId: string, year: number): Promise<Buffer> {
  const doc = new PDFDocument({
    size: "A4",
    margin: 40,
  });

  const summaries = await getUserMonthlySummaries(userId);
  const yearSummaries = summaries.filter((s: any) => s.year === year);
  const generatedDate = format(new Date(), "dd/MM/yyyy HH:mm", { locale: ptBR });

  let totalIncome = 0;
  let totalExpense = 0;
  let totalBalance = 0;

  yearSummaries.forEach((s: any) => {
    totalIncome += s.totalIncome;
    totalExpense += s.totalExpense;
    totalBalance += s.balance;
  });

  // Header
  doc.fontSize(24).font("Helvetica-Bold").text("To Fuhh - Relatório Anual", { align: "center" });
  doc.fontSize(12).font("Helvetica").text(year.toString(), { align: "center" });
  doc.fontSize(10).fillColor("#666").text(`Gerado em ${generatedDate}`, { align: "center" });
  doc.moveDown();

  // Summary Cards
  const summaryY = doc.y;
  const cardWidth = (doc.page.width - 80 - 20) / 3;

  // Income Card
  doc.rect(40, summaryY, cardWidth, 80).stroke("#e5e7eb");
  doc.fontSize(10).fillColor("#666").text("Total Entradas", 50, summaryY + 10);
  doc
    .fontSize(16)
    .fillColor("#10b981")
    .font("Helvetica-Bold")
    .text(`R$ ${(totalIncome / 100).toFixed(2).replace(".", ",")}`, 50, summaryY + 30);

  // Expense Card
  doc.rect(40 + cardWidth + 10, summaryY, cardWidth, 80).stroke("#e5e7eb");
  doc.fontSize(10).fillColor("#666").text("Total Saídas", 50 + cardWidth + 10, summaryY + 10);
  doc
    .fontSize(16)
    .fillColor("#ef4444")
    .font("Helvetica-Bold")
    .text(`R$ ${(totalExpense / 100).toFixed(2).replace(".", ",")}`, 50 + cardWidth + 10, summaryY + 30);

  // Balance Card
  const balanceColor = totalBalance >= 0 ? "#10b981" : "#ef4444";
  doc.rect(40 + (cardWidth + 10) * 2, summaryY, cardWidth, 80).stroke("#e5e7eb");
  doc.fontSize(10).fillColor("#666").text("Saldo Anual", 50 + (cardWidth + 10) * 2, summaryY + 10);
  doc
    .fontSize(16)
    .fillColor(balanceColor)
    .font("Helvetica-Bold")
    .text(`R$ ${(totalBalance / 100).toFixed(2).replace(".", ",")}`, 50 + (cardWidth + 10) * 2, summaryY + 30);

  doc.moveDown(6);

  // Monthly Breakdown
  doc.fontSize(14).fillColor("#000").font("Helvetica-Bold").text("Resumo Mensal", { underline: true });
  doc.moveDown(0.5);

  if (yearSummaries.length > 0) {
    // Table Header
    const tableTop = doc.y;
    const col1 = 50;
    const col2 = 150;
    const col3 = 300;
    const col4 = 450;

    doc.fontSize(10).font("Helvetica-Bold").fillColor("#374151");
    doc.text("Mês", col1, tableTop);
    doc.text("Entradas", col2, tableTop, { align: "right" });
    doc.text("Saídas", col3, tableTop, { align: "right" });
    doc.text("Saldo", col4, tableTop, { align: "right" });

    // Horizontal line
    doc.moveTo(40, tableTop + 15).lineTo(550, tableTop + 15).stroke("#d1d5db");

    // Table Rows
    let rowY = tableTop + 20;
    doc.fontSize(9).fillColor("#1f2937");

    yearSummaries.forEach((s: any) => {
      if (rowY > 700) {
        doc.addPage();
        rowY = 40;
      }

      const monthName = format(new Date(s.year, s.month - 1), "MMMM", { locale: ptBR });
      doc.text(monthName, col1, rowY);
      doc.fillColor("#10b981").text(`R$ ${(s.totalIncome / 100).toFixed(2).replace(".", ",")}`, col2, rowY, {
        align: "right",
      });
      doc.fillColor("#ef4444").text(`R$ ${(s.totalExpense / 100).toFixed(2).replace(".", ",")}`, col3, rowY, {
        align: "right",
      });

      const saldoColor = s.balance >= 0 ? "#10b981" : "#ef4444";
      doc.fillColor(saldoColor).text(`R$ ${(s.balance / 100).toFixed(2).replace(".", ",")}`, col4, rowY, {
        align: "right",
      });

      rowY += 20;
      doc.fillColor("#1f2937");
    });
  } else {
    doc.fontSize(9).fillColor("#9ca3af").text("Nenhum dado disponível para este ano");
  }

  doc.moveDown(2);

  // Insights
  doc.fontSize(14).fillColor("#000").font("Helvetica-Bold").text("Insights", { underline: true });
  doc.moveDown(0.5);

  if (yearSummaries.length > 0) {
    const maxIncomeMonth = yearSummaries.reduce((max: any, s: any) =>
      s.totalIncome > max.totalIncome ? s : max
    );
    const maxExpenseMonth = yearSummaries.reduce((max: any, s: any) =>
      s.totalExpense > max.totalExpense ? s : max
    );

    const savingsRate = totalIncome > 0 ? ((totalBalance / totalIncome) * 100).toFixed(1) : "0";

    doc.fontSize(10).fillColor("#1f2937");
    doc.text(
      `Mês com maior entrada: ${format(new Date(maxIncomeMonth.year, maxIncomeMonth.month - 1), "MMMM", {
        locale: ptBR,
      })}`
    );
    doc.text(
      `Mês com maior saída: ${format(new Date(maxExpenseMonth.year, maxExpenseMonth.month - 1), "MMMM", {
        locale: ptBR,
      })}`
    );
    doc.fillColor(totalBalance >= 0 ? "#10b981" : "#ef4444").text(`Taxa de economia: ${savingsRate}%`);
  }

  // Footer
  doc.fontSize(9).fillColor("#9ca3af");
  doc.text("To Fuhh © 2024 - Seu Gerenciador Financeiro Pessoal", 40, doc.page.height - 40, {
    align: "center",
  });

  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    doc.on("data", (chunk: Buffer) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);
    doc.end();
  });
}
