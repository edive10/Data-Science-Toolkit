let chart;
let uploadedData = [];
let cleaningLog = [];

function updateInputs() {
    const tool = document.getElementById("tool").value;
    const inputFields = document.getElementById("input-fields");
    const dataInput = document.getElementById("data-input");
    inputFields.innerHTML = "";
    dataInput.style.display = "none";

    if (tool === "binomial") {
        inputFields.innerHTML = `
            <input type="number" id="n" placeholder="n (trials)" min="1">
            <input type="number" id="k" placeholder="k (successes)" min="0">
            <input type="number" id="p" placeholder="p (0-1)" min="0" max="1" step="0.01">
        `;
    } else if (tool === "poisson") {
        inputFields.innerHTML = `
            <input type="number" id="lambda" placeholder="λ (rate)" min="0" step="0.1">
            <input type="number" id="k" placeholder="k (events)" min="0">
        `;
    } else if (tool === "normal") {
        inputFields.innerHTML = `
            <input type="number" id="mu" placeholder="μ (mean)">
            <input type="number" id="sigma" placeholder="σ (std dev)" min="0" step="0.1">
            <input type="number" id="a" placeholder="a (lower)">
            <input type="number" id="b" placeholder="b (upper)">
        `;
    } else if (tool === "exponential") {
        inputFields.innerHTML = `
            <input type="number" id="lambda" placeholder="λ (rate)" min="0" step="0.1">
            <input type="number" id="x" placeholder="x (time)" min="0" step="0.1">
        `;
    } else if (tool === "zscore") {
        inputFields.innerHTML = `
            <input type="number" id="x" placeholder="x (value)">
            <input type="number" id="mu" placeholder="μ (mean)">
            <input type="number" id="sigma" placeholder="σ (std dev)" min="0" step="0.1">
        `;
    } else if (tool === "descriptive" || tool === "confidence" || tool === "ttest" || tool === "regression" || tool === "heatmap" || tool === "categorical" || tool === "discrete") {
        dataInput.style.display = "block";
        if (tool === "confidence") {
            inputFields.innerHTML = `<input type="number" id="conf-level" placeholder="Confidence Level (e.g., 95)" min="0" max="100" step="1">`;
        } else if (tool === "ttest") {
            inputFields.innerHTML = `<input type="number" id="mu0" placeholder="Hypothesized Mean (μ0)">`;
        } else if (tool === "heatmap") {
            inputFields.innerHTML = `
                <label for="matrix-type">Matrix Type:</label>
                <select id="matrix-type">
                    <option value="correlation">Correlation</option>
                    <option value="covariance">Covariance</option>
                    <option value="distance">Euclidean Distance</option>
                    <option value="raw">Raw Data</option>
                </select>
            `;
        }
    } else if (tool === "bayes") {
        inputFields.innerHTML = `
            <input type="number" id="pba" placeholder="P(B|A) (0-1)" min="0" max="1" step="0.01">
            <input type="number" id="pa" placeholder="P(A) (0-1)" min="0" max="1" step="0.01">
            <input type="number" id="pb" placeholder="P(B) (0-1)" min="0" max="1" step="0.01">
        `;
    } else if (tool === "binary") {
        inputFields.innerHTML = `
            <input type="number" id="p" placeholder="P(Success) (0-1)" min="0" max="1" step="0.01">
        `;
    }
}

function handleExcelUpload(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function(e) {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: "array" });
        const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
        const jsonData = XLSX.utils.sheet_to_json(firstSheet, { header: 1 });
        uploadedData = jsonData.map(row => row.map(val => (val === "" || val === null || isNaN(parseFloat(val)) ? NaN : parseFloat(val))));
        document.getElementById("dataset").value = uploadedData.map(row => row.join(",")).join(";");
    };
    reader.readAsArrayBuffer(file);
}

function updateProgress(percentage, message) {
    const progressFill = document.getElementById("progress-fill");
    const progressMessage = document.getElementById("progress-message");
    progressFill.style.width = `${percentage}%`;
    progressMessage.innerText = message;
}

function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

