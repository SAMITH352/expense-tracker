import express from "express";
import mongoose from "mongoose";
import Expense from "../models/Expense.js";

const router = express.Router();

/**
 * POST /api/expenses
 * Create a new expense
 * Body: { customerId, category, amount, date, note }
 */
router.post("/", async (req, res) => {
  try {
    const { customerId, category, amount, date, note } = req.body;
    const expense = new Expense({
      customerId,
      category,
      amount,
      date: date ? new Date(date) : new Date(),
      note
    });
    await expense.save();
    res.status(201).json(expense);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

/**
 * GET /api/expenses
 * Query params (optional):
 *   customerId, category, startDate, endDate, limit, skip
 */
router.get("/", async (req, res) => {
  try {
    const { customerId, category, startDate, endDate, limit = 100, skip = 0 } = req.query;
    const filter = {};
    if (customerId) filter.customerId = customerId;
    if (category) filter.category = category;
    if (startDate || endDate) {
      filter.date = {};
      if (startDate) filter.date.$gte = new Date(startDate);
      if (endDate) {
        const e = new Date(endDate);
        // include the whole day for endDate
        e.setHours(23,59,59,999);
        filter.date.$lte = e;
      }
    }

    const expenses = await Expense.find(filter)
      .sort({ date: -1 })
      .skip(Number(skip))
      .limit(Number(limit));
    res.json(expenses);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/expenses/:id
 */
router.get("/:id", async (req, res) => {
  try {
    const exp = await Expense.findById(req.params.id);
    if (!exp) return res.status(404).json({ error: "Not found" });
    res.json(exp);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

/**
 * PUT /api/expenses/:id
 * Update expense by id
 */
router.put("/:id", async (req, res) => {
  try {
    const data = req.body;
    if (data.date) data.date = new Date(data.date);
    const updated = await Expense.findByIdAndUpdate(req.params.id, data, { new: true });
    if (!updated) return res.status(404).json({ error: "Not found" });
    res.json(updated);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

/**
 * DELETE /api/expenses/:id
 */
router.delete("/:id", async (req, res) => {
  try {
    const deleted = await Expense.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ error: "Not found" });
    res.json({ message: "Deleted" });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

/**
 * GET /api/expenses/summary/:customerId/:year/:month
 * Monthly summary for a customer (month is 1-12)
 * Returns totals per category and total sum
 */
router.get("/summary/:customerId/:year/:month", async (req, res) => {
  try {
    const { customerId, year, month } = req.params;
    const y = Number(year);
    const m = Number(month); // 1..12
    const start = new Date(y, m - 1, 1);
    const end = new Date(y, m, 0);
    end.setHours(23,59,59,999);

    const match = {
      customerId: customerId
    };
    match.date = { $gte: start, $lte: end };

    const summary = await Expense.aggregate([
      { $match: match },
      {
        $group: {
          _id: "$category",
          totalAmount: { $sum: "$amount" },
          count: { $sum: 1 }
        }
      },
      { $sort: { totalAmount: -1 } }
    ]);

    const total = summary.reduce((s, item) => s + item.totalAmount, 0);

    res.json({ year: y, month: m, total, byCategory: summary });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
