import Order from "../models/Order.js";
import OrderItem from "../models/OrderItem.js";
import Expense from "../models/Expense.js";
import ExcelJS from "exceljs";
import moment from "moment";
import ApiResponse from "../utils/ApiResponse.js";
import PDFDocument from "pdfkit";

function streamReportPdf(res, filename, title, columns, rows, user) {
  const doc = new PDFDocument({
    size: "A4",
    margins: { top: 100, bottom: 70, left: 50, right: 50 },
    bufferPages: true,
  });

  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
  doc.pipe(res);

  const startX = doc.page.margins.left;
  const usableWidth =
    doc.page.width - doc.page.margins.left - doc.page.margins.right;
  const colCount = columns.length;
  const colWidth = usableWidth / colCount;
  const rowHeight = 20;

  // Company Header
  doc
    .font("Helvetica-Bold")
    .fontSize(16)
    .text("YUVA PLASTICS INDUSTRIES", { align: "center" });
  doc
    .font("Helvetica")
    .fontSize(10)
    .text(
      "At Mamnapur, Taluka Khultabad, Post Golegaon\nAurangabad, Maharashtra - 431101, India",
      { align: "center" }
    );

  // Generated Info
  doc
    .moveDown(1)
    .fontSize(9)
    .text(`Prepared by: ${user.name}`, startX, doc.y)
    .text(`Date: ${new Date().toLocaleDateString()}`, startX, doc.y, {
      width: usableWidth,
      align: "right",
    });

  // Title
  doc
    .moveDown(2)
    .fontSize(14)
    .font("Helvetica-Bold")
    .text(title, { align: "center" });
  doc.moveDown(1);

  // Table Header
  let y = doc.y;
  doc.font("Helvetica-Bold").fontSize(10);
  columns.forEach((col, i) => {
    doc.text(col.header, startX + i * colWidth + 5, y + 5, {
      width: colWidth - 10,
      align: "left",
    });
  });

  // Header bottom line
  y += rowHeight;
  doc
    .moveTo(startX, y)
    .lineTo(startX + usableWidth, y)
    .stroke();

  // Table Rows
  doc.font("Helvetica").fontSize(9);
  rows.forEach((row) => {
    columns.forEach((col, i) => {
      const text = row[col.key] != null ? String(row[col.key]) : "";
      doc.text(text, startX + i * colWidth + 5, y + 5, {
        width: colWidth - 10,
        align: "left",
      });
    });

    y += rowHeight;
    doc
      .moveTo(startX, y)
      .lineTo(startX + usableWidth, y)
      .stroke();

    if (y > doc.page.height - doc.page.margins.bottom - rowHeight) {
      doc.addPage();
      y = doc.page.margins.top;
    }
  });

  // Vertical column borders (clean)
  for (let i = 0; i <= colCount; i++) {
    const x = startX + i * colWidth;
    doc
      .moveTo(x, doc.y - rowHeight * (rows.length + 1))
      .lineTo(x, y)
      .stroke();
  }

  // Page Footer
  const range = doc.bufferedPageRange();
  for (let i = range.start; i < range.start + range.count; i++) {
    doc.switchToPage(i);
    doc
      .font("Helvetica")
      .fontSize(8)
      .fillColor("gray")
      .text(
        `Page ${i + 1} of ${range.count}`,
        0,
        doc.page.height - doc.page.margins.bottom + 20,
        { align: "center" }
      );
  }

  doc.end();
}

