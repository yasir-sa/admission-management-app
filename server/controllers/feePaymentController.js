const FeePayment = require("../models/FeePayment");
const Admission = require("../models/Admission");

const createFeePayment = async (req, res) => {
  try {
    const {
      admission_id,
      enrol_no,
      bill_no,
      amount_paid,
      paid_date,
      status,
    } = req.body;

    const admission = await Admission.findByPk(admission_id);
    if (!admission) {
      return res.status(404).json({
        success: false,
        message: "Admission not found",
      });
    }

    if (admission.total_fee !== null) {
      const existingPayments = await FeePayment.findAll({
        where: { admission_id },
      });
      const totalPaid = existingPayments.reduce(
        (sum, p) => sum + Number(p.amount_paid || 0),
        0
      );
      const balance = Number(admission.total_fee) - totalPaid;

      if (Number(amount_paid) > balance) {
        return res.status(400).json({
          success: false,
          field: "amount_paid",
          message: `Amount exceeds remaining balance of Rs. ${balance}.`,
        });
      }
    }

    const payment = await FeePayment.create({
      admission_id,
      enrol_no,
      bill_no,
      amount_paid,
      paid_date,
      status,
    });

    res.status(201).json({
      success: true,
      message: "Fee payment added successfully",
      data: payment,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

module.exports = { createFeePayment };
