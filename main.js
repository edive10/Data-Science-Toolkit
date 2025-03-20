import { updateInputs, handleExcelUpload } from './ui.js';
import { processTool } from './calculator.js';
import { drawBarChart, drawNormalChart, drawExponentialChart, drawZScoreChart, drawBoxPlot, drawScatterPlot, drawHeatmap } from './charts.js';
import { binomialProb, poissonProb, normalProb, exponentialProb, calculateZScore, descriptiveStats, confidenceInterval, tTest, linearRegression, correlationMatrix, covarianceMatrix, distanceMatrix, parseMultiDataset } from './stats.js';

const TOOLS = {
    binomial: {
        inputs: () => ({
            n: getNumericInput("n", 1, Infinity, 1, 1),
            k: getNumericInput("k", 0, Infinity, 1, 0),
            p: getNumericInput("p", 0, 1, 0.01, 0.5)
        }),
        validate: ({ n, k, p }) => n >= 1 && k <= n && p >= 0 && p <= 1,
        error: "Enter: n ≥ 1, k ≥ 0 and ≤ n, 0 ≤ p ≤ 1.",
        compute: ({ n, k, p }) => ({
            prob: binomialProb(n, k, p),
            output: `Probability: ${binomialProb(n, k, p).toFixed(4)}`
        }),
        chart: ({ n, k, p }) => drawBarChart("Binomial", Array.from({ length: n + 1 }, (_, i) => i), Array.from({ length: n + 1 }, (_, i) => binomialProb(n, i, p))),
        analysis: ({ n, k, p }) => `Probability of exactly ${k} successes in ${n} trials, each with a ${p * 100}% chance. Expected: ${(n * p).toFixed(1)}.`
    },
    poisson: {
        inputs: () => ({
            lambda: getNumericInput("lambda", 0, Infinity, 0.1, 1),
            k: getNumericInput("k", 0, 1000, 1, 0) // Limit k to 1000
        }),
        validate: ({ lambda, k }) => lambda >= 0 && k >= 0 && k <= 1000,
        error: "Enter: λ ≥ 0, 0 ≤ k ≤ 1000.",
        compute: ({ lambda, k }) => {
            const prob = poissonProb(lambda, k);
            if (prob === 0 && k > 100) {
                throw new Error("Probability is effectively 0 for large k. Try a smaller k value.");
            }
            return {
                prob,
                output: `Probability: ${prob.toFixed(4)}`
            };
        },
        chart: ({ lambda, k }) => {
            const maxK = Math.min(k + 10, 50); // Limit chart range for performance
            drawBarChart("Poisson", Array.from({ length: maxK + 1 }, (_, i) => i), Array.from({ length: maxK + 1 }, (_, i) => poissonProb(lambda, i)));
        },
        analysis: ({ lambda, k }) => `Chance of ${k} events with average rate ${lambda}.`
    },
    normal: {
        inputs: () => ({
            mu: getNumericInput("mu", -Infinity, Infinity, 0.1, 0),
            sigma: getNumericInput("sigma", 0.1, Infinity, 0.1, 1),
            a: getNumericInput("a", -Infinity, Infinity, 0.1, -1),
            b: getNumericInput("b", -Infinity, Infinity, 0.1, 1)
        }),
        validate: ({ sigma, a, b }) => sigma > 0 && a <= b,
        error: "Enter: σ > 0, a ≤ b, all numeric.",
        compute: ({ mu, sigma, a, b }) => ({
            prob: normalProb(mu, sigma, a, b),
            output: `Probability: ${normalProb(mu, sigma, a, b).toFixed(4)}`
        }),
        chart: ({ mu, sigma, a, b }) => drawNormalChart(mu, sigma, a, b),
        analysis: ({ mu, sigma, a, b }) => `Probability between ${a} and ${b} (mean ${mu}, std dev ${sigma}).`
    },
    exponential: {
        inputs: () => ({
            lambda: getNumericInput("lambda", 0, Infinity, 0.1, 1),
            x: getNumericInput("x", 0, Infinity, 0.1, 0)
        }),
        validate: ({ lambda, x }) => lambda > 0 && x >= 0,
        error: "Enter: λ > 0, x ≥ 0.",
        compute: ({ lambda, x }) => ({
            prob: exponentialProb(lambda, x),
            output: `Probability: ${exponentialProb(lambda, x).toFixed(4)}`
        }),
        chart: ({ lambda, x }) => drawExponentialChart(lambda, x),
        analysis: ({ lambda, x }) => `Chance of an event within ${x} time units (rate ${lambda}). Mean wait time: ${(1/lambda).toFixed(2)}.`
    },
    zscore: {
        inputs: () => ({
            x: getNumericInput("x", -Infinity, Infinity, 0.1, 0),
            mu: getNumericInput("mu", -Infinity, Infinity, 0.1, 0),
            sigma: getNumericInput("sigma", 0.1, Infinity, 0.1, 1)
        }),
        validate: ({ sigma }) => sigma > 0,
        error: "Enter: σ > 0, all fields numeric.",
        compute: ({ x, mu, sigma }) => ({
            z: calculateZScore(x, mu, sigma),
            output: `Z-Score: ${calculateZScore(x, mu, sigma).toFixed(4)}`
        }),
        chart: ({ x, mu, sigma }) => drawZScoreChart(calculateZScore(x, mu, sigma)),
        analysis: ({ x, mu, sigma }) => {
            const z = calculateZScore(x, mu, sigma);
            return `Z-Score of ${z.toFixed(4)} is ${Math.abs(z).toFixed(1)} std devs ${z > 0 ? 'above' : 'below'} the mean (${mu}).`;
        }
    },
    descriptive: {
        inputs: () => ({
            data: window.uploadedData?.length > 0 ? window.uploadedData : parseMultiDataset(document.getElementById("dataset").value),
            cleanMethod: document.getElementById("clean-method").value
        }),
        validate: ({ data }) => data.length > 0,
        error: "Enter valid data (e.g., '1,2,3') or upload an Excel file.",
        compute: ({ data, cleanMethod }) => {
            const cleanedData = cleanData(data, cleanMethod);
            if (cleanedData.length === 0) throw new Error("After cleaning, no valid data remains.");
            const stats = descriptiveStats(cleanedData[0]);
            return {
                stats,
                output: `Mean: ${stats.mean.toFixed(2)}, Median: ${stats.median.toFixed(2)}, Std Dev: ${stats.stdDev.toFixed(2)}`
            };
        },
        chart: ({ data, cleanMethod }) => drawBoxPlot(cleanData(data, cleanMethod)[0]),
        analysis: ({ data, cleanMethod }) => {
            const cleanedData = cleanData(data, cleanMethod);
            const stats = descriptiveStats(cleanedData[0]);
            return `Dataset of ${cleanedData.length} values. Variance: ${stats.variance.toFixed(2)}. Skewness: ${stats.skewness.toFixed(2)}. ${window.cleaningLog?.join(" ") || ""}`;
        }
    },
    confidence: {
        inputs: () => ({
            data: window.uploadedData?.length > 0 ? window.uploadedData : parseMultiDataset(document.getElementById("dataset").value),
            cleanMethod: document.getElementById("clean-method").value,
            confLevel: getNumericInput("conf-level", 0, 100, 1, 95)
        }),
        validate: ({ data, confLevel }) => data.length > 1 && confLevel > 0 && confLevel < 100,
        error: "Enter data and a confidence level (0-100).",
        compute: ({ data, cleanMethod, confLevel }) => {
            const cleanedData = cleanData(data, cleanMethod);
            if (cleanedData.length <= 1) throw new Error("After cleaning, insufficient data remains.");
            const ci = confidenceInterval(cleanedData[0], confLevel / 100);
            return {
                ci,
                output: `${confLevel}% CI: [${ci.lower.toFixed(2)}, ${ci.upper.toFixed(2)}]`
            };
        },
        chart: ({ data, cleanMethod, confLevel }) => {
            const cleanedData = cleanData(data, cleanMethod);
            const ci = confidenceInterval(cleanedData[0], confLevel / 100);
            drawBarChart("Confidence Interval", ["Lower", "Mean", "Upper"], [ci.lower, ci.mean, ci.upper]);
        },
        analysis: ({ data, cleanMethod, confLevel }) => {
            const cleanedData = cleanData(data, cleanMethod);
            const ci = confidenceInterval(cleanedData[0], confLevel / 100);
            return `With ${confLevel}% confidence, the true mean lies between ${ci.lower.toFixed(2)} and ${ci.upper.toFixed(2)}. Sample mean: ${ci.mean.toFixed(2)}. ${window.cleaningLog?.join(" ") || ""}`;
        }
    },
    ttest: {
        inputs: () => ({
            data: window.uploadedData?.length > 0 ? window.uploadedData : parseMultiDataset(document.getElementById("dataset").value),
            cleanMethod: document.getElementById("clean-method").value,
            mu0: getNumericInput("mu0", -Infinity, Infinity, 0.1, 0)
        }),
        validate: ({ data, mu0 }) => data.length > 1 && !isNaN(mu0),
        error: "Enter data and a hypothesized mean.",
        compute: ({ data, cleanMethod, mu0 }) => {
            const cleanedData = cleanData(data, cleanMethod);
            if (cleanedData.length <= 1) throw new Error("After cleaning, insufficient data remains.");
            const tResult = tTest(cleanedData[0], mu0);
            return {
                tResult,
                output: `T-Statistic: ${tResult.t.toFixed(4)}, P-Value: ${tResult.p.toFixed(4)}`
            };
        },
        chart: ({ data, cleanMethod, mu0 }) => {
            const cleanedData = cleanData(data, cleanMethod);
            const tResult = tTest(cleanedData[0], mu0);
            drawBarChart("T-Test", ["T-Statistic"], [tResult.t]);
        },
        analysis: ({ data, cleanMethod, mu0 }) => {
            const cleanedData = cleanData(data, cleanMethod);
            const tResult = tTest(cleanedData[0], mu0);
            return `Tests if sample mean differs from ${mu0}. P < 0.05 suggests a significant difference. ${window.cleaningLog?.join(" ") || ""}`;
        }
    },
    regression: {
        inputs: () => ({
            data: window.uploadedData?.length > 0 ? window.uploadedData : parseMultiDataset(document.getElementById("dataset").value),
            cleanMethod: document.getElementById("clean-method").value
        }),
        validate: ({ data }) => data.length > 1,
        error: "Enter paired data (e.g., '1,2; 3,4') or upload an Excel file.",
        compute: ({ data, cleanMethod }) => {
            const cleanedData = cleanData(data, cleanMethod);
            if (cleanedData.length <= 1) throw new Error("After cleaning, insufficient data remains.");
            const reg = linearRegression(cleanedData[0]);
            return {
                reg,
                output: `Slope: ${reg.slope.toFixed(4)}, Intercept: ${reg.intercept.toFixed(4)}, R²: ${reg.r2.toFixed(4)}`
            };
        },
        chart: ({ data, cleanMethod }) => {
            const cleanedData = cleanData(data, cleanMethod);
            const reg = linearRegression(cleanedData[0]);
            drawScatterPlot(reg.x, reg.y, reg.fit);
        },
        analysis: ({ data, cleanMethod }) => {
            const cleanedData = cleanData(data, cleanMethod);
            const reg = linearRegression(cleanedData[0]);
            return `Predicts y = ${reg.slope.toFixed(2)}x + ${reg.intercept.toFixed(2)}. R² shows fit quality (1 is perfect). ${window.cleaningLog?.join(" ") || ""}`;
        }
    },
    heatmap: {
        inputs: () => ({
            data: window.uploadedData?.length > 0 ? window.uploadedData : parseMultiDataset(document.getElementById("dataset").value),
            cleanMethod: document.getElementById("clean-method").value,
            matrixType: document.getElementById("matrix-type").value
        }),
        validate: ({ data }) => data.length > 1 && data[0].length > 0,
        error: "Enter valid data (e.g., '1,2; 3,4') or upload an Excel file.",
        compute: ({ data, cleanMethod, matrixType }) => {
            const cleanedData = cleanData(data, cleanMethod);
            if (cleanedData.length <= 1) throw new Error("After cleaning, insufficient data remains.");
            let matrix, labels, result;
            if (matrixType === "correlation") {
                matrix = correlationMatrix(cleanedData);
                labels = Array(cleanedData[0].length).fill(0).map((_, i) => `Var${i+1}`);
                result = "Correlation Heatmap Generated";
            } else if (matrixType === "covariance") {
                matrix = covarianceMatrix(cleanedData);
                labels = Array(cleanedData[0].length).fill(0).map((_, i) => `Var${i+1}`);
                result = "Covariance Heatmap Generated";
            } else if (matrixType === "distance") {
                matrix = distanceMatrix(cleanedData);
                labels = Array(cleanedData.length).fill(0).map((_, i) => `Row${i+1}`);
                result = "Distance Heatmap Generated";
            } else {
                matrix = cleanedData;
                labels = Array(cleanedData[0].length).fill(0).map((_, i) => `Col${i+1}`);
                result = "Raw Data Heatmap Generated";
            }
            return { matrix, labels, matrixType, output: result };
        },
        chart: ({ data, cleanMethod, matrixType }) => {
            const cleanedData = cleanData(data, cleanMethod);
            let matrix, labels;
            if (matrixType === "correlation") {
                matrix = correlationMatrix(cleanedData);
                labels = Array(cleanedData[0].length).fill(0).map((_, i) => `Var${i+1}`);
            } else if (matrixType === "covariance") {
                matrix = covarianceMatrix(cleanedData);
                labels = Array(cleanedData[0].length).fill(0).map((_, i) => `Var${i+1}`);
            } else if (matrixType === "distance") {
                matrix = distanceMatrix(cleanedData);
                labels = Array(cleanedData.length).fill(0).map((_, i) => `Row${i+1}`);
            } else {
                matrix = cleanedData;
                labels = Array(cleanedData[0].length).fill(0).map((_, i) => `Col${i+1}`);
            }
            drawHeatmap(matrix, labels, matrixType);
        },
        analysis: ({ data, cleanMethod, matrixType }) => {
            const cleanedData = cleanData(data, cleanMethod);
            if (matrixType === "correlation") {
                return `Shows correlations between ${cleanedData[0].length} variables. Values range from -1 (negative) to 1 (positive). ${window.cleaningLog?.join(" ") || ""}`;
            } else if (matrixType === "covariance") {
                return `Shows covariances between ${cleanedData[0].length} variables. Positive values indicate variables move together; negative, opposite. ${window.cleaningLog?.join(" ") || ""}`;
            } else if (matrixType === "distance") {
                return `Shows Euclidean distances between ${cleanedData.length} rows. Larger values indicate greater dissimilarity. ${window.cleaningLog?.join(" ") || ""}`;
            } else {
                return `Visualizes raw values across ${cleanedData.length} rows and ${cleanedData[0].length} columns. Intensity reflects magnitude. ${window.cleaningLog?.join(" ") || ""}`;
            }
        }
    },
    bayes: {
        inputs: () => ({
            pba: getNumericInput("pba", 0, 1, 0.01, 0.5),
            pa: getNumericInput("pa", 0, 1, 0.01, 0.5),
            pb: getNumericInput("pb", 0, 1, 0.01, 0.5)
        }),
        validate: ({ pba, pa, pb }) => pba >= 0 && pba <= 1 && pa >= 0 && pa <= 1 && pb > 0 && pb <= 1,
        error: "Enter: 0 ≤ P(B|A), P(A), P(B) ≤ 1, P(B) > 0.",
        compute: ({ pba, pa, pb }) => {
            const pab = (pba * pa) / pb;
            return { pab, output: `P(A|B): ${pab.toFixed(4)}` };
        },
        chart: ({ pba, pa, pb }) => drawBarChart("Bayes' Theorem", ["P(A|B)"], [(pba * pa) / pb]),
        analysis: ({ pba, pa, pb }) => {
            const pab = (pba * pa) / pb;
            return `Probability of A given B is ${pab.toFixed(4)}, using P(B|A)=${pba}, P(A)=${pa}, P(B)=${pb}.`;
        }
    },
    categorical: {
        inputs: () => ({
            data: window.uploadedData?.length > 0 ? window.uploadedData[0] : parseMultiDataset(document.getElementById("dataset").value)[0],
            cleanMethod: document.getElementById("clean-method").value
        }),
        validate: ({ data }) => {
            const total = data.reduce((a, b) => a + b, 0);
            return data.length > 1 && total > 0;
        },
        error: "Enter probabilities or counts (e.g., '0.3,0.4,0.3') summing to > 0.",
        compute: ({ data, cleanMethod }) => {
            const cleanedData = cleanData([data], cleanMethod)[0];
            const total = cleanedData.reduce((a, b) => a + b, 0);
            const probs = cleanedData.map(p => p / total);
            return { probs, output: `Probabilities: ${probs.map(p => p.toFixed(4)).join(", ")}` };
        },
        chart: ({ data, cleanMethod }) => {
            const cleanedData = cleanData([data], cleanMethod)[0];
            const total = cleanedData.reduce((a, b) => a + b, 0);
            const probs = cleanedData.map(p => p / total);
            drawBarChart("Categorical Probability", Array.from({ length: cleanedData.length }, (_, i) => `Cat${i+1}`), probs);
        },
        analysis: ({ data, cleanMethod }) => {
            const cleanedData = cleanData([data], cleanMethod)[0];
            const total = cleanedData.reduce((a, b) => a + b, 0);
            const probs = cleanedData.map(p => p / total);
            return `Normalized probabilities for ${cleanedData.length} categories. Sum: ${probs.reduce((a, b) => a + b, 0).toFixed(4)}. ${window.cleaningLog?.join(" ") || ""}`;
        }
    },
    binary: {
        inputs: () => ({
            p: getNumericInput("p", 0, 1, 0.01, 0.5)
        }),
        validate: ({ p }) => p >= 0 && p <= 1,
        error: "Enter: 0 ≤ P(Success) ≤ 1.",
        compute: ({ p }) => {
            const q = 1 - p;
            return { p, q, output: `P(Success): ${p.toFixed(4)}, P(Failure): ${q.toFixed(4)}` };
        },
        chart: ({ p }) => drawBarChart("Binary Probability", ["Success", "Failure"], [p, 1 - p]),
        analysis: ({ p }) => {
            const q = 1 - p;
            return `Binary outcome with ${p*100}% chance of success and ${q*100}% chance of failure.`;
        }
    },
    discrete: {
        inputs: () => ({
            data: window.uploadedData?.length > 0 ? window.uploadedData[0] : parseMultiDataset(document.getElementById("dataset").value)[0],
            cleanMethod: document.getElementById("clean-method").value
        }),
        validate: ({ data }) => {
            const total = data.reduce((a, b) => a + b, 0);
            return data.length > 1 && total > 0 && data.every(p => p >= 0);
        },
        error: "Enter non-negative probabilities or counts (e.g., '1,2,3') summing to > 0.",
        compute: ({ data, cleanMethod }) => {
            const cleanedData = cleanData([data], cleanMethod)[0];
            const total = cleanedData.reduce((a, b) => a + b, 0);
            const probs = cleanedData.map(p => p / total);
            return { probs, output: `Probabilities: ${probs.map(p => p.toFixed(4)).join(", ")}` };
        },
        chart: ({ data, cleanMethod }) => {
            const cleanedData = cleanData([data], cleanMethod)[0];
            const total = cleanedData.reduce((a, b) => a + b, 0);
            const probs = cleanedData.map(p => p / total);
            drawBarChart("Discrete Probability", Array.from({ length: cleanedData.length }, (_, i) => `${i}`), probs);
        },
        analysis: ({ data, cleanMethod }) => {
            const cleanedData = cleanData([data], cleanMethod)[0];
            const total = cleanedData.reduce((a, b) => a + b, 0);
            const probs = cleanedData.map(p => p / total);
            return `Discrete distribution over ${cleanedData.length} outcomes. Sum: ${probs.reduce((a, b) => a + b, 0).toFixed(4)}. ${window.cleaningLog?.join(" ") || ""}`;
        }
    }
};