// ─── 1. Orders Export ───────────────────────────────────────────────────────────
export const exportOrdersToExcel = async (req, res) => {
  try {
    const exportAs = req.query.export;
    const orders = await Order.find().populate("customer user");

    // Excel
    if (exportAs === "excel") {
      const wb = new ExcelJS.Workbook();
      const ws = wb.addWorksheet("Orders");
      ws.columns = [
        { header: "Order ID", key: "orderId", width: 20 },
        { header: "Customer", key: "customer", width: 25 },
        { header: "Type", key: "type", width: 15 },
        { header: "User", key: "user", width: 20 },
        { header: "Net Payable", key: "net", width: 15 },
        { header: "Paid", key: "paid", width: 15 },
        { header: "Date", key: "date", width: 20 },
      ];
      orders.forEach((o) => {
        ws.addRow({
          orderId: o.orderId,
          customer: o.customer?.name,
          type: o.customer?.type,
          user: o.user?.name,
          net: o.netPayable,
          paid: o.payment.amountPaid,
          date: moment(o.createdAt).format("YYYY-MM-DD HH:mm"),
        });
      });
      res.setHeader(
        "Content-Type",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
      );
      res.setHeader("Content-Disposition", "attachment; filename=orders.xlsx");
      await wb.xlsx.write(res);
      return res.end();
    }

    // PDF
    if (exportAs === "pdf") {
      const columns = [
        { header: "Order ID", key: "orderId" },
        { header: "Customer", key: "customer" },
        { header: "Type", key: "type" },
        { header: "Net Payable", key: "net" },
        { header: "Paid", key: "paid" },
        { header: "Date", key: "date" },
      ];
      const rows = orders.map((o) => ({
        orderId: o.orderId,
        customer: o.customer?.name,
        type: o.customer?.type,
        net: o.netPayable,
        paid: o.payment.amountPaid,
        date: moment(o.createdAt).format("YYYY-MM-DD"),
      }));
      return streamReportPdf(
        res,
        "orders.pdf",
        "Orders Report",
        columns,
        rows,
        req.user
      );
    }

    // JSON
    return res.json(new ApiResponse(200, orders, "Orders fetched"));
  } catch (err) {
    console.error(err);
    res.status(500).json(new ApiResponse(500, null, err.message));
  }
};

// ─── 2. Expenses Export ─────────────────────────────────────────────────────────
export const exportExpensesToExcel = async (req, res) => {
  try {
    const exportAs = req.query.export;
    const expenses = await Expense.find().populate("addedBy", "name");

    if (exportAs === "excel") {
      const wb = new ExcelJS.Workbook();
      const ws = wb.addWorksheet("Expenses");
      ws.columns = [
        { header: "Expense ID", key: "id", width: 20 },
        { header: "Title", key: "title", width: 25 },
        { header: "Category", key: "category", width: 15 },
        { header: "Amount", key: "amount", width: 15 },
        { header: "Added By", key: "user", width: 20 },
        { header: "Date", key: "date", width: 20 },
      ];
      expenses.forEach((e) => {
        ws.addRow({
          id: e._id.toString(),
          title: e.title,
          category: e.category,
          amount: e.amount,
          user: e.addedBy?.name,
          date: moment(e.expenseDate).format("YYYY-MM-DD"),
        });
      });
      res.setHeader(
        "Content-Type",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
      );
      res.setHeader(
        "Content-Disposition",
        "attachment; filename=expenses.xlsx"
      );
      await wb.xlsx.write(res);
      return res.end();
    }

    if (exportAs === "pdf") {
      const columns = [
        { header: "Expense ID", key: "id" },
        { header: "Title", key: "title" },
        { header: "Category", key: "category" },
        { header: "Amount", key: "amount" },
        { header: "Added By", key: "user" },
        { header: "Date", key: "date" },
      ];
      const rows = expenses.map((e) => ({
        id: e._id.toString(),
        title: e.title,
        category: e.category,
        amount: e.amount,
        user: e.addedBy?.name,
        date: moment(e.expenseDate).format("YYYY-MM-DD"),
      }));
      return streamReportPdf(
        res,
        "expenses.pdf",
        "Expenses Report",
        columns,
        rows,
        req.user
      );
    }

    return res.json(new ApiResponse(200, expenses, "Expenses fetched"));
  } catch (err) {
    console.error(err);
    res.status(500).json(new ApiResponse(500, null, err.message));
  }
};

// ─── 3. Top Selling Products ────────────────────────────────────────────────────
export const getTopSellingProducts = async (req, res) => {
  try {
    const exportAs = req.query.export;
    const items = await OrderItem.find()
      .populate({
        path: "product",
        populate: { path: "category", select: "name" },
      })
      .populate({
        path: "order",
        populate: { path: "customer", select: "type" },
      });

    const stats = {};
    items.forEach((item) => {
      const prod = item.product;
      const type = item.order?.customer?.type;
      if (!prod || !type) return;
      const id = prod._id.toString();
      if (!stats[id]) {
        stats[id] = {
          productName: prod.name,
          category: prod.category?.name || "Uncategorized",
          sold: 0,
          revenue: 0,
        };
      }
      stats[id].sold += item.quantity;
      stats[id].revenue += item.totalPrice;
    });
    const report = Object.values(stats).sort((a, b) => b.sold - a.sold);

    if (exportAs === "excel") {
      const wb = new ExcelJS.Workbook();
      const ws = wb.addWorksheet("Top Selling");
      ws.columns = [
        { header: "Product", key: "productName", width: 30 },
        { header: "Category", key: "category", width: 20 },
        { header: "Units Sold", key: "sold", width: 15 },
        { header: "Revenue", key: "revenue", width: 15 },
      ];
      report.forEach((r) => ws.addRow(r));
      res.setHeader(
        "Content-Type",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
      );
      res.setHeader(
        "Content-Disposition",
        "attachment; filename=top_selling.xlsx"
      );
      await wb.xlsx.write(res);
      return res.end();
    }

    if (exportAs === "pdf") {
      const columns = [
        { header: "Product", key: "productName" },
        { header: "Category", key: "category" },
        { header: "Units Sold", key: "sold" },
        { header: "Revenue", key: "revenue" },
      ];
      return streamReportPdf(
        res,
        "top_selling.pdf",
        "Top Selling Products",
        columns,
        report,
        req.user
      );
    }

    return res.json(new ApiResponse(200, report, "Top selling products"));
  } catch (err) {
    console.error(err);
    res.status(500).json(new ApiResponse(500, null, err.message));
  }
};

