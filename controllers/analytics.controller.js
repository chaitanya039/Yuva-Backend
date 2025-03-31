import Order from "../models/Order.js";
import OrderItem from "../models/OrderItem.js";
import Expense from "../models/Expense.js";
import Customer from "../models/Customer.js";
import ApiResponse from "../utils/ApiResponse.js";
import Product from "../models/Product.js";

export const getKPIStats = async (req, res) => {
  try {
    const currentDate = new Date();
    const currentMonth = currentDate.getUTCMonth();
    const currentYear = currentDate.getUTCFullYear();

    const [orders, orderItems, expenses, products] = await Promise.all([
      Order.find({}).populate("customer"),
      OrderItem.find({}),
      Expense.find({}),
      Product.find({}),
    ]);

    const stats = {
      totalOrders: 0,
      currentMonthOrders: 0,
      previousMonthOrders: 0,
      totalRevenue: 0,
      monthlyRevenue: 0,
      previousMonthlyRevenue: 0,
      yearlyRevenue: 0,
      previousYearRevenue: 0,
      totalSalesQty: 0,
      inventoryLowStockCount: 0,
      previousInventoryLowStockCount: 0,
      monthlyGrowthPercent: 0,
      yearlyGrowthPercent: 0,
      monthlyOrderGrowthPercent: 0,
      lowStockGrowthPercent: 0,
      totalExpenses: 0,
      netProfit: 0,
    };

    for (const order of orders) {
      const created = new Date(order.createdAt);
      const orderMonth = created.getUTCMonth();
      const orderYear = created.getUTCFullYear();

      stats.totalOrders += 1;
      stats.totalRevenue += order.totalAmount;

      const isCurrentMonth =
        orderMonth === currentMonth && orderYear === currentYear;
      const isPreviousMonth =
        orderMonth === (currentMonth === 0 ? 11 : currentMonth - 1) &&
        orderYear === (currentMonth === 0 ? currentYear - 1 : currentYear);
      const isCurrentYear = orderYear === currentYear;
      const isPreviousYear = orderYear === currentYear - 1;

      if (isCurrentMonth) {
        stats.currentMonthOrders += 1;
        stats.monthlyRevenue += order.totalAmount;
      }

      if (isPreviousMonth) {
        stats.previousMonthlyRevenue += order.totalAmount;
        stats.previousMonthOrders += 1;
      }

      if (isCurrentYear) stats.yearlyRevenue += order.totalAmount;
      if (isPreviousYear) stats.previousYearRevenue += order.totalAmount;
    }

    for (const item of orderItems) {
      stats.totalSalesQty += item.quantity;
    }

    // Stock counts
    for (const product of products) {
      const stock = product.stock;
      const updatedAt = new Date(product.updatedAt);
      const updatedMonth = updatedAt.getUTCMonth();
      const updatedYear = updatedAt.getUTCFullYear();

      if (stock < 10) {
        if (updatedYear === currentYear && updatedMonth === currentMonth) {
          stats.inventoryLowStockCount += 1;
        } else if (
          updatedYear ===
            (currentMonth === 0 ? currentYear - 1 : currentYear) &&
          updatedMonth === (currentMonth === 0 ? 11 : currentMonth - 1)
        ) {
          stats.previousInventoryLowStockCount += 1;
        }
      }
    }

    for (const exp of expenses) {
      stats.totalExpenses += exp.amount;
      stats.netProfit -= exp.amount;
    }

    stats.netProfit += stats.totalRevenue;

    // Revenue Growth
    stats.monthlyGrowthPercent =
      stats.previousMonthlyRevenue === 0
        ? stats.monthlyRevenue > 0
          ? 100
          : 0
        : ((stats.monthlyRevenue - stats.previousMonthlyRevenue) /
            stats.previousMonthlyRevenue) *
          100;

    stats.yearlyGrowthPercent =
      stats.previousYearRevenue === 0
        ? stats.yearlyRevenue > 0
          ? 100
          : 0
        : ((stats.yearlyRevenue - stats.previousYearRevenue) /
            stats.previousYearRevenue) *
          100;

    // ✅ Order Growth %
    stats.monthlyOrderGrowthPercent =
      stats.previousMonthOrders === 0
        ? stats.currentMonthOrders > 0
          ? 100
          : 0
        : ((stats.currentMonthOrders - stats.previousMonthOrders) /
            stats.previousMonthOrders) *
          100;

    // ✅ Low Stock Growth %
    stats.lowStockGrowthPercent =
      stats.previousInventoryLowStockCount === 0
        ? stats.inventoryLowStockCount > 0
          ? 100
          : 0
        : ((stats.inventoryLowStockCount -
            stats.previousInventoryLowStockCount) /
            stats.previousInventoryLowStockCount) *
          100;

    return res.status(200).json(new ApiResponse(200, stats, "KPI stats"));
  } catch (error) {
    return res.status(500).json(new ApiResponse(500, {}, error.message));
  }
};

