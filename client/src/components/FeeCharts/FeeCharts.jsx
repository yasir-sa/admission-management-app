import { useRef } from "react";
import { Bar, Line, Doughnut } from "react-chartjs-2";
import jsPDF from "jspdf";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js";
import { computeFeeInfo } from "../../utils/feeInfo";

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  ArcElement,
  Title,
  Tooltip,
  Legend
);

const MONTH_LABELS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

const PAYMENT_MODE_COLORS = ["#f59e0b", "#0891b2", "#7c3aed", "#dc2626", "#16a34a"];

const toDateStr = (date) => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
};

const amountTooltip = {
  callbacks: {
    label: (ctx) => ` Rs. ${Number(ctx.parsed.y ?? ctx.parsed).toLocaleString("en-IN")}`,
  },
};

function buildCollectionsOverTime(entries, startDate, endDate) {
  const from = new Date(`${startDate}T00:00:00`);
  const to = new Date(`${endDate}T23:59:59`);

  const inRange = entries.filter((e) => {
    if (!e.paid_date) return false;
    const d = new Date(`${e.paid_date}T00:00:00`);
    return d >= from && d <= to;
  });

  const dayCount = Math.round((to - from) / (1000 * 60 * 60 * 24)) + 1;
  const buckets = new Map();
  const order = [];

  if (dayCount <= 31) {
    for (let i = 0; i < dayCount; i++) {
      const d = new Date(from);
      d.setDate(d.getDate() + i);
      const key = toDateStr(d);
      buckets.set(key, 0);
      order.push({ key, label: `${d.getDate()} ${MONTH_LABELS[d.getMonth()]}` });
    }
    inRange.forEach((e) => {
      if (buckets.has(e.paid_date)) {
        buckets.set(e.paid_date, buckets.get(e.paid_date) + (Number(e.amount) || 0));
      }
    });
  } else {
    const cursor = new Date(from.getFullYear(), from.getMonth(), 1);
    const endMonth = new Date(to.getFullYear(), to.getMonth(), 1);
    while (cursor <= endMonth) {
      const key = `${cursor.getFullYear()}-${cursor.getMonth()}`;
      buckets.set(key, 0);
      order.push({ key, label: `${MONTH_LABELS[cursor.getMonth()]} ${cursor.getFullYear()}` });
      cursor.setMonth(cursor.getMonth() + 1);
    }
    inRange.forEach((e) => {
      const d = new Date(`${e.paid_date}T00:00:00`);
      const key = `${d.getFullYear()}-${d.getMonth()}`;
      if (buckets.has(key)) buckets.set(key, buckets.get(key) + (Number(e.amount) || 0));
    });
  }

  return {
    labels: order.map((o) => o.label),
    datasets: [
      {
        label: "Collections (Rs.)",
        data: order.map((o) => buckets.get(o.key)),
        borderColor: "#16a34a",
        backgroundColor: "rgba(22, 163, 74, 0.15)",
        tension: 0.3,
        fill: true,
        pointRadius: 3,
      },
    ],
  };
}

function buildPaymentModeData(entries, startDate, endDate) {
  const from = new Date(`${startDate}T00:00:00`);
  const to = new Date(`${endDate}T23:59:59`);
  const inRange = entries.filter((e) => {
    if (!e.paid_date) return false;
    const d = new Date(`${e.paid_date}T00:00:00`);
    return d >= from && d <= to;
  });
  const counts = {};
  inRange.forEach((e) => {
    const mode = e.payment_mode || "Unknown";
    counts[mode] = (counts[mode] || 0) + (Number(e.amount) || 0);
  });
  return {
    labels: Object.keys(counts),
    datasets: [
      {
        label: "Collection by Payment Mode",
        data: Object.values(counts),
        backgroundColor: PAYMENT_MODE_COLORS,
        borderRadius: 4,
      },
    ],
  };
}

function buildCourseCollectionData(entries, admissions, startDate, endDate) {
  const from = new Date(`${startDate}T00:00:00`);
  const to = new Date(`${endDate}T23:59:59`);
  const inRange = entries.filter((e) => {
    if (!e.paid_date) return false;
    const d = new Date(`${e.paid_date}T00:00:00`);
    return d >= from && d <= to;
  });
  const enrolToCourse = new Map(
    admissions.map((a) => [a.comn_enrol_no, a.course_name])
  );
  const counts = {};
  inRange.forEach((e) => {
    const course = enrolToCourse.get(e.enrol_no) || "Not in Admission List";
    counts[course] = (counts[course] || 0) + (Number(e.amount) || 0);
  });
  return {
    labels: Object.keys(counts),
    datasets: [
      {
        label: "Collection by Course",
        data: Object.values(counts),
        backgroundColor: "#7c3aed",
        borderRadius: 4,
      },
    ],
  };
}