// ─── 4. Monthly Revenue ────────────────────────────────────────────────────────
export const getMonthlyRevenueReport = async (req, res) => {
  try {
    const { startDate, endDate, export: exportAs } = req.query;
    const match = {};
    if (startDate || endDate) {
      match.orderDate = {};
      if (startDate) match.orderDate.$gte = new Date(startDate);
      if (endDate) match.orderDate.$lte = new Date(endDate);
    }
    const agg = await Order.aggregate([
      { $match: match },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m", date: "$orderDate" } },
          revenue: { $sum: "$netPayable" },
          collected: { $sum: "$payment.amountPaid" },
        },
      },
      { $sort: { _id: 1 } },
    ]);
    const report = agg.map((d) => ({
      month: d._id,
      revenue: d.revenue,
      collected: d.collected,
      outstanding: d.revenue - d.collected,
    }));

    if (exportAs === "excel") {
      const wb = new ExcelJS.Workbook();
      const ws = wb.addWorksheet("Monthly Revenue");
      ws.columns = [
        { header: "Month", key: "month", width: 15 },
        { header: "Revenue", key: "revenue", width: 15 },
        { header: "Collected", key: "collected", width: 15 },
        { header: "Outstanding", key: "outstanding", width: 15 },
      ];
      report.forEach((r) => ws.addRow(r));
      res.setHeader(
        "Content-Type",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
      );
      res.setHeader(
        "Content-Disposition",
        "attachment; filename=monthly_revenue.xlsx"
      );
      await wb.xlsx.write(res);
      return res.end();
    }

    if (exportAs === "pdf") {
      const columns = [
        { header: "Month", key: "month" },
        { header: "Revenue", key: "revenue" },
        { header: "Collected", key: "collected" },
        { header: "Outstanding", key: "outstanding" },
      ];
      return streamReportPdf(
        res,
        "monthly_revenue.pdf",
        "Monthly Revenue Report",
        columns,
        report,
        req.user
      );
    }

    return res.json(new ApiResponse(200, report, "Monthly revenue report"));
  } catch (err) {
    console.error(err);
    res.status(500).json(new ApiResponse(500, null, err.message));
  }
};

// ─── 5. Discount Impact ─────────────────────────────────────────────────────────
export const getDiscountImpactReport = async (req, res) => {
  try {
    const exportAs = req.query.export;
    const orders = await Order.find({
      status: { $nin: ["Cancelled"] },
      discount: { $gt: 0 },
    });
    const totalDiscount = orders.reduce((sum, o) => sum + o.discount, 0);
    const totalGross = orders.reduce(
      (sum, o) => sum + o.netPayable + o.discount,
      0
    );
    const avgDisc = orders.length ? totalDiscount / orders.length : 0;
    const ratio = totalGross ? (totalDiscount / totalGross) * 100 : 0;
    const report = [
      {
        totalDiscount,
        averageDiscount: Number(avgDisc.toFixed(2)),
        discountToRevenueRatio: Number(ratio.toFixed(2)),
      },
    ];

    if (exportAs === "excel") {
      const wb = new ExcelJS.Workbook();
      const ws = wb.addWorksheet("Discount Impact");
      ws.columns = [
        { header: "Total Discount", key: "totalDiscount", width: 20 },
        { header: "Avg. Discount", key: "averageDiscount", width: 20 },
        { header: "Discount %", key: "discountToRevenueRatio", width: 20 },
      ];
      ws.addRow(report[0]);
      res.setHeader(
        "Content-Type",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
      );
      res.setHeader(
        "Content-Disposition",
        "attachment; filename=discount_impact.xlsx"
      );
      await wb.xlsx.write(res);
      return res.end();
    }

    if (exportAs === "pdf") {
      const columns = [
        { header: "Total Discount", key: "totalDiscount" },
        { header: "Avg. Discount", key: "averageDiscount" },
        { header: "Discount %", key: "discountToRevenueRatio" },
      ];
      return streamReportPdf(
        res,
        "discount_impact.pdf",
        "Discount Impact Report",
        columns,
        report,
        req.user
      );
    }

    return res.json(new ApiResponse(200, report, "Discount impact report"));
  } catch (err) {
    console.error(err);
    res.status(500).json(new ApiResponse(500, null, err.message));
  }
};