export const getRevenueBreakdown = async (req, res) => {
  try {
    const { type = "monthly", year, month } = req.query;
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1;

    // Sanitize params
    const selectedYear = Number(year) || currentYear;
    const selectedMonth = Number(month) || currentMonth;

    const orders = await Order.find({}).populate("customer");
    if (!orders.length) {
      return res.status(200).json(new ApiResponse(200, [], "No orders"));
    }

    const dataMap = {};

    for (const order of orders) {
      const date = new Date(order.createdAt);
      const customerType = order.customer?.type;
      if (!["Retailer", "Wholesaler"].includes(customerType)) continue;

      let key = "";

      if (type === "daily") {
        if (
          date.getFullYear() === selectedYear &&
          date.getMonth() + 1 === selectedMonth
        ) {
          key = `${String(date.getDate()).padStart(2, "0")}-${String(
            selectedMonth
          ).padStart(2, "0")}`;
        } else continue;
      } else if (type === "monthly") {
        if (date.getFullYear() === selectedYear) {
          key = date.toLocaleString("default", { month: "short" });
        } else continue;
      } else if (type === "yearly") {
        key = `${date.getFullYear()}`;
      }

      if (!dataMap[key]) {
        dataMap[key] = { label: key, Retailer: 0, Wholesaler: 0 };
      }

      dataMap[key][customerType] += order.totalAmount;
    }

    let breakdown = [];

    if (type === "daily") {
      const daysInMonth = new Date(selectedYear, selectedMonth, 0).getDate();
      breakdown = Array.from({ length: daysInMonth }, (_, i) => {
        const label = `${String(i + 1).padStart(2, "0")}-${String(
          selectedMonth
        ).padStart(2, "0")}`;
        return dataMap[label] || { label, Retailer: 0, Wholesaler: 0 };
      });
    } else if (type === "monthly") {
      const months = [
        "Jan",
        "Feb",
        "Mar",
        "Apr",
        "May",
        "Jun",
        "Jul",
        "Aug",
        "Sep",
        "Oct",
        "Nov",
        "Dec",
      ];
      breakdown = months.map(
        (m) => dataMap[m] || { label: m, Retailer: 0, Wholesaler: 0 }
      );
    } else if (type === "yearly") {
      const years = Array.from(
        { length: 10 },
        (_, i) => `${currentYear - 9 + i}`
      );
      breakdown = years.map(
        (y) => dataMap[y] || { label: y, Retailer: 0, Wholesaler: 0 }
      );
    }

    return res
      .status(200)
      .json(new ApiResponse(200, breakdown, `Revenue breakdown (${type})`));
  } catch (error) {
    console.error("Revenue breakdown error:", error);
    return res.status(500).json(new ApiResponse(500, {}, error.message));
  }
};

// 2️⃣ Expense Breakdown (Pie Chart)
export const getExpenseBreakdown = async (req, res) => {
  try {
    const expenses = await Expense.find({});
    const categoryMap = {};

    for (const ex of expenses) {
      categoryMap[ex.category] = (categoryMap[ex.category] || 0) + ex.amount;
    }

    const breakdown = Object.entries(categoryMap).map(([category, amount]) => ({
      category,
      amount,
    }));

    return res
      .status(200)
      .json(new ApiResponse(200, breakdown, "Expense Category Breakdown"));
  } catch (error) {
    return res.status(500).json(new ApiResponse(500, {}, error.message));
  }
};

// Get sales by category
export const getSalesByCategory = async (req, res) => {
  try {
    const orderItems = await OrderItem.find({}).populate({
      path: "product",
      populate: { path: "category", select: "name" },
    });

    const categorySales = {};

    for (const item of orderItems) {
      const categoryName = item.product?.category?.name || "Uncategorized";
      categorySales[categoryName] =
        (categorySales[categoryName] || 0) + item.quantity;
    }

    const total = Object.values(categorySales).reduce((a, b) => a + b, 0);

    const result = Object.entries(categorySales).map(([category, qty]) => ({
      category,
      percent: ((qty / total) * 100).toFixed(2),
    }));

    return res
      .status(200)
      .json(new ApiResponse(200, result, "Sales by category"));
  } catch (error) {
    return res.status(500).json(new ApiResponse(500, {}, error.message));
  }
};

