import { Bar } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js";

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

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
  if (admissions.length === 0) return null;

  return (
    <div className="admission-list mt-4">
      <h2 className="mb-3">Admission Analytics</h2>
      <div className="row g-4">
        {CHART_FIELDS.map((chart) => (
          <div className="col-md-6" key={chart.field}>
            <div className="border rounded p-3 h-100">
              <Bar
                data={buildChartData(
                  admissions,
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
