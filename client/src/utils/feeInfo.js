export function computeFeeInfo(admission, entries, courses = []) {
  const ownTotalFee =
    admission.total_fee !== null &&
    admission.total_fee !== undefined &&
    admission.total_fee !== ""
      ? Number(admission.total_fee)
      : null;

  let totalFee = ownTotalFee;
  let isFallbackFee = false;
  if (totalFee === null) {
    const matchedCourse = courses.find(
      (c) =>
        (c.course_name || "").trim().toLowerCase() ===
        (admission.course_name || "").trim().toLowerCase()
    );
    if (
      matchedCourse &&
      matchedCourse.standard_fee !== null &&
      matchedCourse.standard_fee !== undefined &&
      matchedCourse.standard_fee !== ""
    ) {
      totalFee = Number(matchedCourse.standard_fee);
      isFallbackFee = true;
    }
  }

  const totalPaid = entries
    .filter((e) => e.enrol_no === admission.comn_enrol_no)
    .reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
  const balance = totalFee !== null ? totalFee - totalPaid : null;
  const status =
    totalFee !== null
      ? balance <= 0
        ? "Paid"
        : "Pending"
      : totalPaid > 0
        ? "Paid"
        : "Pending";
  return { totalFee, totalPaid, balance, status, isFallbackFee };
}