// 3️⃣ Monthly Revenue vs Expense Comparison
export const getMonthlyRevenueVsExpense = async (req, res) => {
  try {
    const { year } = req.query;
    const selectedYear = Number(year) || new Date().getFullYear();

    const orders = await Order.find({}).populate("customer");
    const expenses = await Expense.find({});

    const monthlyData = Array.from({ length: 12 }, (_, i) => ({
      label: new Date(selectedYear, i).toLocaleString("default", {
        month: "short",
      }),
      Revenue: 0,
      Expense: 0,
    }));

    for (const order of orders) {
      const date = new Date(order.createdAt);
      if (date.getFullYear() === selectedYear) {
        const monthIndex = date.getMonth();
        monthlyData[monthIndex].Revenue += order.totalAmount;
      }
    }

    for (const exp of expenses) {
      const date = new Date(exp.createdAt);
      if (date.getFullYear() === selectedYear) {
        const monthIndex = date.getMonth();
        monthlyData[monthIndex].Expense += exp.amount;
      }
    }

    return res
      .status(200)
      .json(
        new ApiResponse(
          200,
          monthlyData,
          "Monthly Revenue vs Expense Comparison"
        )
      );
  } catch (error) {
    return res.status(500).json(new ApiResponse(500, {}, error.message));
  }
};

// 1️⃣ Net Profit Trend (Monthly)
export const getNetProfitTrend = async (req, res) => {
  try {
    const { year } = req.query;
    const selectedYear = Number(year) || new Date().getFullYear();

    const orders = await Order.find({});
    const expenses = await Expense.find({});

    const trend = Array.from({ length: 12 }, (_, i) => ({
      label: new Date(selectedYear, i).toLocaleString("default", {
        month: "short",
      }),
      Revenue: 0,
      Expense: 0,
      Profit: 0,
    }));

    for (const order of orders) {
      const date = new Date(order.createdAt);
      if (date.getFullYear() === selectedYear) {
        const monthIndex = date.getMonth();
        trend[monthIndex].Revenue += order.totalAmount;
      }
    }

    for (const exp of expenses) {
      const date = new Date(exp.expenseDate || exp.createdAt);
      if (date.getFullYear() === selectedYear) {
        const monthIndex = date.getMonth();
        trend[monthIndex].Expense += exp.amount;
      }
    }

    trend.forEach((entry) => {
      entry.Profit = entry.Revenue - entry.Expense;
    });

    return res
      .status(200)
      .json(new ApiResponse(200, trend, "Net Profit Trend (Monthly)"));
  } catch (error) {
    return res.status(500).json(new ApiResponse(500, {}, error.message));
  }
};

// 2️⃣ Top Customers by Revenue
export const getTopCustomers = async (req, res) => {
  try {
    const orders = await Order.find({}).populate("customer");

    const revenueMap = {};

    for (const order of orders) {
      const id = order.customer?._id;
      if (!id) continue;

      if (!revenueMap[id]) {
        revenueMap[id] = {
          customerId: id,
          name: order.customer.name,
          type: order.customer.type,
          totalSpent: 0,
        };
      }
      revenueMap[id].totalSpent += order.totalAmount;
    }

    const sorted = Object.values(revenueMap).sort(
      (a, b) => b.totalSpent - a.totalSpent
    );

    return res
      .status(200)
      .json(
        new ApiResponse(200, sorted.slice(0, 10), "Top Customers by Revenue")
      );
  } catch (error) {
    return res.status(500).json(new ApiResponse(500, {}, error.message));
  }
};

// 3️⃣ Order Count per Month (for bar chart)
export const getMonthlyOrderCount = async (req, res) => {
  try {
    const { year } = req.query;
    const selectedYear = Number(year) || new Date().getFullYear();

    const orders = await Order.find({});
    const counts = Array.from({ length: 12 }, (_, i) => ({
      label: new Date(selectedYear, i).toLocaleString("default", {
        month: "short",
      }),
      count: 0,
    }));

    for (const order of orders) {
      const date = new Date(order.createdAt);
      if (date.getFullYear() === selectedYear) {
        counts[date.getMonth()].count++;
      }
    }

    return res
      .status(200)
      .json(new ApiResponse(200, counts, "Monthly Order Count"));
  } catch (error) {
    return res.status(500).json(new ApiResponse(500, {}, error.message));
  }
};

