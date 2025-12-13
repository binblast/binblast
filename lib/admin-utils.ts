// lib/admin-utils.ts
// Utility functions for admin dashboard metrics calculations

export interface AdminMetrics {
  totalCustomers: number;
  activeSubscriptions: number;
  monthlyRecurringRevenue: number;
  completedCleaningsThisMonth: number;
  completedCleaningsThisWeek: number;
  upcomingCleanings: number;
  activeEmployees: number;
  activePartners: number;
  customerGrowthRate: number;
  averageRevenuePerCustomer: number;
  customerRetentionRate: number;
  customersByPlan: Record<string, number>;
  revenueBySource: {
    direct: number;
    partner: number;
  };
  cleaningsStatus: {
    completed: number;
    pending: number;
    cancelled: number;
  };
}

export interface PlanPrices {
  [key: string]: number;
}

const PLAN_PRICES: PlanPrices = {
  "one-time": 25,
  "twice-month": 45,
  "bi-monthly": 20,
  "quarterly": 15,
  "commercial": 100,
};

export function calculateMRR(customers: any[]): number {
  let mrr = 0;
  customers.forEach((customer) => {
    if (customer.subscriptionStatus === "active" && customer.selectedPlan) {
      const planPrice = PLAN_PRICES[customer.selectedPlan] || 0;
      // Convert to monthly if needed
      if (customer.selectedPlan === "bi-monthly") {
        mrr += planPrice * 2; // Bi-monthly means twice per month
      } else if (customer.selectedPlan === "quarterly") {
        mrr += planPrice / 3; // Quarterly means once every 3 months
      } else {
        mrr += planPrice;
      }
    }
  });
  return mrr;
}

export function calculateARPU(customers: any[], totalRevenue: number): number {
  const activeCustomers = customers.filter(
    (c) => c.subscriptionStatus === "active"
  ).length;
  return activeCustomers > 0 ? totalRevenue / activeCustomers : 0;
}

export function calculateCustomerGrowthRate(
  currentCustomers: number,
  previousCustomers: number
): number {
  if (previousCustomers === 0) return currentCustomers > 0 ? 100 : 0;
  return ((currentCustomers - previousCustomers) / previousCustomers) * 100;
}

export function calculateRetentionRate(
  activeCustomers: number,
  totalCustomers: number
): number {
  return totalCustomers > 0 ? (activeCustomers / totalCustomers) * 100 : 0;
}

export function aggregateMetrics(
  customers: any[],
  cleanings: any[],
  employees: any[],
  partners: any[],
  previousMonthCustomers?: number
): AdminMetrics {
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const startOfWeek = new Date(now);
  startOfWeek.setDate(now.getDate() - now.getDay());
  startOfWeek.setHours(0, 0, 0, 0);

  // Filter cleanings
  const completedThisMonth = cleanings.filter((c) => {
    const date = c.completedAt?.toDate?.() || new Date(c.completedAt || 0);
    return (
      date >= startOfMonth &&
      (c.status === "completed" || c.jobStatus === "completed")
    );
  }).length;

  const completedThisWeek = cleanings.filter((c) => {
    const date = c.completedAt?.toDate?.() || new Date(c.completedAt || 0);
    return (
      date >= startOfWeek &&
      (c.status === "completed" || c.jobStatus === "completed")
    );
  }).length;

  const upcoming = cleanings.filter((c) => {
    const date = c.scheduledDate?.toDate?.() || new Date(c.scheduledDate);
    const sevenDaysFromNow = new Date();
    sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);
    return (
      date >= now &&
      date <= sevenDaysFromNow &&
      c.status !== "cancelled"
    );
  }).length;

  // Calculate status breakdown
  const cleaningsStatus = {
    completed: cleanings.filter(
      (c) => c.status === "completed" || c.jobStatus === "completed"
    ).length,
    pending: cleanings.filter(
      (c) =>
        c.status !== "completed" &&
        c.jobStatus !== "completed" &&
        c.status !== "cancelled"
    ).length,
    cancelled: cleanings.filter((c) => c.status === "cancelled").length,
  };

  // Calculate customers by plan
  const customersByPlan: Record<string, number> = {};
  customers.forEach((customer) => {
    if (customer.selectedPlan) {
      customersByPlan[customer.selectedPlan] =
        (customersByPlan[customer.selectedPlan] || 0) + 1;
    }
  });

  // Calculate revenue by source
  let directRevenue = 0;
  let partnerRevenue = 0;
  customers.forEach((customer) => {
    if (customer.subscriptionStatus === "active" && customer.selectedPlan) {
      const planPrice = PLAN_PRICES[customer.selectedPlan] || 0;
      if (customer.source === "partner") {
        partnerRevenue += planPrice;
      } else {
        directRevenue += planPrice;
      }
    }
  });

  // Active subscriptions
  const activeSubscriptions = customers.filter(
    (c) => c.subscriptionStatus === "active"
  ).length;

  // Calculate MRR
  const mrr = calculateMRR(customers);

  // Calculate ARPU
  const totalRevenue = directRevenue + partnerRevenue;
  const arpu = calculateARPU(customers, totalRevenue);

  // Calculate growth rate
  const customerGrowthRate = previousMonthCustomers
    ? calculateCustomerGrowthRate(customers.length, previousMonthCustomers)
    : 0;

  // Calculate retention rate
  const customerRetentionRate = calculateRetentionRate(
    activeSubscriptions,
    customers.length
  );

  return {
    totalCustomers: customers.length,
    activeSubscriptions,
    monthlyRecurringRevenue: mrr,
    completedCleaningsThisMonth: completedThisMonth,
    completedCleaningsThisWeek: completedThisWeek,
    upcomingCleanings: upcoming,
    activeEmployees: employees.filter((e) => e.role === "employee").length,
    activePartners: partners.filter((p) => p.status === "active").length,
    customerGrowthRate,
    averageRevenuePerCustomer: arpu,
    customerRetentionRate,
    customersByPlan,
    revenueBySource: {
      direct: directRevenue,
      partner: partnerRevenue,
    },
    cleaningsStatus,
  };
}