// ─── 6. Revenue by Segment ─────────────────────────────────────────────────────
export const getRevenueBySegmentReport = async (req, res) => {
  try {
    const exportAs = req.query.export;
    const orders = await Order.find({
      status: { $nin: ["Cancelled"] },
    }).populate("customer", "type");
    const stats = {};
    orders.forEach((o) => {
      const seg = o.customer?.type || "Unknown";
      stats[seg] = stats[seg] || {
        segment: seg,
        orders: 0,
        revenue: 0,
        collected: 0,
      };
      stats[seg].orders++;
      stats[seg].revenue += o.netPayable;
      stats[seg].collected += o.payment.amountPaid;
    });
    const report = Object.values(stats).map((s) => ({
      segment: s.segment,
      orders: s.orders,
      revenue: s.revenue,
      collected: s.collected,
      outstanding: s.revenue - s.collected,
    }));

    if (exportAs === "excel") {
      const wb = new ExcelJS.Workbook();
      const ws = wb.addWorksheet("Revenue by Segment");
      ws.columns = [
        { header: "Segment", key: "segment", width: 20 },
        { header: "Orders", key: "orders", width: 10 },
        { header: "Revenue", key: "revenue", width: 15 },
        { header: "Collected", key: "collected", width: 15 },
        { header: "Outstanding", key: "outstanding", width: 15 },
      ];
      report.forEach((r) => ws.addRow(r));
      res.setHeader(
        "Content-Type",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
      );
      res.setHeader(
        "Content-Disposition",
        "attachment; filename=revenue_by_segment.xlsx"
      );
      await wb.xlsx.write(res);
      return res.end();
    }

    if (exportAs === "pdf") {
      const columns = [
        { header: "Segment", key: "segment" },
        { header: "Orders", key: "orders" },
        { header: "Revenue", key: "revenue" },
        { header: "Collected", key: "collected" },
        { header: "Outstanding", key: "outstanding" },
      ];
      return streamReportPdf(
        res,
        "revenue_by_segment.pdf",
        "Revenue by Segment",
        columns,
        report,
        req.user
      );
    }

    return res.json(new ApiResponse(200, report, "Revenue by segment report"));
  } catch (err) {
    console.error(err);
    res.status(500).json(new ApiResponse(500, null, err.message));
  }
};

// ─── 7. AR Aging ───────────────────────────────────────────────────────────────
export const getARAgingReport = async (req, res) => {
  try {
    const exportAs = req.query.export;
    const buckets = {
      "0-30": { count: 0, amount: 0 },
      "31-60": { count: 0, amount: 0 },
      "61-90": { count: 0, amount: 0 },
      "90+": { count: 0, amount: 0 },
    };
    const orders = await Order.find({
      "payment.balanceRemaining": { $gt: 0 },
      status: { $nin: ["Cancelled"] },
    });
    const now = moment();
    orders.forEach((o) => {
      const age = now.diff(moment(o.orderDate), "days");
      const amt = o.payment.balanceRemaining;
      if (age <= 30) buckets["0-30"].count++, (buckets["0-30"].amount += amt);
      else if (age <= 60)
        buckets["31-60"].count++, (buckets["31-60"].amount += amt);
      else if (age <= 90)
        buckets["61-90"].count++, (buckets["61-90"].amount += amt);
      else buckets["90+"].count++, (buckets["90+"].amount += amt);
    });
    const report = Object.entries(buckets).map(([range, v]) => ({
      range,
      count: v.count,
      amount: v.amount,
    }));

    if (exportAs === "excel") {
      const wb = new ExcelJS.Workbook();
      const ws = wb.addWorksheet("AR Aging");
      ws.columns = [
        { header: "Age Range", key: "range", width: 15 },
        { header: "Invoices", key: "count", width: 10 },
        { header: "Amount Due", key: "amount", width: 15 },
      ];
      report.forEach((r) => ws.addRow(r));
      res.setHeader(
        "Content-Type",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
      );
      res.setHeader(
        "Content-Disposition",
        "attachment; filename=ar_aging.xlsx"
      );
      await wb.xlsx.write(res);
      return res.end();
    }

    if (exportAs === "pdf") {
      const columns = [
        { header: "Age Range", key: "range" },
        { header: "Invoices", key: "count" },
        { header: "Amount Due", key: "amount" },
      ];
      return streamReportPdf(
        res,
        "ar_aging.pdf",
        "AR Aging Report",
        columns,
        report,
        req.user
      );
    }

    return res.json(new ApiResponse(200, report, "AR aging report"));
  } catch (err) {
    console.error(err);
    res.status(500).json(new ApiResponse(500, null, err.message));
  }
};

