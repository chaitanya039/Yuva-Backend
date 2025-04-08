// payment.analysis.controller.js
import Order from "../models/Order.js";
import Customer from "../models/Customer.js";
import ApiResponse from "../utils/ApiResponse.js";

export const getTotalRevenueCollected = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    const filter = {
      "payment.amountPaid": { $gt: 0 },
      status: { $in: ["Completed", "Processing"] },
    };

    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) filter.createdAt.$gte = new Date(startDate);
      if (endDate) filter.createdAt.$lte = new Date(endDate);
    }

    const orders = await Order.find(filter);

    const totalCollected = orders.reduce(
      (acc, order) => acc + order.payment.amountPaid,
      0
    );

    return res.status(200).json(
      new ApiResponse(200, { totalCollected }, "Total Revenue Collected")
    );
  } catch (error) {
    return res.status(500).json(
      new ApiResponse(500, {}, `Error fetching total revenue: ${error.message}`)
    );
  }
};

export const getOutstandingBalance = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    const filter = {
      "payment.amountPaid": { $lt: "$netPayable" },
      status: { $nin: ["Cancelled", "Rejected"] },
    };

    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) filter.createdAt.$gte = new Date(startDate);
      if (endDate) filter.createdAt.$lte = new Date(endDate);
    }

    const orders = await Order.find(filter);

    const totalOutstanding = orders.reduce(
      (acc, order) => acc + (order.netPayable - order.payment.amountPaid),
      0
    );

    return res.status(200).json(
      new ApiResponse(200, { totalOutstanding }, "Total Outstanding Balance")
    );
  } catch (error) {
    return res
      .status(500)
      .json(new ApiResponse(500, {}, `Error fetching balance: ${error.message}`));
  }
};

export const getAverageRecoveryPercentage = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    const filter = {
      netPayable: { $gt: 0 },
      status: { $nin: ["Cancelled", "Rejected"] },
    };

    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) filter.createdAt.$gte = new Date(startDate);
      if (endDate) filter.createdAt.$lte = new Date(endDate);
    }

    const orders = await Order.find(filter);

    let totalPayable = 0;
    let totalCollected = 0;

    for (const order of orders) {
      totalPayable += order.netPayable;
      totalCollected += order.payment.amountPaid;
    }

    const avgRecovery =
      totalPayable === 0 ? 0 : ((totalCollected / totalPayable) * 100).toFixed(2);

    return res.status(200).json(
      new ApiResponse(200, { avgRecovery }, "Average Recovery Percentage")
    );
  } catch (error) {
    return res.status(500).json(
      new ApiResponse(500, {}, `Failed to fetch recovery %: ${error.message}`)
    );
  }
};

export const getPaymentStatusDistribution = async (req, res) => {
  try {
    const orders = await Order.find({
      netPayable: { $gt: 0 },
      status: { $nin: ["Cancelled", "Rejected"] },
    });

    let paid = 0;
    let partiallyPaid = 0;
    let unpaid = 0;

    for (const order of orders) {
      if (order.payment.status === "Unpaid") unpaid++;
      else if (order.payment.status === "Paid") paid++;
      else if (order.payment.status === "Partially Paid") partiallyPaid++;
    }

    return res.status(200).json(
      new ApiResponse(
        200,
        [
          { status: "Paid", count: paid },
          { status: "Partially Paid", count: partiallyPaid },
          { status: "Unpaid", count: unpaid },
        ],
        "Payment status distribution"
      )
    );
  } catch (error) {
    return res.status(500).json(new ApiResponse(500, {}, error.message));
  }
};

export const getDiscountStats = async (req, res) => {
  try {
    const orders = await Order.find({
      status: { $nin: ["Cancelled", "Rejected"] },
      discount: { $gt: 0 },
    });

    const totalDiscount = orders.reduce(
      (acc, order) => acc + (order.discount || 0),
      0
    );
    const totalOrders = orders.length;

    const totalGrossRevenue = orders.reduce(
      (acc, order) => acc + (order.netPayable || 0) + (order.discount || 0),
      0
    );

    const averageDiscount = totalOrders === 0 ? 0 : totalDiscount / totalOrders;
    const discountToRevenueRatio =
      totalGrossRevenue === 0 ? 0 : (totalDiscount / totalGrossRevenue) * 100;

    return res.status(200).json(
      new ApiResponse(
        200,
        {
          totalDiscount,
          averageDiscount,
          discountToRevenueRatio: Number(discountToRevenueRatio.toFixed(2)),
        },
        "Discount statistics"
      )
    );
  } catch (error) {
    return res.status(500).json(new ApiResponse(500, {}, error.message));
  }
};