export interface ChartDataPoint {
  label: string;
  value: number;
  color?: string;
}

export function calculateRevenueTrend(cleanings: any[], days: number = 30): ChartDataPoint[] {
  const now = new Date();
  const data: ChartDataPoint[] = [];
  const dailyRevenue: Record<string, number> = {};

  // Initialize daily revenue
  for (let i = days - 1; i >= 0; i--) {
    const date = new Date(now);
    date.setDate(date.getDate() - i);
    const dateKey = date.toISOString().split("T")[0];
    dailyRevenue[dateKey] = 0;
  }

  // Calculate revenue from completed cleanings
  cleanings.forEach((cleaning) => {
    const completedDate = cleaning.completedAt?.toDate?.() || new Date(cleaning.completedAt || 0);
    if (completedDate >= new Date(now.getTime() - days * 24 * 60 * 60 * 1000)) {
      const dateKey = completedDate.toISOString().split("T")[0];
      if (dailyRevenue.hasOwnProperty(dateKey)) {
        // Estimate revenue per cleaning (simplified)
        dailyRevenue[dateKey] += 25; // Average cleaning price
      }
    }
  });

  // Convert to chart data
  Object.keys(dailyRevenue).forEach((dateKey) => {
    const date = new Date(dateKey);
    const label = `${date.getMonth() + 1}/${date.getDate()}`;
    data.push({ label, value: dailyRevenue[dateKey] });
  });

  return data;
}

export function calculateCustomerGrowth(customers: any[], months: number = 6): ChartDataPoint[] {
  const now = new Date();
  const data: ChartDataPoint[] = [];
  const monthlyCounts: Record<string, number> = {};

  // Initialize monthly counts
  for (let i = months - 1; i >= 0; i--) {
    const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
    monthlyCounts[monthKey] = 0;
  }

  // Count customers by month
  customers.forEach((customer) => {
    const createdAt = customer.createdAt?.toDate?.() || new Date(customer.createdAt || 0);
    const monthKey = `${createdAt.getFullYear()}-${String(createdAt.getMonth() + 1).padStart(2, "0")}`;
    if (monthlyCounts.hasOwnProperty(monthKey)) {
      monthlyCounts[monthKey]++;
    }
  });

  // Convert to chart data
  Object.keys(monthlyCounts).forEach((monthKey) => {
    const [year, month] = monthKey.split("-");
    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const label = `${monthNames[parseInt(month) - 1]} ${year.slice(2)}`;
    data.push({ label, value: monthlyCounts[monthKey] });
  });

  return data;
}

export function calculateWeeklyCleanings(cleanings: any[], weeks: number = 8): ChartDataPoint[] {
  const now = new Date();
  const data: ChartDataPoint[] = [];
  const weeklyCounts: Record<string, number> = {};

  // Initialize weekly counts
  for (let i = weeks - 1; i >= 0; i--) {
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - (now.getDay() + i * 7));
    weekStart.setHours(0, 0, 0, 0);
    const weekKey = weekStart.toISOString().split("T")[0];
    weeklyCounts[weekKey] = 0;
  }

  // Count completed cleanings by week
  cleanings.forEach((cleaning) => {
    const completedDate = cleaning.completedAt?.toDate?.() || new Date(cleaning.completedAt || 0);
    if (completedDate >= new Date(now.getTime() - weeks * 7 * 24 * 60 * 60 * 1000)) {
      const weekStart = new Date(completedDate);
      weekStart.setDate(completedDate.getDate() - completedDate.getDay());
      weekStart.setHours(0, 0, 0, 0);
      const weekKey = weekStart.toISOString().split("T")[0];
      if (weeklyCounts.hasOwnProperty(weekKey)) {
        weeklyCounts[weekKey]++;
      }
    }
  });

  // Convert to chart data
  Object.keys(weeklyCounts).forEach((weekKey) => {
    const date = new Date(weekKey);
    const label = `${date.getMonth() + 1}/${date.getDate()}`;
    data.push({ label, value: weeklyCounts[weekKey] });
  });

  return data;
}

export function calculatePlanDistribution(customersByPlan: Record<string, number>, planNames: Record<string, string>): ChartDataPoint[] {
  return Object.entries(customersByPlan).map(([plan, count]) => ({
    label: planNames[plan] || plan,
    value: count,
  }));
}

export function calculateRevenueByPlan(customers: any[], planNames: Record<string, string>): ChartDataPoint[] {
  const planRevenue: Record<string, number> = {};
  const planPrices: PlanPrices = {
    "one-time": 25,
    "twice-month": 45,
    "bi-monthly": 20,
    "quarterly": 15,
    "commercial": 100,
  };

  customers.forEach((customer) => {
    if (customer.subscriptionStatus === "active" && customer.selectedPlan) {
      const price = planPrices[customer.selectedPlan] || 0;
      planRevenue[customer.selectedPlan] = (planRevenue[customer.selectedPlan] || 0) + price;
    }
  });

  return Object.entries(planRevenue).map(([plan, revenue]) => ({
    label: planNames[plan] || plan,
    value: revenue,
  }));
}

