// Lets a teacher-authenticated request reuse admin-only controllers
// (createAdmission, createFeeEntry, createInformationSheet) unchanged —
// those controllers only ever read req.admin.adminId, so this just
// supplies that shape from the teacher's own admin_id. Mount AFTER
// requireTeacherAuth. Write-only endpoints only — never put this in
// front of a controller that lists/reads existing records, since a
// teacher must not get admin's read access this way.
const teacherActingAsAdmin = (req, res, next) => {
  req.admin = { adminId: req.teacher.admin_id };
  next();
};

module.exports = teacherActingAsAdmin;
