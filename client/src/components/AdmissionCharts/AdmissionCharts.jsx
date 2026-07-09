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

const TIME_RANGES = [
  { key: "7d", label: "Last 7 Days", days: 7 },
  { key: "1m", label: "Last 1 Month", days: 30 },
  { key: "1y", label: "Last 1 Year", days: 365 },
  { key: "3y", label: "Last 3 Years", days: 1095 },
];

const MONTH_LABELS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
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

function buildTimeSeriesData(admissions, days) {
  const now = new Date();
  const from = new Date(now);
  from.setDate(from.getDate() - days);

  const inRange = admissions.filter((a) => {
    if (!a.created_at) return false;
    const created = new Date(a.created_at);
    return created >= from && created <= now;
  });

  const buckets = new Map();
  const order = [];

  if (days <= 31) {
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      const label = `${d.getDate()} ${MONTH_LABELS[d.getMonth()]}`;
      buckets.set(key, 0);
      order.push({ key, label });
    }
    inRange.forEach((a) => {
      const key = new Date(a.created_at).toISOString().slice(0, 10);
      if (buckets.has(key)) buckets.set(key, buckets.get(key) + 1);
    });
  } else {
    const months = Math.ceil(days / 30);
    for (let i = months - 1; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${d.getMonth()}`;
      const label = `${MONTH_LABELS[d.getMonth()]} ${d.getFullYear()}`;
      buckets.set(key, 0);
      order.push({ key, label });
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

function DateLookup({ admissions, year, month, day, setYear, setMonth, setDay, total }) {
  const years = Array.from(
    new Set(
      admissions
        .filter((a) => a.created_at)
        .map((a) => new Date(a.created_at).getFullYear())
    )
  ).sort((a, b) => b - a);

  const hasFilter = year || month || day;

  const describeSelection = () => {
    if (!hasFilter) return "";
    const parts = [];
    if (day) parts.push(day);
    if (month) parts.push(MONTH_LABELS[Number(month)]);
    if (year) parts.push(year);
    return parts.join(" ");
  };

  return (
    <div className="border rounded p-3 mb-4">
      <h5 className="mb-3">Search Admissions by Date</h5>
      <div className="row g-2 align-items-end">
        <div className="col-auto">
          <label className="form-label small mb-1">Year</label>
          <select
            className="form-select form-select-sm"
            value={year}
            onChange={(e) => {
              setYear(e.target.value);
              if (!e.target.value) {
                setMonth("");
                setDay("");
              }
            }}
          >
            <option value="">All Years</option>
            {years.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
        </div>
        <div className="col-auto">
          <label className="form-label small mb-1">Month</label>
          <select
            className="form-select form-select-sm"
            value={month}
            disabled={!year}
            onChange={(e) => {
              setMonth(e.target.value);
              if (!e.target.value) setDay("");
            }}
          >
            <option value="">All Months</option>
            {MONTH_LABELS.map((m, i) => (
              <option key={m} value={i}>
                {m}
              </option>
            ))}
          </select>
        </div>
        <div className="col-auto">
          <label className="form-label small mb-1">Day</label>
          <select
            className="form-select form-select-sm"
            value={day}
            disabled={!month}
            onChange={(e) => setDay(e.target.value)}
          >
            <option value="">All Days</option>
            {Array.from({ length: 31 }, (_, i) => i + 1).map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>
        </div>
        {hasFilter && (
          <div className="col-auto">
            <button
              type="button"
              className="btn btn-sm btn-outline-secondary"
              onClick={() => {
                setYear("");
                setMonth("");
                setDay("");
              }}
            >
              Clear
            </button>
          </div>
        )}
      </div>

      {hasFilter && (
        <div className="alert alert-primary mt-3 mb-0 py-2">
          <strong>{total}</strong> admission
          {total === 1 ? "" : "s"} found for{" "}
          <strong>{describeSelection()}</strong>
        </div>
      )}
    </div>
  );
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
  const [timeRange, setTimeRange] = useState("1y");
  const [year, setYear] = useState("");
  const [month, setMonth] = useState("");
  const [day, setDay] = useState("");
  const lineChartRef = useRef(null);
  const barChartRefs = useRef({});

  if (admissions.length === 0) return null;

  const hasDateFilter = year || month || day;
  const activeRange = TIME_RANGES.find((r) => r.key === timeRange);

  const filteredAdmissions = hasDateFilter
    ? admissions.filter((a) => {
        if (!a.created_at) return false;
        const d = new Date(a.created_at);
        if (year && d.getFullYear() !== Number(year)) return false;
        if (month && d.getMonth() !== Number(month)) return false;
        if (day && d.getDate() !== Number(day)) return false;
        return true;
      })
    : admissions.filter((a) => {
        if (!a.created_at) return false;
        const created = new Date(a.created_at);
        const from = new Date();
        from.setDate(from.getDate() - activeRange.days);
        return created >= from && created <= new Date();
      });

  const selectTimeRange = (key) => {
    setTimeRange(key);
    setYear("");
    setMonth("");
    setDay("");
  };

  const filterDescription = hasDateFilter
    ? [day, month !== "" ? MONTH_LABELS[Number(month)] : "", year]
        .filter(Boolean)
        .join(" ")
    : activeRange.label;

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
        <div className="d-flex justify-content-between align-items-center flex-wrap gap-2 mb-2">
          <h5 className="mb-0">Admissions Over Time</h5>
          <div className="d-flex gap-2 flex-wrap">
            {TIME_RANGES.map((range) => (
              <button
                key={range.key}
                type="button"
                className={`btn btn-sm ${!hasDateFilter && timeRange === range.key ? "btn-primary" : "btn-outline-primary"}`}
                onClick={() => selectTimeRange(range.key)}
              >
                {range.label}
              </button>
            ))}
          </div>
        </div>
        <Line
          ref={lineChartRef}
          data={buildTimeSeriesData(
            filteredAdmissions,
            hasDateFilter ? 1095 : activeRange.days
          )}
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

      <DateLookup
        admissions={admissions}
        year={year}
        month={month}
        day={day}
        setYear={setYear}
        setMonth={setMonth}
        setDay={setDay}
        total={filteredAdmissions.length}
      />

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
