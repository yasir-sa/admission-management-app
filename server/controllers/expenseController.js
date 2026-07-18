const Expense = require("../models/Expense");

const createExpense = async (req, res) => {
  try {
    const { expense_date, bill_no, category, paid_to, amount, payment_mode, description } =
      req.body;
    if (!amount) {
      return res.status(400).json({
        success: false,
        errors: { amount: "Amount is required." },
      });
    }
    const expense = await Expense.create({
      expense_date: expense_date || null,
      bill_no: bill_no || null,
      category: category || null,
      paid_to: paid_to || null,
      amount,
      payment_mode: payment_mode || null,
      description: description || null,
    });
    res.status(201).json({
      success: true,
      message: "Expense entry saved successfully",
      data: expense,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

const getAllExpenses = async (req, res) => {
  try {
    const expenses = await Expense.findAll({ order: [["id", "ASC"]] });
    res.status(200).json({
      success: true,
      data: expenses,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

const updateExpense = async (req, res) => {
  try {
    const { id } = req.params;
    const { expense_date, bill_no, category, paid_to, amount, payment_mode, description } =
      req.body;
    const expense = await Expense.findByPk(id);
    if (!expense) {
      return res.status(404).json({
        success: false,
        message: "Expense entry not found",
      });
    }
    if (!amount) {
      return res.status(400).json({
        success: false,
        errors: { amount: "Amount is required." },
      });
    }
    await expense.update({
      expense_date: expense_date || null,
      bill_no: bill_no || null,
      category: category || null,
      paid_to: paid_to || null,
      amount,
      payment_mode: payment_mode || null,
      description: description || null,
    });
    res.status(200).json({
      success: true,
      message: "Expense entry updated successfully",
      data: expense,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

const deleteExpense = async (req, res) => {
  try {
    const { id } = req.params;
    const expense = await Expense.findByPk(id);
    if (!expense) {
      return res.status(404).json({
        success: false,
        message: "Expense entry not found",
      });
    }
    await expense.destroy();
    res.status(200).json({
      success: true,
      message: "Expense entry deleted successfully",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

module.exports = {
  createExpense,
  getAllExpenses,
  updateExpense,
  deleteExpense,
};
