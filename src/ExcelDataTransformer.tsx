import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { PieChart as RechartsPieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line } from 'recharts';
import * as XLSX from 'xlsx';

const style = document.createElement('style');
style.textContent = '@import url("https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700&display=swap");';
document.head.appendChild(style);

const ExcelDataTransformer = () => {
    const [uploadedFiles, setUploadedFiles] = useState([]);
    const [transformedData, setTransformedData] = useState([]);
    const [isProcessing, setIsProcessing] = useState(false);
    const [processingProgress, setProcessingProgress] = useState(0);
    const [processingStatus, setProcessingStatus] = useState('');
    const [editingCell, setEditingCell] = useState(null);
    const [showBulkEdit, setShowBulkEdit] = useState(false);
    const [bulkEditFileName, setBulkEditFileName] = useState('');
    const [selectedFileName, setSelectedFileName] = useState('');
    const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });
    const [activeChart, setActiveChart] = useState('impression');
    const [colorScheme, setColorScheme] = useState('new-heritage-red');
    const [trendLineView, setTrendLineView] = useState('month'); // 'month' or 'year'
    const [sovTableView, setSovTableView] = useState('month'); // 'month' or 'year'
    const [sovTableDisplayMode, setSovTableDisplayMode] = useState('percentage'); // 'percentage' or 'impressions'
    const [customColors, setCustomColors] = useState(['#FF3534', '#3197EE', '#06B8A2', '#FFB84E', '#F585DA', '#806FEA', '#99170C', '#216AA3', '#027062', '#B37930']);
    const [showCustomColorPicker, setShowCustomColorPicker] = useState(false);
    const [showFilters, setShowFilters] = useState(false);
    const [editingHeader, setEditingHeader] = useState(null);
    const [columnDisplayNames, setColumnDisplayNames] = useState({});
    const [showColumnConfig, setShowColumnConfig] = useState(false);
    
    // Pagination states
    const [currentPage, setCurrentPage] = useState(1);
    const [rowsPerPage, setRowsPerPage] = useState(50);
    
    // Updated default values for chart optimization
    const [maxBrandsInChart, setMaxBrandsInChart] = useState(8); // Changed from 5 to 8
    const [minPercentageThreshold, setMinPercentageThreshold] = useState(2); // Changed from 5 to 2
    
    // Threshold settings for ad type and media type charts
    const [maxBrandsInAdTypeChart, setMaxBrandsInAdTypeChart] = useState(8);
    const [maxBrandsInMediaTypeChart, setMaxBrandsInMediaTypeChart] = useState(8);
    
    const [columnConfig, setColumnConfig] = useState({
        includeBrand: true,
        includeMediaType: true,
        includeAdType: true
    });
    const [chartFilters, setChartFilters] = useState({
        fileNames: [],
        brands: [],
        years: [],
        adTypes: [],
        mediaTypes: [],
        months: []
    });
    const fileInputRef = useRef(null);

    // Effect to switch to impression chart if current chart type's column is disabled
    useEffect(() => {
        if (transformedData.length > 0) {
            const hasAdType = transformedData[0].hasOwnProperty('Ad Type');
            const hasMediaType = transformedData[0].hasOwnProperty('Media Type');
            
            if (activeChart === 'adtype' && !hasAdType) {
                setActiveChart('impression');
            } else if (activeChart === 'mediatype' && !hasMediaType) {
                setActiveChart('impression');
            }
        }
    }, [transformedData, activeChart]);

    // Reset pagination when data changes
    useEffect(() => {
        setCurrentPage(1);
    }, [transformedData, sortConfig]);

    // Auto-load notification on component mount
    useEffect(() => {
        const savedData = localStorage.getItem('excelTransformer_session');
        if (savedData) {
            try {
                const sessionData = JSON.parse(savedData);
                if (sessionData.timestamp && sessionData.transformedData?.length > 0) {
                    const savedDate = new Date(sessionData.timestamp);
                    console.log(`Saved session found from ${savedDate.toLocaleString()} with ${sessionData.transformedData.length} rows`);
                }
            } catch (error) {
                console.error('Error checking saved session:', error);
            }
        }
    }, []);

    const monthOrder = [
        'January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'
    ];

    const COLOR_SCHEMES = {
        'new-heritage-red': ['#FF3534', '#E62E2A', '#CC2620', '#B31F16', '#99170C', '#801002', '#FF5854', '#FF7874', '#FF9999', '#FFBBBB'],
        'sunburst': ['#FFB84E', '#E6A344', '#CC8E3A', '#B37930', '#996426', '#804F1C', '#FFCC6E', '#FFDD8E', '#FFEE9E', '#FFFFAE'],
        'flamingo': ['#F585DA', '#DC76C1', '#C267A8', '#A9588F', '#8F4976', '#763A5D', '#F799E4', '#F9ADEE', '#FBBDF8', '#FDCDFC'],
        'lake': ['#3197EE', '#2C88D5', '#2679BC', '#216AA3', '#1B5B8A', '#164C71', '#51A7F1', '#71B7F4', '#91C7F7', '#B1D7FA'],
        'mint': ['#06B8A2', '#05A692', '#049482', '#038272', '#027062', '#015E52', '#26C8B2', '#46D8C2', '#66E8D2', '#86F8E2'],
        'orchid': ['#806FEA', '#7363D1', '#6657B8', '#594B9F', '#4C3F86', '#3F336D', '#9485ED', '#A89BF0', '#BCB1F3', '#D0C7F6'],
        'custom': customColors
    };

    const handleCustomColorChange = (index, color) => {
        const newCustomColors = [...customColors];
        newCustomColors[index] = color;
        setCustomColors(newCustomColors);
    };

    const addCustomColor = () => {
        if (customColors.length < 20) {
            setCustomColors([...customColors, '#000000']);
        }
    };

    const removeCustomColor = (index) => {
        if (customColors.length > 1) {
            const newCustomColors = customColors.filter((_, i) => i !== index);
            setCustomColors(newCustomColors);
        }
    };

    const resetCustomColors = () => {
        setCustomColors(['#FF3534', '#3197EE', '#06B8A2', '#FFB84E', '#F585DA', '#806FEA', '#99170C', '#216AA3', '#027062', '#B37930']);
    };

    // Save and Load Session Functions
    const saveSession = () => {
        try {
            const sessionData = {
                transformedData,
                uploadedFiles,
                chartFilters,
                columnConfig,
                columnDisplayNames,
                activeChart,
                trendLineView,
                sovTableView,
                sovTableDisplayMode,
                maxBrandsInChart,
                minPercentageThreshold,
                maxBrandsInAdTypeChart,
                maxBrandsInMediaTypeChart,
                colorScheme,
                customColors,
                timestamp: new Date().toISOString(),
                version: '1.0'
            };
            
            localStorage.setItem('excelTransformer_session', JSON.stringify(sessionData));
            alert(`Session saved successfully!\nData: ${transformedData.length} rows, ${uploadedFiles.length} files\nSaved at: ${new Date().toLocaleString()}`);
        } catch (error) {
            console.error('Failed to save session:', error);
            alert('Failed to save session. Your browser storage might be full.');
        }
    };

    const loadSession = () => {
        try {
            const savedData = localStorage.getItem('excelTransformer_session');
            if (!savedData) {
                alert('No saved session found.');
                return;
            }

            const sessionData = JSON.parse(savedData);
            
            // Verify data structure
            if (!sessionData.version || !sessionData.timestamp) {
                throw new Error('Invalid session data format');
            }

            // Restore all state
            setTransformedData(sessionData.transformedData || []);
            setUploadedFiles(sessionData.uploadedFiles || []);
            setChartFilters(sessionData.chartFilters || {
                fileNames: [],
                brands: [],
                years: [],
                adTypes: [],
                mediaTypes: [],
                months: []
            });
            setColumnConfig(sessionData.columnConfig || {
                includeBrand: true,
                includeMediaType: true,
                includeAdType: true
            });
            setColumnDisplayNames(sessionData.columnDisplayNames || {});
            setActiveChart(sessionData.activeChart || 'impression');
            setTrendLineView(sessionData.trendLineView || 'month');
            setSovTableView(sessionData.sovTableView || 'month');
            setSovTableDisplayMode(sessionData.sovTableDisplayMode || 'percentage');
            setMaxBrandsInChart(sessionData.maxBrandsInChart || 8);
            setMinPercentageThreshold(sessionData.minPercentageThreshold || 2);
            setMaxBrandsInAdTypeChart(sessionData.maxBrandsInAdTypeChart || 8);
            setMaxBrandsInMediaTypeChart(sessionData.maxBrandsInMediaTypeChart || 8);
            setColorScheme(sessionData.colorScheme || 'new-heritage-red');
            setCustomColors(sessionData.customColors || ['#FF3534', '#3197EE', '#06B8A2', '#FFB84E', '#F585DA', '#806FEA', '#99170C', '#216AA3', '#027062', '#B37930']);

            const savedDate = new Date(sessionData.timestamp);
            alert(`Session loaded successfully!\nData: ${sessionData.transformedData?.length || 0} rows, ${sessionData.uploadedFiles?.length || 0} files\nSaved: ${savedDate.toLocaleString()}`);
        } catch (error) {
            console.error('Failed to load session:', error);
            alert('Failed to load session. The saved data might be corrupted.');
        }
    };

    const clearSavedSession = () => {
        if (window.confirm('Are you sure you want to delete the saved session? This cannot be undone.')) {
            localStorage.removeItem('excelTransformer_session');
            alert('Saved session deleted successfully.');
        }
    };

    const hasSavedSession = () => {
        return localStorage.getItem('excelTransformer_session') !== null;
    };

    // Optimized sleep function
    const sleep = useCallback((ms) => new Promise(resolve => setTimeout(resolve, ms)), []);

    // Memoized filter options for better performance
    const filterOptions = useMemo(() => {
        const fileNames = [...new Set(transformedData.map(row => row['File Name']))].filter(Boolean);
        const brands = [...new Set(transformedData.map(row => row['Brand Name']))].filter(Boolean);
        const years = [...new Set(transformedData.map(row => row['Year']))].filter(Boolean).sort();
        const adTypes = transformedData.length > 0 && transformedData[0].hasOwnProperty('Ad Type') 
            ? [...new Set(transformedData.map(row => row['Ad Type']))].filter(Boolean)
            : [];
        const mediaTypes = transformedData.length > 0 && transformedData[0].hasOwnProperty('Media Type')
            ? [...new Set(transformedData.map(row => row['Media Type']))].filter(Boolean)
            : [];
        const months = [...new Set(transformedData.map(row => row['Month']))].filter(Boolean);

        return { fileNames, brands, years, adTypes, mediaTypes, months };
    }, [transformedData]);

    // Memoized filtered chart data
    const filteredChartData = useMemo(() => {
        const hasFilters = Object.values(chartFilters).some(filterArray => filterArray.length > 0);
        if (!hasFilters) {
            return transformedData;
        }

        return transformedData.filter(row => {
            const { fileNames, brands, years, adTypes, mediaTypes, months } = chartFilters;

            return (
                (fileNames.length === 0 || fileNames.includes(row['File Name'])) &&
                (brands.length === 0 || brands.includes(row['Brand Name'])) &&
                (years.length === 0 || years.includes(row['Year'])) &&
                (adTypes.length === 0 || adTypes.includes(row['Ad Type'])) &&
                (mediaTypes.length === 0 || mediaTypes.includes(row['Media Type'])) &&
                (months.length === 0 || months.includes(row['Month']))
            );
        });
    }, [transformedData, chartFilters]);

    // Optimized impression chart data with brand limiting and grouping
    const impressionChartData = useMemo(() => {
        const brandTotals = {};

        filteredChartData.forEach(row => {
            const brand = row['Brand Name'] || 'Unknown';
            const impressionStr = row['Impression (ad contact)']?.toString().replace(/,/g, '') || '0';
            const impression = parseFloat(impressionStr);
            const validImpression = isNaN(impression) ? 0 : impression;
            brandTotals[brand] = (brandTotals[brand] || 0) + validImpression;
        });

        const Total = Object.values(brandTotals).reduce((sum, value) => sum + (isNaN(value) ? 0 : value), 0);

        const allBrands = Object.entries(brandTotals)
            .map(([brand, value]) => {
                const validValue = isNaN(value) ? 0 : value;
                const percentage = Total > 0 ? ((validValue / Total) * 100) : 0;
                const validPercentage = isNaN(percentage) ? 0 : percentage;

                return {
                    name: brand,
                    value: validValue,
                    percentage: validPercentage
                };
            })
            .filter(item => item.value > 0 && item.percentage >= minPercentageThreshold)
            .sort((a, b) => b.value - a.value);

        // Group smaller brands into "Others" for better visualization
        if (allBrands.length > maxBrandsInChart) {
            const topBrands = allBrands.slice(0, maxBrandsInChart - 1);
            const otherBrands = allBrands.slice(maxBrandsInChart - 1);
            
            const othersValue = otherBrands.reduce((sum, item) => sum + item.value, 0);
            const othersPercentage = Total > 0 ? ((othersValue / Total) * 100) : 0;
            
            if (othersValue > 0) {
                topBrands.push({
                    name: `Others (${otherBrands.length} brands)`,
                    value: othersValue,
                    percentage: Number(othersPercentage.toFixed(1)),
                    isOthers: true,
                    otherBrands: otherBrands.map(b => b.name)
                });
            }
            
            return topBrands.map(item => ({
                ...item,
                percentage: Number(item.percentage.toFixed(1))
            }));
        }

        return allBrands.map(item => ({
            ...item,
            percentage: Number(item.percentage.toFixed(1))
        }));
    }, [filteredChartData, maxBrandsInChart, minPercentageThreshold]);

    // NEW: Line chart data processing function
    const getLineChartData = () => {
        const periodBrandData = {};

        filteredChartData.forEach(row => {
            const brand = row['Brand Name'] || 'Unknown';
            const month = row['Month'];
            const year = row['Year'];
            const impressionStr = row['Impression (ad contact)']?.toString().replace(/,/g, '') || '0';
            const impression = parseFloat(impressionStr) || 0;

            // Use either year or month as the period based on trendLineView
            const period = trendLineView === 'year' ? year : month;

            if (!periodBrandData[period]) {
                periodBrandData[period] = {};
            }
            periodBrandData[period][brand] = (periodBrandData[period][brand] || 0) + impression;
        });

        // Get top brands based on total impressions (using existing logic)
        const topBrands = impressionChartData.slice(0, maxBrandsInChart).map(brand => brand.name);

        // Sort periods and create line chart data
        const sortedPeriods = Object.keys(periodBrandData).sort((a, b) => {
            if (trendLineView === 'year') {
                return parseInt(a) - parseInt(b);
            } else {
                return monthOrder.indexOf(a) - monthOrder.indexOf(b);
            }
        });

        return sortedPeriods.map(period => {
            const periodData = { period };
            topBrands.forEach(brand => {
                periodData[brand] = periodBrandData[period][brand] || 0;
            });
            return periodData;
        });
    };

    // NEW: SOV Table data processing function
    const getSovTableData = () => {
        const periodBrandData = {};
        const periodTotals = {};

        filteredChartData.forEach(row => {
            const brand = row['Brand Name'] || 'Unknown';
            const month = row['Month'];
            const year = row['Year'];
            const impressionStr = row['Impression (ad contact)']?.toString().replace(/,/g, '') || '0';
            const impression = parseFloat(impressionStr) || 0;

            // Use either year or month as the period based on sovTableView
            const period = sovTableView === 'year' ? year : month;

            if (!periodBrandData[period]) {
                periodBrandData[period] = {};
            }
            periodBrandData[period][brand] = (periodBrandData[period][brand] || 0) + impression;
            periodTotals[period] = (periodTotals[period] || 0) + impression;
        });

        // Get all brands
        const allBrands = [...new Set(filteredChartData.map(row => row['Brand Name']))].filter(Boolean);
        
        // Sort periods
        const sortedPeriods = Object.keys(periodBrandData).sort((a, b) => {
            if (sovTableView === 'year') {
                return parseInt(a) - parseInt(b);
            } else {
                return monthOrder.indexOf(a) - monthOrder.indexOf(b);
            }
        });

        return {
            periods: sortedPeriods,
            brands: allBrands,
            data: periodBrandData,
            totals: periodTotals
        };
    };

    const getAdTypeChartData = () => {
        // Check if Ad Type column exists
        if (filteredChartData.length === 0 || !filteredChartData[0].hasOwnProperty('Ad Type')) {
            return [];
        }

        const brandAdTypes = {};

        filteredChartData.forEach(row => {
            const brand = row['Brand Name'] || 'Unknown';
            const adType = row['Ad Type']?.toString().trim() || 'Unknown';
            const impressionStr = row['Impression (ad contact)']?.toString().replace(/,/g, '') || '0';
            const impression = parseFloat(impressionStr) || 0;

            if (brand && impression > 0) {
                if (!brandAdTypes[brand]) {
                    brandAdTypes[brand] = {};
                }
                brandAdTypes[brand][adType] = (brandAdTypes[brand][adType] || 0) + impression;
            }
        });

        const result = Object.entries(brandAdTypes)
            .map(([brand, adTypes]) => {
                const Total = Object.values(adTypes).reduce((sum, val) => sum + val, 0);
                if (Total === 0) return null;

                const percentages = { name: brand };
                Object.entries(adTypes).forEach(([adType, value]) => {
                    percentages[adType] = Math.round(((value / Total) * 100) * 10) / 10;
                    percentages[`${adType}Value`] = value;
                });

                return { ...percentages, sortTotal: Total };
            })
            .filter(item => item !== null)
            .sort((a, b) => b.sortTotal - a.sortTotal);

        // Apply threshold filtering similar to impression chart
        if (result.length > maxBrandsInAdTypeChart) {
            const topBrands = result.slice(0, maxBrandsInAdTypeChart - 1);
            const otherBrands = result.slice(maxBrandsInAdTypeChart - 1);
            
            if (otherBrands.length > 0) {
                // Aggregate "Others" data
                const othersData = { name: `Others (${otherBrands.length} brands)`, isOthers: true, otherBrands: otherBrands.map(b => b.name) };
                const allAdTypes = new Set();
                
                // Collect all ad types
                [...topBrands, ...otherBrands].forEach(brand => {
                    Object.keys(brand).forEach(key => {
                        if (key !== 'name' && key !== 'sortTotal' && key !== 'isOthers' && key !== 'otherBrands' && !key.includes('Value')) {
                            allAdTypes.add(key);
                        }
                    });
                });

                // Calculate aggregated values for others
                allAdTypes.forEach(adType => {
                    const TotalValue = otherBrands.reduce((sum, brand) => sum + (brand[`${adType}Value`] || 0), 0);
                    const TotalImpressions = otherBrands.reduce((sum, brand) => sum + brand.sortTotal, 0);
                    
                    othersData[adType] = TotalImpressions > 0 ? Number(((TotalValue / TotalImpressions) * 100).toFixed(1)) : 0;
                    othersData[`${adType}Value`] = TotalValue;
                });
                
                // Remove sortTotal from all items
                const cleanTopBrands = topBrands.map(({ sortTotal, ...item }) => item);
                return [...cleanTopBrands, othersData];
            }
        }

        // Remove sortTotal from all items
        return result.map(({ sortTotal, ...item }) => item);
    };

    const getMediaTypeChartData = () => {
        // Check if Media Type column exists
        if (filteredChartData.length === 0 || !filteredChartData[0].hasOwnProperty('Media Type')) {
            return [];
        }

        const brandMediaTypes = {};

        filteredChartData.forEach(row => {
            const brand = row['Brand Name'] || 'Unknown';
            const mediaType = row['Media Type']?.toString().trim() || 'Unknown';
            const impressionStr = row['Impression (ad contact)']?.toString().replace(/,/g, '') || '0';
            const impression = parseFloat(impressionStr) || 0;

            if (brand && impression > 0) {
                if (!brandMediaTypes[brand]) {
                    brandMediaTypes[brand] = {};
                }
                brandMediaTypes[brand][mediaType] = (brandMediaTypes[brand][mediaType] || 0) + impression;
            }
        });

        const result = Object.entries(brandMediaTypes)
            .map(([brand, mediaTypes]) => {
                const Total = Object.values(mediaTypes).reduce((sum, val) => sum + val, 0);
                if (Total === 0) return null;

                const percentages = { name: brand };
                Object.entries(mediaTypes).forEach(([mediaType, value]) => {
                    percentages[mediaType] = Number(((value / Total) * 100).toFixed(1));
                    percentages[`${mediaType}Value`] = value;
                });

                return { ...percentages, sortTotal: Total };
            })
            .filter(item => item !== null)
            .sort((a, b) => b.sortTotal - a.sortTotal);

        // Apply threshold filtering similar to impression chart
        if (result.length > maxBrandsInMediaTypeChart) {
            const topBrands = result.slice(0, maxBrandsInMediaTypeChart - 1);
            const otherBrands = result.slice(maxBrandsInMediaTypeChart - 1);
            
            if (otherBrands.length > 0) {
                // Aggregate "Others" data
                const othersData = { name: `Others (${otherBrands.length} brands)`, isOthers: true, otherBrands: otherBrands.map(b => b.name) };
                const allMediaTypes = new Set();
                
                // Collect all media types
                [...topBrands, ...otherBrands].forEach(brand => {
                    Object.keys(brand).forEach(key => {
                        if (key !== 'name' && key !== 'sortTotal' && key !== 'isOthers' && key !== 'otherBrands' && !key.includes('Value')) {
                            allMediaTypes.add(key);
                        }
                    });
                });

                // Calculate aggregated values for others
                allMediaTypes.forEach(mediaType => {
                    const TotalValue = otherBrands.reduce((sum, brand) => sum + (brand[`${mediaType}Value`] || 0), 0);
                    const TotalImpressions = otherBrands.reduce((sum, brand) => sum + brand.sortTotal, 0);
                    
                    othersData[mediaType] = TotalImpressions > 0 ? Number(((TotalValue / TotalImpressions) * 100).toFixed(1)) : 0;
                    othersData[`${mediaType}Value`] = TotalValue;
                });
                
                // Remove sortTotal from all items
                const cleanTopBrands = topBrands.map(({ sortTotal, ...item }) => item);
                return [...cleanTopBrands, othersData];
            }
        }

        // Remove sortTotal from all items
        return result.map(({ sortTotal, ...item }) => item);
    };

    const handleFilterChange = (filterType, value, checked) => {
        setChartFilters(prev => ({
            ...prev,
            [filterType]: checked
                ? [...prev[filterType], value]
                : prev[filterType].filter(item => item !== value)
        }));
    };

    const handleColumnConfigChange = (configKey, value) => {
        setColumnConfig(prev => ({
            ...prev,
            [configKey]: value
        }));
    };

    const setDefaultFilters = (data) => {
        const dataToUse = data || transformedData;
        if (dataToUse.length === 0) return;
        
        const fileNames = [...new Set(dataToUse.map(row => row['File Name']))].filter(Boolean);
        const brands = [...new Set(dataToUse.map(row => row['Brand Name']))].filter(Boolean);
        const years = [...new Set(dataToUse.map(row => row['Year']))].filter(Boolean);
        const adTypes = [...new Set(dataToUse.map(row => row['Ad Type']))].filter(Boolean);
        const mediaTypes = [...new Set(dataToUse.map(row => row['Media Type']))].filter(Boolean);
        const months = [...new Set(dataToUse.map(row => row['Month']))].filter(Boolean);

        setChartFilters({
            fileNames: fileNames,
            brands: brands,
            years: years,
            adTypes: adTypes,
            mediaTypes: mediaTypes,
            months: months
        });
    };

    const clearAllFilters = () => {
        setChartFilters({
            fileNames: [],
            brands: [],
            years: [],
            adTypes: [],
            mediaTypes: [],
            months: []
        });
    };

    const selectAllFilters = () => {
        if (transformedData.length > 0) {
            setDefaultFilters();
        }
    };

    const copyChartData = async () => {
        try {
            let chartData = [];
            let title = '';

            switch (activeChart) {
                case 'impression':
                    chartData = impressionChartData;
                    title = 'Share of Voice (SOV) - Impression Distribution';
                    break;
                case 'adtype':
                    chartData = getAdTypeChartData();
                    title = 'Ad Type Distribution by Brand';
                    break;
                case 'mediatype':
                    chartData = getMediaTypeChartData();
                    title = 'Media Type Distribution by Brand';
                    break;
                case 'line':
                    chartData = getLineChartData();
                    title = `Brand Impression Trends by ${trendLineView === 'year' ? 'Year' : 'Month'}`;
                    break;
                case 'sovtable':
                    const sovData = getSovTableData();
                    title = `SOV ${sovTableDisplayMode === 'percentage' ? 'Percentage' : 'Impression'} Table by ${sovTableView === 'year' ? 'Year' : 'Month'}`;
                    // Handle table data differently
                    let sovExcelData = [title, ''];
                    sovExcelData.push([sovTableView === 'year' ? 'Year' : 'Month', ...sovData.brands, 'Total'].join('\t'));
                    
                    // Calculate grand total for percentage calculations
                    const grandTotal = Object.values(sovData.totals).reduce((sum, value) => sum + value, 0);
                    
                    // Calculate yearly totals by brand (for month view) - COMPLETELY FIXED
                    const yearlyBrandTotals = {};
                    if (sovTableView === 'month') {
                        sovData.brands.forEach(brand => {
                            let brandYearTotal = 0;
                            sovData.periods.forEach(period => {
                                // Make sure we access the data correctly
                                if (sovData.data[period] && sovData.data[period][brand] !== undefined) {
                                    brandYearTotal += sovData.data[period][brand];
                                }
                            });
                            yearlyBrandTotals[brand] = brandYearTotal;
                        });
                    }
                    
                    sovData.periods.forEach(period => {
                        const rowData = [period];
                        sovData.brands.forEach(brand => {
                            const value = sovData.data[period][brand] || 0;
                            const total = sovData.totals[period] || 0;
                            
                            if (sovTableDisplayMode === 'percentage') {
                                const percentage = total > 0 ? ((value / total) * 100).toFixed(2) : '0.00';
                                rowData.push(`${percentage}%`);
                            } else {
                                rowData.push(value);
                            }
                        });
                        // Add total column based on display mode
                        if (sovTableDisplayMode === 'percentage') {
                            const periodPercentage = grandTotal > 0 ? (((sovData.totals[period] || 0) / grandTotal) * 100).toFixed(2) : '0.00';
                            rowData.push(`${periodPercentage}%`);
                        } else {
                            rowData.push(sovData.totals[period] || 0);
                        }
                        sovExcelData.push(rowData.join('\t'));
                    });
                    
                    // Add Year Total row (only for month view)
                    if (sovTableView === 'month') {
                        const yearTotalRow = ['Year Total'];
                        sovData.brands.forEach(brand => {
                            const yearTotal = yearlyBrandTotals[brand] || 0;
                            
                            if (sovTableDisplayMode === 'percentage') {
                                const percentage = grandTotal > 0 ? ((yearTotal / grandTotal) * 100).toFixed(2) : '0.00';
                                yearTotalRow.push(`${percentage}%`);
                            } else {
                                yearTotalRow.push(yearTotal);
                            }
                        });
                        // Add year total - total column
                        if (sovTableDisplayMode === 'percentage') {
                            yearTotalRow.push('100.00%');
                        } else {
                            yearTotalRow.push(grandTotal);
                        }
                        sovExcelData.push(yearTotalRow.join('\t'));
                    }
                    const sovClipboardText = sovExcelData.join('\n');
                    await navigator.clipboard.writeText(sovClipboardText);
                    alert('SOV Table data copied! You can paste this directly into Excel.');
                    return;
            }

            if (chartData.length === 0) {
                alert('No chart data to copy');
                return;
            }

            let excelData = [title, ''];

            switch (activeChart) {
                case 'impression':
                    excelData.push('Brand\tImpressions\tPercentage');
                    chartData.forEach(row => {
                        excelData.push(`${row.name}\t${row.value}\t${row.percentage}%`);
                    });
                    break;
                case 'line':
                    if (chartData.length > 0) {
                        const lineKeys = Object.keys(chartData[0]).filter(key => key !== 'period');
                        const headers = [trendLineView === 'year' ? 'Year' : 'Month', ...lineKeys];
                        excelData.push(headers.join('\t'));
                        chartData.forEach(row => {
                            const rowData = [row.period, ...lineKeys.map(key => row[key] || 0)];
                            excelData.push(rowData.join('\t'));
                        });
                    }
                    break;
                case 'adtype':
                case 'mediatype':
                    if (chartData.length > 0) {
                        const dataKeys = Object.keys(chartData[0]).filter(key => key !== 'name' && !key.includes('Value'));
                        const headers = ['Brand', ...dataKeys.map(k => `${k} %`), ...dataKeys.map(k => `${k} Value`)];
                        excelData.push(headers.join('\t'));

                        chartData.forEach(row => {
                            const rowData = [
                                row.name,
                                ...dataKeys.map(key => `${row[key]}%`),
                                ...dataKeys.map(key => row[`${key}Value`] || 0)
                            ];
                            excelData.push(rowData.join('\t'));
                        });
                    }
                    break;
            }

            const clipboardText = excelData.join('\n');
            await navigator.clipboard.writeText(clipboardText);
            alert('Chart data copied! You can paste this directly into Excel or use it to create charts in PowerPoint.');
        } catch (error) {
            console.error('Failed to copy chart data:', error);
            alert('Failed to copy chart data. Please try again.');
        }
    };

    const downloadChart = async () => {
        try {
            // Special handling for SOV Table - provide SVG
            if (activeChart === 'sovtable') {
                const sovData = getSovTableData();
                if (sovData.periods.length === 0 || sovData.brands.length === 0) {
                    alert('No SOV table data to download.');
                    return;
                }

                const dateStr = new Date().toISOString().split('T')[0];
                
                // Calculate grand total for percentage calculations
                const grandTotal = Object.values(sovData.totals).reduce((sum, value) => sum + value, 0);
                
                // Calculate yearly totals by brand (for month view) - COMPLETELY FIXED
                const yearlyBrandTotals = {};
                if (sovTableView === 'month') {
                    sovData.brands.forEach(brand => {
                        let brandYearTotal = 0;
                        sovData.periods.forEach(period => {
                            // Make sure we access the data correctly
                            if (sovData.data[period] && sovData.data[period][brand] !== undefined) {
                                brandYearTotal += sovData.data[period][brand];
                            }
                        });
                        yearlyBrandTotals[brand] = brandYearTotal;
                    });
                }
                
                // Create and download SVG
                const cellWidth = 140; // Increased width for better fitting
                const cellHeight = 30;
                const headerHeight = 35;
                const padding = 10; // Increased padding
                const fontSize = 11; // Slightly smaller font for better fit
                
                const numCols = sovData.brands.length + 2; // period + brands + total
                const numRows = sovData.periods.length + 1 + (sovTableView === 'month' ? 1 : 0); // data rows + header + year total (if month view)
                
                const svgWidth = numCols * cellWidth;
                const svgHeight = headerHeight + (numRows - 1) * cellHeight;
                
                let svgContent = `
                    <svg width="${svgWidth}" height="${svgHeight}" xmlns="http://www.w3.org/2000/svg">
                        <style>
                            .header-text { font-family: Poppins, sans-serif; font-size: ${fontSize}px; font-weight: bold; fill: #374151; }
                            .cell-text { font-family: Poppins, sans-serif; font-size: ${fontSize}px; fill: #374151; }
                            .number-text { font-family: Poppins, sans-serif; font-size: ${fontSize}px; fill: #374151; text-anchor: end; }
                            .year-total-text { font-family: Poppins, sans-serif; font-size: ${fontSize}px; font-weight: bold; fill: #dc2626; }
                            .year-total-number { font-family: Poppins, sans-serif; font-size: ${fontSize}px; font-weight: bold; fill: #dc2626; text-anchor: end; }
                            .header-bg { fill: #f3f4f6; stroke: #d1d5db; stroke-width: 1; }
                            .cell-bg { fill: #ffffff; stroke: #d1d5db; stroke-width: 1; }
                            .alt-cell-bg { fill: #f9fafb; stroke: #d1d5db; stroke-width: 1; }
                            .year-total-bg { fill: #fef2f2; stroke: #dc2626; stroke-width: 2; }
                        </style>
                `;

                // Draw header
                let x = 0;
                
                // Period header
                svgContent += `<rect x="${x}" y="0" width="${cellWidth}" height="${headerHeight}" class="header-bg"/>`;
                svgContent += `<text x="${x + padding}" y="${headerHeight/2 + 4}" class="header-text">${sovTableView === 'year' ? 'Year' : 'Month'}</text>`;
                x += cellWidth;
                
                // Brand headers
                sovData.brands.forEach(brand => {
                    svgContent += `<rect x="${x}" y="0" width="${cellWidth}" height="${headerHeight}" class="header-bg"/>`;
                    const truncatedBrand = brand.length > 20 ? brand.substring(0, 20) + '...' : brand;
                    svgContent += `<text x="${x + padding}" y="${headerHeight/2 + 4}" class="header-text">${truncatedBrand}</text>`;
                    x += cellWidth;
                });
                
                // Total header
                svgContent += `<rect x="${x}" y="0" width="${cellWidth}" height="${headerHeight}" class="header-bg"/>`;
                svgContent += `<text x="${x + padding}" y="${headerHeight/2 + 4}" class="header-text">Total</text>`;

                // Draw data rows
                let y = headerHeight;
                sovData.periods.forEach((period, rowIndex) => {
                    x = 0;
                    const isEvenRow = rowIndex % 2 === 0;
                    const cellClass = isEvenRow ? 'alt-cell-bg' : 'cell-bg';
                    
                    // Period cell
                    svgContent += `<rect x="${x}" y="${y}" width="${cellWidth}" height="${cellHeight}" class="${cellClass}"/>`;
                    svgContent += `<text x="${x + padding}" y="${y + cellHeight/2 + 4}" class="cell-text">${period}</text>`;
                    x += cellWidth;
                    
                    // Brand cells (percentage or impression based on display mode)
                    sovData.brands.forEach(brand => {
                        const value = sovData.data[period][brand] || 0;
                        const total = sovData.totals[period] || 0;
                        
                        let displayValue;
                        if (sovTableDisplayMode === 'percentage') {
                            const percentage = total > 0 ? ((value / total) * 100).toFixed(2) : '0.00';
                            displayValue = `${percentage}%`;
                        } else {
                            displayValue = value.toLocaleString();
                        }
                        
                        svgContent += `<rect x="${x}" y="${y}" width="${cellWidth}" height="${cellHeight}" class="${cellClass}"/>`;
                        svgContent += `<text x="${x + cellWidth - padding}" y="${y + cellHeight/2 + 4}" class="number-text">${displayValue}</text>`;
                        x += cellWidth;
                    });
                    
                    // Total cell
                    svgContent += `<rect x="${x}" y="${y}" width="${cellWidth}" height="${cellHeight}" class="${cellClass}"/>`;
                    let totalDisplayValue;
                    if (sovTableDisplayMode === 'percentage') {
                        const periodPercentage = grandTotal > 0 ? (((sovData.totals[period] || 0) / grandTotal) * 100).toFixed(2) : '0.00';
                        totalDisplayValue = `${periodPercentage}%`;
                    } else {
                        totalDisplayValue = (sovData.totals[period] || 0).toLocaleString();
                    }
                    svgContent += `<text x="${x + cellWidth - padding}" y="${y + cellHeight/2 + 4}" class="number-text">${totalDisplayValue}</text>`;
                    
                    y += cellHeight;
                });

                // Add Year Total row (only for month view) - FIXED STYLING AND LAYOUT
                if (sovTableView === 'month') {
                    x = 0;
                    
                    // Year Total label cell
                    svgContent += `<rect x="${x}" y="${y}" width="${cellWidth}" height="${cellHeight}" class="year-total-bg"/>`;
                    svgContent += `<text x="${x + padding}" y="${y + cellHeight/2 + 4}" class="year-total-text">Year Total</text>`;
                    x += cellWidth;
                    
                    // Brand yearly total cells - FIXED CALCULATION AND STYLING
                    sovData.brands.forEach(brand => {
                        const yearTotal = yearlyBrandTotals[brand] || 0;
                        
                        let displayValue;
                        if (sovTableDisplayMode === 'percentage') {
                            const percentage = grandTotal > 0 ? ((yearTotal / grandTotal) * 100).toFixed(2) : '0.00';
                            displayValue = `${percentage}%`;
                        } else {
                            displayValue = yearTotal.toLocaleString();
                        }
                        
                        svgContent += `<rect x="${x}" y="${y}" width="${cellWidth}" height="${cellHeight}" class="year-total-bg"/>`;
                        svgContent += `<text x="${x + cellWidth - padding}" y="${y + cellHeight/2 + 4}" class="year-total-number">${displayValue}</text>`;
                        x += cellWidth;
                    });
                    
                    // Year total - total cell
                    svgContent += `<rect x="${x}" y="${y}" width="${cellWidth}" height="${cellHeight}" class="year-total-bg"/>`;
                    const yearTotalDisplay = sovTableDisplayMode === 'percentage' ? '100.00%' : grandTotal.toLocaleString();
                    svgContent += `<text x="${x + cellWidth - padding}" y="${y + cellHeight/2 + 4}" class="year-total-number">${yearTotalDisplay}</text>`;
                }

                svgContent += '</svg>';

                // Download SVG
                const svgBlob = new Blob([svgContent], {type: 'image/svg+xml;charset=utf-8'});
                const svgUrl = URL.createObjectURL(svgBlob);
                const svgLink = document.createElement('a');
                svgLink.download = `sov-table-${sovTableView}-${sovTableDisplayMode}-${dateStr}.svg`;
                svgLink.href = svgUrl;
                document.body.appendChild(svgLink);
                svgLink.click();
                document.body.removeChild(svgLink);
                URL.revokeObjectURL(svgUrl);

                alert('SOV Table downloaded as SVG file!');
                return;
            }

            // For other charts - FIXED TO MATCH DISPLAY EXACTLY
            const svgElement = document.querySelector('.recharts-wrapper svg');
            if (!svgElement) {
                alert('Chart not found. Please make sure a chart is displayed.');
                return;
            }

            // Clone the SVG to avoid modifying the original
            const svgClone = svgElement.cloneNode(true);
            
            // Set white background
            svgClone.style.backgroundColor = 'white';
            
            // Get SVG dimensions
            const svgRect = svgElement.getBoundingClientRect();
            const svgWidth = svgRect.width;
            const svgHeight = svgRect.height;
            
            // FIXED: ADD LEGENDS THAT MATCH EXACTLY WHAT'S DISPLAYED
            const currentColors = COLOR_SCHEMES[colorScheme];
            let legendHTML = '';
            
            // NO LEGEND for impression/pie chart since brand names are shown on the pie itself
            if (activeChart === 'line') {
                // FIXED: Add legend for line chart that matches the display exactly
                const lineData = getLineChartData();
                const brands = lineData.length > 0 ? Object.keys(lineData[0]).filter(key => key !== 'period') : [];
                
                const legendY = svgHeight - 40;
                const legendWidth = Math.min(brands.length * 100, svgWidth - 40);
                legendHTML = `<g transform="translate(${svgWidth/2 - legendWidth/2}, ${legendY})">`;
                
                // Show exactly the same brands as displayed in the chart
                brands.forEach((brand, index) => {
                    const xPos = 10 + (index * (legendWidth-20)/brands.length);
                    legendHTML += `<line x1="${xPos}" y1="15" x2="${xPos + 20}" y2="15" stroke="${currentColors[index % currentColors.length]}" stroke-width="3"/>`;
                    const truncatedBrand = brand.length > 10 ? brand.substring(0, 10) + '...' : brand;
                    legendHTML += `<text x="${xPos + 25}" y="22" font-family="Arial" font-size="10" fill="#333">${truncatedBrand}</text>`;
                });
                legendHTML += '</g>';
            } else if (activeChart === 'adtype' || activeChart === 'mediatype') {
                // FIXED: Add legend for bar charts that matches the display exactly
                const chartData = activeChart === 'adtype' ? getAdTypeChartData() : getMediaTypeChartData();
                const dataKeys = chartData.length > 0 ? Object.keys(chartData[0]).filter(key => key !== 'name' && !key.includes('Value') && key !== 'isOthers' && key !== 'otherBrands') : [];
                
                const legendY = svgHeight - 40;
                const legendWidth = Math.min(dataKeys.length * 120, svgWidth - 40);
                legendHTML = `<g transform="translate(${svgWidth/2 - legendWidth/2}, ${legendY})">`;
                
                // Show exactly the same data keys as displayed in the chart
                dataKeys.forEach((key, index) => {
                    const xPos = 10 + (index * (legendWidth-20)/dataKeys.length);
                    legendHTML += `<rect x="${xPos}" y="10" width="15" height="15" fill="${currentColors[index % currentColors.length]}"/>`;
                    const truncatedKey = key.length > 12 ? key.substring(0, 12) + '...' : key;
                    legendHTML += `<text x="${xPos + 20}" y="22" font-family="Arial" font-size="12" fill="#333">${truncatedKey}</text>`;
                });
                legendHTML += '</g>';
            }
            
            // Insert the legend into the SVG
            if (legendHTML) {
                svgClone.insertAdjacentHTML('beforeend', legendHTML);
            }
            
            // Get SVG data
            const svgData = new XMLSerializer().serializeToString(svgClone);
            const svgBlob = new Blob([svgData], {type: 'image/svg+xml;charset=utf-8'});
            
            // Create download link
            const url = URL.createObjectURL(svgBlob);
            const link = document.createElement('a');
            link.download = `${activeChart}-chart-${new Date().toISOString().split('T')[0]}.svg`;
            link.href = url;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
            
        } catch (error) {
            console.error('Failed to download chart:', error);
            alert('For chart download: Right-click on the chart and select "Save image as..." or use "Copy Data" to get data for PowerPoint charts.');
        }
    };

    const handleSort = (key) => {
        let direction = 'asc';
        if (sortConfig.key === key && sortConfig.direction === 'asc') {
            direction = 'desc';
        }
        setSortConfig({ key, direction });
    };

    const getSortedData = () => {
        if (!sortConfig.key) return transformedData;

        const sortedData = [...transformedData].sort((a, b) => {
            let aValue = a[sortConfig.key];
            let bValue = b[sortConfig.key];

            switch (sortConfig.key) {
                case 'File Name':
                case 'Brand Name':
                    aValue = aValue?.toString().toLowerCase() || '';
                    bValue = bValue?.toString().toLowerCase() || '';
                    break;

                case 'Year':
                    aValue = parseInt(aValue) || 0;
                    bValue = parseInt(bValue) || 0;
                    break;

                case 'Month':
                    aValue = monthOrder.indexOf(aValue) !== -1 ? monthOrder.indexOf(aValue) : 999;
                    bValue = monthOrder.indexOf(bValue) !== -1 ? monthOrder.indexOf(bValue) : 999;
                    break;

                case 'Impression (ad contact)':
                    aValue = parseFloat(aValue?.toString().replace(/,/g, '')) || 0;
                    bValue = parseFloat(bValue?.toString().replace(/,/g, '')) || 0;
                    break;

                default:
                    aValue = aValue?.toString().toLowerCase() || '';
                    bValue = bValue?.toString().toLowerCase() || '';
            }

            if (aValue < bValue) {
                return sortConfig.direction === 'asc' ? -1 : 1;
            }
            if (aValue > bValue) {
                return sortConfig.direction === 'asc' ? 1 : -1;
            }
            return 0;
        });

        return sortedData;
    };

    // Pagination logic
    const getPaginatedData = () => {
        const sortedData = getSortedData();
        const startIndex = (currentPage - 1) * rowsPerPage;
        const endIndex = startIndex + rowsPerPage;
        return sortedData.slice(startIndex, endIndex);
    };

    const getTotalPages = () => {
        const sortedData = getSortedData();
        return Math.ceil(sortedData.length / rowsPerPage);
    };

    const handlePageChange = (newPage) => {
        setCurrentPage(Math.max(1, Math.min(newPage, getTotalPages())));
    };

    const handleRowsPerPageChange = (newRowsPerPage) => {
        setRowsPerPage(newRowsPerPage);
        setCurrentPage(1); // Reset to first page
    };

    const getSortIcon = (columnKey) => {
        if (sortConfig.key !== columnKey) {
            return <span className="text-gray-400 ml-1">↕</span>;
        }
        return sortConfig.direction === 'asc' ?
            <span className="text-black-600 ml-1">↑</span> :
            <span className="text-black-600 ml-1">↓</span>;
    };

    // Pagination controls component
    const renderPaginationControls = () => {
        const TotalPages = getTotalPages();
        const sortedData = getSortedData();
        const startIndex = (currentPage - 1) * rowsPerPage;
        const endIndex = Math.min(startIndex + rowsPerPage, sortedData.length);

        if (TotalPages <= 1) return null;

        const pageNumbers = [];
        const maxVisiblePages = 5;
        
        let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
        let endPage = Math.min(TotalPages, startPage + maxVisiblePages - 1);
        
        if (endPage - startPage < maxVisiblePages - 1) {
            startPage = Math.max(1, endPage - maxVisiblePages + 1);
        }

        for (let i = startPage; i <= endPage; i++) {
            pageNumbers.push(i);
        }

        return (
            <div className="flex items-center justify-between px-4 py-3 bg-gray-50 border-t">
                <div className="flex items-center space-x-4">
                    <div className="text-sm text-gray-700">
                        Showing {startIndex + 1} to {endIndex} of {sortedData.length} entries
                    </div>
                    <div className="flex items-center space-x-2">
                        <span className="text-sm text-gray-700">Rows per page:</span>
                        <select
                            value={rowsPerPage}
                            onChange={(e) => handleRowsPerPageChange(parseInt(e.target.value))}
                            className="px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:border-red-500"
                        >
                            <option value={25}>25</option>
                            <option value={50}>50</option>
                            <option value={100}>100</option>
                            <option value={250}>250</option>
                            <option value={500}>500</option>
                        </select>
                    </div>
                </div>

                <div className="flex items-center space-x-2">
                    <button
                        onClick={() => handlePageChange(1)}
                        disabled={currentPage === 1}
                        className="px-2 py-1 border border-gray-300 rounded text-sm hover:bg-gray-100 disabled:bg-gray-200 disabled:cursor-not-allowed"
                    >
                        ««
                    </button>
                    <button
                        onClick={() => handlePageChange(currentPage - 1)}
                        disabled={currentPage === 1}
                        className="px-2 py-1 border border-gray-300 rounded text-sm hover:bg-gray-100 disabled:bg-gray-200 disabled:cursor-not-allowed"
                    >
                        ‹
                    </button>
                    
                    {startPage > 1 && (
                        <>
                            <button
                                onClick={() => handlePageChange(1)}
                                className="px-3 py-1 border border-gray-300 rounded text-sm hover:bg-gray-100"
                            >
                                1
                            </button>
                            {startPage > 2 && <span className="text-gray-500">...</span>}
                        </>
                    )}

                    {pageNumbers.map(pageNum => (
                        <button
                            key={pageNum}
                            onClick={() => handlePageChange(pageNum)}
                            className={`px-3 py-1 border rounded text-sm ${
                                currentPage === pageNum
                                    ? 'bg-red-500 text-white border-red-500'
                                    : 'border-gray-300 hover:bg-gray-100'
                            }`}
                        >
                            {pageNum}
                        </button>
                    ))}

                    {endPage < TotalPages && (
                        <>
                            {endPage < TotalPages - 1 && <span className="text-gray-500">...</span>}
                            <button
                                onClick={() => handlePageChange(TotalPages)}
                                className="px-3 py-1 border border-gray-300 rounded text-sm hover:bg-gray-100"
                            >
                                {TotalPages}
                            </button>
                        </>
                    )}

                    <button
                        onClick={() => handlePageChange(currentPage + 1)}
                        disabled={currentPage === TotalPages}
                        className="px-2 py-1 border border-gray-300 rounded text-sm hover:bg-gray-100 disabled:bg-gray-200 disabled:cursor-not-allowed"
                    >
                        ›
                    </button>
                    <button
                        onClick={() => handlePageChange(TotalPages)}
                        disabled={currentPage === TotalPages}
                        className="px-2 py-1 border border-gray-300 rounded text-sm hover:bg-gray-100 disabled:bg-gray-200 disabled:cursor-not-allowed"
                    >
                        »»
                    </button>
                </div>
            </div>
        );
    };

    // Optimized file upload with chunked processing
    const handleFileUpload = async (event) => {
        const files = Array.from(event.target.files);
        if (files.length === 0) return;

        setIsProcessing(true);
        setProcessingProgress(0);
        setProcessingStatus('Starting...');

        try {
            for (let fileIndex = 0; fileIndex < files.length; fileIndex++) {
                const file = files[fileIndex];
                const baseProgress = (fileIndex / files.length) * 100;
                const fileProgressRange = 100 / files.length;
                
                setProcessingStatus(`Reading file: ${file.name}`);
                setProcessingProgress(Math.min(baseProgress + (fileProgressRange * 0.1), 100));
                await sleep(50);

                const arrayBuffer = await file.arrayBuffer();
                
                setProcessingStatus(`Parsing Excel file...`);
                setProcessingProgress(Math.min(baseProgress + (fileProgressRange * 0.3), 100));
                await sleep(50);

                const workbook = XLSX.read(arrayBuffer, { type: 'array' });
                const sheetName = workbook.SheetNames[0];
                const worksheet = workbook.Sheets[sheetName];

                setProcessingStatus(`Transforming data...`);
                setProcessingProgress(Math.min(baseProgress + (fileProgressRange * 0.6), 100));
                await sleep(50);

                const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' });
                
                setProcessingStatus(`Processing data...`);
                setProcessingProgress(Math.min(baseProgress + (fileProgressRange * 0.8), 100));
                await sleep(50);

                // Use optimized processing for large files
                const processedData = await processDataAsyncOptimized(jsonData, file.name);

                // Add data immediately as it's processed
                setTransformedData(prevData => [...prevData, ...processedData.transformed]);
                setUploadedFiles(prevFiles => [...prevFiles, {
                    name: file.name,
                    size: file.size,
                    rowsAdded: processedData.transformed.length,
                    uploadedAt: new Date().toLocaleString()
                }]);

                setProcessingProgress(Math.min(baseProgress + fileProgressRange, 100));
                await sleep(50);
            }

            setProcessingStatus('Completed!');
            await sleep(500);

            // Set filters only once at the end
            setTimeout(() => {
                const currentHasFilters = Object.values(chartFilters).some(filterArray => filterArray.length > 0);
                if (!currentHasFilters) {
                    setDefaultFilters();
                }
            }, 100);

        } catch (error) {
            console.error('Error processing file:', error);
            alert('Error processing file. Please make sure it\'s a valid Excel file.');
        } finally {
            setIsProcessing(false);
            setProcessingProgress(0);
            setProcessingStatus('');
            if (fileInputRef.current) {
                fileInputRef.current.value = '';
            }
        }
    };

    // Optimized data processing with better performance for large files
    const processDataAsyncOptimized = async (data, fileName) => {
        let processedData = data.slice(18);

        processedData = processedData.filter(row => {
            const rowString = row.join(' ').toLowerCase();
            return !rowString.includes('all ad types') &&
                !rowString.includes('all media types') &&
                !rowString.includes('all brands') &&
                !rowString.includes('all ');
        });

        if (processedData.length > 0) {
            const headerRow = processedData[0];
            const sumColumnIndex = headerRow.findIndex(cell =>
                cell && cell.toString().toLowerCase().includes('sum')
            );

            if (sumColumnIndex !== -1) {
                processedData = processedData.map(row => {
                    const newRow = [...row];
                    newRow.splice(sumColumnIndex, 1);
                    return newRow;
                });
            }
        }

        // Use optimized transformation for large datasets
        const transformedData = await transformToLongFormatOptimized(processedData, fileName);

        return {
            original: processedData,
            transformed: transformedData
        };
    };

    // Optimized transformation with better chunking and performance
    const transformToLongFormatOptimized = async (data, fileName) => {
        if (data.length < 2) return [];

        const headerRow = data[0];
        const dataRows = data.slice(1);

        const monthColumns = [];
        headerRow.forEach((header, index) => {
            if (header && header.toString().match(/\d{4}\s+\w+/)) {
                monthColumns.push({
                    index: index,
                    header: header.toString(),
                    year: header.toString().split(' ')[0],
                    month: header.toString().split(' ')[1]
                });
            }
        });

        const transformedRows = [];

        // Determine column indices based on configuration
        let currentIndex = 0;
        const columnMapping = {};

        if (columnConfig.includeBrand) {
            columnMapping.brand = currentIndex;
            currentIndex++;
        }

        if (columnConfig.includeMediaType) {
            columnMapping.mediaType = currentIndex;
            currentIndex++;
        }

        if (columnConfig.includeAdType) {
            columnMapping.adType = currentIndex;
            currentIndex++;
        }

        // Process in larger chunks for better performance, with more frequent pauses for very large files
        const chunkSize = dataRows.length > 10000 ? 50 : 200;
        const pauseInterval = dataRows.length > 10000 ? 5 : 10;
        
        for (let i = 0; i < dataRows.length; i += chunkSize) {
            const chunk = dataRows.slice(i, i + chunkSize);
            
            chunk.forEach(row => {
                // Check if we have brand data (required for processing)
                const hasBrandData = columnConfig.includeBrand ? (row[columnMapping.brand] && row[columnMapping.brand] !== '') : true;
                
                if (hasBrandData) {
                    monthColumns.forEach(monthCol => {
                        const impressionValue = row[monthCol.index];
                        if (impressionValue && impressionValue !== '' && impressionValue !== '-') {
                            // Create row in the correct order: file name, brand name, media type, ad type, year, month, impression
                            const transformedRow = {};

                            // Always start with File Name
                            transformedRow['File Name'] = fileName;

                            // Add Brand Name only if included
                            if (columnConfig.includeBrand) {
                                transformedRow['Brand Name'] = row[columnMapping.brand] || '';
                            }

                            // Add Media Type only if included
                            if (columnConfig.includeMediaType) {
                                transformedRow['Media Type'] = row[columnMapping.mediaType] || '';
                            }

                            // Add Ad Type only if included
                            if (columnConfig.includeAdType) {
                                transformedRow['Ad Type'] = row[columnMapping.adType] || '';
                            }

                            // Add Year, Month, and Impression
                            transformedRow['Year'] = monthCol.year;
                            transformedRow['Month'] = monthCol.month;
                            transformedRow['Impression (ad contact)'] = impressionValue;

                            transformedRows.push(transformedRow);
                        }
                    });
                }
            });

            // More frequent pauses for large files to prevent browser freezing
            if (i % (chunkSize * pauseInterval) === 0) {
                await sleep(dataRows.length > 10000 ? 20 : 10);
            }
        }

        return transformedRows;
    };

    const handleBulkFileNameEdit = () => {
        if (!selectedFileName || !bulkEditFileName.trim()) return;

        const newData = transformedData.map(row => {
            if (row['File Name'] === selectedFileName) {
                return { ...row, 'File Name': bulkEditFileName.trim() };
            }
            return row;
        });

        setTransformedData(newData);
        setShowBulkEdit(false);
        setBulkEditFileName('');
        setSelectedFileName('');
        alert(`Updated all rows with file name "${selectedFileName}" to "${bulkEditFileName.trim()}"`);
    };

    const getUniqueFileNames = () => {
        const fileNames = transformedData.map(row => row['File Name']);
        return [...new Set(fileNames)];
    };

    const copyAllData = async () => {
        const dataToUse = getSortedData();
        if (dataToUse.length === 0) return;

        try {
            const headers = Object.keys(dataToUse[0]);
            const displayHeaders = headers.map(header => getDisplayName(header));
            const headerRow = displayHeaders.join('\t');
            const dataRows = dataToUse.map(row =>
                headers.map(header => row[header] || '').join('\t')
            );
            const clipboardText = [headerRow, ...dataRows].join('\n');

            await navigator.clipboard.writeText(clipboardText);
            alert('Data copied to clipboard!');
        } catch (error) {
            console.error('Failed to copy data:', error);
            alert('Failed to copy data. Please try again.');
        }
    };

    const clearAllData = () => {
        setUploadedFiles([]);
        setTransformedData([]);
        setEditingCell(null);
        setEditingHeader(null);
        setColumnDisplayNames({});
        setShowBulkEdit(false);
        setBulkEditFileName('');
        setSelectedFileName('');
        setSortConfig({ key: null, direction: 'asc' });
        setCurrentPage(1);
        clearAllFilters();
    };

    const removeFile = (index) => {
        const fileToRemove = uploadedFiles[index];
        const newUploadedFiles = uploadedFiles.filter((_, i) => i !== index);
        const newTransformedData = transformedData.filter(row => row['File Name'] !== fileToRemove.name);

        setUploadedFiles(newUploadedFiles);
        setTransformedData(newTransformedData);
    };

    const handleCellEdit = (rowIndex, column, value) => {
        const newData = [...transformedData];
        newData[rowIndex][column] = value;
        setTransformedData(newData);
    };

    const handleCellClick = (rowIndex, column) => {
        setEditingCell({ rowIndex, column });
    };

    const handleCellBlur = () => {
        setEditingCell(null);
    };

    const handleKeyPress = (e, rowIndex, column) => {
        if (e.key === 'Enter') {
            setEditingCell(null);
        }
    };

    const handleHeaderClick = (columnKey) => {
        setEditingHeader(columnKey);
    };

    const handleHeaderEdit = (columnKey, newDisplayName) => {
        setColumnDisplayNames(prev => ({
            ...prev,
            [columnKey]: newDisplayName
        }));
    };

    const handleHeaderBlur = () => {
        setEditingHeader(null);
    };

    const handleHeaderKeyPress = (e) => {
        if (e.key === 'Enter') {
            setEditingHeader(null);
        }
    };

    const getDisplayName = (columnKey) => {
        return columnDisplayNames[columnKey] || columnKey;
    };

    // NEW: Line Chart rendering function
    const renderLineChart = () => {
        const lineData = getLineChartData();
        
        if (lineData.length === 0) {
            return (
                <div className="h-96 flex items-center justify-center">
                    <p className="text-gray-500">No trend data available for the current filters</p>
                </div>
            );
        }

        const currentColors = COLOR_SCHEMES[colorScheme];
        const brands = lineData.length > 0 ? Object.keys(lineData[0]).filter(key => key !== 'period') : [];

        return (
            <div className="h-96">
                <div className="flex justify-between items-center mb-2">
                    <div className="text-xs text-gray-500">
                        Showing impression trends for top {brands.length} brands over {lineData.length} {trendLineView === 'year' ? 'years' : 'months'}
                    </div>
                    <div className="flex items-center space-x-2">
                        <span className="text-sm text-gray-600">View by:</span>
                        <select
                            value={trendLineView}
                            onChange={(e) => setTrendLineView(e.target.value)}
                            className="px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:border-red-500"
                        >
                            <option value="month">Month</option>
                            <option value="year">Year</option>
                        </select>
                    </div>
                </div>
                <ResponsiveContainer width="100%" height="90%">
                    <LineChart data={lineData} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis 
                            dataKey="period" 
                            angle={-45}
                            textAnchor="end"
                            height={80}
                            tick={{ fontSize: 16 }}
                        />
                        <YAxis 
                            tick={{ fontSize: 12 }}
                            tickFormatter={(value) => {
                                if (value >= 1000000000) {
                                    return `${(value / 1000000000).toFixed(1)}B`;
                                } else if (value >= 1000000) {
                                    return `${(value / 1000000).toFixed(0)}M`;
                                } else if (value >= 1000) {
                                    return `${(value / 1000).toFixed(0)}K`;
                                } else {
                                    return value.toString();
                                }
                            }}
                            domain={[0, 'dataMax']}
                            allowDataOverflow={false}
                            tickCount={6}
                        />
                        <Tooltip 
                            formatter={(value, name) => [value.toLocaleString(), name]}
                            labelFormatter={(label) => `${trendLineView === 'year' ? 'Year' : 'Month'}: ${label}`}
                        />
                        <Legend />
                        {brands.map((brand, index) => (
                            <Line
                                key={brand}
                                type="monotone"
                                dataKey={brand}
                                stroke={currentColors[index % currentColors.length]}
                                strokeWidth={2}
                                dot={{ r: 4 }}
                                name={brand}
                            />
                        ))}
                    </LineChart>
                </ResponsiveContainer>
            </div>
        );
    };

    // NEW: SOV Table rendering function
    const renderSovTable = () => {
        const sovData = getSovTableData();
        
        if (sovData.periods.length === 0 || sovData.brands.length === 0) {
            return (
                <div className="h-96 flex items-center justify-center">
                    <p className="text-gray-500">No SOV table data available for the current filters</p>
                </div>
            );
        }

        // Calculate grand total for percentage calculations
        const grandTotal = Object.values(sovData.totals).reduce((sum, value) => sum + value, 0);

        // Calculate yearly totals by brand (for month view) - COMPLETELY FIXED
        const yearlyBrandTotals = {};
        if (sovTableView === 'month') {
            sovData.brands.forEach(brand => {
                let brandYearTotal = 0;
                sovData.periods.forEach(period => {
                    // Make sure we access the data correctly
                    if (sovData.data[period] && sovData.data[period][brand] !== undefined) {
                        brandYearTotal += sovData.data[period][brand];
                    }
                });
                yearlyBrandTotals[brand] = brandYearTotal;
            });
        }

        return (
            <div className="h-96">
                <div className="flex justify-between items-center mb-2">
                    <div className="text-xs text-gray-500">
                        {sovTableDisplayMode === 'percentage' ? 'SOV percentages' : 'Impression numbers'} for {sovData.brands.length} brands across {sovData.periods.length} {sovTableView === 'year' ? 'years' : 'months'}
                    </div>
                    <div className="flex items-center space-x-4">
                        <div className="flex items-center space-x-2">
                            <span className="text-sm text-gray-600">View by:</span>
                            <select
                                value={sovTableView}
                                onChange={(e) => setSovTableView(e.target.value)}
                                className="px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:border-red-500"
                            >
                                <option value="month">Month</option>
                                <option value="year">Year</option>
                            </select>
                        </div>
                        <div className="flex items-center space-x-2">
                            <span className="text-sm text-gray-600">Display:</span>
                            <select
                                value={sovTableDisplayMode}
                                onChange={(e) => setSovTableDisplayMode(e.target.value)}
                                className="px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:border-red-500"
                            >
                                <option value="percentage">Percentage</option>
                                <option value="impressions">Impressions</option>
                            </select>
                        </div>
                    </div>
                </div>
                <div className="overflow-auto" style={{ height: 'calc(100% - 40px)' }}>
                    <table className="w-full text-sm border-collapse border border-gray-300" id="sov-table">
                        <thead className="bg-gray-100 sticky top-0">
                            <tr>
                                <th className="border border-gray-300 px-3 py-2 text-left font-medium">{sovTableView === 'year' ? 'Year' : 'Month'}</th>
                                {sovData.brands.map(brand => (
                                    <th key={brand} className="border border-gray-300 px-3 py-2 text-left font-medium">
                                        {brand}
                                    </th>
                                ))}
                                <th className="border border-gray-300 px-3 py-2 text-left font-medium">Total</th>
                            </tr>
                        </thead>
                        <tbody>
                            {sovData.periods.map((period, index) => (
                                <tr key={period} className={index % 2 === 0 ? 'bg-gray-50' : 'bg-white'}>
                                    <td className="border border-gray-300 px-3 py-2 font-medium">{period}</td>
                                    {sovData.brands.map(brand => {
                                        const value = sovData.data[period][brand] || 0;
                                        const total = sovData.totals[period] || 0;
                                        
                                        let displayValue;
                                        if (sovTableDisplayMode === 'percentage') {
                                            const percentage = total > 0 ? ((value / total) * 100).toFixed(2) : '0.00';
                                            displayValue = `${percentage}%`;
                                        } else {
                                            displayValue = value.toLocaleString();
                                        }
                                        
                                        return (
                                            <td key={brand} className="border border-gray-300 px-3 py-2 text-right">
                                                {displayValue}
                                            </td>
                                        );
                                    })}
                                    <td className="border border-gray-300 px-3 py-2 text-right font-medium">
                                        {sovTableDisplayMode === 'percentage' 
                                            ? `${grandTotal > 0 ? (((sovData.totals[period] || 0) / grandTotal) * 100).toFixed(2) : '0.00'}%`
                                            : (sovData.totals[period] || 0).toLocaleString()
                                        }
                                    </td>
                                </tr>
                            ))}
                            
                            {/* Year Total Row (only for month view) */}
                            {sovTableView === 'month' && (
                                <tr className="bg-red-100 border-t-2 border-red-300">
                                    <td className="border border-gray-300 px-3 py-2 font-bold text-red-800">Year Total</td>
                                    {sovData.brands.map(brand => {
                                        const yearTotal = yearlyBrandTotals[brand] || 0;
                                        
                                        let displayValue;
                                        if (sovTableDisplayMode === 'percentage') {
                                            const percentage = grandTotal > 0 ? ((yearTotal / grandTotal) * 100).toFixed(2) : '0.00';
                                            displayValue = `${percentage}%`;
                                        } else {
                                            displayValue = yearTotal.toLocaleString();
                                        }
                                        
                                        return (
                                            <td key={brand} className="border border-gray-300 px-3 py-2 text-right font-bold text-red-800">
                                                {displayValue}
                                            </td>
                                        );
                                    })}
                                    <td className="border border-gray-300 px-3 py-2 text-right font-bold text-red-800">
                                        {sovTableDisplayMode === 'percentage' ? '100.00%' : grandTotal.toLocaleString()}
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        );
    };

    const renderChart = () => {
        const currentColors = COLOR_SCHEMES[colorScheme];

        switch (activeChart) {
            case 'impression':
                if (impressionChartData.length === 0) {
                    return (
                        <div className="h-96 flex items-center justify-center">
                            <p className="text-gray-500">No data available for the current filters</p>
                        </div>
                    );
                }
                return (
                    <div className="flex h-96">
                        <div className="flex-1" style={{ filter: 'drop-shadow(0 4px 8px rgba(0,0,0,0.1))' }}>
                            <ResponsiveContainer width="100%" height="100%">
                                <RechartsPieChart>
                                    <Pie
                                        data={impressionChartData}
                                        cx="50%"
                                        cy="50%"
                                        outerRadius={120}
                                        fill="#8884d8"
                                        dataKey="value"
                                        label={({ name, percentage }) => percentage >= 3 ? `${name}: ${percentage}%` : ''}
                                        labelLine={false}
                                        stroke="#fff"
                                        strokeWidth={2}
                                    >
                                        {impressionChartData.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={currentColors[index % currentColors.length]} />
                                        ))}
                                    </Pie>
                                    <Tooltip 
                                        formatter={(value, name, props) => {
                                            const { payload } = props;
                                            if (payload.isOthers) {
                                                return [
                                                    value.toLocaleString(),
                                                    payload.name,
                                                    `Includes: ${payload.otherBrands.slice(0, 5).join(', ')}${payload.otherBrands.length > 5 ? '...' : ''}`
                                                ];
                                            }
                                            return [value.toLocaleString(), payload.name];
                                        }}
                                    />
                                </RechartsPieChart>
                            </ResponsiveContainer>
                        </div>
                        <div className="w-64 p-4 bg-gray-50 rounded border max-h-96 overflow-y-auto">
                            <h4 className="font-semibold mb-3">Brands ({impressionChartData.length})</h4>
                            <div className="space-y-2">
                                {impressionChartData.map((entry, index) => (
                                    <div key={entry.name} className="flex items-center text-sm">
                                        <div
                                            className="w-4 h-4 rounded mr-2 flex-shrink-0"
                                            style={{ backgroundColor: currentColors[index % currentColors.length] }}
                                        ></div>
                                        <div className="flex-1 min-w-0">
                                            <div className="truncate font-medium">{entry.name}</div>
                                            <div className="text-xs text-gray-600">{entry.percentage}%</div>
                                            {entry.isOthers && (
                                                <div className="text-xs text-gray-500" title={entry.otherBrands.join(', ')}>
                                                    {entry.otherBrands.length} brands
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                );

            case 'adtype':
                const adTypeData = getAdTypeChartData();
                
                // Check if Ad Type column is available
                if (transformedData.length === 0 || !transformedData[0].hasOwnProperty('Ad Type')) {
                    return (
                        <div className="h-96 flex items-center justify-center">
                            <div className="text-center p-4 bg-red-50 rounded border">
                                <p className="text-gray-700 font-medium mb-2">Ad Type column is not included</p>
                                <div className="text-sm text-gray-600 space-y-1">
                                    <p>Enable "Ad Type" in Column Configuration to view this chart</p>
                                </div>
                            </div>
                        </div>
                    );
                }
                
                if (adTypeData.length === 0) {
                    const uniqueAdTypes = [...new Set(filteredChartData.map(r => r['Ad Type']))].filter(Boolean);

                    return (
                        <div className="h-96 flex items-center justify-center">
                            <div className="text-center p-4 bg-red-50 rounded border">
                                <p className="text-gray-700 font-medium mb-2">No ad type chart data available</p>
                                <div className="text-sm text-gray-600 space-y-1">
                                    <p>Filtered rows: {filteredChartData.length}</p>
                                    <p>Unique ad types found: {uniqueAdTypes.join(', ') || 'None'}</p>
                                </div>
                            </div>
                        </div>
                    );
                }

                const adTypeKeys = adTypeData.length > 0 ?
                    Object.keys(adTypeData[0]).filter(key => key !== 'name' && !key.includes('Value') && key !== 'isOthers' && key !== 'otherBrands') : [];

                return (
                    <div className="h-96">
                        <div className="text-xs text-gray-500 mb-2">
                            Showing {adTypeData.length} brands with ad type data (100% stacked bars based on impressions)
                        </div>
                        <ResponsiveContainer width="100%" height="85%">
                            <BarChart data={adTypeData} margin={{ top: 20, right: 30, left: 20, bottom: 30 }}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis
                                    dataKey="name"
                                    angle={-45}
                                    textAnchor="end"
                                    height={80}
                                    tick={{ fontSize: 16 }}
                                    interval={0}
                                />
                                <YAxis
                                    domain={[0, 100]}
                                    tick={{ fontSize: 12 }}
                                    ticks={[0, 20, 40, 60, 80, 100]}
                                    tickFormatter={(value) => `${value}%`}

                                />
                                <Tooltip
                                    formatter={(value, name, props) => {
                                        const { payload } = props;
                                        if (payload.isOthers) {
                                            return [`${value}% (grouped from ${payload.otherBrands.join(', ')})`, name];
                                        }
                                        return [`${value}% (${adTypeData.find(d => d.name === payload.name)?.[`${name}Value`] || 'N/A'} impressions)`, name];
                                    }}
                                    labelFormatter={(label) => `Brand: ${label}`}
                                />
                                <Legend />
                                {adTypeKeys.map((key, index) => (
                                    <Bar
                                        key={key}
                                        dataKey={key}
                                        stackId="a"
                                        fill={currentColors[index % currentColors.length]}
                                        name={key}
                                    />
                                ))}
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                );

            case 'mediatype':
                const mediaTypeData = getMediaTypeChartData();
                
                // Check if Media Type column is available
                if (transformedData.length === 0 || !transformedData[0].hasOwnProperty('Media Type')) {
                    return (
                        <div className="h-96 flex items-center justify-center">
                            <div className="text-center p-4 bg-red-50 rounded border">
                                <p className="text-gray-700 font-medium mb-2">Media Type column is not included</p>
                                <div className="text-sm text-gray-600 space-y-1">
                                    <p>Enable "Media Type" in Column Configuration to view this chart</p>
                                </div>
                            </div>
                        </div>
                    );
                }
                
                if (mediaTypeData.length === 0) {
                    const uniqueMediaTypes = [...new Set(filteredChartData.map(r => r['Media Type']))].filter(Boolean);

                    return (
                        <div className="h-96 flex items-center justify-center">
                            <div className="text-center p-4 bg-red-50 rounded border">
                                <p className="text-gray-700 font-medium mb-2">No media type chart data available</p>
                                <div className="text-sm text-gray-600 space-y-1">
                                    <p>Filtered rows: {filteredChartData.length}</p>
                                    <p>Unique media types found: {uniqueMediaTypes.join(', ') || 'None'}</p>
                                </div>
                            </div>
                        </div>
                    );
                }

                const mediaTypeKeys = mediaTypeData.length > 0 ?
                    Object.keys(mediaTypeData[0]).filter(key => key !== 'name' && !key.includes('Value') && key !== 'isOthers' && key !== 'otherBrands') : [];

                return (
                    <div className="h-96">
                        <div className="text-xs text-gray-500 mb-2">
                            Showing {mediaTypeData.length} brands with media type data (100% stacked bars based on impressions)
                        </div>
                        <ResponsiveContainer width="100%" height="85%">
                            <BarChart data={mediaTypeData} margin={{ top: 20, right: 30, left: 20, bottom: 30 }}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis
                                    dataKey="name"
                                    angle={-45}
                                    textAnchor="end"
                                    height={80}
                                    tick={{ fontSize: 16 }}
                                    interval={0}
                                />
                                <YAxis
                                    domain={[0, 100]}
                                    tick={{ fontSize: 12 }}
                                    ticks={[0, 20, 40, 60, 80, 100]}
                                    tickFormatter={(value) => `${value}%`}

                                />
                                <Tooltip
                                    formatter={(value, name, props) => {
                                        const { payload } = props;
                                        if (payload.isOthers) {
                                            return [`${value}% (grouped from ${payload.otherBrands.join(', ')})`, name];
                                        }
                                        return [`${value}% (${mediaTypeData.find(d => d.name === payload.name)?.[`${name}Value`] || 'N/A'} impressions)`, name];
                                    }}
                                    labelFormatter={(label) => `Brand: ${label}`}
                                />
                                <Legend />
                                {mediaTypeKeys.map((key, index) => (
                                    <Bar
                                        key={key}
                                        dataKey={key}
                                        stackId="a"
                                        fill={currentColors[index % currentColors.length]}
                                        name={key}
                                    />
                                ))}
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                );

            // NEW: Line chart case
            case 'line':
                return renderLineChart();

            // NEW: SOV table case  
            case 'sovtable':
                return renderSovTable();

            default:
                return null;
        }
    };

    const renderColumnConfig = () => {
        return (
            <div className="mb-4">
                <button
                    onClick={() => setShowColumnConfig(!showColumnConfig)}
                    className="w-full bg-gradient-to-r from-[#FF3534] from-80% to-[#F585DA] text-white py-3 px-4 mb-4 rounded-lg hover:bg-red-600 transition-all duration-200 flex items-center justify-between shadow-md"
                >
                    <div className="flex items-center">
                        <span className="mr-2">⚙</span>
                        <span className="font-medium">Column Configuration</span>
                        <span className="ml-2 text-xs bg-white bg-opacity-20 px-2 py-1 rounded">
                            Configure which columns to include
                        </span>
                    </div>
                    <div className={`transform transition-transform duration-200 ${showColumnConfig ? 'rotate-180' : ''}`}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M6 9L12 15L18 9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                    </div>
                </button>

                <div className={`overflow-hidden transition-all duration-300 ease-in-out ${showColumnConfig ? 'max-h-screen opacity-100' : 'max-h-0 opacity-0'}`}>
                    <div className="bg-red-50 p-4 rounded-lg mt-2 border">
                        <div className="mb-3">
                            <h4 className="font-medium text-gray-800 mb-2">Select columns to include in data processing:</h4>
                            <p className="text-sm text-gray-600 mb-3">
                                When columns are excluded, the remaining columns will shift left. For example, if you exclude Media Type (column B), then Ad Type will become column B, and month data will start from column C instead of D.
                            </p>
                        </div>

                        <div className="space-y-3">
                            <label className="flex items-center text-sm hover:bg-red-100 px-2 py-2 rounded">
                                <input
                                    type="checkbox"
                                    checked={columnConfig.includeBrand}
                                    onChange={(e) => handleColumnConfigChange('includeBrand', e.target.checked)}
                                    className="mr-3 accent-red-500"
                                />
                                <div className="flex-1">
                                    <span className="font-medium">Brand Name (Column A)</span>
                                    <div className="text-xs text-gray-600">Include brand information in the data</div>
                                </div>
                            </label>

                            <label className="flex items-center text-sm hover:bg-red-100 px-2 py-2 rounded">
                                <input
                                    type="checkbox"
                                    checked={columnConfig.includeMediaType}
                                    onChange={(e) => handleColumnConfigChange('includeMediaType', e.target.checked)}
                                    className="mr-3 accent-red-500"
                                />
                                <div className="flex-1">
                                    <span className="font-medium">Media Type (Column {columnConfig.includeBrand ? 'B' : 'A'})</span>
                                    <div className="text-xs text-gray-600">Include media type information (TV, Radio, etc.)</div>
                                </div>
                            </label>

                            <label className="flex items-center text-sm hover:bg-red-100 px-2 py-2 rounded">
                                <input
                                    type="checkbox"
                                    checked={columnConfig.includeAdType}
                                    onChange={(e) => handleColumnConfigChange('includeAdType', e.target.checked)}
                                    className="mr-3 accent-red-500"
                                />
                                <div className="flex-1">
                                    <span className="font-medium">Ad Type (Column {
                                        columnConfig.includeBrand && columnConfig.includeMediaType ? 'C' :
                                        (columnConfig.includeBrand || columnConfig.includeMediaType) ? 'B' : 'A'
                                    })</span>
                                    <div className="text-xs text-gray-600">Include ad type information</div>
                                </div>
                            </label>
                        </div>

                        <div className="mt-4 p-3 bg-white rounded border">
                            <h5 className="font-medium text-sm text-gray-700 mb-2">Current Column Mapping:</h5>
                            <div className="text-xs text-gray-600 space-y-1">
                                {(() => {
                                    let currentCol = 'A';
                                    const mapping = [];
                                    
                                    if (columnConfig.includeBrand) {
                                        mapping.push(`Column ${currentCol}: Brand Name`);
                                        currentCol = String.fromCharCode(currentCol.charCodeAt(0) + 1);
                                    }
                                    if (columnConfig.includeMediaType) {
                                        mapping.push(`Column ${currentCol}: Media Type`);
                                        currentCol = String.fromCharCode(currentCol.charCodeAt(0) + 1);
                                    }
                                    if (columnConfig.includeAdType) {
                                        mapping.push(`Column ${currentCol}: Ad Type`);
                                        currentCol = String.fromCharCode(currentCol.charCodeAt(0) + 1);
                                    }
                                    mapping.push(`Column ${currentCol}+: Month/Impression Data`);
                                    
                                    return mapping.map((item, index) => (
                                        <div key={index}>{item}</div>
                                    ));
                                })()}
                            </div>
                        </div>

                        {transformedData.length > 0 && (
                            <div className="mt-3">
                                <button
                                    onClick={() => {
                                        // Clear existing data and prompt user to re-upload
                                        if (window.confirm('Changing column configuration will clear current data. You will need to re-upload your files. Continue?')) {
                                            clearAllData();
                                            alert('Configuration applied! Please upload your files again to apply the new column settings.');
                                        }
                                    }}
                                    className="bg-red-500 text-white px-4 py-2 rounded text-sm hover:bg-red-600 transition-all duration-200"
                                >
                                    Apply Configuration (Re-upload Required)
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        );
    };

    // New chart optimization controls
    const renderFilters = () => {
        return (
            <div className="mb-4">
                <button
                    onClick={() => setShowFilters(!showFilters)}
                    className="w-full bg-red-500 text-white py-3 px-4 rounded-lg hover:bg-red-600 transition-all duration-200 flex items-center justify-between shadow-md"
                >
                    <div className="flex items-center">
                        <span className="mr-2">▼</span>
                        <span className="font-medium">Chart Filters</span>
                        <span className="ml-2 text-xs bg-white bg-opacity-20 px-2 py-1 rounded">
                            {filteredChartData.length} rows
                        </span>
                    </div>
                    <div className={`transform transition-transform duration-200 ${showFilters ? 'rotate-180' : ''}`}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M6 9L12 15L18 9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                    </div>
                </button>

                <div className={`overflow-hidden transition-all duration-300 ease-in-out ${showFilters ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'}`}>
                    <div className="bg-gray-50 p-4 rounded-lg mt-2 border max-h-96 overflow-y-auto">
                        {activeChart === 'impression' && (
                            <div className="bg-red-50 p-4 rounded-lg border mb-4">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm text-gray-600 mb-2">
                                            Max brands in pie chart: {maxBrandsInChart}
                                        </label>
                                        <input
                                            type="range"
                                            min="3"
                                            max="15"
                                            value={maxBrandsInChart}
                                            onChange={(e) => setMaxBrandsInChart(parseInt(e.target.value))}
                                            className="w-full accent-red-500"
                                        />
                                        <div className="text-xs text-gray-500 mt-1">
                                            Smaller brands will be grouped into "Others"
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-sm text-gray-600 mb-2">
                                            Min percentage threshold: {minPercentageThreshold}%
                                        </label>
                                        <input
                                            type="range"
                                            min="0.5"
                                            max="10"
                                            step="0.5"
                                            value={minPercentageThreshold}
                                            onChange={(e) => setMinPercentageThreshold(parseFloat(e.target.value))}
                                            className="w-full accent-red-500"
                                        />
                                        <div className="text-xs text-gray-500 mt-1">
                                            Hide brands below this percentage
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {activeChart === 'adtype' && transformedData.length > 0 && transformedData[0].hasOwnProperty('Ad Type') && (
                            <div className="bg-red-50 p-4 rounded-lg border mb-4">
                                <div>
                                    <label className="block text-sm text-gray-600 mb-2">
                                        Max brands in ad type chart: {maxBrandsInAdTypeChart}
                                    </label>
                                    <input
                                        type="range"
                                        min="3"
                                        max="20"
                                        value={maxBrandsInAdTypeChart}
                                        onChange={(e) => setMaxBrandsInAdTypeChart(parseInt(e.target.value))}
                                        className="w-full accent-red-500"
                                    />
                                    <div className="text-xs text-gray-500 mt-1">
                                        Smaller brands will be grouped into "Others"
                                    </div>
                                </div>
                            </div>
                        )}

                        {activeChart === 'mediatype' && transformedData.length > 0 && transformedData[0].hasOwnProperty('Media Type') && (
                            <div className="bg-red-50 p-4 rounded-lg border mb-4">
                                <div>
                                    <label className="block text-sm text-gray-600 mb-2">
                                        Max brands in media type chart: {maxBrandsInMediaTypeChart}
                                    </label>
                                    <input
                                        type="range"
                                        min="3"
                                        max="20"
                                        value={maxBrandsInMediaTypeChart}
                                        onChange={(e) => setMaxBrandsInMediaTypeChart(parseInt(e.target.value))}
                                        className="w-full accent-red-500"
                                    />
                                    <div className="text-xs text-gray-500 mt-1">
                                        Smaller brands will be grouped into "Others"
                                    </div>
                                </div>
                            </div>
                        )}

                        <div className="flex justify-end items-center mb-3">
                            <div className="flex space-x-2">
                                <button
                                    onClick={selectAllFilters}
                                    className="text-sm bg-red-500 text-white px-3 py-1 rounded hover:bg-red-600 transition-all duration-200"
                                >
                                    Select All
                                </button>
                                <button
                                    onClick={clearAllFilters}
                                    className="text-sm bg-red-500 text-white px-3 py-1 rounded hover:bg-red-600 transition-all duration-200 flex items-center"
                                >
                                    <span className="mr-1">×</span>
                                    Clear All
                                </button>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
                            {Object.entries(filterOptions).map(([filterType, values]) => (
                                <div key={filterType} className="space-y-2">
                                    <label className="font-medium text-sm text-gray-700 capitalize">
                                        {filterType.replace(/([A-Z])/g, ' $1').trim()} ({values.length})
                                    </label>
                                    <div className="max-h-48 overflow-y-auto space-y-1 border rounded p-2 bg-white">
                                        {values.length === 0 ? (
                                            <p className="text-xs text-gray-400">No options available</p>
                                        ) : (
                                            values.map(value => (
                                                <label key={value} className="flex items-center text-sm hover:bg-gray-50 px-1 py-1 rounded">
                                                    <input
                                                        type="checkbox"
                                                        checked={chartFilters[filterType].includes(value)}
                                                        onChange={(e) => handleFilterChange(filterType, value, e.target.checked)}
                                                        className="mr-2 accent-red-500"
                                                    />
                                                    <span className="truncate">{value || '(empty)'}</span>
                                                </label>
                                            ))
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        );
    };

    // Loading bar component - simplified inline version
    const renderProgressBar = () => {
        if (!isProcessing) return null;

        return (
            <div className="bg-red-50 p-3 rounded-lg border">
                <div className="flex items-center justify-between text-xs text-gray-600 mb-2">
                    <span className="flex items-center truncate flex-1 mr-2">
                        <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-red-500 mr-2 flex-shrink-0"></div>
                        <span className="truncate">{processingStatus}</span>
                    </span>
                    <span className="text-xs font-medium flex-shrink-0">{Math.round(processingProgress)}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-1.5">
                    <div 
                        className="bg-red-500 h-1.5 rounded-full transition-all duration-300 ease-out"
                        style={{ width: `${Math.min(Math.max(processingProgress, 0), 100)}%` }}
                    ></div>
                </div>
            </div>
        );
    };

    return (
        <div className="flex h-screen bg-gray-50">
            <div className="w-1/4 bg-white border-r border-gray-200 flex flex-col h-screen">
                <div className="flex-1 overflow-y-auto p-6">
                    <div className="mb-6 text-center">
                        <img
                            src="https://www.umww.com/wp-content/uploads/2024/06/logo-new.png"
                            alt="UMWW Logo"
                            className="h-16 w-auto mx-auto mb-4 object-contain max-w-full"
                            onError={(e) => {
                                e.target.style.display = 'none';
                                e.target.nextSibling.style.display = 'block';
                            }}
                        />
                        <a
                            href="https://www.umww.com/wp-content/uploads/2024/06/logo-new.png"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-red-500 hover:text-red-600 text-sm underline"
                            style={{ display: 'none' }}
                        >
                            UMWW Logo
                        </a>
                    </div>

                    <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-red-400 transition-colors mb-6">
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept=".xlsx,.xls,.csv"
                            onChange={handleFileUpload}
                            className="hidden"
                            id="file-upload"
                            disabled={isProcessing}
                            multiple
                        />
                        <label htmlFor="file-upload" className="cursor-pointer">
                            <img
                                src="/upload-bro.svg"
                                alt="Upload"
                                className="w-48 h-auto mx-auto mb-4"
                            />
                            <p className="text-sm text-gray-600">
                                {isProcessing ? 'Processing...' : 'Click to upload Excel files'}
                            </p>
                            <p className="text-xs text-gray-400 mt-1">
                                Supports .xlsx, .xls, .csv (Multiple files allowed)
                            </p>
                        </label>
                    </div>

                    {renderProgressBar()}
                    
                    {uploadedFiles.length > 0 && (
                        <div className="mb-6">
                            <h3 className="font-medium text-gray-800 mb-3">Uploaded Files ({uploadedFiles.length}):</h3>
                            <div className="space-y-2">
                                {uploadedFiles.map((file, index) => (
                                    <div key={index} className="bg-red-50 p-3 rounded-lg">
                                        <div className="flex justify-between items-start">
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm text-black-700 font-medium truncate">{file.name}</p>
                                                <p className="text-xs text-black-600">
                                                    {(file.size / 1024).toFixed(1)} KB • {file.rowsAdded} rows
                                                </p>
                                                <p className="text-xs text-black-500">{file.uploadedAt}</p>
                                            </div>
                                            <button
                                                onClick={() => removeFile(index)}
                                                className="ml-2 text-red-500 hover:text-red-700"
                                            >
                                                <span className="text-sm">×</span>
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {transformedData.length > 0 && (
                        <div className="space-y-3 mb-6">
                            <button
                                onClick={copyAllData}
                                className="w-full bg-red-500 text-white py-2 px-4 rounded-lg hover:bg-red-600 transition-all duration-200 flex items-center justify-center shadow-md"
                            >
                                <span className="mr-2">⧉</span>
                                Copy All Data
                            </button>

                            <button
                                onClick={clearAllData}
                                className="w-full bg-red-500 text-white py-2 px-4 rounded-lg hover:bg-red-600 transition-all duration-200 flex items-center justify-center shadow-md"
                            >
                                <span className="mr-2">×</span>
                                Clear All Data
                            </button>
                        </div>
                    )}

                    <div className="mb-6">
                        <div className="space-y-2">
                            <button
                                onClick={saveSession}
                                disabled={transformedData.length === 0}
                                className="w-full bg-red-500 text-white py-2 px-4 rounded-lg hover:bg-red-600 transition-all duration-200 flex items-center justify-center shadow-md disabled:bg-gray-400 disabled:cursor-not-allowed"
                            >
                                <span className="mr-2">▣</span>
                                Save Session
                            </button>

                            <button
                                onClick={loadSession}
                                disabled={!hasSavedSession()}
                                className="w-full bg-red-500 text-white py-2 px-4 rounded-lg hover:bg-red-600 transition-all duration-200 flex items-center justify-center shadow-md disabled:bg-gray-400 disabled:cursor-not-allowed"
                            >
                                <span className="mr-2">◉</span>
                                Load Session
                            </button>

                            {hasSavedSession() && (
                                <button
                                    onClick={clearSavedSession}
                                    className="w-full bg-red-500 text-white py-1 px-4 rounded-lg hover:bg-red-600 transition-all duration-200 flex items-center justify-center shadow-md text-sm"
                                >
                                    <span className="mr-2">×</span>
                                    Delete Saved
                                </button>
                            )}
                        </div>
                        {hasSavedSession() && (
                            <div className="mt-2 text-xs text-gray-500 text-center">
                                ● Saved session available
                            </div>
                        )}
                    </div>

                    <div className="pt-4 border-t border-gray-200">
                        <div className="text-xs text-gray-500">
                            <p className="mb-2 font-medium">Features:</p>
                            <ul className="space-y-1">
                                <li>• Data processing & transformation</li>
                                <li>• Skips first 18 rows & summary rows</li>
                                <li>• Filters empty/invalid impression data</li>
                                <li>• Editable cells & column names</li>
                                <li>• Interactive charts with filtering</li>
                                <li>• SOV, Ad Type & Media Type analysis</li>
                                <li>• Configurable column mapping</li>
                                <li>• Pagination for large datasets</li>
                                <li>• Save/Load sessions (browser storage)</li>
                            </ul>
                        </div>
                    </div>
                </div>
            </div>

            <div className="w-3/4 p-6 overflow-auto">
                <div className="flex justify-between items-center mb-2 bg-gradient-to-r from-[#FF3534] from-80% to-[#F585DA] p-4 rounded-lg shadow-sm border">
                    <div>
                        <h1 className="text-2xl font-bold text-white">
                            Full Color Data
                        </h1>
                        <p className="text-sm text-white">
                            Transform and analyze your Gemius marketing data. <i> For better outcomes. </i>
                        </p>
                    </div>

                    {transformedData.length > 0 && (
                        <div className="flex items-center space-x-4 text-sm text-white">
                            <div className="flex items-center space-x-2">
                                <span className="text-white">✎</span>
                                <span>Click cells to edit</span>
                            </div>
                            <div className="flex items-center space-x-2">
                                <span className="text-white">✎</span>
                                <span>Click headers to rename</span>
                            </div>
                            <div className="flex items-center space-x-2">
                                <span className="text-white">↕</span>
                                <span>Click sort icon to sort</span>
                            </div>
                        </div>
                    )}
                </div>

                {renderColumnConfig()}

                {transformedData.length > 0 ? (
                    <div className="space-y-6">
                        <div className="bg-white rounded-lg shadow border">
                            <div className="p-4 border-b bg-gray-50 flex justify-between items-center">
                                <h3 className="text-lg font-semibold text-gray-800">
                                    Transformed Data ({transformedData.length} rows)
                                </h3>
                                <div className="flex space-x-2">
                                    <button
                                        onClick={() => setShowBulkEdit(!showBulkEdit)}
                                        className="bg-red-500 text-white px-3 py-1 rounded text-sm hover:bg-red-600 transition-all duration-200 flex items-center shadow-md"
                                    >
                                        <span className="mr-1">✎</span>
                                        Bulk Edit
                                    </button>
                                    <button
                                        onClick={copyAllData}
                                        className="bg-red-500 text-white px-3 py-1 rounded text-sm hover:bg-red-600 transition-all duration-200 flex items-center shadow-md"
                                    >
                                        <span className="mr-1">⧉</span>
                                        Copy All
                                    </button>
                                    {Object.keys(columnDisplayNames).length > 0 && (
                                        <button
                                            onClick={() => setColumnDisplayNames({})}
                                            className="bg-gray-500 text-white px-3 py-1 rounded text-sm hover:bg-gray-600 transition-all duration-200 flex items-center shadow-md"
                                            title="Reset all column names to original"
                                        >
                                            <span className="mr-1">×</span>
                                            Reset Names
                                        </button>
                                    )}
                                </div>
                            </div>

                            {showBulkEdit && (
                                <div className="p-4 bg-red-50 border-b">
                                    <h4 className="font-medium text-gray-800 mb-3">Bulk Edit File Names</h4>
                                    <div className="flex items-center space-x-3">
                                        <div className="flex-1">
                                            <label className="block text-sm text-gray-600 mb-1">Select File Name to Change:</label>
                                            <select
                                                value={selectedFileName}
                                                onChange={(e) => setSelectedFileName(e.target.value)}
                                                className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:border-red-500"
                                            >
                                                <option value="">Choose a file name...</option>
                                                {getUniqueFileNames().map((fileName) => (
                                                    <option key={fileName} value={fileName}>
                                                        {fileName} ({transformedData.filter(row => row['File Name'] === fileName).length} rows)
                                                    </option>
                                                ))}
                                            </select>
                                        </div>
                                        <div className="flex-1">
                                            <label className="block text-sm text-gray-600 mb-1">New File Name:</label>
                                            <input
                                                type="text"
                                                value={bulkEditFileName}
                                                onChange={(e) => setBulkEditFileName(e.target.value)}
                                                placeholder="Enter new file name..."
                                                className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:border-red-500"
                                            />
                                        </div>
                                        <div className="flex space-x-2 pt-6">
                                            <button
                                                onClick={handleBulkFileNameEdit}
                                                disabled={!selectedFileName || !bulkEditFileName.trim()}
                                                className="bg-red-500 text-white px-4 py-2 rounded text-sm hover:bg-red-600 transition-all duration-200 disabled:bg-gray-400 disabled:cursor-not-allowed shadow-md"
                                            >
                                                Update
                                            </button>
                                            <button
                                                onClick={() => {
                                                    setShowBulkEdit(false);
                                                    setBulkEditFileName('');
                                                    setSelectedFileName('');
                                                }}
                                                className="bg-red-500 text-white px-4 py-2 rounded text-sm hover:bg-red-600 transition-all duration-200 shadow-md"
                                            >
                                                Cancel
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            )}

                            <div className="overflow-auto max-h-96">
                                <table className="w-full">
                                    <thead className="bg-gray-100 sticky top-0">
                                        <tr>
                                            {transformedData.length > 0 && Object.keys(transformedData[0]).map((header) => {
                                                const isEditingThisHeader = editingHeader === header;

                                                return (
                                                    <th
                                                        key={header}
                                                        className="px-4 py-3 text-left text-sm font-medium text-gray-700 border-b select-none"
                                                    >
                                                        <div className="flex items-center">
                                                            {isEditingThisHeader ? (
                                                                <input
                                                                    type="text"
                                                                    value={getDisplayName(header)}
                                                                    onChange={(e) => handleHeaderEdit(header, e.target.value)}
                                                                    onBlur={handleHeaderBlur}
                                                                    onKeyPress={handleHeaderKeyPress}
                                                                    className="w-full px-1 py-0 border-0 outline-none bg-red-50 focus:bg-red-100 font-medium"
                                                                    autoFocus
                                                                />
                                                            ) : (
                                                                <div
                                                                    onClick={() => handleHeaderClick(header)}
                                                                    className="cursor-pointer hover:bg-red-50 min-h-[20px] flex-1 flex items-center"
                                                                >
                                                                    {getDisplayName(header)}
                                                                </div>
                                                            )}
                                                            <button
                                                                onClick={() => handleSort(header)}
                                                                className="ml-2 cursor-pointer hover:bg-gray-200 transition-colors p-1 rounded"
                                                                title="Click to sort"
                                                            >
                                                                {getSortIcon(header)}
                                                            </button>
                                                        </div>
                                                    </th>
                                                );
                                            })}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {getPaginatedData().map((row, rowIndex) => {
                                            const actualRowIndex = transformedData.findIndex(originalRow =>
                                                JSON.stringify(originalRow) === JSON.stringify(row)
                                            );
                                            return (
                                                <tr key={actualRowIndex} className={rowIndex % 2 === 0 ? 'bg-gray-50' : 'bg-white'}>
                                                    {Object.keys(row).map((column) => {
                                                        const isEditing = editingCell?.rowIndex === actualRowIndex && editingCell?.column === column;
                                                        return (
                                                            <td key={column} className="px-4 py-2 text-sm text-gray-700 border-b">
                                                                {isEditing ? (
                                                                    <input
                                                                        type="text"
                                                                        value={row[column]}
                                                                        onChange={(e) => handleCellEdit(actualRowIndex, column, e.target.value)}
                                                                        onBlur={handleCellBlur}
                                                                        onKeyPress={(e) => handleKeyPress(e, actualRowIndex, column)}
                                                                        className="w-full px-1 py-0 border-0 outline-none bg-red-50 focus:bg-red-100"
                                                                        autoFocus
                                                                    />
                                                                ) : (
                                                                    <div
                                                                        onClick={() => handleCellClick(actualRowIndex, column)}
                                                                        className="cursor-pointer hover:bg-red-50 min-h-[20px] w-full"
                                                                    >
                                                                        {row[column]}
                                                                    </div>
                                                                )}
                                                            </td>
                                                        );
                                                    })}
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                            
                            {renderPaginationControls()}
                        </div>

                        <div className="bg-white rounded-lg shadow border p-6">
                            <div className="flex justify-between items-center mb-6">
                                <h3 className="text-lg font-semibold text-gray-800">Data Analysis Charts</h3>
                                <div className="flex items-center space-x-4">
                                    <div className="flex items-center space-x-2">
                                        <span className="text-gray-600">◐</span>
                                        <select
                                            value={colorScheme}
                                            onChange={(e) => setColorScheme(e.target.value)}
                                            className="px-3 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:border-red-400"
                                        >
                                            <option value="new-heritage-red">New Heritage Red</option>
                                            <option value="sunburst">Sunburst</option>
                                            <option value="flamingo">Flamingo</option>
                                            <option value="lake">Lake</option>
                                            <option value="mint">Mint</option>
                                            <option value="orchid">Orchid</option>
                                            <option value="custom">Custom Colors</option>
                                        </select>
                                    </div>
                                    <button
                                        onClick={copyChartData}
                                        className="bg-red-500 text-white px-3 py-1 rounded text-sm hover:bg-red-600 transition-all duration-200 flex items-center shadow-md"
                                    >
                                        <span className="mr-1">⧉</span>
                                        Copy Data
                                    </button>
                                    <button
                                        onClick={downloadChart}
                                        className="bg-red-500 text-white px-3 py-1 rounded text-sm hover:bg-red-600 transition-all duration-200 flex items-center shadow-md"
                                    >
                                        <span className="mr-1">⬇</span>
                                        Download Chart
                                    </button>
                                    {colorScheme === 'custom' && (
                                        <button
                                            onClick={() => setShowCustomColorPicker(!showCustomColorPicker)}
                                            className="bg-red-500 text-white px-3 py-1 rounded text-sm hover:bg-red-600 transition-all duration-200 flex items-center shadow-md"
                                        >
                                            <span className="mr-1">🎨</span>
                                            {showCustomColorPicker ? 'Hide' : 'Edit'} Colors
                                        </button>
                                    )}
                                </div>
                            </div>

                            {colorScheme === 'custom' && showCustomColorPicker && (
                                <div className="bg-red-50 p-4 rounded-lg border mb-4">
                                    <div className="flex justify-between items-center mb-3">
                                        <h4 className="font-semibold text-red-800">Custom Color Palette</h4>
                                        <div className="flex space-x-2">
                                            <button
                                                onClick={addCustomColor}
                                                disabled={customColors.length >= 20}
                                                className="bg-red-500 text-white px-3 py-1 rounded text-sm hover:bg-red-600 transition-all duration-200 disabled:bg-gray-400 disabled:cursor-not-allowed"
                                            >
                                                + Add Color
                                            </button>
                                            <button
                                                onClick={resetCustomColors}
                                                className="bg-red-500 text-white px-3 py-1 rounded text-sm hover:bg-red-600 transition-all duration-200"
                                            >
                                                Reset
                                            </button>
                                        </div>
                                    </div>
                                    
                                    <div className="grid grid-cols-5 md:grid-cols-10 gap-3">
                                        {customColors.map((color, index) => (
                                            <div key={index} className="flex flex-col items-center space-y-2">
                                                <div className="relative">
                                                    <input
                                                        type="color"
                                                        value={color}
                                                        onChange={(e) => handleCustomColorChange(index, e.target.value)}
                                                        className="w-10 h-10 rounded border-2 border-gray-300 cursor-pointer hover:border-red-400 transition-colors"
                                                        title={`Color ${index + 1}: ${color}`}
                                                    />
                                                    {customColors.length > 1 && (
                                                        <button
                                                            onClick={() => removeCustomColor(index)}
                                                            className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs hover:bg-red-600 transition-colors"
                                                            title="Remove color"
                                                        >
                                                            ×
                                                        </button>
                                                    )}
                                                </div>
                                                <div className="text-xs text-red-600 font-mono bg-white px-1 rounded">{color}</div>
                                            </div>
                                        ))}
                                    </div>
                                    
                                    <div className="mt-3 text-sm text-red-600">
                                        <p>• Click on any color circle to change it</p>
                                        <p>• Colors will repeat if you have more data points than colors</p>
                                        <p>• Maximum 20 colors allowed</p>
                                    </div>
                                </div>
                            )}

                            <div className="flex flex-wrap gap-3 mb-6">
                                <button
                                    onClick={() => setActiveChart('impression')}
                                    className={`px-4 py-2 rounded-lg flex items-center transition-all duration-200 shadow-md ${activeChart === 'impression'
                                            ? 'bg-red-500 text-white hover:bg-red-600'
                                            : 'bg-red-200 text-gray-700 hover:bg-red-300'
                                        }`}
                                >
                                    <span className="mr-2">○</span>
                                    SOV (Impression)
                                </button>

                                {/* NEW: Trend Line Button - grouped with SOV */}
                                <button
                                    onClick={() => setActiveChart('line')}
                                    className={`px-4 py-2 rounded-lg flex items-center transition-all duration-200 shadow-md ${activeChart === 'line'
                                            ? 'bg-red-500 text-white hover:bg-red-600'
                                            : 'bg-red-200 text-gray-700 hover:bg-red-300'
                                        }`}
                                >
                                    <span className="mr-2">─</span>
                                    Trend Line
                                </button>

                                {/* NEW: SOV Table Button - grouped with SOV */}
                                <button
                                    onClick={() => setActiveChart('sovtable')}
                                    className={`px-4 py-2 rounded-lg flex items-center transition-all duration-200 shadow-md ${activeChart === 'sovtable'
                                            ? 'bg-red-500 text-white hover:bg-red-600'
                                            : 'bg-red-200 text-gray-700 hover:bg-red-300'
                                        }`}
                                >
                                    <span className="mr-2">▦</span>
                                    SOV Table
                                </button>
                                
                                {transformedData.length > 0 && transformedData[0].hasOwnProperty('Ad Type') && (
                                    <button
                                        onClick={() => setActiveChart('adtype')}
                                        className={`px-4 py-2 rounded-lg flex items-center transition-all duration-200 shadow-md ${activeChart === 'adtype'
                                                ? 'bg-red-500 text-white hover:bg-red-600'
                                                : 'bg-red-200 text-gray-700 hover:bg-red-300'
                                            }`}
                                    >
                                        <span className="mr-2">▬</span>
                                        Ad Type
                                    </button>
                                )}
                                
                                {transformedData.length > 0 && transformedData[0].hasOwnProperty('Media Type') && (
                                    <button
                                        onClick={() => setActiveChart('mediatype')}
                                        className={`px-4 py-2 rounded-lg flex items-center transition-all duration-200 shadow-md ${activeChart === 'mediatype'
                                                ? 'bg-red-500 text-white hover:bg-red-600'
                                                : 'bg-red-200 text-gray-700 hover:bg-red-300'
                                            }`}
                                    >
                                        <span className="mr-2">▬</span>
                                        Media Type
                                    </button>
                                )}
                            </div>

                            {renderFilters()}

                            <div className="chart-container">
                                <h3 className="text-lg font-semibold mb-4">
                                    {activeChart === 'impression' && 'Share of Voice (SOV) - Impression Distribution'}
                                    {activeChart === 'line' && `Brand Impression Trends by ${trendLineView === 'year' ? 'Year' : 'Month'}`}
                                    {activeChart === 'sovtable' && `SOV ${sovTableDisplayMode === 'percentage' ? 'Percentage' : 'Impression'} Table by ${sovTableView === 'year' ? 'Year' : 'Month'} and Brand`}
                                    {activeChart === 'adtype' && 'Ad Type Distribution by Brand (Based on Impressions)'}
                                    {activeChart === 'mediatype' && 'Media Type Distribution by Brand (Based on Impressions)'}
                                </h3>
                                {renderChart()}
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="flex-1 flex items-center justify-center bg-white rounded-lg shadow border min-h-96">
                        <div className="text-center">
                            <img
                                src="/writers-block-rafiki.svg"
                                alt="No Data"
                                className="w-72 h-auto mx-auto mb-4"
                            />

                            <h3 className="text-lg font-medium text-gray-600">No Data to Display</h3>
                            <p className="text-gray-400">
                                Upload Excel files to see the transformed data here
                            </p>
                            <p className="text-sm text-gray-400 mb-20">
                                Multiple files will be combined into one dataset
                            </p>
                            <p className="text-xs text-gray-400 mb-2">
                                Built by OneVue Team
                            </p>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default ExcelDataTransformer;
