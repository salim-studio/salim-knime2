/* ============================================
   app-core.js - Core Workflow Engine
   ============================================ */

class WorkflowEngine {
    constructor() {
        this.nodes = new Map();
        this.connections = [];
        this.nodeCounter = 0;
        this.selectedNodes = new Set();
        this.selectedConnection = null;
        this.nodeData = new Map();
        this.undoStack = [];
        this.redoStack = [];
        this.zoom = 1;
        this.panX = 0;
        this.panY = 0;
        this.isPanning = false;
        this.isConnecting = false;
        this.isDraggingNode = false;
        this.connectingFrom = null;
        this.tempLine = null;
        this.dragOffset = { x: 0, y: 0 };
        this.canvas = document.getElementById('workflow-canvas');
        this.nodesLayer = document.getElementById('nodes-layer');
        this.connectionsLayer = document.getElementById('connections-layer');
        this.tempConnLayer = document.getElementById('temp-connection-layer');
    }

    // ==========================================
    // Node Management
    // ==========================================
    addNode(type, x, y) {
        const def = NODE_REGISTRY[type];
        if (!def) return null;
        const id = `node_${++this.nodeCounter}`;
        const node = {
            id, type,
            x: (x - this.panX) / this.zoom,
            y: (y - this.panY) / this.zoom,
            config: JSON.parse(JSON.stringify(def.defaultConfig)),
            status: 'idle',
            result: null
        };
        this.nodes.set(id, node);
        this.saveUndo();
        this.renderNode(node);
        this.updateStatusBar();
        return node;
    }

    deleteNode(nodeId) {
        this.connections = this.connections.filter(c => c.from.nodeId !== nodeId && c.to.nodeId !== nodeId);
        this.nodes.delete(nodeId);
        this.nodeData.delete(nodeId);
        this.selectedNodes.delete(nodeId);
        this.saveUndo();
        this.renderAll();
        this.updateStatusBar();
        showToast(I18N.t('nodeDeleted'), 'info');
    }

    duplicateNode(nodeId) {
        const orig = this.nodes.get(nodeId);
        if (!orig) return;
        this.addNode(orig.type, (orig.x + 40) * this.zoom + this.panX, (orig.y + 40) * this.zoom + this.panY);
    }

    // ==========================================
    // Connection Management
    // ==========================================
    addConnection(fromNodeId, fromPortId, toNodeId, toPortId) {
        const exists = this.connections.find(c =>
            c.to.nodeId === toNodeId && c.to.portId === toPortId
        );
        if (exists) return false;
        if (fromNodeId === toNodeId) return false;

        this.connections.push({
            id: `conn_${Date.now()}`,
            from: { nodeId: fromNodeId, portId: fromPortId },
            to: { nodeId: toNodeId, portId: toPortId }
        });
        this.saveUndo();
        this.renderConnections();
        this.updateStatusBar();
        return true;
    }

    deleteConnection(connId) {
        this.connections = this.connections.filter(c => c.id !== connId);
        this.saveUndo();
        this.renderConnections();
        this.updateStatusBar();
    }

    getInputData(nodeId) {
        const inputConns = this.connections.filter(c => c.to.nodeId === nodeId);
        if (inputConns.length === 0) return null;
        const results = [];
        for (const conn of inputConns) {
            const sourceData = this.nodeData.get(conn.from.nodeId);
            if (sourceData) results.push(sourceData);
        }
        return results.length === 1 ? results[0] : results.length > 0 ? results : null;
    }

    // ==========================================
    // Execution Engine
    // ==========================================
    getExecutionOrder() {
        const visited = new Set();
        const order = [];
        const visit = (nodeId) => {
            if (visited.has(nodeId)) return;
            visited.add(nodeId);
            const deps = this.connections.filter(c => c.to.nodeId === nodeId);
            deps.forEach(c => visit(c.from.nodeId));
            order.push(nodeId);
        };
        this.nodes.forEach((_, id) => visit(id));
        return order;
    }

