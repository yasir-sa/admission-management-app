import { useRef, useState } from "react";
import { Bar, Line } from "react-chartjs-2";
import jsPDF from "jspdf";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js";

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  Title,
  Tooltip,
  Legend
);

const MONTH_LABELS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

const toDateStr = (date) => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
};

const QUICK_RANGES = [
  { key: "today", label: "Today" },
  { key: "week", label: "This Week" },
  { key: "month", label: "This Month" },
  { key: "all", label: "All Time" },
];

const pointValueLabelPlugin = {
  id: "pointValueLabelPlugin",
  afterDatasetsDraw(chart) {
    const { ctx } = chart;
    chart.data.datasets.forEach((dataset, datasetIndex) => {
      const meta = chart.getDatasetMeta(datasetIndex);
      meta.data.forEach((point, index) => {
        const value = dataset.data[index];
        if (!value) return;
        ctx.save();
        ctx.fillStyle = "#1d4ed8";
        ctx.font = "bold 11px sans-serif";
        ctx.textAlign = "center";
        ctx.fillText(value, point.x, point.y - 10);
        ctx.restore();
      });
    });
  },
};

function buildTimeSeriesData(admissions, startDate, endDate) {
  const from = new Date(`${startDate}T00:00:00`);
  const to = new Date(`${endDate}T23:59:59`);

  const inRange = admissions.filter((a) => {
    if (!a.created_at) return false;
    const created = new Date(a.created_at);
    return created >= from && created <= to;
  });

  const dayCount =
    Math.round((to - from) / (1000 * 60 * 60 * 24)) + 1;

  const buckets = new Map();
  const order = [];

  if (dayCount <= 31) {
    for (let i = 0; i < dayCount; i++) {
      const d = new Date(from);
      d.setDate(d.getDate() + i);
      const key = toDateStr(d);
      const label = `${d.getDate()} ${MONTH_LABELS[d.getMonth()]}`;
      buckets.set(key, 0);
      order.push({ key, label });
    }
    inRange.forEach((a) => {
      const key = toDateStr(new Date(a.created_at));
      if (buckets.has(key)) buckets.set(key, buckets.get(key) + 1);
    });
  } else {
    const cursor = new Date(from.getFullYear(), from.getMonth(), 1);
    const endMonth = new Date(to.getFullYear(), to.getMonth(), 1);
    while (cursor <= endMonth) {
      const key = `${cursor.getFullYear()}-${cursor.getMonth()}`;
      const label = `${MONTH_LABELS[cursor.getMonth()]} ${cursor.getFullYear()}`;
      buckets.set(key, 0);
      order.push({ key, label });
      cursor.setMonth(cursor.getMonth() + 1);
    }
    inRange.forEach((a) => {
      const d = new Date(a.created_at);
      const key = `${d.getFullYear()}-${d.getMonth()}`;
      if (buckets.has(key)) buckets.set(key, buckets.get(key) + 1);
    });
  }

  return {
    labels: order.map((o) => o.label),
    datasets: [
      {
        label: "Admissions",
        data: order.map((o) => buckets.get(o.key)),
        borderColor: "#1d4ed8",
        backgroundColor: "rgba(29, 78, 216, 0.15)",
        tension: 0.3,
        fill: true,
        pointRadius: 3,
      },
    ],
  };
}

const CHART_FIELDS = [
  { field: "community", label: "Students by Community", color: "#1d4ed8" },
  { field: "religion", label: "Students by Religion", color: "#0d9488" },
  { field: "occupation", label: "Students by Occupation", color: "#f59e0b" },
  { field: "sex", label: "Students by Sex", color: "#dc2626" },
];

const buildChartData = (admissions, field, label, color) => {
  const counts = {};
  admissions.forEach((row) => {
    const value = row[field] || "Unknown";
    counts[value] = (counts[value] || 0) + 1;
  });
  return {
    labels: Object.keys(counts),
    datasets: [
      {
        label,
        data: Object.values(counts),
        backgroundColor: color,
        borderRadius: 4,
      },
    ],
  };
};

