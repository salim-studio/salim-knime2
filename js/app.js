/* ============================================
   app.js - UI Controller & Event Handlers
   ============================================ */

let engine;

document.addEventListener('DOMContentLoaded', () => {
    engine = new WorkflowEngine();
    I18N.init();
    initSidebar();
    initToolbar();
    initCanvas();
    initContextMenu();
    initModals();
    engine.updateStatusBar();
});

// ==========================================
// Sidebar Initialization
// ==========================================
function initSidebar() {
    const categories = getCategories();
    categories.forEach(cat => {
        const catEl = document.querySelector(`.category[data-category="${cat}"]`);
        if (!catEl) return;
        const nodesContainer = catEl.querySelector('.category-nodes');
        const nodes = getNodesByCategory(cat);

        nodes.forEach(nodeDef => {
            const item = document.createElement('div');
            item.className = 'node-item';
            item.setAttribute('data-type', nodeDef.id);
            item.setAttribute('data-category', cat);
            item.setAttribute('draggable', 'true');
            item.innerHTML = `
                <span class="node-icon"><i class="${nodeDef.icon}"></i></span>
                <span class="node-label">${I18N.t(nodeDef.nameKey)}</span>
            `;
            item.addEventListener('dragstart', onNodeDragStart);
            nodesContainer.appendChild(item);
        });

        // Toggle category
        catEl.querySelector('.category-header').addEventListener('click', () => {
            catEl.classList.toggle('collapsed');
        });
    });

    // Search
    document.getElementById('node-search').addEventListener('input', (e) => {
        const q = e.target.value.toLowerCase();
        document.querySelectorAll('.node-item').forEach(item => {
            const label = item.querySelector('.node-label').textContent.toLowerCase();
            const type = item.getAttribute('data-type').toLowerCase();
            item.style.display = (label.includes(q) || type.includes(q)) ? '' : 'none';
        });
    });

    // Toggle sidebar
    document.getElementById('btn-toggle-sidebar').addEventListener('click', () => {
        document.getElementById('sidebar').classList.toggle('collapsed');
    });
}

// ==========================================
// Toolbar
// ==========================================
function initToolbar() {
    document.getElementById('btn-run').addEventListener('click', () => engine.executeAll());
    document.getElementById('btn-stop').addEventListener('click', () => {
        document.getElementById('status-message').textContent = I18N.t('ready');
    });
    document.getElementById('btn-reset').addEventListener('click', () => {
        engine.nodes.forEach(n => { n.status = 'idle'; n.result = null; });
        engine.nodeData.clear();
        engine.renderAll();
        document.getElementById('status-message').textContent = I18N.t('ready');
    });
    document.getElementById('btn-new').addEventListener('click', () => engine.resetWorkflow());
    document.getElementById('btn-save').addEventListener('click', () => engine.saveWorkflow());
    document.getElementById('btn-open').addEventListener('click', () => document.getElementById('file-input-workflow').click());
    document.getElementById('btn-undo').addEventListener('click', () => engine.undo());
    document.getElementById('btn-redo').addEventListener('click', () => engine.redo());
    document.getElementById('btn-zoom-in').addEventListener('click', () => engine.zoomIn());
    document.getElementById('btn-zoom-out').addEventListener('click', () => engine.zoomOut());
    document.getElementById('btn-zoom-fit').addEventListener('click', () => engine.zoomFit());
    document.getElementById('btn-lang').addEventListener('click', () => {
        I18N.toggleLanguage();
        // Re-render sidebar node labels
        document.querySelectorAll('.node-item').forEach(item => {
            const type = item.getAttribute('data-type');
            const def = NODE_REGISTRY[type];
            if (def) item.querySelector('.node-label').textContent = I18N.t(def.nameKey);
        });
        engine.renderAll();
    });

    // Load workflow file
    document.getElementById('file-input-workflow').addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (ev) => engine.loadWorkflow(ev.target.result);
        reader.readAsText(file);
        e.target.value = '';
    });
}

// ==========================================
// Canvas Events
// ==========================================
function initCanvas() {
    const canvas = document.getElementById('workflow-canvas');
    const container = document.getElementById('canvas-container');

    // Drop from sidebar
    container.addEventListener('dragover', (e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'copy'; });
    container.addEventListener('drop', (e) => {
        e.preventDefault();
        const nodeType = e.dataTransfer.getData('nodeType');
        if (!nodeType) return;
        const rect = container.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        engine.addNode(nodeType, x, y);
    });

    // Pan & Node interaction
    let panStartX, panStartY, dragNode = null, dragStartX, dragStartY;

    canvas.addEventListener('mousedown', (e) => {
        const port = e.target.closest('.node-port');
        const nodeEl = e.target.closest('.workflow-node');

        if (port) {
            // Start connection
            e.stopPropagation();
            const dir = port.getAttribute('data-port-dir');
            if (dir === 'out') {
                engine.isConnecting = true;
                engine.connectingFrom = {
                    nodeId: port.getAttribute('data-node-id'),
                    portId: port.getAttribute('data-port-id')
                };
                canvas.classList.add('connecting');
            }
        } else if (nodeEl) {
            // Start drag node
            e.stopPropagation();
            const nodeId = nodeEl.getAttribute('data-id');
            const node = engine.nodes.get(nodeId);
            if (!node) return;

            if (!e.ctrlKey && !e.metaKey) {
                engine.selectedNodes.clear();
            }
            engine.selectedNodes.add(nodeId);
            engine.renderAll();
            showPropertyPanel(nodeId);

            dragNode = node;
            const ctm = canvas.getScreenCTM();
            dragStartX = (e.clientX - ctm.e) / ctm.a - node.x;
            dragStartY = (e.clientY - ctm.f) / ctm.d - node.y;
            engine.isDraggingNode = true;
        } else {
            // Start pan
            engine.isPanning = true;
            panStartX = e.clientX - engine.panX;
            panStartY = e.clientY - engine.panY;
            canvas.classList.add('panning');
            // Deselect
            engine.selectedNodes.clear();
            engine.renderAll();
            clearPropertyPanel();
        }
    });

    canvas.addEventListener('mousemove', (e) => {
        if (engine.isPanning) {
            engine.panX = e.clientX - panStartX;
            engine.panY = e.clientY - panStartY;
            engine.applyTransform();
        } else if (engine.isDraggingNode && dragNode) {
            const ctm = canvas.getScreenCTM();
            dragNode.x = (e.clientX - ctm.e) / ctm.a - dragStartX;
            dragNode.y = (e.clientY - ctm.f) / ctm.d - dragStartY;
            // Snap to grid
            dragNode.x = Math.round(dragNode.x / 20) * 20;
            dragNode.y = Math.round(dragNode.y / 20) * 20;
            engine.renderNode(dragNode);
            engine.renderConnections();
        } else if (engine.isConnecting) {
            // Draw temp connection line
            engine.tempConnLayer.innerHTML = '';
            const fromNode = engine.nodes.get(engine.connectingFrom.nodeId);
            const fromDef = NODE_REGISTRY[fromNode.type];
            const portIdx = fromDef.ports.out.findIndex(p => p.id === engine.connectingFrom.portId);
            const W = 160, H = 60;
            const x1 = fromNode.x + W;
            const y1 = fromNode.y + H / (fromDef.ports.out.length + 1) * (portIdx + 1);
            const ctm = canvas.getScreenCTM();
            const x2 = (e.clientX - ctm.e) / ctm.a;
            const y2 = (e.clientY - ctm.f) / ctm.d;
            const dx = Math.abs(x2 - x1) * 0.4;
            const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
            path.setAttribute('d', `M${x1},${y1} C${x1 + dx},${y1} ${x2 - dx},${y2} ${x2},${y2}`);
            path.setAttribute('class', 'temp-connection');
            engine.tempConnLayer.appendChild(path);
        }
    });

    canvas.addEventListener('mouseup', (e) => {
        if (engine.isConnecting) {
            const port = e.target.closest('.node-port');
            if (port && port.getAttribute('data-port-dir') === 'in') {
                engine.addConnection(
                    engine.connectingFrom.nodeId,
                    engine.connectingFrom.portId,
                    port.getAttribute('data-node-id'),
                    port.getAttribute('data-port-id')
                );
            }
            engine.isConnecting = false;
            engine.connectingFrom = null;
            engine.tempConnLayer.innerHTML = '';
            canvas.classList.remove('connecting');
        }
        if (engine.isDraggingNode) {
            engine.isDraggingNode = false;
            dragNode = null;
            engine.saveUndo();
        }
        if (engine.isPanning) {
            engine.isPanning = false;
            canvas.classList.remove('panning');
        }
    });

    // Zoom with scroll
    container.addEventListener('wheel', (e) => {
        e.preventDefault();
        const delta = e.deltaY > 0 ? -0.05 : 0.05;
        engine.setZoom(engine.zoom + delta);
    });

    // Double-click to open results
    canvas.addEventListener('dblclick', (e) => {
        const nodeEl = e.target.closest('.workflow-node');
        if (nodeEl) {
            const nodeId = nodeEl.getAttribute('data-id');
            const node = engine.nodes.get(nodeId);
            if (node && node.type === 'dataEntry') {
                openDataEntryModal(nodeId);
            } else if (node && node.result) {
                showResultsModal(nodeId);
            }
        }
    });

    // Delete key
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Delete' && engine.selectedNodes.size > 0) {
            [...engine.selectedNodes].forEach(id => engine.deleteNode(id));
        }
        if (e.ctrlKey && e.key === 'z') engine.undo();
        if (e.ctrlKey && e.key === 'y') engine.redo();
    });

    // Click on connection to select/delete
    canvas.addEventListener('click', (e) => {
        if (e.target.classList.contains('connection-line')) {
            const connId = e.target.getAttribute('data-conn-id');
            if (confirm(I18N.currentLang === 'ar' ? 'حذف هذا الرابط؟' : 'Delete this connection?')) {
                engine.deleteConnection(connId);
            }
        }
    });
}

