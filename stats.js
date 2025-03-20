export function binomialProb(n, k, p) {
  const coeff = factorial(n) / (factorial(k) * factorial(n - k));
  return coeff * Math.pow(p, k) * Math.pow(1 - p, n - k);
}

export function poissonProb(lambda, k) {
  // Input validation: k should be a non-negative integer
  if (!Number.isInteger(k) || k < 0) return 0;
  if (lambda < 0) return 0;

  // For very large k, the probability is effectively 0
  if (k > 1000) return 0;

  // Use logarithmic form to avoid overflow: log(P) = k * log(λ) - λ - log(k!)
  const logP = k * Math.log(lambda) - lambda - logFactorial(k);
  return Math.exp(logP);
}

export function normalProb(mu, sigma, a, b) {
  const z1 = (a - mu) / sigma;
  const z2 = (b - mu) / sigma;
  return 0.5 * (erf(z2 / Math.sqrt(2)) - erf(z1 / Math.sqrt(2)));
}

export function exponentialProb(lambda, x) {
  return 1 - Math.exp(-lambda * x);
}

export function calculateZScore(x, mu, sigma) {
  return (x - mu) / sigma;
}

export function descriptiveStats(data) {
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

export function confidenceInterval(data, confLevel) {
  const validData = data.filter(x => !isNaN(x));
  if (validData.length < 2) return { lower: 0, upper: 0, mean: 0 };
  const n = validData.length;
  const mean = validData.reduce((a, b) => a + b, 0) / n;
  const stdDev = Math.sqrt(validData.reduce((a, b) => a + (b - mean)**2, 0) / (n - 1));
  const z = confLevel < 0.95 ? 1.645 : confLevel < 0.99 ? 1.96 : 2.576;
  const margin = z * stdDev / Math.sqrt(n);
  return { lower: mean - margin, upper: mean + margin, mean };
}

export function tTest(data, mu0) {
  const validData = data.filter(x => !isNaN(x));
  if (validData.length < 2) return { t: 0, p: 1 };
  const n = validData.length;
  const mean = validData.reduce((a, b) => a + b, 0) / n;
  const stdDev = Math.sqrt(validData.reduce((a, b) => a + (b - mean)**2, 0) / (n - 1));
  const t = (mean - mu0) / (stdDev / Math.sqrt(n));
  const p = 2 * (1 - tDistCDF(Math.abs(t), n - 1));
  return { t, p };
}

export function linearRegression(data) {
  const validData = data.filter(x => !isNaN(x));
  if (validData.length < 2) return { slope: 0, intercept: 0, r2: 0, x: [], y: [], fit: [] };
  const n = validData.length;
  const x = Array.from({ length: n }, (_, i) => i + 1);
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

export function correlationMatrix(data) {
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

export function covarianceMatrix(data) {
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

export function distanceMatrix(data) {
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

export function parseMultiDataset(input) {
  return input.split(";").map(row => row.split(",").map(x => {
      const trimmed = x.trim();
      return (trimmed === "" || isNaN(parseFloat(trimmed))) ? NaN : parseFloat(trimmed);
  }));
}

function cleanData(data, method) {
  window.cleaningLog = [];
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
          window.cleaningLog.push(`Dropped ${originalRows - cleanedData.length} rows with non-numeric or missing values.`);
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
          window.cleaningLog.push(`Replaced ${nanCount} non-numeric or missing values with ${method === "mean" ? "column means" : "zeros"}.`);
      }
  }

  return cleanedData.length > 0 && cleanedData[0].length > 0 ? cleanedData : [];
}

// Iterative factorial for small numbers
function factorial(n) {
  if (!Number.isInteger(n) || n < 0) return 1;
  let result = 1;
  for (let i = 2; i <= n; i++) {
      result *= i;
  }
  return result;
}

// Logarithm of factorial using Stirling's approximation for large numbers
function logFactorial(n) {
  if (!Number.isInteger(n) || n < 0) return 0;
  if (n <= 1) return 0;
  if (n <= 20) return Math.log(factorial(n)); // Use iterative factorial for small n
  // Stirling's approximation: log(n!) ≈ n * log(n) - n + 0.5 * log(2 * π * n)
  return n * Math.log(n) - n + 0.5 * Math.log(2 * Math.PI * n);
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