function AdmissionCharts({ admissions }) {
  const today = new Date();
  const todayStr = toDateStr(today);
  const earliestDateStr = admissions.reduce((min, a) => {
    if (!a.created_at) return min;
    const d = a.created_at.slice(0, 10);
    return !min || d < min ? d : min;
  }, null) || todayStr;

  const [startDate, setStartDate] = useState(earliestDateStr);
  const [endDate, setEndDate] = useState(todayStr);
  const [activePreset, setActivePreset] = useState("all");
  const lineChartRef = useRef(null);
  const barChartRefs = useRef({});

  if (admissions.length === 0) return null;

  const selectQuickRange = (key) => {
    setActivePreset(key);
    const now = new Date();
    const nowStr = toDateStr(now);

    if (key === "today") {
      setStartDate(nowStr);
      setEndDate(nowStr);
    } else if (key === "week") {
      const dayOfWeek = now.getDay();
      const daysSinceMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
      const monday = new Date(now);
      monday.setDate(now.getDate() - daysSinceMonday);
      setStartDate(toDateStr(monday));
      setEndDate(nowStr);
    } else if (key === "month") {
      const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      setStartDate(toDateStr(firstOfMonth));
      setEndDate(nowStr);
    } else if (key === "all") {
      setStartDate(earliestDateStr);
      setEndDate(nowStr);
    }
  };

  const handleStartDateChange = (e) => {
    setStartDate(e.target.value);
    setActivePreset(null);
  };

  const handleEndDateChange = (e) => {
    setEndDate(e.target.value);
    setActivePreset(null);
  };

  const filteredAdmissions = admissions.filter((a) => {
    if (!a.created_at) return false;
    const from = new Date(`${startDate}T00:00:00`);
    const to = new Date(`${endDate}T23:59:59`);
    const created = new Date(a.created_at);
    return created >= from && created <= to;
  });

  const filterDescription = `${startDate} to ${endDate}`;

  const exportChartsToPDF = () => {
    const doc = new jsPDF({ orientation: "portrait" });
    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 10;
    const imgWidth = pageWidth - margin * 2;

    doc.setFontSize(14);
    doc.text("Admission Analytics", margin, 15);
    doc.setFontSize(9);
    doc.setTextColor(100);
    doc.text(`Showing: ${filterDescription}`, margin, 20);
    doc.setTextColor(0);

    let y = 26;
    if (lineChartRef.current) {
      const lineImg = lineChartRef.current.toBase64Image();
      doc.addImage(lineImg, "PNG", margin, y, imgWidth, imgWidth * 0.4);
      y += imgWidth * 0.4 + 10;
    }

    const barWidth = (imgWidth - 10) / 2;
    let col = 0;
    CHART_FIELDS.forEach((chart) => {
      const chartInstance = barChartRefs.current[chart.field];
      if (!chartInstance) return;
      const img = chartInstance.toBase64Image();
      const x = margin + col * (barWidth + 10);
      doc.addImage(img, "PNG", x, y, barWidth, barWidth * 0.75);
      col += 1;
      if (col === 2) {
        col = 0;
        y += barWidth * 0.75 + 10;
      }
    });

    doc.save("admission_analytics.pdf");
  };

  return (
    <div className="admission-list mt-4">
      <div className="d-flex justify-content-between align-items-center flex-wrap gap-2 mb-3">
        <h2 className="mb-0">Admission Analytics</h2>
        <div className="d-flex align-items-center gap-2">
          <span className="badge bg-primary fs-6">
            Admission Total: {filteredAdmissions.length}
          </span>
          <button
            type="button"
            className="btn btn-outline-danger btn-sm d-flex align-items-center gap-1"
            onClick={exportChartsToPDF}
          >
            <i className="bi bi-file-earmark-pdf"></i> Export Charts as PDF
          </button>
        </div>
      </div>

      <div className="border rounded p-3 mb-4">
        <div className="d-flex justify-content-between align-items-center flex-wrap gap-3 mb-3">
          <div className="d-flex gap-2 flex-wrap">
            {QUICK_RANGES.map((range) => (
              <button
                key={range.key}
                type="button"
                className={`btn btn-sm ${activePreset === range.key ? "btn-primary" : "btn-outline-primary"}`}
                onClick={() => selectQuickRange(range.key)}
              >
                {range.label}
              </button>
            ))}
          </div>
          <div className="d-flex align-items-end gap-2">
            <div>
              <label className="form-label small mb-1">Start Date</label>
              <input
                type="date"
                className="form-control form-control-sm"
                value={startDate}
                max={endDate}
                onChange={handleStartDateChange}
              />
            </div>
            <div>
              <label className="form-label small mb-1">End Date</label>
              <input
                type="date"
                className="form-control form-control-sm"
                value={endDate}
                min={startDate}
                max={todayStr}
                onChange={handleEndDateChange}
              />
            </div>
          </div>
        </div>

        <h5 className="mb-2">Admissions Over Time</h5>
        <Line
          ref={lineChartRef}
          data={buildTimeSeriesData(filteredAdmissions, startDate, endDate)}
          plugins={[pointValueLabelPlugin]}
          options={{
            responsive: true,
            layout: { padding: { top: 20 } },
            plugins: {
              legend: { display: false },
            },
            scales: {
              y: { beginAtZero: true, ticks: { precision: 0 } },
            },
          }}
        />
      </div>

      <div className="row g-4">
        {CHART_FIELDS.map((chart) => (
          <div className="col-md-6" key={chart.field}>
            <div className="border rounded p-3 h-100">
              <Bar
                ref={(el) => {
                  barChartRefs.current[chart.field] = el;
                }}
                data={buildChartData(
                  filteredAdmissions,
                  chart.field,
                  chart.label,
                  chart.color
                )}
                options={{
                  responsive: true,
                  plugins: {
                    legend: { display: false },
                    title: { display: true, text: chart.label },
                  },
                  scales: {
                    y: { beginAtZero: true, ticks: { precision: 0 } },
                  },
                }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default AdmissionCharts;
