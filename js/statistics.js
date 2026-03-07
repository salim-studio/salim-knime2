/* ============================================
   statistics.js - Statistical Computation Engine
   ============================================ */

const Stats = {
    // ==========================================
    // Basic Math Utilities
    // ==========================================
    sum(arr) {
        return arr.reduce((a, b) => a + b, 0);
    },

    mean(arr) {
        return this.sum(arr) / arr.length;
    },

    median(arr) {
        const sorted = [...arr].sort((a, b) => a - b);
        const mid = Math.floor(sorted.length / 2);
        return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
    },

    mode(arr) {
        const freq = {};
        arr.forEach(v => freq[v] = (freq[v] || 0) + 1);
        const maxFreq = Math.max(...Object.values(freq));
        return Object.keys(freq).filter(k => freq[k] === maxFreq).map(Number);
    },

    variance(arr, sample = true) {
        const m = this.mean(arr);
        const ss = arr.reduce((acc, v) => acc + (v - m) ** 2, 0);
        return ss / (arr.length - (sample ? 1 : 0));
    },

    stdDev(arr, sample = true) {
        return Math.sqrt(this.variance(arr, sample));
    },

    min(arr) { return Math.min(...arr); },
    max(arr) { return Math.max(...arr); },
    range(arr) { return this.max(arr) - this.min(arr); },

    quartiles(arr) {
        const sorted = [...arr].sort((a, b) => a - b);
        const n = sorted.length;
        const q1 = sorted[Math.floor(n * 0.25)];
        const q2 = sorted[Math.floor(n * 0.5)];
        const q3 = sorted[Math.floor(n * 0.75)];
        return { q1, q2, q3, iqr: q3 - q1 };
    },

    skewness(arr) {
        const n = arr.length;
        const m = this.mean(arr);
        const s = this.stdDev(arr);
        if (s === 0) return 0;
        const sum3 = arr.reduce((acc, v) => acc + ((v - m) / s) ** 3, 0);
        return (n / ((n - 1) * (n - 2))) * sum3;
    },

    kurtosis(arr) {
        const n = arr.length;
        const m = this.mean(arr);
        const s = this.stdDev(arr);
        if (s === 0) return 0;
        const sum4 = arr.reduce((acc, v) => acc + ((v - m) / s) ** 4, 0);
        return ((n * (n + 1)) / ((n - 1) * (n - 2) * (n - 3))) * sum4
            - (3 * (n - 1) ** 2) / ((n - 2) * (n - 3));
    },

    // Standard Error of Mean
    sem(arr) {
        return this.stdDev(arr) / Math.sqrt(arr.length);
    },

    // ==========================================
    // Descriptive Statistics
    // ==========================================
    descriptive(arr) {
        const clean = arr.filter(v => v !== null && v !== undefined && !isNaN(v)).map(Number);
        if (clean.length === 0) return null;

        const q = this.quartiles(clean);
        return {
            count: clean.length,
            missing: arr.length - clean.length,
            mean: this.mean(clean),
            median: this.median(clean),
            mode: this.mode(clean),
            stdDev: this.stdDev(clean),
            variance: this.variance(clean),
            min: this.min(clean),
            max: this.max(clean),
            range: this.range(clean),
            sum: this.sum(clean),
            sem: this.sem(clean),
            q1: q.q1,
            q2: q.q2,
            q3: q.q3,
            iqr: q.iqr,
            skewness: this.skewness(clean),
            kurtosis: this.kurtosis(clean)
        };
    },

    // ==========================================
    // Correlation
    // ==========================================
    pearsonCorrelation(x, y) {
        const n = Math.min(x.length, y.length);
        const mx = this.mean(x.slice(0, n));
        const my = this.mean(y.slice(0, n));
        let num = 0, dx2 = 0, dy2 = 0;
        for (let i = 0; i < n; i++) {
            const dx = x[i] - mx;
            const dy = y[i] - my;
            num += dx * dy;
            dx2 += dx * dx;
            dy2 += dy * dy;
        }
        const denom = Math.sqrt(dx2 * dy2);
        if (denom === 0) return 0;
        const r = num / denom;
        // t-test for correlation significance
        const t = r * Math.sqrt((n - 2) / (1 - r * r));
        const df = n - 2;
        let pValue = 0;
        try {
            pValue = 2 * (1 - jStat.studentt.cdf(Math.abs(t), df));
        } catch (e) {
            pValue = NaN;
        }
        return { r, t, df, pValue };
    },

    correlationMatrix(data, columns) {
        const matrix = {};
        for (const c1 of columns) {
            matrix[c1] = {};
            for (const c2 of columns) {
                const x = data.map(row => parseFloat(row[c1])).filter(v => !isNaN(v));
                const y = data.map(row => parseFloat(row[c2])).filter(v => !isNaN(v));
                const minLen = Math.min(x.length, y.length);
                matrix[c1][c2] = this.pearsonCorrelation(x.slice(0, minLen), y.slice(0, minLen));
            }
        }
        return matrix;
    },

    // ==========================================
    // Simple Linear Regression
    // ==========================================
    simpleRegression(xArr, yArr) {
        const n = Math.min(xArr.length, yArr.length);
        const x = xArr.slice(0, n).map(Number);
        const y = yArr.slice(0, n).map(Number);

        const mx = this.mean(x);
        const my = this.mean(y);

        let ssxy = 0, ssxx = 0, ssyy = 0;
        for (let i = 0; i < n; i++) {
            ssxy += (x[i] - mx) * (y[i] - my);
            ssxx += (x[i] - mx) ** 2;
            ssyy += (y[i] - my) ** 2;
        }

        const b1 = ssxy / ssxx;
        const b0 = my - b1 * mx;

        // R-squared
        const predicted = x.map(xi => b0 + b1 * xi);
        const ssRes = y.reduce((acc, yi, i) => acc + (yi - predicted[i]) ** 2, 0);
        const ssTot = ssyy;
        const rSquared = 1 - ssRes / ssTot;

        // Standard error
        const mse = ssRes / (n - 2);
        const seB1 = Math.sqrt(mse / ssxx);
        const seB0 = Math.sqrt(mse * (1 / n + mx * mx / ssxx));

        // t-statistics
        const tB0 = b0 / seB0;
        const tB1 = b1 / seB1;

        // p-values
        let pB0 = 0, pB1 = 0;
        try {
            pB0 = 2 * (1 - jStat.studentt.cdf(Math.abs(tB0), n - 2));
            pB1 = 2 * (1 - jStat.studentt.cdf(Math.abs(tB1), n - 2));
        } catch (e) { }

        // F-statistic
        const ssReg = ssTot - ssRes;
        const fStat = (ssReg / 1) / (ssRes / (n - 2));
        let pF = 0;
        try { pF = 1 - jStat.centralF.cdf(fStat, 1, n - 2); } catch (e) { }

        return {
            intercept: { value: b0, se: seB0, t: tB0, p: pB0 },
            slope: { value: b1, se: seB1, t: tB1, p: pB1 },
            rSquared,
            adjustedRSquared: 1 - (1 - rSquared) * (n - 1) / (n - 2),
            fStatistic: fStat,
            pValue: pF,
            n,
            mse,
            rmse: Math.sqrt(mse),
            predicted,
            residuals: y.map((yi, i) => yi - predicted[i])
        };
    },

    // ==========================================
    // Variable Transformation Helper
    // ==========================================
    applyTransformation(values, transform) {
        switch (transform) {
            case 'log': return values.map(v => v > 0 ? Math.log(v) : NaN);
            case 'sqrt': return values.map(v => v >= 0 ? Math.sqrt(v) : NaN);
            case 'square': return values.map(v => v * v);
            case 'inverse': return values.map(v => v !== 0 ? 1 / v : NaN);
            case 'log10': return values.map(v => v > 0 ? Math.log10(v) : NaN);
            default: return values;
        }
    },

    applyDifferencing(values, order) {
        let result = [...values];
        for (let d = 0; d < order; d++) {
            const diffed = [];
            for (let i = 1; i < result.length; i++) {
                diffed.push(result[i] - result[i - 1]);
            }
            result = diffed;
        }
        return result;
    },

    // ==========================================
    // Durbin-Watson Statistic
    // ==========================================
    durbinWatson(residuals) {
        let sumNum = 0, sumDen = 0;
        for (let i = 0; i < residuals.length; i++) {
            sumDen += residuals[i] * residuals[i];
            if (i > 0) sumNum += (residuals[i] - residuals[i - 1]) ** 2;
        }
        return sumDen === 0 ? 0 : sumNum / sumDen;
    },

    // ==========================================
    // Breusch-Godfrey Serial Correlation LM Test
    // ==========================================
    breuschGodfreyTest(residuals, X, lags = 1) {
        const n = residuals.length;
        // Auxiliary regression: e_t on X and lagged residuals
        const usableN = n - lags;
        const auxY = residuals.slice(lags);
        const auxX = [];
        for (let i = lags; i < n; i++) {
            const row = [...X[i]];
            for (let l = 1; l <= lags; l++) {
                row.push(residuals[i - l]);
            }
            auxX.push(row);
        }
        // Compute R² of auxiliary regression
        const auxXt = this._transpose(auxX);
        const auxXtX = this._matMul(auxXt, auxX);
        const auxXtY = this._matMul(auxXt, auxY.map(v => [v]));
        const auxXtXInv = this._invertMatrix(auxXtX);
        if (!auxXtXInv) return { lm: 0, pValue: 1, lags };
        const auxBeta = this._matMul(auxXtXInv, auxXtY).map(r => r[0]);
        const auxPred = auxX.map(row => row.reduce((s, v, i) => s + v * auxBeta[i], 0));
        const auxResid = auxY.map((y, i) => y - auxPred[i]);
        const meanAuxY = this.mean(auxY);
        const ssTotAux = auxY.reduce((s, v) => s + (v - meanAuxY) ** 2, 0);
        const ssResAux = auxResid.reduce((s, v) => s + v * v, 0);
        const auxR2 = ssTotAux > 0 ? 1 - ssResAux / ssTotAux : 0;
        const lm = usableN * auxR2;
        let p = 0;
        try { p = 1 - jStat.chisquare.cdf(lm, lags); } catch (e) { }
        return { lm, pValue: p, lags };
    },

    // ==========================================
    // Breusch-Pagan Heteroskedasticity Test
    // ==========================================
    breuschPaganTest(residuals, X) {
        const n = residuals.length;
        const e2 = residuals.map(e => e * e);
        const meanE2 = this.mean(e2);
        // Auxiliary regression: e² on X (without intercept since X already has it)
        const Xt = this._transpose(X);
        const XtX = this._matMul(Xt, X);
        const XtY = this._matMul(Xt, e2.map(v => [v]));
        const XtXInv = this._invertMatrix(XtX);
        if (!XtXInv) return { lm: 0, pValue: 1 };
        const beta = this._matMul(XtXInv, XtY).map(r => r[0]);
        const pred = X.map(row => row.reduce((s, v, i) => s + v * beta[i], 0));
        const resid = e2.map((y, i) => y - pred[i]);
        const ssTot = e2.reduce((s, v) => s + (v - meanE2) ** 2, 0);
        const ssRes = resid.reduce((s, v) => s + v * v, 0);
        const r2 = ssTot > 0 ? 1 - ssRes / ssTot : 0;
        const k = X[0].length - 1; // exclude intercept
        const lm = n * r2;
        let p = 0;
        try { p = 1 - jStat.chisquare.cdf(lm, k); } catch (e) { }
        return { lm, pValue: p, df: k };
    },

    // ==========================================
    // Multiple Linear Regression
    // ==========================================
    multipleRegression(data, depVar, indepVars, config) {
        const n = data.length;
        const k = indepVars.length;

        // Build matrices
        const y = data.map(row => parseFloat(row[depVar]));
        const X = data.map(row => {
            const r = [1]; // intercept
            indepVars.forEach(v => r.push(parseFloat(row[v])));
            return r;
        });

        // X'X
        const Xt = this._transpose(X);
        const XtX = this._matMul(Xt, X);
        const XtY = this._matMul(Xt, y.map(v => [v]));

        // Solve (X'X)^-1 * X'Y
        const XtXInv = this._invertMatrix(XtX);
        if (!XtXInv) return { error: 'Singular matrix - cannot compute regression' };

        const beta = this._matMul(XtXInv, XtY).map(r => r[0]);

        // Predictions
        const predicted = X.map(row => row.reduce((s, v, i) => s + v * beta[i], 0));
        const residuals = y.map((yi, i) => yi - predicted[i]);

        // R-squared
        const my = this.mean(y);
        const ssTot = y.reduce((s, v) => s + (v - my) ** 2, 0);
        const ssRes = residuals.reduce((s, v) => s + v * v, 0);
        const rSquared = 1 - ssRes / ssTot;
        const adjR2 = 1 - (1 - rSquared) * (n - 1) / (n - k - 1);

        // MSE
        const mse = ssRes / (n - k - 1);

        // Standard errors, t-values, p-values for each coefficient
        const coefficients = beta.map((b, i) => {
            const se = Math.sqrt(mse * XtXInv[i][i]);
            const t = b / se;
            let p = 0;
            try { p = 2 * (1 - jStat.studentt.cdf(Math.abs(t), n - k - 1)); } catch (e) { }
            return {
                name: i === 0 ? 'Intercept' : indepVars[i - 1],
                value: b,
                se,
                t,
                p,
                significant: p < 0.05
            };
        });

        // F-statistic
        const ssReg = ssTot - ssRes;
        const fStat = (ssReg / k) / (ssRes / (n - k - 1));
        let pF = 0;
        try { pF = 1 - jStat.centralF.cdf(fStat, k, n - k - 1); } catch (e) { }

        // Durbin-Watson
        const dw = this.durbinWatson(residuals);

        // Build regression equation string
        let equation = `${depVar} = ${beta[0].toFixed(4)}`;
        for (let i = 1; i < beta.length; i++) {
            const sign = beta[i] >= 0 ? '+' : '-';
            equation += ` ${sign} ${Math.abs(beta[i]).toFixed(4)} × ${indepVars[i - 1]}`;
        }

        // Diagnostic tests
        const jbTest = this.jarqueBeraTest(residuals);
        const bgTest = this.breuschGodfreyTest(residuals, X, 1);
        const bpTest = this.breuschPaganTest(residuals, X);

        return {
            coefficients,
            rSquared,
            adjustedRSquared: adjR2,
            fStatistic: fStat,
            pValue: pF,
            modelSignificant: pF < 0.05,
            durbinWatson: dw,
            equation,
            n,
            k,
            mse,
            rmse: Math.sqrt(mse),
            predicted,
            residuals,
            diagnostics: {
                jarqueBera: jbTest,
                serialCorrelation: bgTest,
                heteroskedasticity: bpTest
            }
        };
    },

    // ==========================================
    // T-Tests
    // ==========================================
    tTestOneSample(data, mu = 0) {
        const n = data.length;
        const m = this.mean(data);
        const s = this.stdDev(data);
        const se = s / Math.sqrt(n);
        const t = (m - mu) / se;
        const df = n - 1;
        let p = 0;
        try { p = 2 * (1 - jStat.studentt.cdf(Math.abs(t), df)); } catch (e) { }
        return { t, df, pValue: p, mean: m, se, n };
    },

    tTestIndependent(data1, data2) {
        const n1 = data1.length, n2 = data2.length;
        const m1 = this.mean(data1), m2 = this.mean(data2);
        const v1 = this.variance(data1), v2 = this.variance(data2);
        const sp = Math.sqrt(v1 / n1 + v2 / n2);
        const t = (m1 - m2) / sp;
        // Welch's df
        const dfNum = (v1 / n1 + v2 / n2) ** 2;
        const dfDen = (v1 / n1) ** 2 / (n1 - 1) + (v2 / n2) ** 2 / (n2 - 1);
        const df = dfNum / dfDen;
        let p = 0;
        try { p = 2 * (1 - jStat.studentt.cdf(Math.abs(t), df)); } catch (e) { }
        return {
            t, df, pValue: p,
            mean1: m1, mean2: m2,
            std1: Math.sqrt(v1), std2: Math.sqrt(v2),
            n1, n2, meanDiff: m1 - m2
        };
    },

    tTestPaired(data1, data2) {
        const diffs = data1.map((v, i) => v - data2[i]);
        const result = this.tTestOneSample(diffs, 0);
        result.meanDiff = this.mean(diffs);
        return result;
    },

    // ==========================================
    // ANOVA (One-Way)
    // ==========================================
    oneWayAnova(groups) {
        const k = groups.length;
        const N = groups.reduce((s, g) => s + g.length, 0);
        const grandMean = this.mean(groups.flat());

        // Between-group SS
        const ssBetween = groups.reduce((s, g) => {
            return s + g.length * (this.mean(g) - grandMean) ** 2;
        }, 0);

        // Within-group SS
        const ssWithin = groups.reduce((s, g) => {
            const m = this.mean(g);
            return s + g.reduce((ss, v) => ss + (v - m) ** 2, 0);
        }, 0);

        const dfBetween = k - 1;
        const dfWithin = N - k;
        const msBetween = ssBetween / dfBetween;
        const msWithin = ssWithin / dfWithin;
        const fStat = msBetween / msWithin;

        let p = 0;
        try { p = 1 - jStat.centralF.cdf(fStat, dfBetween, dfWithin); } catch (e) { }

        return {
            fStatistic: fStat,
            pValue: p,
            dfBetween, dfWithin,
            ssBetween, ssWithin,
            msBetween, msWithin,
            groupMeans: groups.map(g => this.mean(g)),
            groupSizes: groups.map(g => g.length),
            grandMean, N, k
        };
    },

    // ==========================================
    // Chi-Square Test of Independence
    // ==========================================
    chiSquareTest(data, col1, col2) {
        // Build contingency table
        const vals1 = [...new Set(data.map(r => r[col1]))];
        const vals2 = [...new Set(data.map(r => r[col2]))];

        const observed = {};
        const rowTotals = {};
        const colTotals = {};
        let total = 0;

        vals1.forEach(v1 => {
            observed[v1] = {};
            rowTotals[v1] = 0;
            vals2.forEach(v2 => {
                const count = data.filter(r => r[col1] === v1 && r[col2] === v2).length;
                observed[v1][v2] = count;
                rowTotals[v1] += count;
                colTotals[v2] = (colTotals[v2] || 0) + count;
                total += count;
            });
        });

        // Chi-square statistic
        let chiSq = 0;
        vals1.forEach(v1 => {
            vals2.forEach(v2 => {
                const expected = (rowTotals[v1] * colTotals[v2]) / total;
                if (expected > 0) {
                    chiSq += (observed[v1][v2] - expected) ** 2 / expected;
                }
            });
        });

        const df = (vals1.length - 1) * (vals2.length - 1);
        let p = 0;
        try { p = 1 - jStat.chisquare.cdf(chiSq, df); } catch (e) { }

        return {
            chiSquare: chiSq,
            df,
            pValue: p,
            observed,
            rows: vals1,
            cols: vals2,
            cramersV: Math.sqrt(chiSq / (total * (Math.min(vals1.length, vals2.length) - 1)))
        };
    },

    // ==========================================
    // Normality Test (Jarque-Bera)
    // ==========================================
    jarqueBeraTest(arr) {
        const n = arr.length;
        const s = this.skewness(arr);
        const k = this.kurtosis(arr);
        const jb = (n / 6) * (s * s + (k * k) / 4);
        let p = 0;
        try { p = 1 - jStat.chisquare.cdf(jb, 2); } catch (e) { }
        return { jb, pValue: p, skewness: s, kurtosis: k, n };
    },

    // ==========================================
    // ML: K-Nearest Neighbors
    // ==========================================
    knn(trainX, trainY, testX, k = 5) {
        const predictions = testX.map(testPoint => {
            const distances = trainX.map((trainPoint, i) => ({
                dist: this._euclideanDist(testPoint, trainPoint),
                label: trainY[i]
            }));
            distances.sort((a, b) => a.dist - b.dist);
            const neighbors = distances.slice(0, k);
            // Majority vote
            const votes = {};
            neighbors.forEach(n => votes[n.label] = (votes[n.label] || 0) + 1);
            return Object.entries(votes).sort((a, b) => b[1] - a[1])[0][0];
        });
        return predictions;
    },

    // ==========================================
    // ML: Decision Tree (simplified)
    // ==========================================
    decisionTree(trainX, trainY, maxDepth = 5) {
        const tree = this._buildTree(trainX, trainY, 0, maxDepth);
        return {
            tree,
            predict: (testX) => testX.map(x => this._predictTree(tree, x))
        };
    },

    _buildTree(X, Y, depth, maxDepth) {
        const uniqueY = [...new Set(Y)];
        if (uniqueY.length === 1 || depth >= maxDepth || X.length < 2) {
            const freq = {};
            Y.forEach(y => freq[y] = (freq[y] || 0) + 1);
            return { leaf: true, prediction: Object.entries(freq).sort((a, b) => b[1] - a[1])[0][0] };
        }

        let bestGini = Infinity, bestFeature = 0, bestThreshold = 0;
        const nFeatures = X[0].length;

        for (let f = 0; f < nFeatures; f++) {
            const values = [...new Set(X.map(x => x[f]))].sort((a, b) => a - b);
            for (let i = 0; i < values.length - 1; i++) {
                const threshold = (values[i] + values[i + 1]) / 2;
                const leftY = Y.filter((_, j) => X[j][f] <= threshold);
                const rightY = Y.filter((_, j) => X[j][f] > threshold);
                if (leftY.length === 0 || rightY.length === 0) continue;
                const gini = (leftY.length * this._gini(leftY) + rightY.length * this._gini(rightY)) / Y.length;
                if (gini < bestGini) {
                    bestGini = gini;
                    bestFeature = f;
                    bestThreshold = threshold;
                }
            }
        }

        const leftIdx = X.map((x, i) => x[bestFeature] <= bestThreshold ? i : -1).filter(i => i >= 0);
        const rightIdx = X.map((x, i) => x[bestFeature] > bestThreshold ? i : -1).filter(i => i >= 0);

        if (leftIdx.length === 0 || rightIdx.length === 0) {
            const freq = {};
            Y.forEach(y => freq[y] = (freq[y] || 0) + 1);
            return { leaf: true, prediction: Object.entries(freq).sort((a, b) => b[1] - a[1])[0][0] };
        }

        return {
            leaf: false,
            feature: bestFeature,
            threshold: bestThreshold,
            left: this._buildTree(leftIdx.map(i => X[i]), leftIdx.map(i => Y[i]), depth + 1, maxDepth),
            right: this._buildTree(rightIdx.map(i => X[i]), rightIdx.map(i => Y[i]), depth + 1, maxDepth)
        };
    },

    _predictTree(node, x) {
        if (node.leaf) return node.prediction;
        return x[node.feature] <= node.threshold
            ? this._predictTree(node.left, x)
            : this._predictTree(node.right, x);
    },

    _gini(labels) {
        const freq = {};
        labels.forEach(l => freq[l] = (freq[l] || 0) + 1);
        const n = labels.length;
        return 1 - Object.values(freq).reduce((s, f) => s + (f / n) ** 2, 0);
    },

    // ==========================================
    // ML: K-Means Clustering
    // ==========================================
    kMeans(data, k = 3, maxIter = 100) {
        const n = data.length;
        const dims = data[0].length;

        // Initialize centroids randomly
        let centroids = [];
        const used = new Set();
        while (centroids.length < k) {
            const idx = Math.floor(Math.random() * n);
            if (!used.has(idx)) {
                centroids.push([...data[idx]]);
                used.add(idx);
            }
        }

        let labels = new Array(n).fill(0);

        for (let iter = 0; iter < maxIter; iter++) {
            // Assign clusters
            const newLabels = data.map(point => {
                let minDist = Infinity, bestC = 0;
                centroids.forEach((c, ci) => {
                    const d = this._euclideanDist(point, c);
                    if (d < minDist) { minDist = d; bestC = ci; }
                });
                return bestC;
            });

            // Check convergence
            if (newLabels.every((l, i) => l === labels[i])) break;
            labels = newLabels;

            // Update centroids
            centroids = centroids.map((_, ci) => {
                const clusterPoints = data.filter((_, i) => labels[i] === ci);
                if (clusterPoints.length === 0) return centroids[ci];
                return Array.from({ length: dims }, (_, d) =>
                    this.mean(clusterPoints.map(p => p[d]))
                );
            });
        }

        // Inertia
        const inertia = data.reduce((s, point, i) => {
            return s + this._euclideanDist(point, centroids[labels[i]]) ** 2;
        }, 0);

        return { labels, centroids, inertia, k };
    },

    // ==========================================
    // ML: Naive Bayes (Gaussian)
    // ==========================================
    naiveBayes(trainX, trainY) {
        const classes = [...new Set(trainY)];
        const nFeatures = trainX[0].length;
        const stats = {};
        const priors = {};

        classes.forEach(c => {
            const classData = trainX.filter((_, i) => trainY[i] === c);
            priors[c] = classData.length / trainX.length;
            stats[c] = [];
            for (let f = 0; f < nFeatures; f++) {
                const vals = classData.map(x => x[f]);
                stats[c].push({ mean: this.mean(vals), std: this.stdDev(vals) });
            }
        });

        return {
            predict: (testX) => testX.map(x => {
                let bestClass = classes[0], bestProb = -Infinity;
                classes.forEach(c => {
                    let logProb = Math.log(priors[c]);
                    x.forEach((v, f) => {
                        const { mean: m, std: s } = stats[c][f];
                        if (s > 0) {
                            logProb += -0.5 * Math.log(2 * Math.PI * s * s) - ((v - m) ** 2) / (2 * s * s);
                        }
                    });
                    if (logProb > bestProb) { bestProb = logProb; bestClass = c; }
                });
                return bestClass;
            }),
            stats,
            priors,
            classes
        };
    },

    // ==========================================
    // ML: Logistic Regression (simplified)
    // ==========================================
    logisticRegression(trainX, trainY, lr = 0.01, iterations = 1000) {
        const classes = [...new Set(trainY)];
        const n = trainX.length;
        const nFeatures = trainX[0].length;

        // Binary classification
        const yBinary = trainY.map(y => y === classes[0] ? 1 : 0);

        let weights = new Array(nFeatures).fill(0);
        let bias = 0;

        const sigmoid = z => 1 / (1 + Math.exp(-Math.max(-500, Math.min(500, z))));

        for (let iter = 0; iter < iterations; iter++) {
            let dw = new Array(nFeatures).fill(0);
            let db = 0;

            for (let i = 0; i < n; i++) {
                const z = trainX[i].reduce((s, x, j) => s + x * weights[j], 0) + bias;
                const pred = sigmoid(z);
                const error = pred - yBinary[i];

                trainX[i].forEach((x, j) => dw[j] += error * x);
                db += error;
            }

            weights = weights.map((w, j) => w - lr * dw[j] / n);
            bias -= lr * db / n;
        }

        return {
            predict: (testX) => testX.map(x => {
                const z = x.reduce((s, xi, j) => s + xi * weights[j], 0) + bias;
                return sigmoid(z) >= 0.5 ? classes[0] : classes[1];
            }),
            weights,
            bias,
            classes
        };
    },

    // ==========================================
    // Classification Metrics
    // ==========================================
    accuracy(actual, predicted) {
        const correct = actual.filter((a, i) => String(a) === String(predicted[i])).length;
        return correct / actual.length;
    },

    confusionMatrix(actual, predicted) {
        const classes = [...new Set([...actual, ...predicted])].sort();
        const matrix = {};
        classes.forEach(a => {
            matrix[a] = {};
            classes.forEach(p => {
                matrix[a][p] = actual.filter((v, i) => String(v) === String(a) && String(predicted[i]) === String(p)).length;
            });
        });
        return { matrix, classes };
    },

    // ==========================================
    // Helper: Matrix Operations
    // ==========================================
    _transpose(m) {
        return m[0].map((_, i) => m.map(row => row[i]));
    },

    _matMul(a, b) {
        const rows = a.length, cols = b[0].length, inner = b.length;
        const result = Array.from({ length: rows }, () => new Array(cols).fill(0));
        for (let i = 0; i < rows; i++)
            for (let j = 0; j < cols; j++)
                for (let k = 0; k < inner; k++)
                    result[i][j] += a[i][k] * b[k][j];
        return result;
    },

    _invertMatrix(m) {
        const n = m.length;
        const aug = m.map((row, i) => [...row, ...Array.from({ length: n }, (_, j) => i === j ? 1 : 0)]);

        for (let i = 0; i < n; i++) {
            let maxRow = i;
            for (let r = i + 1; r < n; r++)
                if (Math.abs(aug[r][i]) > Math.abs(aug[maxRow][i])) maxRow = r;
            [aug[i], aug[maxRow]] = [aug[maxRow], aug[i]];

            if (Math.abs(aug[i][i]) < 1e-10) return null;

            const pivot = aug[i][i];
            for (let j = 0; j < 2 * n; j++) aug[i][j] /= pivot;

            for (let r = 0; r < n; r++) {
                if (r !== i) {
                    const factor = aug[r][i];
                    for (let j = 0; j < 2 * n; j++) aug[r][j] -= factor * aug[i][j];
                }
            }
        }

        return aug.map(row => row.slice(n));
    },

    _euclideanDist(a, b) {
        return Math.sqrt(a.reduce((s, v, i) => s + (v - b[i]) ** 2, 0));
    }
};