function cleanData(data, method) {
    cleaningLog = [];
    let cleanedData = JSON.parse(JSON.stringify(data));
    const numCols = Math.max(...cleanedData.map(row => row.length));

    cleanedData = cleanedData.map(row => {
        while (row.length < numCols) row.push(NaN);
        return row.slice(0, numCols);
    });

    if (method === "drop") {
        const originalRows = cleanedData.length;
        cleanedData = cleanedData.filter(row => row.every(val => !isNaN(val)));
        if (cleanedData.length < originalRows) {
            cleaningLog.push(`Dropped ${originalRows - cleanedData.length} rows with non-numeric or missing values.`);
        }
    } else {
        const colMeans = Array(numCols).fill(0).map((_, j) => {
            const validVals = cleanedData.map(row => row[j]).filter(v => !isNaN(v));
            return validVals.length > 0 ? validVals.reduce((a, b) => a + b, 0) / validVals.length : 0;
        });

        let nanCount = 0;
        cleanedData = cleanedData.map((row, i) => {
            return row.map((val, j) => {
                if (isNaN(val)) {
                    nanCount++;
                    if (method === "mean") return colMeans[j];
                    if (method === "zero") return 0;
                }
                return val;
            });
        });
        if (nanCount > 0) {
            cleaningLog.push(`Replaced ${nanCount} non-numeric or missing values with ${method === "mean" ? "column means" : "zeros"}.`);
        }
    }

    return cleanedData.length > 0 && cleanedData[0].length > 0 ? cleanedData : [];
}

