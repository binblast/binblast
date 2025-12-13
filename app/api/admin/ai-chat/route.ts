// app/api/admin/ai-chat/route.ts
import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

// Lazy initialization - only create client when needed
function getOpenAIClient() {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY is not configured");
  }
  return new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });
}

export async function POST(request: NextRequest) {
  try {
    // Check if OpenAI API key is configured
    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        { error: "OpenAI API key is not configured. Please set OPENAI_API_KEY in your environment variables." },
        { status: 500 }
      );
    }

    const openai = getOpenAIClient();

    const { message, adminStats, chartData } = await request.json();

    // Validate input
    if (!message || typeof message !== 'string') {
      return NextResponse.json(
        { error: "Invalid message format" },
        { status: 400 }
      );
    }

    // Verify user is admin (you may want to add authentication check here)
    // For now, we'll trust the client since this is an admin-only route

    // Safely prepare business context with fallbacks for missing data
    const safeGet = (obj: any, path: string, defaultValue: any = 0) => {
      try {
        const keys = path.split('.');
        let value = obj;
        for (const key of keys) {
          value = value?.[key];
          if (value === undefined || value === null) return defaultValue;
        }
        return value;
      } catch {
        return defaultValue;
      }
    };

    const formatNumber = (num: number) => {
      if (typeof num !== 'number' || isNaN(num)) return '0';
      return num.toFixed(2);
    };

    const formatArray = (arr: any[], labelKey: string = 'label', valueKey: string = 'value') => {
      if (!Array.isArray(arr) || arr.length === 0) return 'No data available';
      return arr.map((d: any) => {
        const label = d[labelKey] || 'Unknown';
        const value = typeof d[valueKey] === 'number' ? d[valueKey].toFixed(2) : d[valueKey] || '0';
        return `${label}: ${value}`;
      }).join('\n');
    };

    const businessContext = `
You are a Business AI Assistant for Bin Blast, a bin cleaning service company. You help the business owner/admin understand their business metrics and answer questions.

Current Business Statistics:
- Total Customers: ${safeGet(adminStats, 'totalCustomers', 0)}
- Active Subscriptions: ${safeGet(adminStats, 'activeSubscriptions', 0)}
- Monthly Recurring Revenue: $${formatNumber(safeGet(adminStats, 'monthlyRecurringRevenue', 0))}
- Completed Cleanings This Month: ${safeGet(adminStats, 'completedCleaningsThisMonth', 0)}
- Completed Cleanings This Week: ${safeGet(adminStats, 'completedCleaningsThisWeek', 0)}
- Upcoming Cleanings: ${safeGet(adminStats, 'upcomingCleanings', 0)}
- Active Employees: ${safeGet(adminStats, 'activeEmployees', 0)}
- Active Partners: ${safeGet(adminStats, 'activePartners', 0)}
- Customer Growth Rate: ${formatNumber(safeGet(adminStats, 'customerGrowthRate', 0))}%
- Average Revenue Per Customer: $${formatNumber(safeGet(adminStats, 'averageRevenuePerCustomer', 0))}
- Customer Retention Rate: ${formatNumber(safeGet(adminStats, 'customerRetentionRate', 0))}%

Revenue by Source:
- Direct Revenue: $${formatNumber(safeGet(adminStats, 'revenueBySource.direct', 0))}
- Partner Revenue: $${formatNumber(safeGet(adminStats, 'revenueBySource.partner', 0))}

Cleanings Status:
- Completed: ${safeGet(adminStats, 'cleaningsStatus.completed', 0)}
- Pending: ${safeGet(adminStats, 'cleaningsStatus.pending', 0)}
- Cancelled: ${safeGet(adminStats, 'cleaningsStatus.cancelled', 0)}

Customers by Plan:
${Object.entries(safeGet(adminStats, 'customersByPlan', {})).map(([plan, count]) => `- ${plan}: ${count} customers`).join('\n') || 'No plan data available'}

Revenue Trend (Last 30 Days):
${formatArray(safeGet(chartData, 'revenueTrend', []), 'label', 'value')}

Customer Growth (Last 6 Months):
${formatArray(safeGet(chartData, 'customerGrowth', []), 'label', 'value')}

Weekly Cleanings:
${formatArray(safeGet(chartData, 'weeklyCleanings', []), 'label', 'value')}

Plan Distribution:
${formatArray(safeGet(chartData, 'planDistribution', []), 'label', 'value')}

Revenue by Plan:
${formatArray(safeGet(chartData, 'revenueByPlan', []), 'label', 'value')}

Instructions:
- Answer questions about business metrics clearly and concisely
- Provide insights and analysis when appropriate
- Use the data provided to give accurate answers
- If asked to generate a report, format it nicely with clear sections
- Be helpful and professional
- If you don't have enough information, say so politely
`;

    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        {
          role: "system",
          content: businessContext,
        },
        {
          role: "user",
          content: message,
        },
      ],
      max_tokens: 500,
      temperature: 0.7,
    });

    const response = completion.choices[0]?.message?.content || "I apologize, but I couldn't generate a response. Please try again.";

    return NextResponse.json({ response });
  } catch (error) {
    console.error("Error in AI chat:", error);
    return NextResponse.json(
      { error: "Failed to process AI request" },
      { status: 500 }
    );
  }
}