    async executeAll() {
        const order = this.getExecutionOrder();
        document.getElementById('status-message').textContent = I18N.t('executing');
        for (const nodeId of order) {
            const node = this.nodes.get(nodeId);
            if (!node) continue;
            node.status = 'executing';
            this.updateNodeStatus(nodeId);
            try {
                await this.executeNode(nodeId);
                node.status = 'success';
            } catch (e) {
                node.status = 'error';
                node.result = { error: e.message };
                console.error(`Node ${nodeId} error:`, e);
            }
            this.updateNodeStatus(nodeId);
        }
        document.getElementById('status-message').textContent = I18N.t('completed');
        showToast(I18N.t('executionComplete'), 'success');
    }

    async executeNode(nodeId) {
        const node = this.nodes.get(nodeId);
        if (!node) return;
        const def = NODE_REGISTRY[node.type];
        const inputData = this.getInputData(nodeId);
        let result = null;

        switch (node.type) {
            case 'csvReader':
            case 'excelReader':
                result = node.config._loadedData || null;
                break;

            case 'dataEntry':
                result = node.config.data || null;
                break;

            case 'columnFilter':
                if (inputData && node.config.includeColumns.length > 0) {
                    result = inputData.map(row => {
                        const r = {};
                        node.config.includeColumns.forEach(c => { if (row[c] !== undefined) r[c] = row[c]; });
                        return r;
                    });
                } else { result = inputData; }
                break;

            case 'rowFilter':
                if (inputData && node.config.column) {
                    result = inputData.filter(row => {
                        const val = row[node.config.column];
                        const target = node.config.value;
                        switch (node.config.operator) {
                            case 'equals': return String(val) === String(target);
                            case 'notEquals': return String(val) !== String(target);
                            case 'greater': return parseFloat(val) > parseFloat(target);
                            case 'less': return parseFloat(val) < parseFloat(target);
                            case 'contains': return String(val).includes(target);
                            default: return true;
                        }
                    });
                } else { result = inputData; }
                break;

            case 'sorter':
                if (inputData && node.config.sortColumn) {
                    result = [...inputData].sort((a, b) => {
                        const va = a[node.config.sortColumn], vb = b[node.config.sortColumn];
                        const cmp = isNaN(va) ? String(va).localeCompare(String(vb)) : parseFloat(va) - parseFloat(vb);
                        return node.config.sortOrder === 'ascending' ? cmp : -cmp;
                    });
                } else { result = inputData; }
                break;

            case 'missingValue':
                if (inputData) {
                    result = inputData.map(row => {
                        const r = { ...row };
                        Object.keys(r).forEach(k => {
                            if (r[k] === null || r[k] === undefined || r[k] === '' || isNaN(r[k])) {
                                if (node.config.strategy === 'mean') {
                                    const vals = inputData.map(x => parseFloat(x[k])).filter(v => !isNaN(v));
                                    r[k] = vals.length ? Stats.mean(vals) : 0;
                                } else if (node.config.strategy === 'median') {
                                    const vals = inputData.map(x => parseFloat(x[k])).filter(v => !isNaN(v));
                                    r[k] = vals.length ? Stats.median(vals) : 0;
                                } else if (node.config.strategy === 'zero') { r[k] = 0; }
                                else if (node.config.strategy === 'remove') { r[k] = '__REMOVE__'; }
                            }
                        });
                        return r;
                    });
                    if (node.config.strategy === 'remove') {
                        result = result.filter(r => !Object.values(r).includes('__REMOVE__'));
                    }
                } else { result = inputData; }
                break;

            case 'groupBy':
                if (inputData && node.config.groupColumns.length > 0) {
                    const groups = {};
                    inputData.forEach(row => {
                        const key = node.config.groupColumns.map(c => row[c]).join('|');
                        if (!groups[key]) groups[key] = [];
                        groups[key].push(row);
                    });
                    result = Object.entries(groups).map(([key, rows]) => {
                        const r = {};
                        node.config.groupColumns.forEach((c, i) => r[c] = key.split('|')[i]);
                        r['Count'] = rows.length;
                        return r;
                    });
                } else { result = inputData; }
                break;

            case 'descriptiveStats':
                if (inputData) {
                    const cols = node.config.includeAll
                        ? Object.keys(inputData[0]).filter(k => !isNaN(parseFloat(inputData[0][k])))
                        : node.config.columns;
                    const statsResult = {};
                    cols.forEach(col => {
                        const vals = inputData.map(r => parseFloat(r[col])).filter(v => !isNaN(v));
                        statsResult[col] = Stats.descriptive(vals);
                    });
                    result = statsResult;
                    node.result = result;
                }
                break;

            case 'correlation':
                if (inputData) {
                    const cols = node.config.columns.length > 0
                        ? node.config.columns
                        : Object.keys(inputData[0]).filter(k => !isNaN(parseFloat(inputData[0][k])));
                    result = Stats.correlationMatrix(inputData, cols);
                    node.result = { matrix: result, columns: cols };
                }
                break;

            case 'simpleRegression':
                if (inputData && node.config.dependentVar && node.config.independentVar) {
                    const x = inputData.map(r => parseFloat(r[node.config.independentVar])).filter(v => !isNaN(v));
                    const y = inputData.map(r => parseFloat(r[node.config.dependentVar])).filter(v => !isNaN(v));
                    result = Stats.simpleRegression(x, y);
                    node.result = result;
                }
                break;

            case 'multipleRegression':
                if (inputData && node.config.dependentVar && node.config.independentVars.length > 0) {
                    // Apply transformations and differencing
                    let transformedData = inputData.map(row => ({ ...row }));
                    const depVar = node.config.dependentVar;
                    const indepVars = node.config.independentVars;

                    // Transform dependent variable
                    if (node.config.depTransform && node.config.depTransform !== 'none') {
                        const vals = transformedData.map(r => parseFloat(r[depVar]));
                        const transformed = Stats.applyTransformation(vals, node.config.depTransform);
                        transformedData.forEach((r, i) => r[depVar] = transformed[i]);
                    }

                    // Transform independent variables
                    indepVars.forEach(v => {
                        const tr = (node.config.indepTransforms || {})[v];
                        if (tr && tr !== 'none') {
                            const vals = transformedData.map(r => parseFloat(r[v]));
                            const transformed = Stats.applyTransformation(vals, tr);
                            transformedData.forEach((r, i) => r[v] = transformed[i]);
                        }
                    });

                    // Apply differencing to dependent variable
                    if (node.config.depDiff && node.config.depDiff > 0) {
                        const vals = transformedData.map(r => parseFloat(r[depVar]));
                        const diffed = Stats.applyDifferencing(vals, node.config.depDiff);
                        // Also diff all independent vars to keep alignment
                        const diffLen = diffed.length;
                        const startIdx = transformedData.length - diffLen;
                        const newData = [];
                        for (let i = 0; i < diffLen; i++) {
                            const row = { ...transformedData[i + startIdx] };
                            row[depVar] = diffed[i];
                            newData.push(row);
                        }
                        transformedData = newData;
                    }

                    // Apply differencing to independent variables
                    indepVars.forEach(v => {
                        const diffOrder = (node.config.indepDiffs || {})[v];
                        if (diffOrder && diffOrder > 0) {
                            const vals = transformedData.map(r => parseFloat(r[v]));
                            const diffed = Stats.applyDifferencing(vals, diffOrder);
                            const diffLen = diffed.length;
                            const startIdx = transformedData.length - diffLen;
                            const newData = [];
                            for (let i = 0; i < diffLen; i++) {
                                const row = { ...transformedData[i + startIdx] };
                                row[v] = diffed[i];
                                newData.push(row);
                            }
                            transformedData = newData;
                        }
                    });

                    // Filter NaN rows
                    transformedData = transformedData.filter(row => {
                        if (isNaN(parseFloat(row[depVar]))) return false;
                        return indepVars.every(v => !isNaN(parseFloat(row[v])));
                    });

                    // Generate dummy variables
                    const allIndepVars = [...indepVars];
                    if (node.config.dummyEnabled && node.config.dummyYearColumn && node.config.dummyYears && node.config.dummyYears.length > 0) {
                        node.config.dummyYears.forEach(d => {
                            if (node.config.dummyType === 'quarter' && d.quarter) {
                                const colName = `DUM_${d.year}_Q${d.quarter}`;
                                transformedData.forEach(row => {
                                    const rowYear = parseFloat(row[node.config.dummyYearColumn]);
                                    // Quarter: year is fractional (e.g. 2008.25, 2008.5, 2008.75, 2009)
                                    // or integer year with separate quarter logic
                                    const yearVal = Math.floor(rowYear);
                                    const frac = rowYear - yearVal;
                                    let q = 1;
                                    if (frac >= 0.75) q = 4;
                                    else if (frac >= 0.5) q = 3;
                                    else if (frac >= 0.25) q = 2;
                                    row[colName] = (yearVal === d.year && q === d.quarter) ? 1 : 0;
                                });
                                allIndepVars.push(colName);
                            } else {
                                const colName = `DUM_${d.year}`;
                                transformedData.forEach(row => {
                                    const rowYear = parseFloat(row[node.config.dummyYearColumn]);
                                    row[colName] = (Math.floor(rowYear) === d.year) ? 1 : 0;
                                });
                                allIndepVars.push(colName);
                            }
                        });
                    }

                    result = Stats.multipleRegression(transformedData, depVar, allIndepVars, node.config);
                    node.result = result;
                }
                break;

            case 'tTest':
                if (inputData) {
                    if (node.config.testType === 'one-sample' && node.config.column1) {
                        const d = inputData.map(r => parseFloat(r[node.config.column1])).filter(v => !isNaN(v));
                        result = Stats.tTestOneSample(d, parseFloat(node.config.mu) || 0);
                    } else if (node.config.testType === 'independent' && node.config.column1 && node.config.column2) {
                        const d1 = inputData.map(r => parseFloat(r[node.config.column1])).filter(v => !isNaN(v));
                        const d2 = inputData.map(r => parseFloat(r[node.config.column2])).filter(v => !isNaN(v));
                        result = Stats.tTestIndependent(d1, d2);
                    } else if (node.config.testType === 'paired' && node.config.column1 && node.config.column2) {
                        const d1 = inputData.map(r => parseFloat(r[node.config.column1])).filter(v => !isNaN(v));
                        const d2 = inputData.map(r => parseFloat(r[node.config.column2])).filter(v => !isNaN(v));
                        result = Stats.tTestPaired(d1, d2);
                    }
                    node.result = result;
                }
                break;

            case 'anova':
                if (inputData && node.config.dependentVar && node.config.groupVar) {
                    const groupVals = [...new Set(inputData.map(r => r[node.config.groupVar]))];
                    const groups = groupVals.map(g =>
                        inputData.filter(r => r[node.config.groupVar] === g)
                            .map(r => parseFloat(r[node.config.dependentVar]))
                            .filter(v => !isNaN(v))
                    );
                    result = Stats.oneWayAnova(groups);
                    result.groupNames = groupVals;
                    node.result = result;
                }
                break;

            case 'chiSquare':
                if (inputData && node.config.column1 && node.config.column2) {
                    result = Stats.chiSquareTest(inputData, node.config.column1, node.config.column2);
                    node.result = result;
                }
                break;

            case 'normality':
                if (inputData && node.config.column) {
                    const vals = inputData.map(r => parseFloat(r[node.config.column])).filter(v => !isNaN(v));
                    result = Stats.jarqueBeraTest(vals);
                    node.result = result;
                }
                break;

            case 'knn':
            case 'decisionTree':
            case 'randomForest':
            case 'naiveBayes':
            case 'logisticRegression':
                if (inputData && node.config.targetColumn && node.config.features.length > 0) {
                    result = this.executeMLNode(node, inputData);
                    node.result = result;
                }
                break;

            case 'kMeans':
                if (inputData && node.config.features.length > 0) {
                    const X = inputData.map(r => node.config.features.map(f => parseFloat(r[f]) || 0));
                    const km = Stats.kMeans(X, node.config.nClusters || 3);
                    result = inputData.map((r, i) => ({ ...r, Cluster: km.labels[i] }));
                    node.result = { ...km, data: result };
                }
                break;

            // View nodes
            case 'tableView':
            case 'scatterPlot':
            case 'barChart':
            case 'lineChart':
            case 'histogram':
            case 'boxPlot':
            case 'pieChart':
            case 'heatmap':
                result = inputData;
                node.result = inputData;
                break;

            default:
                result = inputData;
        }

        if (result) this.nodeData.set(nodeId, Array.isArray(result) ? result : result);
        return result;
    }