function buildPaidPendingData(admissions, entries, courses) {
  let paid = 0;
  let pending = 0;
  admissions.forEach((a) => {
    const info = computeFeeInfo(a, entries, courses);
    if (info.status === "Paid") paid += 1;
    else pending += 1;
  });
  return {
    labels: ["Paid", "Pending"],
    datasets: [
      {
        data: [paid, pending],
        backgroundColor: ["#16a34a", "#f59e0b"],
      },
    ],
  };
}

function FeeCharts({ admissions, entries, courses, startDate, endDate }) {
  const lineChartRef = useRef(null);
  const modeChartRef = useRef(null);
  const courseChartRef = useRef(null);
  const statusChartRef = useRef(null);

  if (!startDate || !endDate) return null;
  if (entries.length === 0 && admissions.length === 0) return null;

  const filterDescription = `${startDate} to ${endDate}`;

  const exportChartsToPDF = () => {
    const doc = new jsPDF({ orientation: "portrait" });
    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 10;
    const imgWidth = pageWidth - margin * 2;

    doc.setFontSize(14);
    doc.text("Fee Collection Analytics", margin, 15);
    doc.setFontSize(9);
    doc.setTextColor(100);
    doc.text(`Showing: ${filterDescription}`, margin, 20);
    doc.setTextColor(0);

    let y = 26;
    if (lineChartRef.current) {
      const img = lineChartRef.current.toBase64Image();
      doc.addImage(img, "PNG", margin, y, imgWidth, imgWidth * 0.4);
      y += imgWidth * 0.4 + 10;
    }

    const halfWidth = (imgWidth - 10) / 2;
    if (modeChartRef.current) {
      doc.addImage(modeChartRef.current.toBase64Image(), "PNG", margin, y, halfWidth, halfWidth * 0.75);
    }
    if (statusChartRef.current) {
      doc.addImage(
        statusChartRef.current.toBase64Image(),
        "PNG",
        margin + halfWidth + 10,
        y,
        halfWidth,
        halfWidth * 0.75
      );
    }
    y += halfWidth * 0.75 + 10;
    if (courseChartRef.current) {
      const img = courseChartRef.current.toBase64Image();
      doc.addImage(img, "PNG", margin, y, imgWidth, imgWidth * 0.5);
    }

    doc.save("fee_collection_analytics.pdf");
  };

  return (
    <div className="mt-4">
      <div className="d-flex justify-content-between align-items-center flex-wrap gap-2 mb-3">
        <h4 className="mb-0">Fee Collection Analytics</h4>
        <button
          type="button"
          className="btn btn-outline-danger btn-sm d-flex align-items-center gap-1"
          onClick={exportChartsToPDF}
        >
          <i className="bi bi-file-earmark-pdf"></i> Export Charts as PDF
        </button>
      </div>

      <div className="border rounded p-3 mb-4">
        <h6 className="mb-2">Collections Over Time</h6>
        <Line
          ref={lineChartRef}
          data={buildCollectionsOverTime(entries, startDate, endDate)}
          options={{
            responsive: true,
            plugins: {
              legend: { display: false },
              tooltip: amountTooltip,
            },
            scales: {
              y: { beginAtZero: true, ticks: { precision: 0 } },
            },
          }}
        />
      </div>

      <div className="row g-4">
        <div className="col-md-6">
          <div className="border rounded p-3 h-100">
            <Bar
              ref={modeChartRef}
              data={buildPaymentModeData(entries, startDate, endDate)}
              options={{
                responsive: true,
                plugins: {
                  legend: { display: false },
                  title: { display: true, text: "Collection by Payment Mode" },
                  tooltip: amountTooltip,
                },
                scales: {
                  y: { beginAtZero: true, ticks: { precision: 0 } },
                },
              }}
            />
          </div>
        </div>
        <div className="col-md-6">
          <div className="border rounded p-3 h-100">
            <div style={{ maxWidth: "280px", margin: "0 auto" }}>
              <Doughnut
                ref={statusChartRef}
                data={buildPaidPendingData(admissions, entries, courses)}
                options={{
                  responsive: true,
                  plugins: {
                    legend: { position: "bottom" },
                    title: { display: true, text: "Fee Status — Paid vs Pending" },
                  },
                }}
              />
            </div>
          </div>
        </div>
      </div>

      <div className="border rounded p-3 mt-4">
        <h6 className="mb-2">Collection by Course</h6>
        <Bar
          ref={courseChartRef}
          data={buildCourseCollectionData(entries, admissions, startDate, endDate)}
          options={{
            indexAxis: "y",
            responsive: true,
            plugins: {
              legend: { display: false },
              tooltip: amountTooltip,
            },
            scales: {
              x: { beginAtZero: true, ticks: { precision: 0 } },
            },
          }}
        />
      </div>
    </div>
  );
}

export default FeeCharts;