function onNodeDragStart(e) {
    const type = e.target.closest('.node-item').getAttribute('data-type');
    e.dataTransfer.setData('nodeType', type);
    e.dataTransfer.effectAllowed = 'copy';
}

// ==========================================
// Context Menu
// ==========================================
function initContextMenu() {
    const menu = document.getElementById('context-menu');
    let contextNodeId = null;

    document.getElementById('workflow-canvas').addEventListener('contextmenu', (e) => {
        e.preventDefault();
        const nodeEl = e.target.closest('.workflow-node');
        if (nodeEl) {
            contextNodeId = nodeEl.getAttribute('data-id');
            menu.style.display = 'block';
            menu.style.left = e.clientX + 'px';
            menu.style.top = e.clientY + 'px';
        }
    });

    document.addEventListener('click', () => { menu.style.display = 'none'; });

    menu.querySelectorAll('.context-item').forEach(item => {
        item.addEventListener('click', () => {
            if (!contextNodeId) return;
            const action = item.getAttribute('data-action');
            switch (action) {
                case 'delete': engine.deleteNode(contextNodeId); break;
                case 'duplicate': engine.duplicateNode(contextNodeId); break;
                case 'execute':
                    const node = engine.nodes.get(contextNodeId);
                    node.status = 'executing'; engine.updateNodeStatus(contextNodeId);
                    engine.executeNode(contextNodeId).then(() => {
                        node.status = 'success'; engine.updateNodeStatus(contextNodeId);
                        showToast(I18N.t('executionComplete'), 'success');
                    }).catch(err => {
                        node.status = 'error'; engine.updateNodeStatus(contextNodeId);
                        showToast(err.message, 'error');
                    });
                    break;
                case 'viewResults': showResultsModal(contextNodeId); break;
                case 'configure': showPropertyPanel(contextNodeId); break;
            }
            menu.style.display = 'none';
        });
    });
}

// ==========================================
// Property Panel
// ==========================================
function clearPropertyPanel() {
    document.getElementById('panel-content').innerHTML = `
        <div class="panel-empty">
            <i class="fas fa-hand-pointer"></i>
            <p>${I18N.t('selectNode')}</p>
        </div>`;
}