    executeMLNode(node, data) {
        const features = node.config.features;
        const target = node.config.targetColumn;
        const testSplit = node.config.testSplit || 0.2;

        const shuffled = [...data].sort(() => Math.random() - 0.5);
        const splitIdx = Math.floor(shuffled.length * (1 - testSplit));
        const train = shuffled.slice(0, splitIdx);
        const test = shuffled.slice(splitIdx);

        const trainX = train.map(r => features.map(f => parseFloat(r[f]) || 0));
        const trainY = train.map(r => r[target]);
        const testX = test.map(r => features.map(f => parseFloat(r[f]) || 0));
        const testY = test.map(r => r[target]);

        let predictions;
        switch (node.type) {
            case 'knn':
                predictions = Stats.knn(trainX, trainY, testX, node.config.nNeighbors || 5);
                break;
            case 'decisionTree':
                const dt = Stats.decisionTree(trainX, trainY, node.config.maxDepth || 5);
                predictions = dt.predict(testX);
                break;
            case 'naiveBayes':
                const nb = Stats.naiveBayes(trainX, trainY);
                predictions = nb.predict(testX);
                break;
            case 'logisticRegression':
                const lr = Stats.logisticRegression(trainX, trainY, node.config.learningRate || 0.01, node.config.iterations || 1000);
                predictions = lr.predict(testX);
                break;
            case 'randomForest':
                // Simplified: multiple decision trees with random subsets
                const nTrees = Math.min(node.config.nEstimators || 10, 20);
                const treePreds = [];
                for (let t = 0; t < nTrees; t++) {
                    const sampleIdx = Array.from({ length: trainX.length }, () => Math.floor(Math.random() * trainX.length));
                    const sX = sampleIdx.map(i => trainX[i]);
                    const sY = sampleIdx.map(i => trainY[i]);
                    const tree = Stats.decisionTree(sX, sY, node.config.maxDepth || 5);
                    treePreds.push(tree.predict(testX));
                }
                predictions = testX.map((_, i) => {
                    const votes = {};
                    treePreds.forEach(tp => votes[tp[i]] = (votes[tp[i]] || 0) + 1);
                    return Object.entries(votes).sort((a, b) => b[1] - a[1])[0][0];
                });
                break;
            default:
                predictions = testY;
        }

        const accuracy = Stats.accuracy(testY, predictions);
        const cm = Stats.confusionMatrix(testY, predictions);

        return { predictions, actual: testY, accuracy, confusionMatrix: cm, trainSize: train.length, testSize: test.length };
    }