// 4️⃣ Order Type Distribution (Retailer vs Wholesaler)
export const getOrderTypeDistribution = async (req, res) => {
  try {
    const orders = await Order.find({}).populate("customer");

    let retailer = 0;
    let wholesaler = 0;

    for (const order of orders) {
      if (order.customer?.type === "Retailer") retailer++;
      if (order.customer?.type === "Wholesaler") wholesaler++;
    }

    return res.status(200).json(
      new ApiResponse(
        200,
        [
          { type: "Retailer", count: retailer },
          { type: "Wholesaler", count: wholesaler },
        ],
        "Order Type Distribution"
      )
    );
  } catch (error) {
    return res.status(500).json(new ApiResponse(500, {}, error.message));
  }
};

// 1. Top Customers by Revenue
export const getTopCustomersByRevenue = async (req, res) => {
  try {
    const orders = await Order.find({}).populate("customer");

    const revenueMap = {};
    for (const order of orders) {
      const customerId = order.customer?._id?.toString();
      if (!customerId) continue;
      revenueMap[customerId] =
        (revenueMap[customerId] || 0) + order.totalAmount;
    }

    const customers = await Customer.find({});
    const result = customers
      .map((c) => ({
        customer: {
          _id: c._id,
          name: c.name,
          email: c.email,
        },
        totalRevenue: revenueMap[c._id.toString()] || 0,
      }))
      .sort((a, b) => b.totalRevenue - a.totalRevenue)
      .slice(0, 10);

    return res
      .status(200)
      .json(new ApiResponse(200, result, "Top customers by revenue"));
  } catch (error) {
    return res.status(500).json(new ApiResponse(500, {}, error.message));
  }
};

// 2. Most Sold Products
export const getMostSoldProducts = async (req, res) => {
  try {
    const orderItems = await OrderItem.find({}).populate("product");

    const productMap = {};
    for (const item of orderItems) {
      const id = item.product?._id?.toString();
      if (!id) continue;
      productMap[id] = {
        ...productMap[id],
        product: item.product,
        quantity: (productMap[id]?.quantity || 0) + item.quantity,
      };
    }

    const result = Object.values(productMap)
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 10);

    return res
      .status(200)
      .json(new ApiResponse(200, result, "Most sold products"));
  } catch (error) {
    return res.status(500).json(new ApiResponse(500, {}, error.message));
  }
};

// 3. Monthly Orders and Revenue Trend
export const getMonthlyOrderAndRevenueTrend = async (req, res) => {
  try {
    const { year } = req.query;
    const selectedYear = Number(year) || new Date().getFullYear();

    const orders = await Order.find({});
    const monthlyData = Array.from({ length: 12 }, (_, i) => ({
      label: new Date(selectedYear, i).toLocaleString("default", {
        month: "short",
      }),
      orders: 0,
      revenue: 0,
    }));

    for (const order of orders) {
      const date = new Date(order.createdAt);
      if (date.getFullYear() === selectedYear) {
        const monthIndex = date.getMonth();
        monthlyData[monthIndex].orders += 1;
        monthlyData[monthIndex].revenue += order.totalAmount;
      }
    }

    return res
      .status(200)
      .json(
        new ApiResponse(200, monthlyData, "Monthly orders and revenue trend")
      );
  } catch (error) {
    return res.status(500).json(new ApiResponse(500, {}, error.message));
  }
};

// 4. Customer Type Distribution
export const getCustomerTypeDistribution = async (req, res) => {
  try {
    const customers = await Customer.find({});
    const typeCount = { Retailer: 0, Wholesaler: 0 };

    for (const c of customers) {
      if (typeCount[c.type] !== undefined) {
        typeCount[c.type]++;
      }
    }

    return res.status(200).json(
      new ApiResponse(
        200,
        [
          { type: "Retailer", count: typeCount.Retailer },
          { type: "Wholesaler", count: typeCount.Wholesaler },
        ],
        "Customer type distribution"
      )
    );
  } catch (error) {
    return res.status(500).json(new ApiResponse(500, {}, error.message));
  }
};