function getNumericInput(id, min = -Infinity, max = Infinity, step = 1, defaultVal = 0) {
    const val = parseFloat(document.getElementById(id)?.value ?? NaN);
    return isNaN(val) || val < min || val > max ? defaultVal : Math.round(val / step) * step;
}

async function calculate() {
    const tool = document.getElementById("tool").value;
    const toolConfig = TOOLS[tool];
    if (!toolConfig) {
        console.error(`Tool ${tool} not found in TOOLS configuration.`);
        return;
    }

    try {
        const inputs = toolConfig.inputs();
        await processTool({
            validate: toolConfig.validate(inputs),
            error: toolConfig.error,
            compute: () => toolConfig.compute(inputs),
            chart: () => toolConfig.chart(inputs),
            analysis: () => toolConfig.analysis(inputs)
        });
    } catch (err) {
        console.error(`Calculation error for ${tool}:`, err);
        document.getElementById("result-text").innerText = "Error";
        document.getElementById("analysis-text").innerText = err.message;
    }
}

// Initialize
console.log("Initializing Data Science Toolkit...");
updateInputs(); // Ensure inputs are populated on page load
document.getElementById("tool").addEventListener("change", () => {
    console.log("Tool changed to:", document.getElementById("tool").value);
    updateInputs();
});
document.getElementById("calc-btn")?.addEventListener("click", calculate);
document.getElementById("excel-upload")?.addEventListener("change", handleExcelUpload);