    // ==========================================
    // Undo/Redo
    // ==========================================
    saveUndo() {
        this.undoStack.push({
            nodes: new Map(JSON.parse(JSON.stringify([...this.nodes]))),
            connections: JSON.parse(JSON.stringify(this.connections))
        });
        if (this.undoStack.length > 50) this.undoStack.shift();
        this.redoStack = [];
    }

    undo() {
        if (this.undoStack.length === 0) return;
        this.redoStack.push({
            nodes: new Map(JSON.parse(JSON.stringify([...this.nodes]))),
            connections: JSON.parse(JSON.stringify(this.connections))
        });
        const state = this.undoStack.pop();
        this.nodes = new Map(state.nodes);
        this.connections = state.connections;
        this.renderAll();
    }

    redo() {
        if (this.redoStack.length === 0) return;
        this.undoStack.push({
            nodes: new Map(JSON.parse(JSON.stringify([...this.nodes]))),
            connections: JSON.parse(JSON.stringify(this.connections))
        });
        const state = this.redoStack.pop();
        this.nodes = new Map(state.nodes);
        this.connections = state.connections;
        this.renderAll();
    }

    // ==========================================
    // Save/Load Workflow
    // ==========================================
    saveWorkflow() {
        const data = {
            nodes: [...this.nodes],
            connections: this.connections,
            zoom: this.zoom,
            panX: this.panX,
            panY: this.panY
        };
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url; a.download = 'workflow.json'; a.click();
        URL.revokeObjectURL(url);
        showToast(I18N.t('workflowSaved'), 'success');
    }

