const express = require("express");
const router = express.Router();
const {
  createAdmission,
  getAllAdmissions,
  getAdmissionById,
  updateAdmission,
  deleteAdmission,
  getAdmissionBySlug,
} = require("../controllers/admissionController");

router.post("/", createAdmission);
router.get("/", getAllAdmissions);
router.get("/slug/:slug", getAdmissionBySlug);
router.get("/:id", getAdmissionById);
router.put("/:id", updateAdmission);
router.delete("/:id", deleteAdmission);

module.exports = router;