async function calculate() {
    const tool = document.getElementById("tool").value;
    const calcBtn = document.getElementById("calc-btn");
    const progressBar = document.getElementById("progress");
    const resultText = document.getElementById("result-text");
    const analysisText = document.getElementById("analysis-text");

    calcBtn.disabled = true;
    progressBar.style.display = "block";
    updateProgress(0, "Initializing...");

    let result = "";
    let analysis = "";

    if (tool === "binomial") {
        await delay(200);
        updateProgress(20, "Parsing inputs...");
        const n = parseInt(document.getElementById("n").value);
        const k = parseInt(document.getElementById("k").value);
        const p = parseFloat(document.getElementById("p").value);
        if (n && k >= 0 && p >= 0 && p <= 1) {
            await delay(300);
            updateProgress(50, "Computing probability...");
            const prob = binomialProb(n, k, p);
            result = `Probability: ${prob.toFixed(4)}`;
            analysis = `This is the probability of exactly ${k} successes in ${n} trials, each with a ${p*100}% chance of success. Expected successes: ${(n*p).toFixed(1)}.`;
            await delay(300);
            updateProgress(80, "Rendering chart...");
            drawBarChart("Binomial", Array.from({length: n+1}, (_, i) => i), Array.from({length: n+1}, (_, i) => binomialProb(n, i, p)));
        } else {
            result = "Invalid input";
            analysis = "Enter: n ≥ 1, k ≥ 0, 0 ≤ p ≤ 1.";
        }
    } else if (tool === "poisson") {
        await delay(200);
        updateProgress(20, "Parsing inputs...");
        const lambda = parseFloat(document.getElementById("lambda").value);
        const k = parseInt(document.getElementById("k").value);
        if (lambda >= 0 && k >= 0) {
            await delay(300);
            updateProgress(50, "Computing probability...");
            const prob = poissonProb(lambda, k);
            result = `Probability: ${prob.toFixed(4)}`;
            analysis = `Chance of ${k} events with an average rate of ${lambda}. Useful for rare events like customer arrivals.`;
            await delay(300);
            updateProgress(80, "Rendering chart...");
            drawBarChart("Poisson", Array.from({length: 10}, (_, i) => i), Array.from({length: 10}, (_, i) => poissonProb(lambda, i)));
        } else {
            result = "Invalid input";
            analysis = "Enter: λ ≥ 0, k ≥ 0.";
        }
    } else if (tool === "normal") {
        await delay(200);
        updateProgress(20, "Parsing inputs...");
        const mu = parseFloat(document.getElementById("mu").value);
        const sigma = parseFloat(document.getElementById("sigma").value);
        const a = parseFloat(document.getElementById("a").value);
        const b = parseFloat(document.getElementById("b").value);
        if (sigma > 0 && !isNaN(mu) && !isNaN(a) && !isNaN(b)) {
            await delay(300);
            updateProgress(50, "Computing probability...");
            const prob = normalProb(mu, sigma, a, b);
            result = `Probability: ${prob.toFixed(4)}`;
            analysis = `Probability of a value between ${a} and ${b} (mean ${mu}, std dev ${sigma}). Spans ${(b-a)/sigma.toFixed(1)} std devs.`;
            await delay(300);
            updateProgress(80, "Rendering chart...");
            drawNormalChart(mu, sigma, a, b);
        } else {
            result = "Invalid input";
            analysis = "Enter: σ > 0, all fields numeric.";
        }
    } else if (tool === "exponential") {
        await delay(200);
        updateProgress(20, "Parsing inputs...");
        const lambda = parseFloat(document.getElementById("lambda").value);
        const x = parseFloat(document.getElementById("x").value);
        if (lambda > 0 && x >= 0) {
            await delay(300);
            updateProgress(50, "Computing probability...");
            const prob = exponentialProb(lambda, x);
            result = `Probability: ${prob.toFixed(4)}`;
            analysis = `Chance of an event within ${x} time units (rate ${lambda}). Mean wait time: ${(1/lambda).toFixed(2)}.`;
            await delay(300);
            updateProgress(80, "Rendering chart...");
            drawExponentialChart(lambda, x);
        } else {
            result = "Invalid input";
            analysis = "Enter: λ > 0, x ≥ 0.";
        }
    } else if (tool === "zscore") {
        await delay(200);
        updateProgress(20, "Parsing inputs...");
        const x = parseFloat(document.getElementById("x").value);
        const mu = parseFloat(document.getElementById("mu").value);
        const sigma = parseFloat(document.getElementById("sigma").value);
        if (!isNaN(x) && !isNaN(mu) && sigma > 0) {
            await delay(300);
            updateProgress(50, "Computing Z-Score...");
            const z = calculateZScore(x, mu, sigma);
            result = `Z-Score: ${z.toFixed(4)}`;
            analysis = `Z-Score of ${z.toFixed(4)} is ${Math.abs(z).toFixed(1)} std devs ${z > 0 ? 'above' : 'below'} the mean (${mu}).`;
            await delay(300);
            updateProgress(80, "Rendering chart...");
            drawZScoreChart(z);
        } else {
            result = "Invalid input";
            analysis = "Enter: σ > 0, all fields numeric.";
        }
    } else if (tool === "descriptive") {
        await delay(200);
        updateProgress(20, "Parsing data...");
        let data = uploadedData.length > 0 ? uploadedData : parseMultiDataset(document.getElementById("dataset").value);
        const cleanMethod = document.getElementById("clean-method").value;
        await delay(200);
        updateProgress(30, "Cleaning data...");
        data = cleanData(data, cleanMethod);
        if (data.length > 0) {
            await delay(300);
            updateProgress(50, "Computing statistics...");
            const stats = descriptiveStats(data[0]);
            result = `Mean: ${stats.mean.toFixed(2)}, Median: ${stats.median.toFixed(2)}, Std Dev: ${stats.stdDev.toFixed(2)}`;
            analysis = `Dataset of ${data.length} values. Variance: ${stats.variance.toFixed(2)}. Skewness: ${stats.skewness.toFixed(2)}. ${cleaningLog.join(" ")}`;
            await delay(300);
            updateProgress(80, "Rendering chart...");
            drawBoxPlot(data[0]);
        } else {
            result = "Invalid data";
            analysis = "After cleaning, no valid data remains. Check input and cleaning method.";
        }
    } else if (tool === "confidence") {
        await delay(200);
        updateProgress(20, "Parsing data...");
        let data = uploadedData.length > 0 ? uploadedData : parseMultiDataset(document.getElementById("dataset").value);
        const cleanMethod = document.getElementById("clean-method").value;
        const confLevel = parseFloat(document.getElementById("conf-level").value);
        await delay(200);
        updateProgress(30, "Cleaning data...");
        data = cleanData(data, cleanMethod);
        if (data.length > 1 && confLevel > 0 && confLevel < 100) {
            await delay(300);
            updateProgress(50, "Computing confidence interval...");
            const ci = confidenceInterval(data[0], confLevel / 100);
            result = `${confLevel}% CI: [${ci.lower.toFixed(2)}, ${ci.upper.toFixed(2)}]`;
            analysis = `With ${confLevel}% confidence, the true mean lies between ${ci.lower.toFixed(2)} and ${ci.upper.toFixed(2)}. Sample mean: ${ci.mean.toFixed(2)}. ${cleaningLog.join(" ")}`;
            await delay(300);
            updateProgress(80, "Rendering chart...");
            drawBarChart("Confidence Interval", ["Lower", "Mean", "Upper"], [ci.lower, ci.mean, ci.upper]);
        } else {
            result = "Invalid input";
            analysis = "Enter data and a confidence level (0-100). Check if cleaning removed all data.";
        }
    } else if (tool === "ttest") {
        await delay(200);
        updateProgress(20, "Parsing data...");
        let data = uploadedData.length > 0 ? uploadedData : parseMultiDataset(document.getElementById("dataset").value);
        const cleanMethod = document.getElementById("clean-method").value;
        const mu0 = parseFloat(document.getElementById("mu0").value);
        await delay(200);
        updateProgress(30, "Cleaning data...");
        data = cleanData(data, cleanMethod);
        if (data.length > 1 && !isNaN(mu0)) {
            await delay(300);
            updateProgress(50, "Computing T-Test...");
            const tResult = tTest(data[0], mu0);
            result = `T-Statistic: ${tResult.t.toFixed(4)}, P-Value: ${tResult.p.toFixed(4)}`;
            analysis = `Tests if sample mean differs from ${mu0}. P < 0.05 suggests a significant difference. ${cleaningLog.join(" ")}`;
            await delay(300);
            updateProgress(80, "Rendering chart...");
            drawBarChart("T-Test", ["T-Statistic"], [tResult.t]);
        } else {
            result = "Invalid input";
            analysis = "Enter data and a hypothesized mean. Check if cleaning removed all data.";
        }
    } else if (tool === "regression") {
        await delay(200);
        updateProgress(20, "Parsing data...");
        let data = uploadedData.length > 0 ? uploadedData : parseMultiDataset(document.getElementById("dataset").value);
        const cleanMethod = document.getElementById("clean-method").value;
        await delay(200);
        updateProgress(30, "Cleaning data...");
        data = cleanData(data, cleanMethod);
        if (data.length > 1) {
            await delay(300);
            updateProgress(50, "Computing regression...");
            const reg = linearRegression(data[0]);
            result = `Slope: ${reg.slope.toFixed(4)}, Intercept: ${reg.intercept.toFixed(4)}, R²: ${reg.r2.toFixed(4)}`;
            analysis = `Predicts y = ${reg.slope.toFixed(2)}x + ${reg.intercept.toFixed(2)}. R² shows fit quality (1 is perfect). ${cleaningLog.join(" ")}`;
            await delay(300);
            updateProgress(80, "Rendering chart...");
            drawScatterPlot(reg.x, reg.y, reg.fit);
        } else {
            result = "Invalid input";
            analysis = "Enter paired data (e.g., '1,2; 3,4') or upload an Excel file. Check if cleaning removed all data.";
        }
    } else if (tool === "heatmap") {
        await delay(200);
        updateProgress(20, "Parsing data...");
        let data = uploadedData.length > 0 ? uploadedData : parseMultiDataset(document.getElementById("dataset").value);
        const cleanMethod = document.getElementById("clean-method").value;
        const matrixType = document.getElementById("matrix-type").value;
        await delay(200);
        updateProgress(30, "Cleaning data...");
        data = cleanData(data, cleanMethod);
        if (data.length > 1 && data[0].length > 0) {
            await delay(300);
            updateProgress(50, `Computing ${matrixType} matrix...`);
            let matrix;
            let labels;
            if (matrixType === "correlation") {
                matrix = correlationMatrix(data);
                labels = Array(data[0].length).fill(0).map((_, i) => `Var${i+1}`);
                result = "Correlation Heatmap Generated";
                analysis = `Shows correlations between ${data[0].length} variables. Values range from -1 (negative) to 1 (positive). ${cleaningLog.join(" ")}`;
            } else if (matrixType === "covariance") {
                matrix = covarianceMatrix(data);
                labels = Array(data[0].length).fill(0).map((_, i) => `Var${i+1}`);
                result = "Covariance Heatmap Generated";
                analysis = `Shows covariances between ${data[0].length} variables. Positive values indicate variables move together; negative, opposite. ${cleaningLog.join(" ")}`;
            } else if (matrixType === "distance") {
                matrix = distanceMatrix(data);
                labels = Array(data.length).fill(0).map((_, i) => `Row${i+1}`);
                result = "Distance Heatmap Generated";
                analysis = `Shows Euclidean distances between ${data.length} rows. Larger values indicate greater dissimilarity. ${cleaningLog.join(" ")}`;
            } else if (matrixType === "raw") {
                matrix = data;
                labels = Array(data[0].length).fill(0).map((_, i) => `Col${i+1}`);
                result = "Raw Data Heatmap Generated";
                analysis = `Visualizes raw values across ${data.length} rows and ${data[0].length} columns. Intensity reflects magnitude. ${cleaningLog.join(" ")}`;
            }
            await delay(300);
            updateProgress(80, "Rendering heatmap...");
            drawHeatmap(matrix, labels, matrixType);
        } else {
            result = "Invalid input";
            analysis = "After cleaning, no valid data remains. Check input and cleaning method.";
        }
    } else if (tool === "bayes") {
        await delay(200);
        updateProgress(20, "Parsing inputs...");
        const pba = parseFloat(document.getElementById("pba").value);
        const pa = parseFloat(document.getElementById("pa").value);
        const pb = parseFloat(document.getElementById("pb").value);
        if (pba >= 0 && pba <= 1 && pa >= 0 && pa <= 1 && pb > 0 && pb <= 1) {
            await delay(300);
            updateProgress(50, "Computing Bayes' Theorem...");
            const pab = (pba * pa) / pb;
            result = `P(A|B): ${pab.toFixed(4)}`;
            analysis = `Probability of A given B is ${pab.toFixed(4)}, using P(B|A)=${pba}, P(A)=${pa}, P(B)=${pb}.`;
            await delay(300);
            updateProgress(80, "Rendering chart...");
            drawBarChart("Bayes' Theorem", ["P(A|B)"], [pab]);
        } else {
            result = "Invalid input";
            analysis = "Enter: 0 ≤ P(B|A), P(A), P(B) ≤ 1, P(B) > 0.";
        }
    } else if (tool === "categorical") {
        await delay(200);
        updateProgress(20, "Parsing data...");
        let data = uploadedData.length > 0 ? uploadedData[0] : parseMultiDataset(document.getElementById("dataset").value)[0];
        const cleanMethod = document.getElementById("clean-method").value;
        await delay(200);
        updateProgress(30, "Cleaning data...");
        data = cleanData([data], cleanMethod)[0];
        const total = data.reduce((a, b) => a + b, 0);
        if (data.length > 1 && total > 0) {
            await delay(300);
            updateProgress(50, "Computing probabilities...");
            const probs = data.map(p => p / total);
            result = `Probabilities: ${probs.map(p => p.toFixed(4)).join(", ")}`;
            analysis = `Normalized probabilities for ${data.length} categories. Sum: ${probs.reduce((a, b) => a + b, 0).toFixed(4)}. ${cleaningLog.join(" ")}`;
            await delay(300);
            updateProgress(80, "Rendering chart...");
            drawBarChart("Categorical Probability", Array.from({length: data.length}, (_, i) => `Cat${i+1}`), probs);
        } else {
            result = "Invalid input";
            analysis = "Enter probabilities or counts (e.g., '0.3,0.4,0.3') summing to > 0.";
        }
    } else if (tool === "binary") {
        await delay(200);
        updateProgress(20, "Parsing inputs...");
        const p = parseFloat(document.getElementById("p").value);
        if (p >= 0 && p <= 1) {
            await delay(300);
            updateProgress(50, "Computing probabilities...");
            const q = 1 - p;
            result = `P(Success): ${p.toFixed(4)}, P(Failure): ${q.toFixed(4)}`;
            analysis = `Binary outcome with ${p*100}% chance of success and ${q*100}% chance of failure.`;
            await delay(300);
            updateProgress(80, "Rendering chart...");
            drawBarChart("Binary Probability", ["Success", "Failure"], [p, q]);
        } else {
            result = "Invalid input";
            analysis = "Enter: 0 ≤ P(Success) ≤ 1.";
        }
    } else if (tool === "discrete") {
        await delay(200);
        updateProgress(20, "Parsing data...");
        let data = uploadedData.length > 0 ? uploadedData[0] : parseMultiDataset(document.getElementById("dataset").value)[0];
        const cleanMethod = document.getElementById("clean-method").value;
        await delay(200);
        updateProgress(30, "Cleaning data...");
        data = cleanData([data], cleanMethod)[0];
        const total = data.reduce((a, b) => a + b, 0);
        if (data.length > 1 && total > 0 && data.every(p => p >= 0)) {
            await delay(300);
            updateProgress(50, "Computing probabilities...");
            const probs = data.map(p => p / total);
            result = `Probabilities: ${probs.map(p => p.toFixed(4)).join(", ")}`;
            analysis = `Discrete distribution over ${data.length} outcomes. Sum: ${probs.reduce((a, b) => a + b, 0).toFixed(4)}. ${cleaningLog.join(" ")}`;
            await delay(300);
            updateProgress(80, "Rendering chart...");
            drawBarChart("Discrete Probability", Array.from({length: data.length}, (_, i) => `${i}`), probs);
        } else {
            result = "Invalid input";
            analysis = "Enter non-negative probabilities or counts (e.g., '1,2,3') summing to > 0.";
        }
    }

    await delay(200);
    updateProgress(100, "Finalizing...");
    resultText.innerText = result;
    analysisText.innerText = analysis;
    await delay(200);
    progressBar.style.display = "none";
    updateProgress(0, "Ready to calculate...");
    calcBtn.disabled = false;
}