function showPropertyPanel(nodeId) {
    const node = engine.nodes.get(nodeId);
    if (!node) return;
    const def = NODE_REGISTRY[node.type];
    const panel = document.getElementById('panel-content');
    const inputData = engine.getInputData(nodeId);
    const columns = inputData && Array.isArray(inputData) && inputData.length > 0 ? Object.keys(inputData[0]) : [];

    let html = `<div class="config-section">
        <div class="config-section-title"><i class="fas fa-info-circle"></i> ${I18N.t(def.nameKey)}</div>
        <p style="font-size:11px;color:var(--text-muted);margin-bottom:12px;">${def.description}</p></div>`;

    // Generate config form based on node type
    switch (node.type) {
        case 'csvReader':
            html += fileUploadForm(node, '.csv', 'csv');
            break;
        case 'excelReader':
            html += fileUploadForm(node, '.xlsx,.xls', 'excel');
            break;
        case 'dataEntry':
            html += `<div class="form-group">
                <button class="btn-file" onclick="openDataEntryModal('${nodeId}')">
                    <i class="fas fa-table"></i> ${I18N.t('dataEntry')}</button></div>`;
            break;
        case 'columnFilter':
            html += columnMultiSelect('includeColumns', I18N.t('columns'), columns, node.config.includeColumns, nodeId);
            break;
        case 'rowFilter':
            html += columnSelect('column', I18N.t('columns'), columns, node.config.column, nodeId);
            html += selectField('operator', 'Operator', ['equals', 'notEquals', 'greater', 'less', 'contains'], node.config.operator, nodeId);
            html += textField('value', 'Value', node.config.value, nodeId);
            break;
        case 'sorter':
            html += columnSelect('sortColumn', I18N.t('columns'), columns, node.config.sortColumn, nodeId);
            html += selectField('sortOrder', 'Order', ['ascending', 'descending'], node.config.sortOrder, nodeId);
            break;
        case 'missingValue':
            html += selectField('strategy', 'Strategy', ['mean', 'median', 'zero', 'remove'], node.config.strategy, nodeId);
            break;
        case 'groupBy':
            html += columnMultiSelect('groupColumns', I18N.t('columns'), columns, node.config.groupColumns, nodeId);
            break;
        case 'descriptiveStats':
            html += `<div class="form-group"><div class="form-check">
                <input type="checkbox" id="cfg-includeAll" ${node.config.includeAll ? 'checked' : ''} 
                    onchange="updateConfig('${nodeId}','includeAll',this.checked)">
                <label for="cfg-includeAll">${I18N.currentLang === 'ar' ? 'تضمين الكل' : 'Include All'}</label></div></div>`;
            break;
        case 'correlation':
            html += columnMultiSelect('columns', I18N.t('columns'), columns, node.config.columns, nodeId);
            html += selectField('method', 'Method', ['pearson', 'spearman'], node.config.method, nodeId);
            break;
        case 'simpleRegression':
            html += columnSelect('dependentVar', I18N.t('dependentVar'), columns, node.config.dependentVar, nodeId);
            html += columnSelect('independentVar', I18N.currentLang === 'ar' ? 'المتغير المستقل' : 'Independent Var', columns, node.config.independentVar, nodeId);
            break;
        case 'multipleRegression':
            html += columnSelect('dependentVar', I18N.t('dependentVar'), columns, node.config.dependentVar, nodeId);
            // Dependent variable transformation controls
            html += `<div class="form-group" style="display:flex;gap:4px;flex-wrap:wrap;">
                <div style="flex:1;min-width:80px;"><label>${I18N.t('transformation')}</label>
                <select onchange="updateConfig('${nodeId}','depTransform',this.value)" style="width:100%;">
                    <option value="none" ${node.config.depTransform === 'none' ? 'selected' : ''}>--</option>
                    <option value="log" ${node.config.depTransform === 'log' ? 'selected' : ''}>Log</option>
                    <option value="log10" ${node.config.depTransform === 'log10' ? 'selected' : ''}>Log10</option>
                    <option value="sqrt" ${node.config.depTransform === 'sqrt' ? 'selected' : ''}>${I18N.t('squareRoot')}</option>
                    <option value="square" ${node.config.depTransform === 'square' ? 'selected' : ''}>${I18N.t('square')}</option>
                    <option value="inverse" ${node.config.depTransform === 'inverse' ? 'selected' : ''}>${I18N.t('inverse')}</option>
                </select></div>
                <div style="flex:0.6;min-width:55px;"><label>${I18N.t('differencing')}</label>
                <select onchange="updateConfig('${nodeId}','depDiff',parseInt(this.value))" style="width:100%;">
                    <option value="0" ${node.config.depDiff === 0 ? 'selected' : ''}>--</option>
                    <option value="1" ${node.config.depDiff === 1 ? 'selected' : ''}>d=1</option>
                    <option value="2" ${node.config.depDiff === 2 ? 'selected' : ''}>d=2</option>
                </select></div>
                <div style="flex:0.5;min-width:45px;"><label>AR</label>
                <input type="number" min="0" max="5" value="${node.config.depAR || 0}" onchange="updateConfig('${nodeId}','depAR',parseInt(this.value))" style="width:100%;"></div>
                <div style="flex:0.5;min-width:45px;"><label>MA</label>
                <input type="number" min="0" max="5" value="${node.config.depMA || 0}" onchange="updateConfig('${nodeId}','depMA',parseInt(this.value))" style="width:100%;"></div>
            </div>`;
            // Independent variables with per-variable controls
            html += `<div class="form-group"><label>${I18N.t('independentVars')}</label><div class="var-list">`;
            if (columns.length === 0) {
                html += '<div style="padding:8px;color:var(--text-muted);font-size:11px;">No columns available</div>';
            } else {
                columns.forEach(c => {
                    const isSelected = (node.config.independentVars || []).includes(c);
                    const curTransform = (node.config.indepTransforms || {})[c] || 'none';
                    const curDiff = (node.config.indepDiffs || {})[c] || 0;
                    const curAR = (node.config.indepAR || {})[c] || 0;
                    const curMA = (node.config.indepMA || {})[c] || 0;
                    html += `<div class="var-item ${isSelected ? 'selected' : ''}" style="flex-direction:column;align-items:stretch;padding:6px;">
                        <div style="display:flex;align-items:center;gap:6px;cursor:pointer;" onclick="toggleMultiSelect('${nodeId}','independentVars','${c}',this.closest('.var-item'))">
                            <input type="checkbox" ${isSelected ? 'checked' : ''} style="pointer-events:none">
                            <span>${c}</span>
                        </div>
                        ${isSelected ? `<div style="display:flex;gap:3px;margin-top:4px;flex-wrap:wrap;">
                            <select style="flex:1;min-width:55px;font-size:10px;" onchange="updateIndepConfig('${nodeId}','indepTransforms','${c}',this.value)">
                                <option value="none" ${curTransform === 'none' ? 'selected' : ''}>--</option>
                                <option value="log" ${curTransform === 'log' ? 'selected' : ''}>Log</option>
                                <option value="log10" ${curTransform === 'log10' ? 'selected' : ''}>Log10</option>
                                <option value="sqrt" ${curTransform === 'sqrt' ? 'selected' : ''}>√</option>
                                <option value="square" ${curTransform === 'square' ? 'selected' : ''}>x²</option>
                                <option value="inverse" ${curTransform === 'inverse' ? 'selected' : ''}>1/x</option>
                            </select>
                            <select style="flex:0.6;min-width:40px;font-size:10px;" onchange="updateIndepConfig('${nodeId}','indepDiffs','${c}',parseInt(this.value))">
                                <option value="0" ${curDiff === 0 ? 'selected' : ''}>--</option>
                                <option value="1" ${curDiff === 1 ? 'selected' : ''}>d1</option>
                                <option value="2" ${curDiff === 2 ? 'selected' : ''}>d2</option>
                            </select>
                            <input type="number" min="0" max="5" value="${curAR}" placeholder="AR" title="AR" style="width:32px;font-size:10px;" onchange="updateIndepConfig('${nodeId}','indepAR','${c}',parseInt(this.value))">
                            <input type="number" min="0" max="5" value="${curMA}" placeholder="MA" title="MA" style="width:32px;font-size:10px;" onchange="updateIndepConfig('${nodeId}','indepMA','${c}',parseInt(this.value))">
                        </div>` : ''}
                    </div>`;
                });
            }
            html += '</div></div>';
            // Dummy Variable Section
            html += `<div class="form-group" style="border-top:1px solid var(--border-color);padding-top:10px;margin-top:8px;">
                <label style="display:flex;align-items:center;gap:6px;cursor:pointer;">
                    <input type="checkbox" ${node.config.dummyEnabled ? 'checked' : ''} onchange="updateConfig('${nodeId}','dummyEnabled',this.checked);showPropertyPanel('${nodeId}')">
                    <i class="fas fa-calendar-alt"></i> ${I18N.t('dummyVariable')}
                </label>
            </div>`;
            if (node.config.dummyEnabled) {
                html += columnSelect('dummyYearColumn', I18N.t('yearColumn'), columns, node.config.dummyYearColumn, nodeId);
                html += `<div class="form-group"><label>${I18N.t('dummyType')}</label>
                    <select onchange="updateConfig('${nodeId}','dummyType',this.value);showPropertyPanel('${nodeId}')" style="width:100%;">
                        <option value="year" ${node.config.dummyType === 'year' ? 'selected' : ''}>${I18N.t('fullYear')}</option>
                        <option value="quarter" ${node.config.dummyType === 'quarter' ? 'selected' : ''}>${I18N.t('yearQuarter')}</option>
                    </select></div>`;
                // Add year input
                html += `<div class="form-group"><label>${I18N.t('addDummyYear')}</label>
                    <div style="display:flex;gap:4px;align-items:center;">
                        <input type="number" id="dummyYearInput_${nodeId}" placeholder="${I18N.t('year')}" min="1900" max="2100" style="flex:2;">`;
                if (node.config.dummyType === 'quarter') {
                    html += `<select id="dummyQuarterInput_${nodeId}" style="flex:1;">
                        <option value="1">Q1</option><option value="2">Q2</option><option value="3">Q3</option><option value="4">Q4</option>
                    </select>`;
                }
                html += `<button onclick="addDummyYear('${nodeId}')" style="padding:4px 10px;background:var(--accent-color);color:#fff;border:none;border-radius:4px;cursor:pointer;font-size:12px;"><i class="fas fa-plus"></i></button>
                    </div></div>`;
                // Display added dummies
                const dummies = node.config.dummyYears || [];
                if (dummies.length > 0) {
                    html += `<div class="form-group"><label>${I18N.t('addedDummies')}</label><div style="display:flex;flex-wrap:wrap;gap:4px;">`;
                    dummies.forEach((d, idx) => {
                        const label = d.quarter ? `${d.year} Q${d.quarter}` : `${d.year}`;
                        html += `<span style="background:var(--bg-tertiary);padding:3px 8px;border-radius:12px;font-size:11px;display:flex;align-items:center;gap:4px;">
                            <i class="fas fa-tag" style="font-size:9px;color:var(--accent-color);"></i> ${label}
                            <i class="fas fa-times" style="cursor:pointer;font-size:9px;color:var(--status-error);" onclick="removeDummyYear('${nodeId}',${idx})"></i>
                        </span>`;
                    });
                    html += '</div></div>';
                }
            }
            break;
        case 'tTest':
            html += selectField('testType', I18N.t('testType'), ['one-sample', 'independent', 'paired'], node.config.testType, nodeId);
            html += columnSelect('column1', 'Column 1', columns, node.config.column1, nodeId);
            html += columnSelect('column2', 'Column 2', columns, node.config.column2, nodeId);
            html += numberField('mu', 'μ₀', node.config.mu, nodeId);
            html += numberField('alpha', I18N.t('alpha'), node.config.alpha, nodeId);
            break;
        case 'anova':
            html += columnSelect('dependentVar', I18N.t('dependentVar'), columns, node.config.dependentVar, nodeId);
            html += columnSelect('groupVar', I18N.currentLang === 'ar' ? 'متغير المجموعات' : 'Group Variable', columns, node.config.groupVar, nodeId);
            break;
        case 'chiSquare':
            html += columnSelect('column1', 'Column 1', columns, node.config.column1, nodeId);
            html += columnSelect('column2', 'Column 2', columns, node.config.column2, nodeId);
            break;
        case 'normality':
            html += columnSelect('column', I18N.t('columns'), columns, node.config.column, nodeId);
            break;
        case 'knn':
            html += columnSelect('targetColumn', I18N.t('targetColumn'), columns, node.config.targetColumn, nodeId);
            html += columnMultiSelect('features', I18N.t('features'), columns, node.config.features, nodeId);
            html += numberField('nNeighbors', I18N.t('nNeighbors'), node.config.nNeighbors, nodeId);
            break;
        case 'decisionTree':
            html += columnSelect('targetColumn', I18N.t('targetColumn'), columns, node.config.targetColumn, nodeId);
            html += columnMultiSelect('features', I18N.t('features'), columns, node.config.features, nodeId);
            html += numberField('maxDepth', I18N.t('maxDepth'), node.config.maxDepth, nodeId);
            break;
        case 'randomForest':
            html += columnSelect('targetColumn', I18N.t('targetColumn'), columns, node.config.targetColumn, nodeId);
            html += columnMultiSelect('features', I18N.t('features'), columns, node.config.features, nodeId);
            html += numberField('nEstimators', I18N.t('nEstimators'), node.config.nEstimators, nodeId);
            html += numberField('maxDepth', I18N.t('maxDepth'), node.config.maxDepth, nodeId);
            break;
        case 'logisticRegression':
        case 'naiveBayes':
            html += columnSelect('targetColumn', I18N.t('targetColumn'), columns, node.config.targetColumn, nodeId);
            html += columnMultiSelect('features', I18N.t('features'), columns, node.config.features, nodeId);
            break;
        case 'kMeans':
            html += columnMultiSelect('features', I18N.t('features'), columns, node.config.features, nodeId);
            html += numberField('nClusters', I18N.t('nClusters'), node.config.nClusters, nodeId);
            break;
        // View nodes
        case 'scatterPlot':
            html += columnSelect('xColumn', 'X', columns, node.config.xColumn, nodeId);
            html += columnSelect('yColumn', 'Y', columns, node.config.yColumn, nodeId);
            html += textField('title', 'Title', node.config.title, nodeId);
            break;
        case 'barChart':
            html += columnSelect('categoryColumn', 'Category', columns, node.config.categoryColumn, nodeId);
            html += columnSelect('valueColumn', 'Value', columns, node.config.valueColumn, nodeId);
            html += textField('title', 'Title', node.config.title, nodeId);
            break;
        case 'lineChart':
            html += columnSelect('xColumn', 'X', columns, node.config.xColumn, nodeId);
            html += columnMultiSelect('yColumns', 'Y Columns', columns, node.config.yColumns || [], nodeId);
            html += textField('title', 'Title', node.config.title, nodeId);
            break;
        case 'histogram':
            html += columnSelect('column', I18N.t('columns'), columns, node.config.column, nodeId);
            html += numberField('bins', 'Bins', node.config.bins, nodeId);
            html += textField('title', 'Title', node.config.title, nodeId);
            break;
        case 'pieChart':
            html += columnSelect('categoryColumn', 'Category', columns, node.config.categoryColumn, nodeId);
            html += columnSelect('valueColumn', 'Value', columns, node.config.valueColumn, nodeId);
            break;
        case 'boxPlot':
            html += columnMultiSelect('columns', I18N.t('columns'), columns, node.config.columns, nodeId);
            break;
        case 'tableView':
            html += numberField('maxRows', 'Max Rows', node.config.maxRows, nodeId);
            break;
    }

    panel.innerHTML = html;
}

