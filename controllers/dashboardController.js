const Dashboard = require('../models/dashboardModel');

// Generate last 6 months labels for chart gap-filling
const getLastSixMonths = () => {
  const months = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date();
    d.setMonth(d.getMonth() - i);
    months.push({
      label: d.toLocaleString('en-US', { month: 'short' }),
      key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    });
  }
  return months;
};

// Fill missing months with 0
const fillChartData = (rawData, label) => {
  const lastSix = getLastSixMonths();
  const labels = lastSix.map(m => m.label);
  const data = lastSix.map(m => {
    const found = rawData.find(r => r.month_sort === m.key);
    return found ? Number(found.total) : 0;
  });
  return { labels, datasets: { label, data } };
};

const getDashboardStats = (req, res) => {
  const response = {};
  let completed = 0;
  let hasError = false;
  const totalSections = 4; // cards, charts, recentSales, recentActivity

  const checkDone = () => {
    completed++;
    if (completed === totalSections && !hasError) {
      res.json(response);
    }
  };

  const handleError = (err) => {
    if (!hasError) {
      hasError = true;
      console.error("Dashboard error:", err);
      res.status(500).json({ error: "Failed to load dashboard data" });
    }
  };

  // 1. Card Stats
  Dashboard.getCardStats((err, cards) => {
    if (err) return handleError(err);
    response.cards = cards;
    checkDone();
  });

  // 2. Charts (3 sub-queries counted as 1 section)
  const charts = {};
  let chartsDone = 0;
  const checkChartsDone = () => {
    chartsDone++;
    if (chartsDone === 3) {
      response.charts = charts;
      checkDone();
    }
  };

  Dashboard.getMonthlySales((err, data) => {
    if (err) return handleError(err);
    charts.monthlySales = fillChartData(data, 'Sales ($)');
    checkChartsDone();
  });

  Dashboard.getMonthlyPurchaseOrders((err, data) => {
    if (err) return handleError(err);
    charts.monthlyPurchaseOrders = fillChartData(data, 'PO Amount ($)');
    checkChartsDone();
  });

  Dashboard.getMonthlyInventoryTransactions((err, data) => {
    if (err) return handleError(err);
    charts.inventoryTransactions = fillChartData(data, 'Transactions');
    checkChartsDone();
  });

  // 3. Recent Sales Orders
  Dashboard.getRecentSalesOrders((err, results) => {
    if (err) return handleError(err);
    response.recentSalesOrders = results;
    checkDone();
  });

  // 4. Recent Activity
  Dashboard.getRecentActivity((err, results) => {
    if (err) return handleError(err);
    response.recentActivity = results;
    checkDone();
  });
};

module.exports = { getDashboardStats };