// Probability Functions
function binomialProb(n, k, p) {
    const coeff = factorial(n) / (factorial(k) * factorial(n - k));
    return coeff * Math.pow(p, k) * Math.pow(1 - p, n - k);
}

function poissonProb(lambda, k) {
    return (Math.pow(lambda, k) * Math.exp(-lambda)) / factorial(k);
}

function normalProb(mu, sigma, a, b) {
    const z1 = (a - mu) / sigma;
    const z2 = (b - mu) / sigma;
    return 0.5 * (erf(z2 / Math.sqrt(2)) - erf(z1 / Math.sqrt(2)));
}

function exponentialProb(lambda, x) {
    return 1 - Math.exp(-lambda * x);
}

function calculateZScore(x, mu, sigma) {
    return (x - mu) / sigma;
}

// Statistical Functions
function parseMultiDataset(input) {
    return input.split(";").map(row => row.split(",").map(x => {
        const trimmed = x.trim();
        return (trimmed === "" || isNaN(parseFloat(trimmed))) ? NaN : parseFloat(trimmed);
    }));
}

function descriptiveStats(data) {
    const validData = data.filter(x => !isNaN(x));
    if (validData.length === 0) return { mean: 0, median: 0, variance: 0, stdDev: 0, skewness: 0 };
    const n = validData.length;
    const mean = validData.reduce((a, b) => a + b, 0) / n;
    const sorted = [...validData].sort((a, b) => a - b);
    const median = n % 2 === 0 ? (sorted[n/2 - 1] + sorted[n/2]) / 2 : sorted[Math.floor(n/2)];
    const variance = validData.reduce((a, b) => a + (b - mean)**2, 0) / (n - 1);
    const stdDev = Math.sqrt(variance);
    const skewness = validData.reduce((a, b) => a + ((b - mean)/stdDev)**3, 0) / n;
    return { mean, median, variance, stdDev, skewness };
}