// ==========================================
// Form Helpers
// ==========================================
function updateConfig(nodeId, key, value) {
    const node = engine.nodes.get(nodeId);
    if (node) { node.config[key] = value; node.status = 'configured'; engine.updateNodeStatus(nodeId); }
}

function textField(key, label, value, nodeId) {
    return `<div class="form-group"><label>${label}</label>
        <input type="text" value="${value || ''}" onchange="updateConfig('${nodeId}','${key}',this.value)"></div>`;
}

function numberField(key, label, value, nodeId) {
    return `<div class="form-group"><label>${label}</label>
        <input type="number" value="${value}" onchange="updateConfig('${nodeId}','${key}',parseFloat(this.value))"></div>`;
}

function selectField(key, label, options, value, nodeId) {
    const opts = options.map(o => `<option value="${o}" ${o === value ? 'selected' : ''}>${o}</option>`).join('');
    return `<div class="form-group"><label>${label}</label>
        <select onchange="updateConfig('${nodeId}','${key}',this.value)">${opts}</select></div>`;
}

function columnSelect(key, label, columns, value, nodeId) {
    const opts = ['<option value="">--</option>', ...columns.map(c => `<option value="${c}" ${c === value ? 'selected' : ''}>${c}</option>`)].join('');
    return `<div class="form-group"><label>${label}</label>
        <select onchange="updateConfig('${nodeId}','${key}',this.value)">${opts}</select></div>`;
}

function columnMultiSelect(key, label, columns, selected, nodeId) {
    const items = columns.map(c => `
        <div class="var-item ${selected.includes(c) ? 'selected' : ''}" onclick="toggleMultiSelect('${nodeId}','${key}','${c}',this)">
            <input type="checkbox" ${selected.includes(c) ? 'checked' : ''} style="pointer-events:none">
            <span>${c}</span></div>`).join('');
    return `<div class="form-group"><label>${label}</label><div class="var-list">${items || '<div style="padding:8px;color:var(--text-muted);font-size:11px;">No columns available</div>'}</div></div>`;
}

function toggleMultiSelect(nodeId, key, col, el) {
    const node = engine.nodes.get(nodeId);
    if (!node) return;
    const arr = node.config[key] || [];
    const idx = arr.indexOf(col);
    if (idx >= 0) arr.splice(idx, 1); else arr.push(col);
    node.config[key] = arr;
    node.status = 'configured';
    engine.updateNodeStatus(nodeId);
    // For multipleRegression, re-render panel to show/hide per-variable controls
    if (node.type === 'multipleRegression') {
        showPropertyPanel(nodeId);
    } else {
        el.classList.toggle('selected');
        el.querySelector('input').checked = !el.querySelector('input').checked;
    }
}