// ─── 8. Outstanding Invoices ─────────────────────────────────────────────────
export const getOutstandingInvoiceRegister = async (req, res) => {
  try {
    const exportAs = req.query.export;
    const orders = await Order.find({
      "payment.balanceRemaining": { $gt: 0 },
      status: { $nin: ["Cancelled"] },
    }).populate("customer", "name");
    const report = orders.map((o) => ({
      orderId: o.orderId,
      customer: o.customer?.name,
      date: moment(o.orderDate).format("YYYY-MM-DD"),
      due: o.payment.balanceRemaining,
      status: o.payment.status,
    }));

    if (exportAs === "excel") {
      const wb = new ExcelJS.Workbook();
      const ws = wb.addWorksheet("Outstanding Invoices");
      ws.columns = [
        { header: "Order ID", key: "orderId", width: 20 },
        { header: "Customer", key: "customer", width: 25 },
        { header: "Date", key: "date", width: 15 },
        { header: "Due Amount", key: "due", width: 15 },
        { header: "Status", key: "status", width: 15 },
      ];
      report.forEach((r) => ws.addRow(r));
      res.setHeader(
        "Content-Type",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
      );
      res.setHeader(
        "Content-Disposition",
        "attachment; filename=outstanding_invoices.xlsx"
      );
      await wb.xlsx.write(res);
      return res.end();
    }

    if (exportAs === "pdf") {
      const columns = [
        { header: "Order ID", key: "orderId" },
        { header: "Customer", key: "customer" },
        { header: "Date", key: "date" },
        { header: "Due Amount", key: "due" },
        { header: "Status", key: "status" },
      ];
      return streamReportPdf(
        res,
        "outstanding_invoices.pdf",
        "Outstanding Invoices",
        columns,
        report,
        req.user
      );
    }

    return res.json(new ApiResponse(200, report, "Outstanding invoices"));
  } catch (err) {
    console.error(err);
    res.status(500).json(new ApiResponse(500, null, err.message));
  }
};

// ─── 9. DSO Report ────────────────────────────────────────────────────────────
export const getDSOReport = async (req, res) => {
  try {
    const exportAs = req.query.export;
    const paid = await Order.find({ "payment.status": "Paid" });
    let totalDays = 0;
    paid.forEach((o) => {
      totalDays += moment(o.updatedAt).diff(moment(o.orderDate), "days");
    });
    const avgDSO = paid.length
      ? Number((totalDays / paid.length).toFixed(2))
      : 0;
    const report = [{ averageDSO: avgDSO, sampleSize: paid.length }];

    if (exportAs === "excel") {
      const wb = new ExcelJS.Workbook();
      const ws = wb.addWorksheet("DSO");
      ws.columns = [
        { header: "Average DSO (days)", key: "averageDSO", width: 20 },
        { header: "Sample Size", key: "sampleSize", width: 15 },
      ];
      ws.addRow(report[0]);
      res.setHeader(
        "Content-Type",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
      );
      res.setHeader("Content-Disposition", "attachment; filename=dso.xlsx");
      await wb.xlsx.write(res);
      return res.end();
    }

    if (exportAs === "pdf") {
      const columns = [
        { header: "Average DSO (days)", key: "averageDSO" },
        { header: "Sample Size", key: "sampleSize" },
      ];
      return streamReportPdf(
        res,
        "dso.pdf",
        "Days Sales Outstanding (DSO)",
        columns,
        report,
        req.user
      );
    }

    return res.json(new ApiResponse(200, report, "DSO report"));
  } catch (err) {
    console.error(err);
    res.status(500).json(new ApiResponse(500, null, err.message));
  }
};