function confidenceInterval(data, confLevel) {
    const validData = data.filter(x => !isNaN(x));
    if (validData.length < 2) return { lower: 0, upper: 0, mean: 0 };
    const n = validData.length;
    const mean = validData.reduce((a, b) => a + b, 0) / n;
    const stdDev = Math.sqrt(validData.reduce((a, b) => a + (b - mean)**2, 0) / (n - 1));
    const z = confLevel < 0.95 ? 1.645 : confLevel < 0.99 ? 1.96 : 2.576;
    const margin = z * stdDev / Math.sqrt(n);
    return { lower: mean - margin, upper: mean + margin, mean };
}

function tTest(data, mu0) {
    const validData = data.filter(x => !isNaN(x));
    if (validData.length < 2) return { t: 0, p: 1 };
    const n = validData.length;
    const mean = validData.reduce((a, b) => a + b, 0) / n;
    const stdDev = Math.sqrt(validData.reduce((a, b) => a + (b - mean)**2, 0) / (n - 1));
    const t = (mean - mu0) / (stdDev / Math.sqrt(n));
    const p = 2 * (1 - tDistCDF(Math.abs(t), n - 1));
    return { t, p };
}

function linearRegression(data) {
    const validData = data.filter(x => !isNaN(x));
    if (validData.length < 2) return { slope: 0, intercept: 0, r2: 0, x: [], y: [], fit: [] };
    const n = validData.length;
    const x = Array.from({length: n}, (_, i) => i + 1);
    const y = validData;
    const xMean = x.reduce((a, b) => a + b, 0) / n;
    const yMean = y.reduce((a, b) => a + b, 0) / n;
    const slope = x.reduce((a, b, i) => a + (b - xMean) * (y[i] - yMean), 0) / x.reduce((a, b) => a + (b - xMean)**2, 0);
    const intercept = yMean - slope * xMean;
    const fit = x.map(xi => slope * xi + intercept);
    const ssTot = y.reduce((a, b) => a + (b - yMean)**2, 0);
    const ssRes = y.reduce((a, b, i) => a + (b - fit[i])**2, 0);
    const r2 = 1 - ssRes / ssTot;
    return { slope, intercept, r2, x, y, fit };
}