function updateIndepConfig(nodeId, configKey, varName, value) {
    const node = engine.nodes.get(nodeId);
    if (!node) return;
    if (!node.config[configKey]) node.config[configKey] = {};
    node.config[configKey][varName] = value;
    node.status = 'configured';
    engine.updateNodeStatus(nodeId);
}

function addDummyYear(nodeId) {
    const node = engine.nodes.get(nodeId);
    if (!node) return;
    const yearInput = document.getElementById(`dummyYearInput_${nodeId}`);
    const year = parseInt(yearInput.value);
    if (isNaN(year) || year < 1900 || year > 2100) return;
    if (!node.config.dummyYears) node.config.dummyYears = [];
    const entry = { year };
    if (node.config.dummyType === 'quarter') {
        const quarterInput = document.getElementById(`dummyQuarterInput_${nodeId}`);
        entry.quarter = parseInt(quarterInput.value);
    }
    // Avoid duplicates
    const exists = node.config.dummyYears.some(d => d.year === entry.year && d.quarter === entry.quarter);
    if (!exists) {
        node.config.dummyYears.push(entry);
        node.status = 'configured';
        engine.updateNodeStatus(nodeId);
        showPropertyPanel(nodeId);
    }
}

function removeDummyYear(nodeId, idx) {
    const node = engine.nodes.get(nodeId);
    if (!node) return;
    node.config.dummyYears.splice(idx, 1);
    node.status = 'configured';
    engine.updateNodeStatus(nodeId);
    showPropertyPanel(nodeId);
}

function fileUploadForm(node, accept, type) {
    return `<div class="form-group">
        <label>${I18N.t('selectFile')}</label>
        <button class="btn-file" onclick="document.getElementById('file-upload-${node.id}').click()">
            <i class="fas fa-upload"></i> ${I18N.t('dragDrop')}</button>
        <input type="file" id="file-upload-${node.id}" accept="${accept}" style="display:none" 
            onchange="handleFileUpload('${node.id}','${type}',this)">
        ${node.config._fileName ? `<p style="margin-top:6px;font-size:11px;color:var(--text-accent);">${node.config._fileName}</p>` : ''}
    </div>`;
}

