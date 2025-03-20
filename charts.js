let chart = null;

export function drawBarChart(title, labels, data) {
    const ctx = document.getElementById("result-chart").getContext("2d");
    if (chart) {
        chart.data.labels = labels;
        chart.data.datasets[0].label = title;
        chart.data.datasets[0].data = data;
        chart.update();
    } else {
        chart = new Chart(ctx, {
            type: "bar",
            data: {
                labels,
                datasets: [{ label: title, data, backgroundColor: "rgba(102, 126, 234, 0.7)", borderColor: "rgba(102, 126, 234, 1)", borderWidth: 1 }]
            },
            options: { scales: { y: { beginAtZero: true, max: 1 } } }
        });
    }
}

export function drawNormalChart(mu, sigma, a, b) {
    const ctx = document.getElementById("result-chart").getContext("2d");
    const xValues = Array.from({ length: 50 }, (_, i) => mu - 3 * sigma + (6 * sigma * i / 49));
    const yValues = xValues.map(x => (1 / (sigma * Math.sqrt(2 * Math.PI))) * Math.exp(-0.5 * ((x - mu) / sigma) ** 2));
    if (chart) chart.destroy();
    chart = new Chart(ctx, {
        type: "line",
        data: {
            labels: xValues,
            datasets: [{ label: "Normal", data: yValues, borderColor: "rgba(102, 126, 234, 1)", fill: false, tension: 0.4 }]
        },
        options: { scales: { y: { beginAtZero: true } } }
    });
}

export function drawExponentialChart(lambda, x) {
    const ctx = document.getElementById("result-chart").getContext("2d");
    const xValues = Array.from({ length: 50 }, (_, i) => i * (x * 2) / 49);
    const yValues = xValues.map(t => lambda * Math.exp(-lambda * t));
    if (chart) chart.destroy();
    chart = new Chart(ctx, {
        type: "line",
        data: {
            labels: xValues,
            datasets: [{ label: "Exponential", data: yValues, borderColor: "rgba(102, 126, 234, 1)", fill: false, tension: 0.4 }]
        },
        options: { scales: { y: { beginAtZero: true } } }
    });
}

export function drawZScoreChart(z) {
    const ctx = document.getElementById("result-chart").getContext("2d");
    if (chart) chart.destroy();
    chart = new Chart(ctx, {
        type: "bar",
        data: {
            labels: ["Z-Score"],
            datasets: [{ label: "Z-Score", data: [z], backgroundColor: "rgba(102, 126, 234, 0.7)", borderColor: "rgba(102, 126, 234, 1)", borderWidth: 1 }]
        },
        options: { scales: { y: { beginAtZero: false } } }
    });
}

export function drawBoxPlot(data) {
    const ctx = document.getElementById("result-chart").getContext("2d");
    const sorted = [...data].sort((a, b) => a - b).filter(x => !isNaN(x));
    if (sorted.length === 0) return;
    const q1 = sorted[Math.floor(sorted.length / 4)];
    const median = sorted[Math.floor(sorted.length / 2)];
    const q3 = sorted[Math.floor(3 * sorted.length / 4)];
    if (chart) chart.destroy();
    chart = new Chart(ctx, {
        type: "bar",
        data: {
            labels: ["Q1", "Median", "Q3"],
            datasets: [{ label: "Box Plot", data: [q1, median, q3], backgroundColor: "rgba(102, 126, 234, 0.7)" }]
        },
        options: { scales: { y: { beginAtZero: false } } }
    });
}

export function drawScatterPlot(x, y, fit) {
    const ctx = document.getElementById("result-chart").getContext("2d");
    if (chart) chart.destroy();
    chart = new Chart(ctx, {
        type: "scatter",
        data: {
            datasets: [
                { label: "Data", data: x.map((xi, i) => ({ x: xi, y: y[i] })), backgroundColor: "rgba(102, 126, 234, 0.7)" },
                { label: "Fit", type: "line", data: x.map((xi, i) => ({ x: xi, y: fit[i] })), borderColor: "red", fill: false }
            ]
        },
        options: { scales: { x: { type: "linear" }, y: { beginAtZero: false } } }
    });
}

export function drawHeatmap(matrix, labels, matrixType) {
    const ctx = document.getElementById("result-chart").getContext("2d");
    const data = [];
    for (let i = 0; i < matrix.length; i++) {
        for (let j = 0; j < matrix[i].length; j++) {
            data.push({ x: labels[j], y: labels[i], v: matrix[i][j] });
        }
    }
    const minVal = Math.min(...matrix.flat().filter(v => !isNaN(v)));
    const maxVal = Math.max(...matrix.flat().filter(v => !isNaN(v)));
    if (chart) chart.destroy();
    chart = new Chart(ctx, {
        type: "matrix",
        data: {
            datasets: [{
                label: `${matrixType.charAt(0).toUpperCase() + matrixType.slice(1)} Heatmap`,
                data: data,
                backgroundColor: c => {
                    const v = c.raw.v;
                    if (isNaN(v)) return "rgba(128, 128, 128, 0.7)";
                    const range = maxVal - minVal;
                    if (range === 0) return "rgba(102, 126, 234, 0.7)";
                    const normalized = (v - minVal) / range;
                    if (normalized < 0.2) return "rgba(255, 0, 0, 0.7)";
                    if (normalized < 0.4) return "rgba(255, 153, 153, 0.7)";
                    if (normalized < 0.6) return "rgba(255, 255, 255, 0.7)";
                    if (normalized < 0.8) return "rgba(153, 204, 255, 0.7)";
                    return "rgba(0, 102, 204, 0.7)";
                },
                borderColor: "rgba(0, 0, 0, 0.1)",
                borderWidth: 1,
                width: ({ chart }) => (chart.chartArea || {}).width / matrix[0].length - 1,
                height: ({ chart }) => (chart.chartArea || {}).height / matrix.length - 1
            }]
        },
        options: {
            scales: {
                x: { type: "category", labels: labels, title: { display: true, text: matrixType === "distance" ? "Rows" : "Variables" } },
                y: { type: "category", labels: labels, title: { display: true, text: matrixType === "distance" ? "Rows" : "Variables" } }
            },
            plugins: {
                legend: { display: false },
                tooltip: {
                    callbacks: {
                        label: ctx => `${matrixType === "raw" ? "Value" : matrixType.charAt(0).toUpperCase() + matrixType.slice(1)}: ${isNaN(ctx.raw.v) ? "NaN" : ctx.raw.v.toFixed(2)}`
                    }
                }
            }
        }
    });
}