    loadWorkflow(json) {
        try {
            const data = JSON.parse(json);
            this.nodes = new Map(data.nodes);
            this.connections = data.connections || [];
            this.zoom = data.zoom || 1;
            this.panX = data.panX || 0;
            this.panY = data.panY || 0;
            this.nodeCounter = Math.max(...[...this.nodes.keys()].map(k => parseInt(k.split('_')[1]) || 0), 0);
            this.renderAll();
            this.updateStatusBar();
            showToast(I18N.t('workflowLoaded'), 'success');
        } catch (e) {
            showToast('Error loading workflow', 'error');
        }
    }

    resetWorkflow() {
        this.nodes.clear();
        this.connections = [];
        this.nodeData.clear();
        this.selectedNodes.clear();
        this.nodeCounter = 0;
        this.zoom = 1;
        this.panX = 0;
        this.panY = 0;
        this.renderAll();
        this.updateStatusBar();
    }

    // ==========================================
    // Rendering
    // ==========================================
    renderAll() {
        this.nodesLayer.innerHTML = '';
        this.nodes.forEach(node => this.renderNode(node));
        this.renderConnections();
        this.applyTransform();
    }

    applyTransform() {
        const transform = `translate(${this.panX}, ${this.panY}) scale(${this.zoom})`;
        this.nodesLayer.setAttribute('transform', transform);
        this.connectionsLayer.setAttribute('transform', transform);
        this.tempConnLayer.setAttribute('transform', transform);
        document.getElementById('zoom-level').textContent = Math.round(this.zoom * 100) + '%';
    }

