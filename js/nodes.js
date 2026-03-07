/* ============================================
   nodes.js - Node Definitions Registry
   ============================================ */

const NODE_REGISTRY = {
    // ==========================================
    // IO Nodes
    // ==========================================
    csvReader: {
        id: 'csvReader',
        nameKey: 'csvReader',
        category: 'io',
        icon: 'fas fa-file-csv',
        color: '#f0883e',
        ports: {
            in: [],
            out: [{ id: 'data', type: 'data', label: 'Data' }]
        },
        defaultConfig: {
            filePath: '',
            hasHeader: true,
            delimiter: ',',
            encoding: 'utf-8'
        },
        description: 'Read data from a CSV file'
    },

    excelReader: {
        id: 'excelReader',
        nameKey: 'excelReader',
        category: 'io',
        icon: 'fas fa-file-excel',
        color: '#3fb950',
        ports: {
            in: [],
            out: [{ id: 'data', type: 'data', label: 'Data' }]
        },
        defaultConfig: {
            filePath: '',
            sheetName: '',
            hasHeader: true
        },
        description: 'Read data from an Excel file'
    },

    csvWriter: {
        id: 'csvWriter',
        nameKey: 'csvWriter',
        category: 'io',
        icon: 'fas fa-file-export',
        color: '#f0883e',
        ports: {
            in: [{ id: 'data', type: 'data', label: 'Data' }],
            out: []
        },
        defaultConfig: {
            fileName: 'output.csv',
            delimiter: ',',
            includeHeader: true
        },
        description: 'Write data to a CSV file'
    },

    dataEntry: {
        id: 'dataEntry',
        nameKey: 'dataEntry',
        category: 'io',
        icon: 'fas fa-keyboard',
        color: '#a371f7',
        ports: {
            in: [],
            out: [{ id: 'data', type: 'data', label: 'Data' }]
        },
        defaultConfig: {
            data: null,
            columns: ['Var1', 'Var2', 'Var3'],
            rows: 5
        },
        description: 'Manually enter data in a spreadsheet'
    },

    // ==========================================
    // Transform Nodes
    // ==========================================
    columnFilter: {
        id: 'columnFilter',
        nameKey: 'columnFilter',
        category: 'transform',
        icon: 'fas fa-table-columns',
        color: '#a371f7',
        ports: {
            in: [{ id: 'data', type: 'data', label: 'Data' }],
            out: [{ id: 'data', type: 'data', label: 'Filtered' }]
        },
        defaultConfig: {
            includeColumns: [],
            excludeColumns: []
        },
        description: 'Filter columns from data'
    },

    rowFilter: {
        id: 'rowFilter',
        nameKey: 'rowFilter',
        category: 'transform',
        icon: 'fas fa-filter',
        color: '#a371f7',
        ports: {
            in: [{ id: 'data', type: 'data', label: 'Data' }],
            out: [{ id: 'data', type: 'data', label: 'Filtered' }]
        },
        defaultConfig: {
            column: '',
            operator: 'equals',
            value: '',
            caseSensitive: false
        },
        description: 'Filter rows by condition'
    },

    sorter: {
        id: 'sorter',
        nameKey: 'sorter',
        category: 'transform',
        icon: 'fas fa-arrow-down-a-z',
        color: '#a371f7',
        ports: {
            in: [{ id: 'data', type: 'data', label: 'Data' }],
            out: [{ id: 'data', type: 'data', label: 'Sorted' }]
        },
        defaultConfig: {
            sortColumn: '',
            sortOrder: 'ascending'
        },
        description: 'Sort data by column'
    },

    groupBy: {
        id: 'groupBy',
        nameKey: 'groupBy',
        category: 'transform',
        icon: 'fas fa-layer-group',
        color: '#a371f7',
        ports: {
            in: [{ id: 'data', type: 'data', label: 'Data' }],
            out: [{ id: 'data', type: 'data', label: 'Grouped' }]
        },
        defaultConfig: {
            groupColumns: [],
            aggregations: []
        },
        description: 'Group data and aggregate'
    },

    joiner: {
        id: 'joiner',
        nameKey: 'joiner',
        category: 'transform',
        icon: 'fas fa-code-merge',
        color: '#a371f7',
        ports: {
            in: [
                { id: 'left', type: 'data', label: 'Left' },
                { id: 'right', type: 'data', label: 'Right' }
            ],
            out: [{ id: 'data', type: 'data', label: 'Joined' }]
        },
        defaultConfig: {
            joinType: 'inner',
            leftKey: '',
            rightKey: ''
        },
        description: 'Join two data tables'
    },

    missingValue: {
        id: 'missingValue',
        nameKey: 'missingValue',
        category: 'transform',
        icon: 'fas fa-eraser',
        color: '#a371f7',
        ports: {
            in: [{ id: 'data', type: 'data', label: 'Data' }],
            out: [{ id: 'data', type: 'data', label: 'Cleaned' }]
        },
        defaultConfig: {
            strategy: 'mean',
            columns: []
        },
        description: 'Handle missing values'
    },

    mathFormula: {
        id: 'mathFormula',
        nameKey: 'mathFormula',
        category: 'transform',
        icon: 'fas fa-calculator',
        color: '#a371f7',
        ports: {
            in: [{ id: 'data', type: 'data', label: 'Data' }],
            out: [{ id: 'data', type: 'data', label: 'Result' }]
        },
        defaultConfig: {
            formula: '',
            newColumnName: 'Result',
            replaceColumn: false
        },
        description: 'Apply math formula to create new column'
    },

    // ==========================================
    // Statistics Nodes
    // ==========================================
    descriptiveStats: {
        id: 'descriptiveStats',
        nameKey: 'descriptiveStats',
        category: 'statistics',
        icon: 'fas fa-chart-bar',
        color: '#3fb950',
        ports: {
            in: [{ id: 'data', type: 'data', label: 'Data' }],
            out: [{ id: 'stats', type: 'data', label: 'Stats' }]
        },
        defaultConfig: {
            columns: [],
            includeAll: true
        },
        description: 'Calculate descriptive statistics'
    },

    correlation: {
        id: 'correlation',
        nameKey: 'correlation',
        category: 'statistics',
        icon: 'fas fa-arrows-left-right',
        color: '#3fb950',
        ports: {
            in: [{ id: 'data', type: 'data', label: 'Data' }],
            out: [{ id: 'matrix', type: 'data', label: 'Matrix' }]
        },
        defaultConfig: {
            method: 'pearson',
            columns: []
        },
        description: 'Calculate correlation matrix'
    },

    simpleRegression: {
        id: 'simpleRegression',
        nameKey: 'simpleRegression',
        category: 'statistics',
        icon: 'fas fa-chart-line',
        color: '#3fb950',
        ports: {
            in: [{ id: 'data', type: 'data', label: 'Data' }],
            out: [{ id: 'model', type: 'data', label: 'Model' }]
        },
        defaultConfig: {
            dependentVar: '',
            independentVar: '',
            confidenceLevel: 0.95
        },
        description: 'Simple linear regression'
    },

    multipleRegression: {
        id: 'multipleRegression',
        nameKey: 'multipleRegression',
        category: 'statistics',
        icon: 'fas fa-chart-area',
        color: '#3fb950',
        ports: {
            in: [{ id: 'data', type: 'data', label: 'Data' }],
            out: [{ id: 'model', type: 'data', label: 'Model' }]
        },
        defaultConfig: {
            dependentVar: '',
            depTransform: 'none',
            depDiff: 0,
            depAR: 0,
            depMA: 0,
            independentVars: [],
            indepTransforms: {},
            indepDiffs: {},
            indepAR: {},
            indepMA: {},
            confidenceLevel: 0.95,
            includeIntercept: true,
            dummyEnabled: false,
            dummyYearColumn: '',
            dummyType: 'year',
            dummyYears: []
        },
        description: 'Multiple linear regression'
    },

    ardl: {
        id: 'ardl',
        nameKey: 'ardl',
        category: 'statistics',
        icon: 'fas fa-wave-square',
        color: '#3fb950',
        ports: {
            in: [{ id: 'data', type: 'data', label: 'Data' }],
            out: [{ id: 'model', type: 'data', label: 'Model' }]
        },
        defaultConfig: {
            dependentVar: '',
            depTransform: 'none',
            depDiff: 0,
            depAR: 0,
            depMA: 0,
            independentVars: [],
            indepTransforms: {},
            indepDiffs: {},
            indepAR: {},
            indepMA: {},
            maxLag: 4,
            criterion: 'aic',
            includeIntercept: true,
            includeTrend: false
        },
        description: 'Autoregressive Distributed Lag (ARDL) model'
    },
    tTest: {
        id: 'tTest',
        nameKey: 'tTest',
        category: 'statistics',
        icon: 'fas fa-t',
        color: '#3fb950',
        ports: {
            in: [{ id: 'data', type: 'data', label: 'Data' }],
            out: [{ id: 'result', type: 'data', label: 'Result' }]
        },
        defaultConfig: {
            testType: 'independent',
            column1: '',
            column2: '',
            mu: 0,
            alpha: 0.05,
            alternative: 'two-sided'
        },
        description: 'T-Test (one-sample, independent, paired)'
    },

    anova: {
        id: 'anova',
        nameKey: 'anova',
        category: 'statistics',
        icon: 'fas fa-chart-column',
        color: '#3fb950',
        ports: {
            in: [{ id: 'data', type: 'data', label: 'Data' }],
            out: [{ id: 'result', type: 'data', label: 'Result' }]
        },
        defaultConfig: {
            dependentVar: '',
            groupVar: '',
            alpha: 0.05
        },
        description: 'One-way ANOVA'
    },

    chiSquare: {
        id: 'chiSquare',
        nameKey: 'chiSquare',
        category: 'statistics',
        icon: 'fas fa-x',
        color: '#3fb950',
        ports: {
            in: [{ id: 'data', type: 'data', label: 'Data' }],
            out: [{ id: 'result', type: 'data', label: 'Result' }]
        },
        defaultConfig: {
            column1: '',
            column2: '',
            alpha: 0.05
        },
        description: 'Chi-Square test of independence'
    },

    normality: {
        id: 'normality',
        nameKey: 'normality',
        category: 'statistics',
        icon: 'fas fa-bell',
        color: '#3fb950',
        ports: {
            in: [{ id: 'data', type: 'data', label: 'Data' }],
            out: [{ id: 'result', type: 'data', label: 'Result' }]
        },
        defaultConfig: {
            column: '',
            testType: 'jarqueBera',
            alpha: 0.05
        },
        description: 'Normality test (Jarque-Bera, Shapiro-Wilk)'
    },

    // ==========================================
    // ML Nodes
    // ==========================================
    knn: {
        id: 'knn',
        nameKey: 'knn',
        category: 'ml',
        icon: 'fas fa-circle-nodes',
        color: '#f778ba',
        ports: {
            in: [{ id: 'data', type: 'data', label: 'Training' }],
            out: [
                { id: 'model', type: 'model', label: 'Model' },
                { id: 'predictions', type: 'data', label: 'Predictions' }
            ]
        },
        defaultConfig: {
            targetColumn: '',
            features: [],
            nNeighbors: 5,
            testSplit: 0.2
        },
        description: 'K-Nearest Neighbors classifier'
    },

    decisionTree: {
        id: 'decisionTree',
        nameKey: 'decisionTree',
        category: 'ml',
        icon: 'fas fa-sitemap',
        color: '#f778ba',
        ports: {
            in: [{ id: 'data', type: 'data', label: 'Training' }],
            out: [
                { id: 'model', type: 'model', label: 'Model' },
                { id: 'predictions', type: 'data', label: 'Predictions' }
            ]
        },
        defaultConfig: {
            targetColumn: '',
            features: [],
            maxDepth: 5,
            minSamples: 2,
            testSplit: 0.2
        },
        description: 'Decision Tree classifier'
    },

    randomForest: {
        id: 'randomForest',
        nameKey: 'randomForest',
        category: 'ml',
        icon: 'fas fa-tree',
        color: '#f778ba',
        ports: {
            in: [{ id: 'data', type: 'data', label: 'Training' }],
            out: [
                { id: 'model', type: 'model', label: 'Model' },
                { id: 'predictions', type: 'data', label: 'Predictions' }
            ]
        },
        defaultConfig: {
            targetColumn: '',
            features: [],
            nEstimators: 100,
            maxDepth: 10,
            testSplit: 0.2
        },
        description: 'Random Forest classifier'
    },

    logisticRegression: {
        id: 'logisticRegression',
        nameKey: 'logisticRegression',
        category: 'ml',
        icon: 'fas fa-wave-square',
        color: '#f778ba',
        ports: {
            in: [{ id: 'data', type: 'data', label: 'Training' }],
            out: [
                { id: 'model', type: 'model', label: 'Model' },
                { id: 'predictions', type: 'data', label: 'Predictions' }
            ]
        },
        defaultConfig: {
            targetColumn: '',
            features: [],
            learningRate: 0.01,
            iterations: 1000,
            testSplit: 0.2
        },
        description: 'Logistic Regression classifier'
    },

    kMeans: {
        id: 'kMeans',
        nameKey: 'kMeans',
        category: 'ml',
        icon: 'fas fa-bullseye',
        color: '#f778ba',
        ports: {
            in: [{ id: 'data', type: 'data', label: 'Data' }],
            out: [
                { id: 'model', type: 'model', label: 'Model' },
                { id: 'clustered', type: 'data', label: 'Clustered' }
            ]
        },
        defaultConfig: {
            features: [],
            nClusters: 3,
            maxIterations: 100
        },
        description: 'K-Means clustering'
    },

    naiveBayes: {
        id: 'naiveBayes',
        nameKey: 'naiveBayes',
        category: 'ml',
        icon: 'fas fa-percent',
        color: '#f778ba',
        ports: {
            in: [{ id: 'data', type: 'data', label: 'Training' }],
            out: [
                { id: 'model', type: 'model', label: 'Model' },
                { id: 'predictions', type: 'data', label: 'Predictions' }
            ]
        },
        defaultConfig: {
            targetColumn: '',
            features: [],
            testSplit: 0.2
        },
        description: 'Naive Bayes classifier'
    },

    // ==========================================
    // View Nodes
    // ==========================================
    tableView: {
        id: 'tableView',
        nameKey: 'tableView',
        category: 'views',
        icon: 'fas fa-table',
        color: '#79c0ff',
        ports: {
            in: [{ id: 'data', type: 'data', label: 'Data' }],
            out: []
        },
        defaultConfig: {
            maxRows: 100,
            title: ''
        },
        description: 'Display data as table'
    },

    scatterPlot: {
        id: 'scatterPlot',
        nameKey: 'scatterPlot',
        category: 'views',
        icon: 'fas fa-chart-scatter-3d',
        color: '#79c0ff',
        ports: {
            in: [{ id: 'data', type: 'data', label: 'Data' }],
            out: []
        },
        defaultConfig: {
            xColumn: '',
            yColumn: '',
            colorColumn: '',
            title: ''
        },
        description: 'Scatter plot visualization'
    },

    barChart: {
        id: 'barChart',
        nameKey: 'barChart',
        category: 'views',
        icon: 'fas fa-chart-bar',
        color: '#79c0ff',
        ports: {
            in: [{ id: 'data', type: 'data', label: 'Data' }],
            out: []
        },
        defaultConfig: {
            categoryColumn: '',
            valueColumn: '',
            aggregation: 'sum',
            title: '',
            horizontal: false
        },
        description: 'Bar chart visualization'
    },

    lineChart: {
        id: 'lineChart',
        nameKey: 'lineChart',
        category: 'views',
        icon: 'fas fa-chart-line',
        color: '#79c0ff',
        ports: {
            in: [{ id: 'data', type: 'data', label: 'Data' }],
            out: []
        },
        defaultConfig: {
            xColumn: '',
            yColumns: [],
            title: ''
        },
        description: 'Line chart visualization'
    },

    histogram: {
        id: 'histogram',
        nameKey: 'histogram',
        category: 'views',
        icon: 'fas fa-chart-column',
        color: '#79c0ff',
        ports: {
            in: [{ id: 'data', type: 'data', label: 'Data' }],
            out: []
        },
        defaultConfig: {
            column: '',
            bins: 10,
            title: ''
        },
        description: 'Histogram visualization'
    },

    boxPlot: {
        id: 'boxPlot',
        nameKey: 'boxPlot',
        category: 'views',
        icon: 'fas fa-box',
        color: '#79c0ff',
        ports: {
            in: [{ id: 'data', type: 'data', label: 'Data' }],
            out: []
        },
        defaultConfig: {
            columns: [],
            groupColumn: '',
            title: ''
        },
        description: 'Box plot visualization'
    },

    pieChart: {
        id: 'pieChart',
        nameKey: 'pieChart',
        category: 'views',
        icon: 'fas fa-chart-pie',
        color: '#79c0ff',
        ports: {
            in: [{ id: 'data', type: 'data', label: 'Data' }],
            out: []
        },
        defaultConfig: {
            categoryColumn: '',
            valueColumn: '',
            title: ''
        },
        description: 'Pie chart visualization'
    },

    heatmap: {
        id: 'heatmap',
        nameKey: 'heatmap',
        category: 'views',
        icon: 'fas fa-grip',
        color: '#79c0ff',
        ports: {
            in: [{ id: 'data', type: 'data', label: 'Data' }],
            out: []
        },
        defaultConfig: {
            columns: [],
            title: ''
        },
        description: 'Heatmap visualization'
    }
};

// Get nodes by category
function getNodesByCategory(category) {
    return Object.values(NODE_REGISTRY).filter(n => n.category === category);
}

// Get all categories
function getCategories() {
    return ['io', 'transform', 'statistics', 'ml', 'views'];
}
