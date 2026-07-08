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
      amount_in_words,
      towards,
      payment_mode,
      cheque_card_no,
      bank_name,
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
      amount_in_words,
      towards,
      payment_mode,
      cheque_card_no,
      bank_name,
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

const updateFeePayment = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      enrol_no,
      bill_no,
      amount_paid,
      paid_date,
      amount_in_words,
      towards,
      payment_mode,
      cheque_card_no,
      bank_name,
    } = req.body;

    const payment = await FeePayment.findByPk(id);
    if (!payment) {
      return res.status(404).json({
        success: false,
        message: "Fee payment not found",
      });
    }

    const admission = await Admission.findByPk(payment.admission_id);
    if (admission && admission.total_fee !== null) {
      const existingPayments = await FeePayment.findAll({
        where: { admission_id: payment.admission_id },
      });
      const totalPaidExcludingThis = existingPayments
        .filter((p) => p.id !== payment.id)
        .reduce((sum, p) => sum + Number(p.amount_paid || 0), 0);
      const balance = Number(admission.total_fee) - totalPaidExcludingThis;

      if (Number(amount_paid) > balance) {
        return res.status(400).json({
          success: false,
          field: "amount_paid",
          message: `Amount exceeds remaining balance of Rs. ${balance}.`,
        });
      }
    }

    await payment.update({
      enrol_no,
      bill_no,
      amount_paid,
      paid_date,
      amount_in_words,
      towards,
      payment_mode,
      cheque_card_no,
      bank_name,
    });

    res.status(200).json({
      success: true,
      message: "Fee payment updated successfully",
      data: payment,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

const deleteFeePayment = async (req, res) => {
  try {
    const { id } = req.params;
    const payment = await FeePayment.findByPk(id);
    if (!payment) {
      return res.status(404).json({
        success: false,
        message: "Fee payment not found",
      });
    }

    await payment.destroy();

    res.status(200).json({
      success: true,
      message: "Fee payment deleted successfully",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

module.exports = { createFeePayment, updateFeePayment, deleteFeePayment };