export const getAverageOrderValueTrend = async (req, res) => {
  try {
    const { year } = req.query;
    const selectedYear = Number(year) || new Date().getFullYear();

    const orders = await Order.find({});
    const monthlyData = Array.from({ length: 12 }, (_, i) => ({
      label: new Date(selectedYear, i).toLocaleString("default", {
        month: "short",
      }),
      totalAmount: 0,
      orderCount: 0,
      averageOrderValue: 0,
    }));

    for (const order of orders) {
      const date = new Date(order.createdAt);
      if (date.getFullYear() === selectedYear) {
        const monthIndex = date.getMonth();
        monthlyData[monthIndex].totalAmount += order.totalAmount;
        monthlyData[monthIndex].orderCount++;
      }
    }

    for (const month of monthlyData) {
      month.averageOrderValue =
        month.orderCount === 0 ? 0 : month.totalAmount / month.orderCount;
    }

    return res
      .status(200)
      .json(new ApiResponse(200, monthlyData, "Average Order Value Trend"));
  } catch (error) {
    return res.status(500).json(new ApiResponse(500, {}, error.message));
  }
};

export const getCategoryWiseRevenue = async (req, res) => {
  try {
    const orderItems = await OrderItem.find({}).populate({
      path: "product",
      populate: { path: "category", select: "name" },
    });

    const categoryRevenueMap = {};

    for (const item of orderItems) {
      const categoryName = item.product?.category?.name || "Uncategorized";
      const revenue = item.unitPrice * item.quantity;

      categoryRevenueMap[categoryName] =
        (categoryRevenueMap[categoryName] || 0) + revenue;
    }

    const result = Object.entries(categoryRevenueMap).map(
      ([category, totalRevenue]) => ({
        category,
        totalRevenue,
      })
    );

    return res
      .status(200)
      .json(new ApiResponse(200, result, "Category-wise revenue distribution"));
  } catch (error) {
    return res.status(500).json(new ApiResponse(500, {}, error.message));
  }
};

export const getCustomerRegistrationTrend = async (req, res) => {
  try {
    const { year } = req.query;
    const selectedYear = Number(year) || new Date().getFullYear();

    const customers = await Customer.find({});
    const monthlyData = Array.from({ length: 12 }, (_, i) => ({
      label: new Date(selectedYear, i).toLocaleString("default", {
        month: "short",
      }),
      registered: 0,
    }));

    for (const customer of customers) {
      const date = new Date(customer.createdAt);
      if (date.getFullYear() === selectedYear) {
        const monthIndex = date.getMonth();
        monthlyData[monthIndex].registered++;
      }
    }

    return res
      .status(200)
      .json(new ApiResponse(200, monthlyData, "Customer registration trend"));
  } catch (error) {
    return res.status(500).json(new ApiResponse(500, {}, error.message));
  }
};

export const getRecentActivity = async (req, res) => {
  try {
    const latestOrders = await Order.find()
      .sort({ createdAt: -1 })
      .limit(5)
      .populate("customer");
    const latestExpenses = await Expense.find()
      .sort({ createdAt: -1 })
      .limit(5);
    const latestCustomers = await Customer.find()
      .sort({ createdAt: -1 })
      .limit(5);

    return res.status(200).json(
      new ApiResponse(
        200,
        {
          latestOrders,
          latestExpenses,
          latestCustomers,
        },
        "Recent system activity"
      )
    );
  } catch (error) {
    return res.status(500).json(new ApiResponse(500, {}, error.message));
  }
};

// 🔁 Repeat vs New Customers
export const getRepeatVsNewCustomers = async (req, res) => {
  try {
    const orders = await Order.find({}).populate("customer");
    const customerOrderMap = {};

    for (const order of orders) {
      const id = order.customer?._id;
      if (!id) continue;
      customerOrderMap[id] = (customerOrderMap[id] || 0) + 1;
    }

    let repeat = 0,
      fresh = 0;
    for (const count of Object.values(customerOrderMap)) {
      if (count > 1) repeat++;
      else fresh++;
    }

    return res.status(200).json(
      new ApiResponse(
        200,
        [
          { type: "Repeat Customers", count: repeat },
          { type: "New Customers", count: fresh },
        ],
        "Repeat vs New Customers"
      )
    );
  } catch (error) {
    return res.status(500).json(new ApiResponse(500, {}, error.message));
  }
};

