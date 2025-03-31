import Order from '../models/Order.js';
import OrderItem from '../models/OrderItem.js';
import Expense from '../models/Expense.js';
import ExcelJS from 'exceljs';
import moment from 'moment';
import ApiResponse from '../utils/ApiResponse.js';
import { Parser } from 'json2csv'; // Ensure this is imported at the top

// Export all orders as Excel
export const exportOrdersToExcel = async (req, res) => {
  try {
    const orders = await Order.find().populate('customer user');
    const items = await OrderItem.find().populate('product');

    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet("Orders");

    sheet.columns = [
      { header: 'Order ID', key: 'orderId', width: 20 },
      { header: 'Customer', key: 'customer', width: 20 },
      { header: 'Type', key: 'type', width: 15 },
      { header: 'User (Admin)', key: 'user', width: 20 },
      { header: 'Total Amount', key: 'total', width: 15 },
      { header: 'Date', key: 'date', width: 20 }
    ];

    orders.forEach(order => {
      sheet.addRow({
        orderId: order._id,
        customer: order.customer?.name,
        type: order.customer?.type,
        user: order.user?.name,
        total: order.totalAmount,
        date: moment(order.createdAt).format('YYYY-MM-DD HH:mm')
      });
    });

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=orders.xlsx');
    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    console.error("Excel export error:", error);
    res.status(500).send("Failed to export orders.");
  }
};

// Export all expenses
export const exportExpensesToExcel = async (req, res) => {
  try {
    const expenses = await Expense.find().populate('addedBy', 'name');

    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet("Expenses");

    sheet.columns = [
      { header: 'Expense ID', key: '_id', width: 20 },
      { header: 'Title', key: 'title', width: 25 },
      { header: 'Category', key: 'category', width: 20 },
      { header: 'Amount', key: 'amount', width: 15 },
      { header: 'Added By', key: 'addedBy', width: 20 },
      { header: 'Date', key: 'date', width: 20 }
    ];

    expenses.forEach(exp => {
      sheet.addRow({
        _id: exp._id,
        title: exp.title,
        category: exp.category,
        amount: exp.amount,
        addedBy: exp.addedBy?.name || '—',
        date: moment(exp.createdAt).format('YYYY-MM-DD')
      });
    });

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=expenses.xlsx');
    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    res.status(500).send("Failed to export expenses.");
  }
};




export const getTopSellingProducts = async (req, res) => {
  try {
    const exportAs = req.query.export || null; // ?export=csv

    const orderItems = await OrderItem.find({})
      .populate({
        path: "product",
        populate: { path: "category", select: "name" }
      })
      .populate({
        path: "order",
        populate: { path: "customer", select: "type" }
      });

    const productStats = {};

    for (const item of orderItems) {
      const product = item.product;
      const customerType = item.order?.customer?.type;
      console.log(customerType);

      if (!product || !customerType) continue;

      const id = product._id.toString();
      const price = customerType === 'Wholesaler'
        ? product.priceWholesale
        : product.priceRetail;

      if (!productStats[id]) {
        productStats[id] = {
          productName: product.name,
          image: product.image,
          category: product.category?.name || "Uncategorized",
          sold: 0,
          revenue: 0
        };
      }

      productStats[id].sold += item.quantity;
      productStats[id].revenue += item.totalPrice;
    }

    const sorted = Object.values(productStats).sort((a, b) => b.sold - a.sold);

    // Export as CSV
    if (exportAs === "csv") {
      const fields = ["productName", "category", "sold", "revenue"];
      const parser = new Parser({ fields });
      const csv = parser.parse(sorted);

      res.header("Content-Type", "text/csv");
      res.attachment("top_selling_products.csv");
      return res.send(csv);
    }

    return res.status(200).json(new ApiResponse(200, sorted, "Top selling products"));
  } catch (error) {
    return res.status(500).json(new ApiResponse(500, {}, error.message));
  }
};