function correlationMatrix(data) {
    const n = data.length;
    const m = data[0].length;
    const means = Array(m).fill(0).map((_, j) => {
        const valid = data.map(row => row[j]).filter(v => !isNaN(v));
        return valid.length > 0 ? valid.reduce((a, b) => a + b, 0) / valid.length : 0;
    });
    const stdDevs = Array(m).fill(0).map((_, j) => {
        const mean = means[j];
        const valid = data.map(row => row[j]).filter(v => !isNaN(v));
        return valid.length > 1 ? Math.sqrt(valid.reduce((a, v) => a + (v - mean)**2, 0) / (valid.length - 1)) : 0;
    });
    const matrix = Array(m).fill(0).map(() => Array(m).fill(0));
    for (let i = 0; i < m; i++) {
        for (let j = 0; j < m; j++) {
            const validPairs = data.map(row => [row[i], row[j]]).filter(pair => !isNaN(pair[0]) && !isNaN(pair[1]));
            if (validPairs.length < 2 || stdDevs[i] === 0 || stdDevs[j] === 0) {
                matrix[i][j] = i === j ? 1 : 0;
            } else {
                const cov = validPairs.reduce((a, pair) => a + (pair[0] - means[i]) * (pair[1] - means[j]), 0) / (validPairs.length - 1);
                matrix[i][j] = cov / (stdDevs[i] * stdDevs[j]);
            }
        }
    }
    return matrix;
}