    renderNode(node) {
        const def = NODE_REGISTRY[node.type];
        if (!def) return;
        const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        g.setAttribute('class', `workflow-node ${this.selectedNodes.has(node.id) ? 'selected' : ''}`);
        g.setAttribute('data-id', node.id);
        g.setAttribute('transform', `translate(${node.x}, ${node.y})`);

        const W = 160, H = 60;
        const catColors = { io: '#f0883e', transform: '#a371f7', statistics: '#3fb950', ml: '#f778ba', views: '#79c0ff' };
        const color = catColors[def.category] || '#6c7ae0';

        // Body
        const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
        Object.entries({ x: 0, y: 0, width: W, height: H, rx: 10, ry: 10, fill: '#21283b', stroke: this.selectedNodes.has(node.id) ? '#6c7ae0' : '#30363d', 'stroke-width': this.selectedNodes.has(node.id) ? 2 : 1 }).forEach(([k, v]) => rect.setAttribute(k, v));
        g.appendChild(rect);

        // Color accent bar
        const accent = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
        Object.entries({ x: 0, y: 0, width: 4, height: H, rx: 2, fill: color }).forEach(([k, v]) => accent.setAttribute(k, v));
        g.appendChild(accent);

        // Icon bg
        const iconBg = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
        Object.entries({ x: 12, y: 15, width: 30, height: 30, rx: 6, fill: color + '20' }).forEach(([k, v]) => iconBg.setAttribute(k, v));
        g.appendChild(iconBg);

        // Icon text (using font awesome unicode)
        const iconText = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        Object.entries({ x: 27, y: 35, fill: color, 'font-size': '14px', 'text-anchor': 'middle', 'font-family': "'Font Awesome 6 Free'", 'font-weight': '900' }).forEach(([k, v]) => iconText.setAttribute(k, v));
        iconText.textContent = this.getIconChar(def.icon);
        g.appendChild(iconText);

        // Title
        const title = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        Object.entries({ x: 90, y: 28, fill: '#e6edf3', 'font-size': '11px', 'font-weight': '600', 'text-anchor': 'middle', 'font-family': "'Inter', sans-serif" }).forEach(([k, v]) => title.setAttribute(k, v));
        title.textContent = I18N.t(def.nameKey);
        title.style.pointerEvents = 'none';
        g.appendChild(title);

        // Subtitle
        const sub = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        Object.entries({ x: 90, y: 42, fill: '#546178', 'font-size': '9px', 'text-anchor': 'middle', 'font-family': "'Inter', sans-serif" }).forEach(([k, v]) => sub.setAttribute(k, v));
        sub.textContent = I18N.t('cat_' + def.category);
        sub.style.pointerEvents = 'none';
        g.appendChild(sub);

        // Status indicator
        const status = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        const statusColors = { idle: '#8b949e', configured: '#f0883e', executing: '#58a6ff', success: '#3fb950', error: '#f85149' };
        Object.entries({ cx: W - 12, cy: 12, r: 5, fill: statusColors[node.status] || statusColors.idle, stroke: '#21283b', 'stroke-width': 2 }).forEach(([k, v]) => status.setAttribute(k, v));
        status.setAttribute('class', `node-status ${node.status}`);
        g.appendChild(status);

        // Input ports
        def.ports.in.forEach((port, i) => {
            const py = H / (def.ports.in.length + 1) * (i + 1);
            const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
            Object.entries({ cx: 0, cy: py, r: 6, fill: '#1c2333', stroke: port.type === 'model' ? '#f778ba' : '#f0883e', 'stroke-width': 1.5, cursor: 'crosshair', class: `node-port port-in port-${port.type}` }).forEach(([k, v]) => circle.setAttribute(k, v));
            circle.setAttribute('data-node-id', node.id);
            circle.setAttribute('data-port-id', port.id);
            circle.setAttribute('data-port-dir', 'in');
            g.appendChild(circle);
        });

        // Output ports
        def.ports.out.forEach((port, i) => {
            const py = H / (def.ports.out.length + 1) * (i + 1);
            const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
            Object.entries({ cx: W, cy: py, r: 6, fill: '#1c2333', stroke: port.type === 'model' ? '#f778ba' : '#f0883e', 'stroke-width': 1.5, cursor: 'crosshair', class: `node-port port-out port-${port.type}` }).forEach(([k, v]) => circle.setAttribute(k, v));
            circle.setAttribute('data-node-id', node.id);
            circle.setAttribute('data-port-id', port.id);
            circle.setAttribute('data-port-dir', 'out');
            g.appendChild(circle);
        });

        // Remove existing
        const existing = this.nodesLayer.querySelector(`[data-id="${node.id}"]`);
        if (existing) existing.remove();
        this.nodesLayer.appendChild(g);
    }

