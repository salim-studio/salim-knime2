/* ============================================
   i18n.js - Internationalization
   Arabic/English support
   ============================================ */

const I18N = {
    currentLang: 'ar',

    translations: {
        ar: {
            // App
            appTitle: 'DataFlow Studio',

            // Toolbar
            newProject: 'مشروع جديد',
            open: 'فتح',
            save: 'حفظ',
            undo: 'تراجع',
            redo: 'إعادة',
            run: 'تشغيل',
            stop: 'إيقاف',
            reset: 'إعادة تعيين',
            zoomIn: 'تكبير',
            zoomOut: 'تصغير',
            zoomFit: 'ملاءمة',
            settings: 'إعدادات',

            // Sidebar
            nodePalette: 'لوحة العقد',
            searchNodes: 'بحث عن العقد...',

            // Categories
            cat_io: 'الإدخال/الإخراج',
            cat_transform: 'التحويل',
            cat_statistics: 'الإحصاء',
            cat_ml: 'تعلم الآلة',
            cat_views: 'العرض',

            // IO Nodes
            csvReader: 'قارئ CSV',
            excelReader: 'قارئ Excel',
            csvWriter: 'كاتب CSV',
            dataEntry: 'إدخال البيانات',

            // Transform Nodes
            columnFilter: 'تصفية الأعمدة',
            rowFilter: 'تصفية الصفوف',
            sorter: 'الترتيب',
            groupBy: 'تجميع حسب',
            joiner: 'الدمج',
            missingValue: 'القيم المفقودة',
            mathFormula: 'صيغة رياضية',
            concatenate: 'الربط',
            pivot: 'جدول محوري',
            unpivot: 'إلغاء المحور',

            // Statistics Nodes  
            descriptiveStats: 'الإحصاء الوصفي',
            correlation: 'الارتباط',
            simpleRegression: 'الانحدار البسيط',
            multipleRegression: 'الانحدار المتعدد',
            tTest: 'اختبار T',
            anova: 'تحليل التباين',
            chiSquare: 'مربع كاي',
            normality: 'اختبار الطبيعية',

            // ML Nodes
            knn: 'K أقرب جار',
            decisionTree: 'شجرة القرار',
            randomForest: 'الغابة العشوائية',
            logisticRegression: 'الانحدار اللوجستي',
            kMeans: 'K-Means تجميع',
            naiveBayes: 'نايف بايز',
            svm: 'آلة المتجهات الداعمة',
            linearSVM: 'SVM خطي',

            // View Nodes
            tableView: 'عرض جدول',
            scatterPlot: 'مخطط التشتت',
            barChart: 'مخطط أعمدة',
            lineChart: 'مخطط خطي',
            histogram: 'مدرج تكراري',
            boxPlot: 'مخطط الصندوق',
            pieChart: 'مخطط دائري',
            heatmap: 'خريطة حرارية',

            // Properties Panel
            properties: 'الخصائص',
            selectNode: 'اختر عقدة لعرض خصائصها',
            nodeSettings: 'إعدادات العقدة',
            general: 'عام',
            columns: 'الأعمدة',
            options: 'الخيارات',

            // Common
            configure: 'إعداد',
            executeNode: 'تنفيذ',
            duplicate: 'نسخ',
            viewResults: 'عرض النتائج',
            delete: 'حذف',
            ready: 'جاهز',
            executing: 'جاري التنفيذ...',
            completed: 'اكتمل',
            error: 'خطأ',

            // Data Entry
            dataEntry: 'إدخال البيانات',
            addRow: 'صف',
            addCol: 'عمود',
            saveData: 'حفظ البيانات',
            cancel: 'إلغاء',

            // Results
            results: 'النتائج',
            mean: 'المتوسط',
            median: 'الوسيط',
            stdDev: 'الانحراف المعياري',
            variance: 'التباين',
            min: 'الحد الأدنى',
            max: 'الحد الأقصى',
            count: 'العدد',
            sum: 'المجموع',
            skewness: 'الالتواء',
            kurtosis: 'التفلطح',
            coefficient: 'المعامل',
            pValue: 'القيمة الاحتمالية',
            rSquared: 'R²',
            fStatistic: 'إحصائية F',
            significant: 'دال إحصائياً',
            notSignificant: 'غير دال إحصائياً',

            // File
            selectFile: 'اختر ملف',
            dragDrop: 'اسحب وأفلت الملف هنا',
            filePath: 'مسار الملف',
            hasHeader: 'يحتوي على عناوين',
            delimiter: 'الفاصل',
            encoding: 'الترميز',

            // Config
            targetColumn: 'العمود الهدف',
            features: 'المتغيرات',
            dependentVar: 'المتغير التابع',
            independentVars: 'المتغيرات المستقلة',
            nNeighbors: 'عدد الجيران',
            nClusters: 'عدد المجموعات',
            maxDepth: 'العمق الأقصى',
            nEstimators: 'عدد المقدرات',
            testType: 'نوع الاختبار',
            confidenceLevel: 'مستوى الثقة',
            alpha: 'مستوى الدلالة',
            transformation: 'التحويل',
            differencing: 'الفروقات',
            squareRoot: 'الجذر التربيعي',
            square: 'التربيع',
            inverse: 'المقلوب',
            dummyVariable: 'متغير وهمي (Dummy)',
            yearColumn: 'عمود السنوات',
            dummyType: 'نوع المتغير الوهمي',
            fullYear: 'سنة كاملة',
            yearQuarter: 'سنة + ربع',
            addDummyYear: 'إضافة سنة',
            year: 'السنة',
            addedDummies: 'المتغيرات الوهمية المضافة',

            // Toast
            workflowSaved: 'تم حفظ سير العمل',
            workflowLoaded: 'تم تحميل سير العمل',
            nodeDeleted: 'تم حذف العقدة',
            executionComplete: 'اكتمل التنفيذ',
            executionError: 'خطأ في التنفيذ',
            noDataAvailable: 'لا توجد بيانات متاحة',
            connectInputFirst: 'يرجى توصيل المدخلات أولاً',
            dataSaved: 'تم حفظ البيانات',
        },

        en: {
            appTitle: 'DataFlow Studio',
            newProject: 'New Project',
            open: 'Open',
            save: 'Save',
            undo: 'Undo',
            redo: 'Redo',
            run: 'Run',
            stop: 'Stop',
            reset: 'Reset',
            zoomIn: 'Zoom In',
            zoomOut: 'Zoom Out',
            zoomFit: 'Fit',
            settings: 'Settings',

            nodePalette: 'Node Palette',
            searchNodes: 'Search nodes...',

            cat_io: 'IO',
            cat_transform: 'Transform',
            cat_statistics: 'Statistics',
            cat_ml: 'Machine Learning',
            cat_views: 'Views',

            csvReader: 'CSV Reader',
            excelReader: 'Excel Reader',
            csvWriter: 'CSV Writer',
            dataEntry: 'Data Entry',

            columnFilter: 'Column Filter',
            rowFilter: 'Row Filter',
            sorter: 'Sorter',
            groupBy: 'Group By',
            joiner: 'Joiner',
            missingValue: 'Missing Value',
            mathFormula: 'Math Formula',
            concatenate: 'Concatenate',
            pivot: 'Pivot',
            unpivot: 'Unpivot',

            descriptiveStats: 'Descriptive Stats',
            correlation: 'Correlation',
            simpleRegression: 'Simple Regression',
            multipleRegression: 'Multiple Regression',
            tTest: 'T-Test',
            anova: 'ANOVA',
            chiSquare: 'Chi-Square',
            normality: 'Normality Test',

            knn: 'K-Nearest Neighbors',
            decisionTree: 'Decision Tree',
            randomForest: 'Random Forest',
            logisticRegression: 'Logistic Regression',
            kMeans: 'K-Means Clustering',
            naiveBayes: 'Naive Bayes',
            svm: 'SVM',
            linearSVM: 'Linear SVM',

            tableView: 'Table View',
            scatterPlot: 'Scatter Plot',
            barChart: 'Bar Chart',
            lineChart: 'Line Chart',
            histogram: 'Histogram',
            boxPlot: 'Box Plot',
            pieChart: 'Pie Chart',
            heatmap: 'Heatmap',

            properties: 'Properties',
            selectNode: 'Select a node to view its properties',
            nodeSettings: 'Node Settings',
            general: 'General',
            columns: 'Columns',
            options: 'Options',

            configure: 'Configure',
            executeNode: 'Execute',
            duplicate: 'Duplicate',
            viewResults: 'View Results',
            delete: 'Delete',
            ready: 'Ready',
            executing: 'Executing...',
            completed: 'Completed',
            error: 'Error',

            dataEntry: 'Data Entry',
            addRow: 'Row',
            addCol: 'Column',
            saveData: 'Save Data',
            cancel: 'Cancel',

            results: 'Results',
            mean: 'Mean',
            median: 'Median',
            stdDev: 'Std. Deviation',
            variance: 'Variance',
            min: 'Min',
            max: 'Max',
            count: 'Count',
            sum: 'Sum',
            skewness: 'Skewness',
            kurtosis: 'Kurtosis',
            coefficient: 'Coefficient',
            pValue: 'P-Value',
            rSquared: 'R²',
            fStatistic: 'F-Statistic',
            significant: 'Significant',
            notSignificant: 'Not Significant',

            selectFile: 'Select File',
            dragDrop: 'Drag & drop file here',
            filePath: 'File Path',
            hasHeader: 'Has Header',
            delimiter: 'Delimiter',
            encoding: 'Encoding',

            targetColumn: 'Target Column',
            features: 'Features',
            dependentVar: 'Dependent Variable',
            independentVars: 'Independent Variables',
            nNeighbors: 'N Neighbors',
            nClusters: 'N Clusters',
            maxDepth: 'Max Depth',
            nEstimators: 'N Estimators',
            testType: 'Test Type',
            confidenceLevel: 'Confidence Level',
            alpha: 'Significance Level',
            transformation: 'Transformation',
            differencing: 'Differencing',
            squareRoot: 'Square Root',
            square: 'Square',
            inverse: 'Inverse',
            dummyVariable: 'Dummy Variable',
            yearColumn: 'Year Column',
            dummyType: 'Dummy Type',
            fullYear: 'Full Year',
            yearQuarter: 'Year + Quarter',
            addDummyYear: 'Add Year',
            year: 'Year',
            addedDummies: 'Added Dummies',

            workflowSaved: 'Workflow saved',
            workflowLoaded: 'Workflow loaded',
            nodeDeleted: 'Node deleted',
            executionComplete: 'Execution complete',
            executionError: 'Execution error',
            noDataAvailable: 'No data available',
            connectInputFirst: 'Please connect inputs first',
            dataSaved: 'Data saved',
        }
    },

    t(key) {
        return this.translations[this.currentLang][key] || key;
    },

    toggleLanguage() {
        this.currentLang = this.currentLang === 'ar' ? 'en' : 'ar';
        const dir = this.currentLang === 'ar' ? 'rtl' : 'ltr';
        const lang = this.currentLang;
        document.documentElement.setAttribute('dir', dir);
        document.documentElement.setAttribute('lang', lang);

        // Update all i18n elements
        document.querySelectorAll('[data-i18n]').forEach(el => {
            const key = el.getAttribute('data-i18n');
            el.textContent = this.t(key);
        });

        document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
            const key = el.getAttribute('data-i18n-placeholder');
            el.setAttribute('placeholder', this.t(key));
        });

        // Update lang button
        const langBtn = document.querySelector('#btn-lang span');
        if (langBtn) {
            langBtn.textContent = this.currentLang === 'ar' ? 'EN' : 'عربي';
        }

        return this.currentLang;
    },

    init() {
        // Apply initial translations
        document.querySelectorAll('[data-i18n]').forEach(el => {
            const key = el.getAttribute('data-i18n');
            el.textContent = this.t(key);
        });

        document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
            const key = el.getAttribute('data-i18n-placeholder');
            el.setAttribute('placeholder', this.t(key));
        });
    }
};