// 📆 Weekday Order Heatmap
export const getWeekdayOrderHeatmap = async (req, res) => {
  try {
    const orders = await Order.find({});
    const weekdayMap = [
      "Sunday",
      "Monday",
      "Tuesday",
      "Wednesday",
      "Thursday",
      "Friday",
      "Saturday",
    ];
    const result = Array.from({ length: 7 }, (_, i) => ({
      day: weekdayMap[i],
      count: 0,
    }));

    for (const order of orders) {
      const weekday = new Date(order.createdAt).getDay();
      result[weekday].count++;
    }

    return res
      .status(200)
      .json(new ApiResponse(200, result, "Orders by Weekday"));
  } catch (error) {
    return res.status(500).json(new ApiResponse(500, {}, error.message));
  }
};

// 📉 Cancelled or Rejected Orders
export const getCancelledOrdersStats = async (req, res) => {
  try {
    const orders = await Order.find({});
    let cancelled = 0;
    let total = 0;

    for (const order of orders) {
      total++;
      if (order.status === "Cancelled" || order.status === "Rejected") {
        cancelled++;
      }
    }

    return res
      .status(200)
      .json(
        new ApiResponse(
          200,
          { cancelled, total },
          "Cancelled or Rejected Orders Stats"
        )
      );
  } catch (error) {
    return res.status(500).json(new ApiResponse(500, {}, error.message));
  }
};

// 📦 Products Nearing Low Stock
export const getLowStockProducts = async (req, res) => {
  try {
    const products = await Product.find({});
    const lowStock = products.filter((p) => p.stock < 10);

    return res
      .status(200)
      .json(new ApiResponse(200, lowStock, "Products with Low Stock (<10)"));
  } catch (error) {
    return res.status(500).json(new ApiResponse(500, {}, error.message));
  }
};

// 🧩 Customer Segmentation (High/Medium/Low based on spending)
export const getCustomerSegments = async (req, res) => {
  try {
    const orders = await Order.find({}).populate("customer");
    const map = {};

    for (const order of orders) {
      const id = order.customer?._id;
      if (!id) continue;
      map[id] = (map[id] || 0) + order.totalAmount;
    }

    let high = 0,
      medium = 0,
      low = 0;
    for (const spent of Object.values(map)) {
      if (spent >= 10000) high++;
      else if (spent >= 5000) medium++;
      else low++;
    }

    return res.status(200).json(
      new ApiResponse(
        200,
        [
          { segment: "High Value", count: high },
          { segment: "Medium Value", count: medium },
          { segment: "Low Value", count: low },
        ],
        "Customer Segments"
      )
    );
  } catch (error) {
    return res.status(500).json(new ApiResponse(500, {}, error.message));
  }
};

// 🌍 Revenue by Location (city-wise with coordinates)
export const getRevenueByCity = async (req, res) => {
  try {
    const orders = await Order.find({}).populate("customer");

    const cityMap = {};

    for (const order of orders) {
      const customer = order.customer;

      // Skip if customer or city is not defined
      if (!customer || !customer.city) continue;

      const city = customer.city;
      const coordinates = customer.location?.coordinates;

      // Skip if no coordinates found
      if (!coordinates || coordinates.length !== 2) continue;

      const key = `${city}_${coordinates[0]}_${coordinates[1]}`; // Unique key per location
      if (!cityMap[key]) {
        cityMap[key] = {
          city,
          revenue: 0,
          lat: coordinates[1],
          lng: coordinates[0],
        };
      }

      cityMap[key].revenue += order.totalAmount;
    }

    const result = Object.values(cityMap);

    return res
      .status(200)
      .json(new ApiResponse(200, result, "Revenue by City with Coordinates"));
  } catch (error) {
    console.error("Error in getRevenueByCity:", error.message);
    return res.status(500).json(new ApiResponse(500, {}, error.message));
  }
};

export const getCustomerDistribution = async (req, res) => {
  try {
    const customers = await Customer.find({
      location: { $exists: true, $ne: null },
    }).select("name city type location");

    const result = customers.map((cust) => ({
      name: cust.name,
      type: cust.type,
      city: cust.city,
      lat: cust.location?.coordinates?.[1],
      lng: cust.location?.coordinates?.[0],
    }));

    return res
      .status(200)
      .json(new ApiResponse(200, result, "Customer location data fetched"));
  } catch (error) {
    return res
      .status(500)
      .json(new ApiResponse(500, {}, "Failed to fetch customer locations"));
  }
};