    renderConnections() {
        this.connectionsLayer.innerHTML = '';
        this.connections.forEach(conn => {
            const fromNode = this.nodes.get(conn.from.nodeId);
            const toNode = this.nodes.get(conn.to.nodeId);
            if (!fromNode || !toNode) return;

            const fromDef = NODE_REGISTRY[fromNode.type];
            const toDef = NODE_REGISTRY[toNode.type];
            const fromPortIdx = fromDef.ports.out.findIndex(p => p.id === conn.from.portId);
            const toPortIdx = toDef.ports.in.findIndex(p => p.id === conn.to.portId);

            const W = 160, H = 60;
            const x1 = fromNode.x + W;
            const y1 = fromNode.y + H / (fromDef.ports.out.length + 1) * (fromPortIdx + 1);
            const x2 = toNode.x;
            const y2 = toNode.y + H / (toDef.ports.in.length + 1) * (toPortIdx + 1);

            const dx = Math.abs(x2 - x1) * 0.5;
            const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
            path.setAttribute('d', `M${x1},${y1} C${x1 + dx},${y1} ${x2 - dx},${y2} ${x2},${y2}`);
            path.setAttribute('class', `connection-line ${fromNode.status === 'executing' ? 'active' : ''}`);
            path.setAttribute('data-conn-id', conn.id);
            this.connectionsLayer.appendChild(path);
        });
    }