export const getPartialPaymentsAndHighDueCustomers = async (req, res) => {
  try {
    const orders = await Order.find({
      status: { $nin: ["Cancelled", "Rejected"] },
    }).populate("customer");

    const partialPayments = [];
    const customerDueMap = {};

    for (const order of orders) {
      const due = order.payment.balanceRemaining;
      if (due > 0) {
        partialPayments.push({
          orderId: order._id,
          customer: {
            id: order.customer?._id,
            name: order.customer?.name,
            type: order.customer?.type,
          },
          totalAmount: order.totalAmount,
          netPayable: order.netPayable,
          dueAmount: due,
          status: order.status,
          date: order.createdAt,
        });

        const custId = order.customer?._id?.toString();
        if (custId) {
          if (!customerDueMap[custId]) {
            customerDueMap[custId] = {
              id: custId,
              name: order.customer?.name,
              type: order.customer?.type,
              totalDue: 0,
              orderCount: 0,
            };
          }
          customerDueMap[custId].totalDue += due;
          customerDueMap[custId].orderCount += 1;
        }
      }
    }

    const highDueCustomers = Object.values(customerDueMap).filter(
      (cust) => cust.totalDue >= 5000
    );

    return res.status(200).json(
      new ApiResponse(
        200,
        {
          partiallyPaidOrders: partialPayments,
          highDueCustomers,
        },
        "Partially Paid Orders & High Due Customers"
      )
    );
  } catch (error) {
    return res.status(500).json(new ApiResponse(500, {}, error.message));
  }
};

export const getTopCustomersPaymentBehavior = async (req, res) => {
  try {
    const orders = await Order.find({
      status: { $nin: ["Cancelled", "Rejected"] },
    }).populate("customer");

    const customerMap = {};

    for (const order of orders) {
      const cust = order.customer;
      const id = cust?._id?.toString();
      if (!id) continue;

      if (!customerMap[id]) {
        customerMap[id] = {
          customerId: id,
          name: cust.name,
          type: cust.type,
          totalOrders: 0,
          totalAmount: 0,
          totalPaid: 0,
          totalDue: 0,
        };
      }

      customerMap[id].totalOrders += 1;
      customerMap[id].totalAmount += order.totalAmount || 0;
      customerMap[id].totalPaid += order.payment.amountPaid || 0;
    }

    const behaviorData = Object.values(customerMap).map((cust) => {
      cust.totalDue = cust.totalAmount - cust.totalPaid;
      cust.avgRecoveryPercent =
        cust.totalAmount === 0
          ? 0
          : ((cust.totalPaid / cust.totalAmount) * 100).toFixed(2);
      return cust;
    });

    behaviorData.sort((a, b) => b.totalPaid - a.totalPaid);

    return res.status(200).json(
      new ApiResponse(200, behaviorData.slice(0, 20), "Top Customers Payment Behavior")
    );
  } catch (error) {
    return res.status(500).json(new ApiResponse(500, {}, error.message));
  }
};

export const getCustomerPaymentConsistency = async (req, res) => {
  try {
    const orders = await Order.find({}).populate("customer");

    const customerMap = {};

    for (const order of orders) {
      const customerId = order.customer?._id?.toString();
      if (!customerId || !order.dueDate) continue;

      const paidOnTime =
        order.payment.amountPaid >= order.netPayable &&
        new Date(order.updatedAt) <= new Date(order.dueDate);

      if (!customerMap[customerId]) {
        customerMap[customerId] = {
          name: order.customer.name,
          email: order.customer.email,
          totalOrders: 0,
          onTimePayments: 0,
        };
      }

      customerMap[customerId].totalOrders += 1;
      if (paidOnTime) customerMap[customerId].onTimePayments += 1;
    }

    const result = Object.values(customerMap).map((c) => ({
      name: c.name,
      email: c.email,
      totalOrders: c.totalOrders,
      consistencyIndex: Number(((c.onTimePayments / c.totalOrders) * 100).toFixed(2)),
    }));

    return res.status(200).json(
      new ApiResponse(200, result, "Customer Payment Consistency Index")
    );
  } catch (error) {
    return res.status(500).json(new ApiResponse(500, {}, error.message));
  }
};