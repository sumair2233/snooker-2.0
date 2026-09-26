import { NextRequest, NextResponse } from "next/server";
import { getGames, getExpenses, getCafeOrders, getLoans, getRevenueEntries, getSettings } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const fromDate = searchParams.get("fromDate") || undefined;
    const toDate = searchParams.get("toDate") || undefined;

    const [games, expenses, cafeOrders, loans, revenue, settings] = await Promise.all([
      getGames({ fromDate, toDate }),
      getExpenses({ fromDate, toDate }),
      getCafeOrders({}),
      getLoans({ fromDate, toDate }),
      getRevenueEntries(),
      getSettings(),
    ]);

    // Filter cafe orders by date range
    let filteredOrders = cafeOrders;
    if (fromDate) filteredOrders = filteredOrders.filter((o) => o.date >= fromDate);
    if (toDate) filteredOrders = filteredOrders.filter((o) => o.date <= toDate);

    // Filter extra revenue by date range
    let filteredRevenue = revenue;
    if (fromDate) filteredRevenue = filteredRevenue.filter((r) => r.date >= fromDate);
    if (toDate) filteredRevenue = filteredRevenue.filter((r) => r.date <= toDate);

    let totalGameRevenue = 0;
    let totalDiscount = 0;
    let cashGameRevenue = 0;
    let onlineGameRevenue = 0;
    let completedGamesCount = 0;

    for (const g of games) {
      if (g.status === "completed") {
        totalGameRevenue += g.amount;
        totalDiscount += g.discount;
        cashGameRevenue += g.cash_amount;
        onlineGameRevenue += g.online_amount;
        completedGamesCount++;
      }
    }

    let totalCafeRevenue = 0;
    let cafeCash = 0;
    let cafeOnline = 0;
    let cafePending = 0;
    for (const o of filteredOrders) {
      totalCafeRevenue += o.net_total;
      if (o.payment_method === "cash") cafeCash += o.net_total;
      else if (o.payment_method === "online") cafeOnline += o.net_total;
      else if (o.payment_method === "bill") cafePending += o.net_total;
    }

    let totalExpenses = 0;
    const expenseByCategory: Record<string, number> = {};
    for (const e of expenses) {
      totalExpenses += e.amount;
      expenseByCategory[e.category] = (expenseByCategory[e.category] || 0) + e.amount;
    }

    let otherRevenue = 0;
    for (const r of filteredRevenue) {
      otherRevenue += r.amount;
    }

    let loanIssued = 0;
    let loanRecovered = 0;
    for (const l of loans) {
      loanIssued += l.amount;
      loanRecovered += l.paid;
    }

    const grossRevenue = totalGameRevenue + totalCafeRevenue + otherRevenue;
    const netProfit = grossRevenue - totalExpenses;

    return NextResponse.json({
      dateRange: { fromDate, toDate },
      summary: {
        completedGames: completedGamesCount,
        totalGameRevenue,
        cashGameRevenue,
        onlineGameRevenue,
        totalDiscount,
        cafeOrdersCount: filteredOrders.length,
        totalCafeRevenue,
        cafeCash,
        cafeOnline,
        cafePending,
        otherRevenue,
        totalExpenses,
        loanIssued,
        loanRecovered,
        grossRevenue,
        netProfit,
        currency: settings.currency,
      },
      expenseBreakdown: Object.entries(expenseByCategory).map(([category, amount]) => ({
        category,
        amount,
      })),
    });
  } catch (error) {
    console.error("Reports API error:", error);
    return NextResponse.json({ error: "Failed to generate financial reports" }, { status: 500 });
  }
}