function handleFileUpload(nodeId, type, input) {
    const file = input.files[0];
    if (!file) return;
    const node = engine.nodes.get(nodeId);

    if (type === 'csv') {
        const reader = new FileReader();
        reader.onload = (e) => {
            const text = e.target.result;
            const lines = text.split('\n').filter(l => l.trim());
            const delimiter = node.config.delimiter || ',';
            const headers = node.config.hasHeader !== false ? lines[0].split(delimiter).map(h => h.trim().replace(/"/g, '')) : lines[0].split(delimiter).map((_, i) => `Col${i + 1}`);
            const startIdx = node.config.hasHeader !== false ? 1 : 0;
            const data = [];
            for (let i = startIdx; i < lines.length; i++) {
                const vals = lines[i].split(delimiter);
                const row = {};
                headers.forEach((h, j) => row[h] = vals[j] ? vals[j].trim().replace(/"/g, '') : '');
                data.push(row);
            }
            node.config._loadedData = data;
            node.config._fileName = file.name;
            node.status = 'configured';
            engine.updateNodeStatus(nodeId);
            showPropertyPanel(nodeId);
            showToast(`${file.name} loaded (${data.length} rows)`, 'success');
        };
        reader.readAsText(file);
    } else if (type === 'excel') {
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const wb = XLSX.read(e.target.result, { type: 'array' });
                const ws = wb.Sheets[wb.SheetNames[0]];
                const data = XLSX.utils.sheet_to_json(ws);
                node.config._loadedData = data;
                node.config._fileName = file.name;
                node.status = 'configured';
                engine.updateNodeStatus(nodeId);
                showPropertyPanel(nodeId);
                showToast(`${file.name} loaded (${data.length} rows)`, 'success');
            } catch (err) { showToast('Error reading Excel file', 'error'); }
        };
        reader.readAsArrayBuffer(file);
    }
}

// ==========================================
// Data Entry Modal
// ==========================================
function initModals() {
    document.getElementById('btn-close-modal')?.addEventListener('click', () => {
        document.getElementById('results-modal').style.display = 'none';
    });
    document.querySelectorAll('.modal-overlay').forEach(ov => {
        ov.addEventListener('click', () => ov.parentElement.style.display = 'none');
    });
}

let currentDataEntryNodeId = null;

function openDataEntryModal(nodeId) {
    currentDataEntryNodeId = nodeId;
    const node = engine.nodes.get(nodeId);
    const modal = document.getElementById('data-entry-modal');
    modal.style.display = 'flex';

    let data = node.config.data;
    let columns = node.config.columns || ['Var1', 'Var2', 'Var3'];
    const rows = node.config.rows || 5;

    if (!data) {
        data = [];
        for (let i = 0; i < rows; i++) {
            const row = {};
            columns.forEach(c => row[c] = '');
            data.push(row);
        }
    } else {
        columns = Object.keys(data[0]);
    }

    renderSpreadsheet(data, columns);

    document.getElementById('btn-add-row').onclick = () => {
        const row = {};
        columns.forEach(c => row[c] = '');
        data.push(row);
        renderSpreadsheet(data, columns);
    };

    document.getElementById('btn-add-col').onclick = () => {
        const name = prompt(I18N.currentLang === 'ar' ? 'اسم العمود:' : 'Column name:') || `Var${columns.length + 1}`;
        columns.push(name);
        data.forEach(row => row[name] = '');
        renderSpreadsheet(data, columns);
    };

    document.getElementById('btn-save-data').onclick = () => {
        const tableData = collectSpreadsheetData(columns);
        node.config.data = tableData;
        node.config.columns = columns;
        node.config._loadedData = tableData;
        node.status = 'configured';
        engine.updateNodeStatus(nodeId);
        modal.style.display = 'none';
        showToast(I18N.t('dataSaved'), 'success');
    };

    document.getElementById('btn-cancel-data').onclick = () => { modal.style.display = 'none'; };

    document.getElementById('btn-import-file').onclick = () => {
        document.getElementById('file-input-import').click();
    };

    document.getElementById('file-input-import').onchange = (e) => {
        const file = e.target.files[0]; if (!file) return;
        const reader = new FileReader();
        if (file.name.endsWith('.csv')) {
            reader.onload = (ev) => {
                const lines = ev.target.result.split('\n').filter(l => l.trim());
                const cols = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
                const rows = [];
                for (let i = 1; i < lines.length; i++) {
                    const vals = lines[i].split(',');
                    const row = {};
                    cols.forEach((c, j) => row[c] = vals[j] ? vals[j].trim().replace(/"/g, '') : '');
                    rows.push(row);
                }
                columns.length = 0; cols.forEach(c => columns.push(c));
                data.length = 0; rows.forEach(r => data.push(r));
                renderSpreadsheet(data, columns);
            };
            reader.readAsText(file);
        } else {
            reader.onload = (ev) => {
                const wb = XLSX.read(ev.target.result, { type: 'array' });
                const ws = wb.Sheets[wb.SheetNames[0]];
                const rows = XLSX.utils.sheet_to_json(ws);
                if (rows.length > 0) {
                    const cols = Object.keys(rows[0]);
                    columns.length = 0; cols.forEach(c => columns.push(c));
                    data.length = 0; rows.forEach(r => data.push(r));
                    renderSpreadsheet(data, columns);
                }
            };
            reader.readAsArrayBuffer(file);
        }
        e.target.value = '';
    };
}

function renderSpreadsheet(data, columns) {
    const container = document.getElementById('spreadsheet-container');
    let html = '<table><thead><tr><th class="row-number">#</th>';
    columns.forEach(c => html += `<th>${c}</th>`);
    html += '</tr></thead><tbody>';
    data.forEach((row, i) => {
        html += `<tr><td class="row-number">${i + 1}</td>`;
        columns.forEach(c => html += `<td><input type="text" value="${row[c] || ''}" data-row="${i}" data-col="${c}"></td>`);
        html += '</tr>';
    });
    html += '</tbody></table>';
    container.innerHTML = html;
}

function collectSpreadsheetData(columns) {
    const inputs = document.querySelectorAll('#spreadsheet-container input');
    const data = [];
    const rows = {};
    inputs.forEach(inp => {
        const r = parseInt(inp.getAttribute('data-row'));
        const c = inp.getAttribute('data-col');
        if (!rows[r]) rows[r] = {};
        rows[r][c] = inp.value;
    });
    Object.keys(rows).sort((a, b) => a - b).forEach(r => data.push(rows[r]));
    return data;
}

// ==========================================
// Results Modal
// ==========================================
function showResultsModal(nodeId) {
    const node = engine.nodes.get(nodeId);
    if (!node || !node.result) { showToast(I18N.t('noDataAvailable'), 'info'); return; }
    const def = NODE_REGISTRY[node.type];
    const modal = document.getElementById('results-modal');
    const title = document.getElementById('modal-title');
    const body = document.getElementById('modal-body');
    title.textContent = I18N.t(def.nameKey) + ' - ' + I18N.t('results');
    body.innerHTML = '';

    const inputData = engine.getInputData(nodeId);

    switch (node.type) {
        case 'descriptiveStats':
            body.innerHTML = renderDescriptiveResults(node.result);
            break;
        case 'correlation':
            body.innerHTML = renderCorrelationResults(node.result);
            break;
        case 'simpleRegression':
        case 'multipleRegression':
            body.innerHTML = renderRegressionResults(node.result, node.type);
            break;
        case 'tTest':
            body.innerHTML = renderTTestResults(node.result, node.config);
            break;
        case 'anova':
            body.innerHTML = renderAnovaResults(node.result);
            break;
        case 'chiSquare':
            body.innerHTML = renderChiSquareResults(node.result);
            break;
        case 'normality':
            body.innerHTML = renderNormalityResults(node.result);
            break;
        case 'knn': case 'decisionTree': case 'randomForest':
        case 'logisticRegression': case 'naiveBayes':
            body.innerHTML = renderMLResults(node.result, def.nameKey);
            break;
        case 'kMeans':
            body.innerHTML = renderKMeansResults(node.result);
            break;
        // View nodes with charts
        case 'scatterPlot': case 'barChart': case 'lineChart':
        case 'histogram': case 'pieChart': case 'boxPlot':
            body.innerHTML = '<div class="chart-container"><canvas id="result-chart"></canvas></div>';
            setTimeout(() => renderChart(node, inputData), 100);
            break;
        case 'tableView':
            body.innerHTML = renderTableView(inputData, node.config.maxRows);
            break;
        default:
            if (Array.isArray(node.result)) {
                body.innerHTML = renderTableView(node.result, 50);
            } else {
                body.innerHTML = `<pre style="color:var(--text-primary);font-family:var(--font-mono);font-size:11px;">${JSON.stringify(node.result, null, 2)}</pre>`;
            }
    }

    modal.style.display = 'flex';
}

// ==========================================
// Result Renderers
// ==========================================
function renderDescriptiveResults(results) {
    const stats = ['count', 'mean', 'median', 'stdDev', 'variance', 'min', 'max', 'range', 'sum', 'skewness', 'kurtosis', 'q1', 'q2', 'q3', 'iqr', 'sem'];
    let html = '<table class="results-table"><thead><tr><th>Statistic</th>';
    Object.keys(results).forEach(col => html += `<th>${col}</th>`);
    html += '</tr></thead><tbody>';
    stats.forEach(s => {
        html += `<tr><td style="font-weight:600;font-family:var(--font-sans);">${I18N.t(s) || s}</td>`;
        Object.keys(results).forEach(col => {
            const v = results[col]?.[s];
            html += `<td>${v !== undefined ? (typeof v === 'number' ? v.toFixed(4) : v) : '-'}</td>`;
        });
        html += '</tr>';
    });
    return html + '</tbody></table>';
}

function renderCorrelationResults(result) {
    const { matrix, columns } = result;
    let html = '<table class="results-table"><thead><tr><th></th>';
    columns.forEach(c => html += `<th>${c}</th>`);
    html += '</tr></thead><tbody>';
    columns.forEach(c1 => {
        html += `<tr><td style="font-weight:600;">${c1}</td>`;
        columns.forEach(c2 => {
            const r = matrix[c1]?.[c2]?.r || 0;
            const color = r > 0.5 ? 'var(--status-success)' : r < -0.5 ? 'var(--status-error)' : 'var(--text-primary)';
            html += `<td style="color:${color}">${r.toFixed(4)}</td>`;
        });
        html += '</tr>';
    });
    return html + '</tbody></table>';
}

function renderRegressionResults(result, type) {
    if (result.error) return `<p style="color:var(--status-error)">${result.error}</p>`;
    const isAr = I18N.currentLang === 'ar';
    const yesNo = (v) => v ? (isAr ? 'نعم' : 'Yes') : (isAr ? 'لا' : 'No');
    let html = '<div class="results-section"><h4><i class="fas fa-chart-line"></i> ' + (isAr ? 'ملخص النموذج' : 'Model Summary') + '</h4>';
    html += `<table class="results-table"><tbody>
        <tr><td>R²</td><td class="result-value">${result.rSquared.toFixed(4)}</td></tr>
        <tr><td>${isAr ? 'R² المعدل' : 'Adjusted R²'}</td><td>${result.adjustedRSquared.toFixed(4)}</td></tr>
        <tr><td>${I18N.t('fStatistic')}</td><td>${result.fStatistic.toFixed(4)}</td></tr>
        <tr><td>P-Value (F)</td><td class="${result.pValue < 0.05 ? 'result-significant' : 'result-not-significant'}">${result.pValue.toFixed(6)}</td></tr>
        <tr><td>${isAr ? 'المعنوية الكلية (فيشر)' : 'Overall Significance (Fisher)'}</td><td class="${result.modelSignificant ? 'result-significant' : 'result-not-significant'}" style="font-weight:700;">${yesNo(result.modelSignificant)}</td></tr>
        <tr><td>${isAr ? 'ديربن واتسون' : 'Durbin-Watson'}</td><td>${result.durbinWatson !== undefined ? result.durbinWatson.toFixed(4) : '-'}</td></tr>
        <tr><td>N</td><td>${result.n}</td></tr>
        <tr><td>RMSE</td><td>${result.rmse.toFixed(4)}</td></tr>
        </tbody></table></div>`;

    // Regression Equation
    if (result.equation) {
        html += `<div class="results-section"><h4><i class="fas fa-equals"></i> ${isAr ? 'معادلة الانحدار' : 'Regression Equation'}</h4>
            <div style="background:var(--bg-secondary);padding:10px 14px;border-radius:8px;font-family:var(--font-mono);font-size:12px;color:var(--text-accent);word-break:break-all;direction:ltr;text-align:left;">${result.equation}</div></div>`;
    }

    // Coefficients table with significance column
    html += '<div class="results-section"><h4><i class="fas fa-list"></i> ' + (isAr ? 'المعاملات' : 'Coefficients') + '</h4>';
    html += `<table class="results-table"><thead><tr><th>${isAr ? 'المتغير' : 'Variable'}</th><th>${isAr ? 'المعامل' : 'Coef.'}</th><th>Std.Err</th><th>t</th><th>P-Value</th><th>${isAr ? 'المعنوية' : 'Sig.'}</th></tr></thead><tbody>`;
    if (type === 'simpleRegression') {
        const r = result;
        html += `<tr><td>Intercept</td><td>${r.intercept.value.toFixed(4)}</td><td>${r.intercept.se.toFixed(4)}</td><td>${r.intercept.t.toFixed(4)}</td><td class="${r.intercept.p < 0.05 ? 'result-significant' : 'result-not-significant'}">${r.intercept.p.toFixed(6)}</td><td class="${r.intercept.p < 0.05 ? 'result-significant' : 'result-not-significant'}" style="font-weight:700;">${yesNo(r.intercept.p < 0.05)}</td></tr>`;
        html += `<tr><td>Slope</td><td>${r.slope.value.toFixed(4)}</td><td>${r.slope.se.toFixed(4)}</td><td>${r.slope.t.toFixed(4)}</td><td class="${r.slope.p < 0.05 ? 'result-significant' : 'result-not-significant'}">${r.slope.p.toFixed(6)}</td><td class="${r.slope.p < 0.05 ? 'result-significant' : 'result-not-significant'}" style="font-weight:700;">${yesNo(r.slope.p < 0.05)}</td></tr>`;
    } else if (result.coefficients) {
        result.coefficients.forEach(c => {
            html += `<tr><td>${c.name}</td><td>${c.value.toFixed(4)}</td><td>${c.se.toFixed(4)}</td><td>${c.t.toFixed(4)}</td><td class="${c.p < 0.05 ? 'result-significant' : 'result-not-significant'}">${c.p.toFixed(6)}</td><td class="${c.significant ? 'result-significant' : 'result-not-significant'}" style="font-weight:700;">${yesNo(c.significant)}</td></tr>`;
        });
    }
    html += '</tbody></table></div>';

    // Model Diagnostics
    if (result.diagnostics) {
        const d = result.diagnostics;
        html += `<div class="results-section"><h4><i class="fas fa-stethoscope"></i> ${isAr ? 'تشخيص النموذج' : 'Model Diagnostics'}</h4>`;
        html += `<table class="results-table"><thead><tr><th>${isAr ? 'الاختبار' : 'Test'}</th><th>${isAr ? 'الإحصائية' : 'Statistic'}</th><th>P-Value</th><th>${isAr ? 'النتيجة' : 'Result'}</th></tr></thead><tbody>`;
        // Jarque-Bera
        if (d.jarqueBera) {
            const jb = d.jarqueBera;
            const isNormal = jb.pValue >= 0.05;
            html += `<tr><td>Jarque-Bera (${isAr ? 'التوزيع الطبيعي' : 'Normality'})</td><td>${jb.jb.toFixed(4)}</td><td class="${isNormal ? 'result-significant' : 'result-not-significant'}">${jb.pValue.toFixed(6)}</td><td class="${isNormal ? 'result-significant' : 'result-not-significant'}" style="font-weight:700;">${isNormal ? (isAr ? 'طبيعي' : 'Normal') : (isAr ? 'غير طبيعي' : 'Not Normal')}</td></tr>`;
        }
        // Serial Correlation (Breusch-Godfrey)
        if (d.serialCorrelation) {
            const bg = d.serialCorrelation;
            const noCorr = bg.pValue >= 0.05;
            html += `<tr><td>Breusch-Godfrey (${isAr ? 'الارتباط التسلسلي' : 'Serial Correlation'})</td><td>${bg.lm.toFixed(4)}</td><td class="${noCorr ? 'result-significant' : 'result-not-significant'}">${bg.pValue.toFixed(6)}</td><td class="${noCorr ? 'result-significant' : 'result-not-significant'}" style="font-weight:700;">${noCorr ? (isAr ? 'لا يوجد' : 'No Serial Corr.') : (isAr ? 'يوجد' : 'Serial Corr. Detected')}</td></tr>`;
        }
        // Heteroskedasticity (Breusch-Pagan)
        if (d.heteroskedasticity) {
            const bp = d.heteroskedasticity;
            const isHomosked = bp.pValue >= 0.05;
            html += `<tr><td>Breusch-Pagan (${isAr ? 'عدم تجانس التباين' : 'Heteroskedasticity'})</td><td>${bp.lm.toFixed(4)}</td><td class="${isHomosked ? 'result-significant' : 'result-not-significant'}">${bp.pValue.toFixed(6)}</td><td class="${isHomosked ? 'result-significant' : 'result-not-significant'}" style="font-weight:700;">${isHomosked ? (isAr ? 'متجانس' : 'Homoskedastic') : (isAr ? 'غير متجانس' : 'Heteroskedastic')}</td></tr>`;
        }
        html += '</tbody></table></div>';
    }

    return html;
}

function renderTTestResults(result, config) {
    return `<div class="results-section"><h4><i class="fas fa-t"></i> T-Test Results (${config.testType})</h4>
        <table class="results-table"><tbody>
        <tr><td>t-Statistic</td><td class="result-value">${result.t.toFixed(4)}</td></tr>
        <tr><td>Degrees of Freedom</td><td>${typeof result.df === 'number' ? result.df.toFixed(2) : result.df}</td></tr>
        <tr><td>P-Value</td><td class="${result.pValue < 0.05 ? 'result-significant' : 'result-not-significant'}">${result.pValue.toFixed(6)}</td></tr>
        ${result.meanDiff !== undefined ? `<tr><td>Mean Difference</td><td>${result.meanDiff.toFixed(4)}</td></tr>` : ''}
        <tr><td>Result</td><td class="${result.pValue < 0.05 ? 'result-significant' : 'result-not-significant'}">${result.pValue < 0.05 ? I18N.t('significant') : I18N.t('notSignificant')}</td></tr>
        </tbody></table></div>`;
}

function renderAnovaResults(result) {
    return `<div class="results-section"><h4><i class="fas fa-chart-column"></i> ANOVA</h4>
        <table class="results-table"><thead><tr><th>Source</th><th>SS</th><th>df</th><th>MS</th><th>F</th><th>P-Value</th></tr></thead><tbody>
        <tr><td>Between</td><td>${result.ssBetween.toFixed(4)}</td><td>${result.dfBetween}</td><td>${result.msBetween.toFixed(4)}</td><td class="result-value">${result.fStatistic.toFixed(4)}</td><td class="${result.pValue < 0.05 ? 'result-significant' : 'result-not-significant'}">${result.pValue.toFixed(6)}</td></tr>
        <tr><td>Within</td><td>${result.ssWithin.toFixed(4)}</td><td>${result.dfWithin}</td><td>${result.msWithin.toFixed(4)}</td><td></td><td></td></tr>
        </tbody></table></div>`;
}

function renderChiSquareResults(result) {
    return `<div class="results-section"><h4><i class="fas fa-x"></i> Chi-Square Test</h4>
        <table class="results-table"><tbody>
        <tr><td>χ²</td><td class="result-value">${result.chiSquare.toFixed(4)}</td></tr>
        <tr><td>df</td><td>${result.df}</td></tr>
        <tr><td>P-Value</td><td class="${result.pValue < 0.05 ? 'result-significant' : 'result-not-significant'}">${result.pValue.toFixed(6)}</td></tr>
        <tr><td>Cramer's V</td><td>${result.cramersV.toFixed(4)}</td></tr>
        </tbody></table></div>`;
}

function renderNormalityResults(result) {
    return `<div class="results-section"><h4><i class="fas fa-bell"></i> Normality Test (Jarque-Bera)</h4>
        <table class="results-table"><tbody>
        <tr><td>JB Statistic</td><td class="result-value">${result.jb.toFixed(4)}</td></tr>
        <tr><td>P-Value</td><td class="${result.pValue < 0.05 ? 'result-significant' : 'result-not-significant'}">${result.pValue.toFixed(6)}</td></tr>
        <tr><td>Skewness</td><td>${result.skewness.toFixed(4)}</td></tr>
        <tr><td>Kurtosis</td><td>${result.kurtosis.toFixed(4)}</td></tr>
        <tr><td>N</td><td>${result.n}</td></tr>
        </tbody></table></div>`;
}

function renderMLResults(result, nameKey) {
    let html = `<div class="results-section"><h4><i class="fas fa-brain"></i> ${I18N.t(nameKey)}</h4>
        <table class="results-table"><tbody>
        <tr><td>Accuracy</td><td class="result-value">${(result.accuracy * 100).toFixed(2)}%</td></tr>
        <tr><td>Train Size</td><td>${result.trainSize}</td></tr>
        <tr><td>Test Size</td><td>${result.testSize}</td></tr>
        </tbody></table></div>`;

    // Confusion matrix
    if (result.confusionMatrix) {
        const cm = result.confusionMatrix;
        html += '<div class="results-section"><h4><i class="fas fa-grip"></i> Confusion Matrix</h4>';
        html += '<table class="results-table"><thead><tr><th></th>';
        cm.classes.forEach(c => html += `<th>Pred: ${c}</th>`);
        html += '</tr></thead><tbody>';
        cm.classes.forEach(actual => {
            html += `<tr><td style="font-weight:600;">Actual: ${actual}</td>`;
            cm.classes.forEach(pred => html += `<td>${cm.matrix[actual]?.[pred] || 0}</td>`);
            html += '</tr>';
        });
        html += '</tbody></table></div>';
    }
    return html;
}

function renderKMeansResults(result) {
    let html = `<div class="results-section"><h4><i class="fas fa-bullseye"></i> K-Means</h4>
        <table class="results-table"><tbody>
        <tr><td>K</td><td>${result.k}</td></tr>
        <tr><td>Inertia</td><td class="result-value">${result.inertia.toFixed(4)}</td></tr>
        </tbody></table></div>`;
    return html;
}

function renderTableView(data, maxRows = 50) {
    if (!data || !Array.isArray(data) || data.length === 0) return '<p style="color:var(--text-muted)">No data</p>';
    const cols = Object.keys(data[0]);
    const rows = data.slice(0, maxRows);
    let html = `<p style="font-size:11px;color:var(--text-muted);margin-bottom:8px;">${data.length} rows × ${cols.length} columns</p>`;
    html += '<table class="results-table"><thead><tr>';
    cols.forEach(c => html += `<th>${c}</th>`);
    html += '</tr></thead><tbody>';
    rows.forEach(row => {
        html += '<tr>';
        cols.forEach(c => html += `<td>${row[c] !== undefined ? row[c] : ''}</td>`);
        html += '</tr>';
    });
    return html + '</tbody></table>';
}

// ==========================================
// Chart Rendering
// ==========================================
function renderChart(node, data) {
    if (!data || !Array.isArray(data) || data.length === 0) return;
    const ctx = document.getElementById('result-chart');
    if (!ctx) return;
    const colors = ['#6c7ae0', '#f0883e', '#3fb950', '#f778ba', '#79c0ff', '#d29922', '#a371f7', '#f85149'];

    Chart.defaults.color = '#8b949e';
    Chart.defaults.borderColor = '#30363d';

    switch (node.type) {
        case 'scatterPlot': {
            const x = data.map(r => parseFloat(r[node.config.xColumn]));
            const y = data.map(r => parseFloat(r[node.config.yColumn]));
            new Chart(ctx, {
                type: 'scatter', data: { datasets: [{ data: x.map((xi, i) => ({ x: xi, y: y[i] })), backgroundColor: '#6c7ae0', pointRadius: 4 }] },
                options: {
                    responsive: true, plugins: { legend: { display: false }, title: { display: !!node.config.title, text: node.config.title, color: '#e6edf3' } },
                    scales: { x: { title: { display: true, text: node.config.xColumn, color: '#8b949e' } }, y: { title: { display: true, text: node.config.yColumn, color: '#8b949e' } } }
                }
            });
            break;
        }
        case 'barChart': {
            const cats = [...new Set(data.map(r => r[node.config.categoryColumn]))];
            const vals = cats.map(c => {
                const rows = data.filter(r => r[node.config.categoryColumn] === c);
                return rows.reduce((s, r) => s + (parseFloat(r[node.config.valueColumn]) || 0), 0);
            });
            new Chart(ctx, {
                type: 'bar', data: { labels: cats, datasets: [{ data: vals, backgroundColor: colors.slice(0, cats.length), borderRadius: 6 }] },
                options: { responsive: true, plugins: { legend: { display: false }, title: { display: !!node.config.title, text: node.config.title, color: '#e6edf3' } } }
            });
            break;
        }
        case 'lineChart': {
            const labels = data.map(r => r[node.config.xColumn]);
            const datasets = (node.config.yColumns || []).map((col, i) => ({
                label: col, data: data.map(r => parseFloat(r[col])),
                borderColor: colors[i % colors.length], backgroundColor: colors[i % colors.length] + '20', tension: 0.3, fill: false, pointRadius: 2
            }));
            new Chart(ctx, {
                type: 'line', data: { labels, datasets },
                options: { responsive: true, plugins: { title: { display: !!node.config.title, text: node.config.title, color: '#e6edf3' } } }
            });
            break;
        }
        case 'histogram': {
            const vals = data.map(r => parseFloat(r[node.config.column])).filter(v => !isNaN(v));
            const bins = node.config.bins || 10;
            const min = Math.min(...vals), max = Math.max(...vals);
            const binWidth = (max - min) / bins;
            const binCounts = new Array(bins).fill(0);
            vals.forEach(v => { const idx = Math.min(Math.floor((v - min) / binWidth), bins - 1); binCounts[idx]++; });
            const labels = binCounts.map((_, i) => (min + i * binWidth).toFixed(1));
            new Chart(ctx, {
                type: 'bar', data: { labels, datasets: [{ data: binCounts, backgroundColor: '#6c7ae0', borderRadius: 2 }] },
                options: { responsive: true, plugins: { legend: { display: false }, title: { display: !!node.config.title, text: node.config.title, color: '#e6edf3' } } }
            });
            break;
        }
        case 'pieChart': {
            const cats = [...new Set(data.map(r => r[node.config.categoryColumn]))];
            const vals = cats.map(c => data.filter(r => r[node.config.categoryColumn] === c).reduce((s, r) => s + (parseFloat(r[node.config.valueColumn]) || 0), 0));
            new Chart(ctx, {
                type: 'doughnut', data: { labels: cats, datasets: [{ data: vals, backgroundColor: colors }] },
                options: { responsive: true, plugins: { title: { display: !!node.config.title, text: node.config.title, color: '#e6edf3' } } }
            });
            break;
        }
        case 'boxPlot': {
            const cols = node.config.columns || [];
            let html = '<div class="results-section">';
            cols.forEach(col => {
                const vals = data.map(r => parseFloat(r[col])).filter(v => !isNaN(v));
                const desc = Stats.descriptive(vals);
                if (desc) {
                    html += `<h4>${col}</h4><table class="results-table"><tbody>
                        <tr><td>Min</td><td>${desc.min.toFixed(4)}</td></tr>
                        <tr><td>Q1</td><td>${desc.q1.toFixed(4)}</td></tr>
                        <tr><td>Median</td><td>${desc.median.toFixed(4)}</td></tr>
                        <tr><td>Q3</td><td>${desc.q3.toFixed(4)}</td></tr>
                        <tr><td>Max</td><td>${desc.max.toFixed(4)}</td></tr>
                        </tbody></table>`;
                }
            });
            ctx.parentElement.innerHTML = html + '</div>';
            break;
        }
    }
}