    updateNodeStatus(nodeId) {
        const node = this.nodes.get(nodeId);
        if (!node) return;
        const el = this.nodesLayer.querySelector(`[data-id="${nodeId}"] .node-status`);
        if (el) {
            const colors = { idle: '#8b949e', configured: '#f0883e', executing: '#58a6ff', success: '#3fb950', error: '#f85149' };
            el.setAttribute('fill', colors[node.status] || colors.idle);
            el.setAttribute('class', `node-status ${node.status}`);
        }
    }

    updateStatusBar() {
        document.getElementById('node-count').textContent = `${I18N.currentLang === 'ar' ? 'العقد' : 'Nodes'}: ${this.nodes.size}`;
        document.getElementById('connection-count').textContent = `${I18N.currentLang === 'ar' ? 'الروابط' : 'Connections'}: ${this.connections.length}`;
    }

    getIconChar(iconClass) {
        const map = {
            'fas fa-file-csv': '\uf6dd', 'fas fa-file-excel': '\uf1c3', 'fas fa-file-export': '\uf56e',
            'fas fa-keyboard': '\uf11c', 'fas fa-table-columns': '\uf0db', 'fas fa-filter': '\uf0b0',
            'fas fa-arrow-down-a-z': '\uf15d', 'fas fa-layer-group': '\uf5fd', 'fas fa-code-merge': '\uf387',
            'fas fa-eraser': '\uf12d', 'fas fa-calculator': '\uf1ec', 'fas fa-chart-bar': '\uf080',
            'fas fa-arrows-left-right': '\uf07e', 'fas fa-chart-line': '\uf201', 'fas fa-chart-area': '\uf1fe',
            'fas fa-t': '\u0054', 'fas fa-chart-column': '\ue0e3', 'fas fa-x': '\u0058',
            'fas fa-bell': '\uf0f3', 'fas fa-circle-nodes': '\ue4e2', 'fas fa-sitemap': '\uf0e8',
            'fas fa-tree': '\uf1bb', 'fas fa-wave-square': '\uf83e', 'fas fa-bullseye': '\uf140',
            'fas fa-percent': '\u0025', 'fas fa-table': '\uf0ce', 'fas fa-chart-pie': '\uf200',
            'fas fa-box': '\uf466', 'fas fa-grip': '\uf58d', 'fas fa-brain': '\uf5dc',
            'fas fa-shuffle': '\uf074', 'fas fa-database': '\uf1c0',
            'fas fa-chart-scatter-3d': '\ue0e8'
        };
        return map[iconClass] || '\uf111';
    }

    // Zoom
    setZoom(z) {
        this.zoom = Math.max(0.2, Math.min(3, z));
        this.applyTransform();
    }

    zoomIn() { this.setZoom(this.zoom + 0.1); }
    zoomOut() { this.setZoom(this.zoom - 0.1); }
    zoomFit() { this.setZoom(1); this.panX = 0; this.panY = 0; this.applyTransform(); }
}

// Toast notification
function showToast(message, type = 'info') {
    let container = document.querySelector('.toast-container');
    if (!container) {
        container = document.createElement('div');
        container.className = 'toast-container';
        document.body.appendChild(container);
    }
    const icons = { success: 'fa-circle-check', error: 'fa-circle-xmark', info: 'fa-circle-info' };
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `<i class="fas ${icons[type] || icons.info}"></i><span>${message}</span>`;
    container.appendChild(toast);
    setTimeout(() => { toast.style.animation = 'toastOut 0.3s ease forwards'; setTimeout(() => toast.remove(), 300); }, 3000);
}