function covarianceMatrix(data) {
    const n = data.length;
    const m = data[0].length;
    const means = Array(m).fill(0).map((_, j) => {
        const valid = data.map(row => row[j]).filter(v => !isNaN(v));
        return valid.length > 0 ? valid.reduce((a, b) => a + b, 0) / valid.length : 0;
    });
    const matrix = Array(m).fill(0).map(() => Array(m).fill(0));
    for (let i = 0; i < m; i++) {
        for (let j = 0; j < m; j++) {
            const validPairs = data.map(row => [row[i], row[j]]).filter(pair => !isNaN(pair[0]) && !isNaN(pair[1]));
            matrix[i][j] = validPairs.length > 1 ? validPairs.reduce((a, pair) => a + (pair[0] - means[i]) * (pair[1] - means[j]), 0) / (validPairs.length - 1) : 0;
        }
    }
    return matrix;
}

function distanceMatrix(data) {
    const n = data.length;
    const matrix = Array(n).fill(0).map(() => Array(n).fill(0));
    for (let i = 0; i < n; i++) {
        for (let j = 0; j < n; j++) {
            const validPairs = data[i].map((val, k) => [val, data[j][k]]).filter(pair => !isNaN(pair[0]) && !isNaN(pair[1]));
            matrix[i][j] = validPairs.length > 0 ? Math.sqrt(validPairs.reduce((a, pair) => a + (pair[0] - pair[1])**2, 0)) : 0;
        }
    }
    return matrix;
}

// Helper Functions
function factorial(n) {
    if (n <= 1) return 1;
    return n * factorial(n - 1);
}

function erf(x) {
    const a1 = 0.254829592, a2 = -0.284496736, a3 = 1.421413741, a4 = -1.453152027, a5 = 1.061405429;
    const p = 0.3275911;
    const t = 1 / (1 + p * Math.abs(x));
    const y = 1 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.exp(-x * x);
    return x >= 0 ? y : -y;
}

function tDistCDF(t, df) {
    return t > 1.5 ? 0.9 : t > 1 ? 0.85 : 0.5; // Simplified
}

// Chart Functions
function drawBarChart(title, labels, data) {
    if (chart) chart.destroy();
    const ctx = document.getElementById("result-chart").getContext("2d");
    chart = new Chart(ctx, {
        type: "bar",
        data: {
            labels: labels,
            datasets: [{ label: title, data: data, backgroundColor: "rgba(102, 126, 234, 0.7)", borderColor: "rgba(102, 126, 234, 1)", borderWidth: 1 }]
        },
        options: { scales: { y: { beginAtZero: true, max: 1 } } }
    });
}

function drawNormalChart(mu, sigma, a, b) {
    if (chart) chart.destroy();
    const ctx = document.getElementById("result-chart").getContext("2d");
    const xValues = Array.from({length: 50}, (_, i) => mu - 3*sigma + (6*sigma * i / 49));
    const yValues = xValues.map(x => (1/(sigma * Math.sqrt(2*Math.PI))) * Math.exp(-0.5 * ((x - mu)/sigma)**2));
    chart = new Chart(ctx, {
        type: "line",
        data: {
            labels: xValues,
            datasets: [{ label: "Normal", data: yValues, borderColor: "rgba(102, 126, 234, 1)", fill: false, tension: 0.4 }]
        },
        options: { scales: { y: { beginAtZero: true } } }
    });
}

function drawExponentialChart(lambda, x) {
    if (chart) chart.destroy();
    const ctx = document.getElementById("result-chart").getContext("2d");
    const xValues = Array.from({length: 50}, (_, i) => i * (x * 2) / 49);
    const yValues = xValues.map(t => lambda * Math.exp(-lambda * t));
    chart = new Chart(ctx, {
        type: "line",
        data: {
            labels: xValues,
            datasets: [{ label: "Exponential", data: yValues, borderColor: "rgba(102, 126, 234, 1)", fill: false, tension: 0.4 }]
        },
        options: { scales: { y: { beginAtZero: true } } }
    });
}

function drawZScoreChart(z) {
    if (chart) chart.destroy();
    const ctx = document.getElementById("result-chart").getContext("2d");
    chart = new Chart(ctx, {
        type: "bar",
        data: {
            labels: ["Z-Score"],
            datasets: [{ label: "Z-Score", data: [z], backgroundColor: "rgba(102, 126, 234, 0.7)", borderColor: "rgba(102, 126, 234, 1)", borderWidth: 1 }]
        },
        options: { scales: { y: { beginAtZero: false } } }
    });
}

function drawBoxPlot(data) {
    if (chart) chart.destroy();
    const ctx = document.getElementById("result-chart").getContext("2d");
    const sorted = [...data].sort((a, b) => a - b).filter(x => !isNaN(x));
    if (sorted.length === 0) return;
    const q1 = sorted[Math.floor(sorted.length / 4)];
    const median = sorted[Math.floor(sorted.length / 2)];
    const q3 = sorted[Math.floor(3 * sorted.length / 4)];
    chart = new Chart(ctx, {
        type: "bar",
        data: {
            labels: ["Q1", "Median", "Q3"],
            datasets: [{ label: "Box Plot", data: [q1, median, q3], backgroundColor: "rgba(102, 126, 234, 0.7)" }]
        },
        options: { scales: { y: { beginAtZero: false } } }
    });
}

function drawScatterPlot(x, y, fit) {
    if (chart) chart.destroy();
    const ctx = document.getElementById("result-chart").getContext("2d");
    chart = new Chart(ctx, {
        type: "scatter",
        data: {
            datasets: [
                { label: "Data", data: x.map((xi, i) => ({x: xi, y: y[i]})), backgroundColor: "rgba(102, 126, 234, 0.7)" },
                { label: "Fit", type: "line", data: x.map((xi, i) => ({x: xi, y: fit[i]})), borderColor: "red", fill: false }
            ]
        },
        options: { scales: { x: { type: "linear" }, y: { beginAtZero: false } } }
    });
}

function drawHeatmap(matrix, labels, matrixType) {
    if (chart) chart.destroy();
    const ctx = document.getElementById("result-chart").getContext("2d");
    const data = [];
    for (let i = 0; i < matrix.length; i++) {
        for (let j = 0; j < matrix[i].length; j++) {
            data.push({ x: labels[j], y: labels[i], v: matrix[i][j] });
        }
    }
    const minVal = Math.min(...matrix.flat().filter(v => !isNaN(v)));
    const maxVal = Math.max(...matrix.flat().filter(v => !isNaN(v)));
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
                width: ({chart}) => (chart.chartArea || {}).width / matrix[0].length - 1,
                height: ({chart}) => (chart.chartArea || {}).height / matrix.length - 1
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

// Initialize
updateInputs();