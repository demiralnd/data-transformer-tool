import React, { useState, useRef, useEffect } from 'react';
import { PieChart as RechartsPieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import * as XLSX from 'xlsx';

const ExcelDataTransformer = () => {
    const [uploadedFiles, setUploadedFiles] = useState([]);
    const [transformedData, setTransformedData] = useState([]);
    const [isProcessing, setIsProcessing] = useState(false);
    const [editingCell, setEditingCell] = useState(null);
    const [showBulkEdit, setShowBulkEdit] = useState(false);
    const [bulkEditFileName, setBulkEditFileName] = useState('');
    const [selectedFileName, setSelectedFileName] = useState('');
    const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });
    const [activeChart, setActiveChart] = useState('impression');
    const [colorScheme, setColorScheme] = useState('new-heritage-red');
    const [showFilters, setShowFilters] = useState(false);
    const [editingHeader, setEditingHeader] = useState(null);
    const [columnDisplayNames, setColumnDisplayNames] = useState({});
    const [showColumnConfig, setShowColumnConfig] = useState(false);
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

    const monthOrder = [
        'January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'
    ];

    const COLOR_SCHEMES = {
        'new-heritage-red': ['#FF3534', '#E62E2A', '#CC2620', '#B31F16', '#99170C', '#801002', '#FF5854', '#FF7874'],
        'sunburst': ['#FFB84E', '#E6A344', '#CC8E3A', '#B37930', '#996426', '#804F1C', '#FFCC6E', '#FFDD8E'],
        'flamingo': ['#F585DA', '#DC76C1', '#C267A8', '#A9588F', '#8F4976', '#763A5D', '#F799E4', '#F9ADEE'],
        'lake': ['#3197EE', '#2C88D5', '#2679BC', '#216AA3', '#1B5B8A', '#164C71', '#51A7F1', '#71B7F4'],
        'mint': ['#06B8A2', '#05A692', '#049482', '#038272', '#027062', '#015E52', '#26C8B2', '#46D8C2'],
        'orchid': ['#806FEA', '#7363D1', '#6657B8', '#594B9F', '#4C3F86', '#3F336D', '#9485ED', '#A89BF0']
    };

    const getFilterOptions = () => {
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
    };

    const getFilteredChartData = () => {
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
    };

    const getImpressionChartData = () => {
        const filteredData = getFilteredChartData();
        const brandTotals = {};

        filteredData.forEach(row => {
            const brand = row['Brand Name'] || 'Unknown';
            const impressionStr = row['Impression (ad contact)']?.toString().replace(/,/g, '') || '0';
            const impression = parseFloat(impressionStr);
            const validImpression = isNaN(impression) ? 0 : impression;
            brandTotals[brand] = (brandTotals[brand] || 0) + validImpression;
        });

        const total = Object.values(brandTotals).reduce((sum, value) => sum + (isNaN(value) ? 0 : value), 0);

        return Object.entries(brandTotals)
            .map(([brand, value]) => {
                const validValue = isNaN(value) ? 0 : value;
                const percentage = total > 0 ? ((validValue / total) * 100) : 0;
                const validPercentage = isNaN(percentage) ? 0 : percentage;

                return {
                    name: brand,
                    value: validValue,
                    percentage: validPercentage.toFixed(1)
                };
            })
            .filter(item => item.value > 0)
            .sort((a, b) => b.value - a.value);
    };

    const getAdTypeChartData = () => {
        const filteredData = getFilteredChartData();
        
        // Check if Ad Type column exists
        if (filteredData.length === 0 || !filteredData[0].hasOwnProperty('Ad Type')) {
            return [];
        }

        const brandAdTypes = {};

        filteredData.forEach(row => {
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
                const total = Object.values(adTypes).reduce((sum, val) => sum + val, 0);
                if (total === 0) return null;

                const percentages = { name: brand };
                Object.entries(adTypes).forEach(([adType, value]) => {
                    percentages[adType] = Number(((value / total) * 100).toFixed(1));
                    percentages[`${adType}Value`] = value;
                });

                return percentages;
            })
            .filter(item => item !== null);

        return result;
    };

    const getMediaTypeChartData = () => {
        const filteredData = getFilteredChartData();
        
        // Check if Media Type column exists
        if (filteredData.length === 0 || !filteredData[0].hasOwnProperty('Media Type')) {
            return [];
        }

        const brandMediaTypes = {};

        filteredData.forEach(row => {
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
                const total = Object.values(mediaTypes).reduce((sum, val) => sum + val, 0);
                if (total === 0) return null;

                const percentages = { name: brand };
                Object.entries(mediaTypes).forEach(([mediaType, value]) => {
                    percentages[mediaType] = Number(((value / total) * 100).toFixed(1));
                    percentages[`${mediaType}Value`] = value;
                });

                return percentages;
            })
            .filter(item => item !== null);

        return result;
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
            setDefaultFilters(transformedData);
        }
    };

    const copyChartData = async () => {
        try {
            let chartData = [];
            let title = '';

            switch (activeChart) {
                case 'impression':
                    chartData = getImpressionChartData();
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

    const getSortIcon = (columnKey) => {
        if (sortConfig.key !== columnKey) {
            return <span className="text-gray-400 ml-1">↕</span>;
        }
        return sortConfig.direction === 'asc' ?
            <span className="text-blue-600 ml-1">↑</span> :
            <span className="text-blue-600 ml-1">↓</span>;
    };

    const handleFileUpload = async (event) => {
        const files = Array.from(event.target.files);
        if (files.length === 0) return;

        setIsProcessing(true);

        try {
            const newTransformedData = [...transformedData];
            const newUploadedFiles = [...uploadedFiles];

            for (const file of files) {
                const arrayBuffer = await file.arrayBuffer();
                const workbook = XLSX.read(arrayBuffer, { type: 'array' });
                const sheetName = workbook.SheetNames[0];
                const worksheet = workbook.Sheets[sheetName];

                const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' });
                const processedData = processData(jsonData, file.name);

                newTransformedData.push(...processedData.transformed);
                newUploadedFiles.push({
                    name: file.name,
                    size: file.size,
                    rowsAdded: processedData.transformed.length,
                    uploadedAt: new Date().toLocaleString()
                });
            }

            setTransformedData(newTransformedData);
            setUploadedFiles(newUploadedFiles);

            if (uploadedFiles.length === 0) {
                setDefaultFilters(newTransformedData);
            } else {
                const currentHasFilters = Object.values(chartFilters).some(filterArray => filterArray.length > 0);
                if (!currentHasFilters) {
                    setDefaultFilters(newTransformedData);
                }
            }
        } catch (error) {
            console.error('Error processing file:', error);
            alert('Error processing file. Please make sure it\'s a valid Excel file.');
        } finally {
            setIsProcessing(false);
            if (fileInputRef.current) {
                fileInputRef.current.value = '';
            }
        }
    };

    const processData = (data, fileName) => {
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

        const transformedData = transformToLongFormat(processedData, fileName);

        return {
            original: processedData,
            transformed: transformedData
        };
    };

    const transformToLongFormat = (data, fileName) => {
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

                        dataRows.forEach(row => {
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

    const renderChart = () => {
        const currentColors = COLOR_SCHEMES[colorScheme];

        switch (activeChart) {
            case 'impression':
                const impressionData = getImpressionChartData();
                if (impressionData.length === 0) {
                    return (
                        <div className="h-96 flex items-center justify-center">
                            <p className="text-gray-500">No data available for the current filters</p>
                        </div>
                    );
                }
                return (
                    <div className="flex h-96">
                        <div className="flex-1">
                            <ResponsiveContainer width="100%" height="100%">
                                <RechartsPieChart>
                                    <Pie
                                        data={impressionData}
                                        cx="50%"
                                        cy="50%"
                                        outerRadius={120}
                                        fill="#8884d8"
                                        dataKey="value"
                                        label={({ name, percentage }) => `${percentage}%`}
                                    >
                                        {impressionData.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={currentColors[index % currentColors.length]} />
                                        ))}
                                    </Pie>
                                    <Tooltip formatter={(value) => [value.toLocaleString(), 'Impressions']} />
                                </RechartsPieChart>
                            </ResponsiveContainer>
                        </div>
                        <div className="w-64 p-4 bg-gray-50 rounded border">
                            <h4 className="font-semibold mb-3">Brands</h4>
                            <div className="space-y-2">
                                {impressionData.map((entry, index) => (
                                    <div key={entry.name} className="flex items-center">
                                        <div
                                            className="w-4 h-4 rounded mr-2"
                                            style={{ backgroundColor: currentColors[index % currentColors.length] }}
                                        ></div>
                                        <span className="text-sm">{entry.name}</span>
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
                            <div className="text-center p-4 bg-yellow-50 rounded border">
                                <p className="text-gray-700 font-medium mb-2">Ad Type column is not included</p>
                                <div className="text-sm text-gray-600 space-y-1">
                                    <p>Enable "Ad Type" in Column Configuration to view this chart</p>
                                </div>
                            </div>
                        </div>
                    );
                }
                
                if (adTypeData.length === 0) {
                    const filteredData = getFilteredChartData();
                    const uniqueAdTypes = [...new Set(filteredData.map(r => r['Ad Type']))].filter(Boolean);

                    return (
                        <div className="h-96 flex items-center justify-center">
                            <div className="text-center p-4 bg-yellow-50 rounded border">
                                <p className="text-gray-700 font-medium mb-2">No ad type chart data available</p>
                                <div className="text-sm text-gray-600 space-y-1">
                                    <p>Filtered rows: {filteredData.length}</p>
                                    <p>Unique ad types found: {uniqueAdTypes.join(', ') || 'None'}</p>
                                </div>
                            </div>
                        </div>
                    );
                }

                const adTypeKeys = adTypeData.length > 0 ?
                    Object.keys(adTypeData[0]).filter(key => key !== 'name' && !key.includes('Value')) : [];

                return (
                    <div className="h-96">
                        <div className="text-xs text-gray-500 mb-2">
                            Showing {adTypeData.length} brands with ad type data (100% stacked bars based on impressions)
                        </div>
                        <ResponsiveContainer width="100%" height="85%">
                            <BarChart data={adTypeData} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis
                                    dataKey="name"
                                    angle={-45}
                                    textAnchor="end"
                                    height={80}
                                    tick={{ fontSize: 11 }}
                                    interval={0}
                                />
                                <YAxis
                                    domain={[0, 100]}
                                    tick={{ fontSize: 12 }}
                                />
                                <Tooltip
                                    formatter={(value, name) => [`${value}% (${adTypeData.find(d => d.name === name)?.[`${name}Value`] || 'N/A'} impressions)`, name]}
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
                            <div className="text-center p-4 bg-yellow-50 rounded border">
                                <p className="text-gray-700 font-medium mb-2">Media Type column is not included</p>
                                <div className="text-sm text-gray-600 space-y-1">
                                    <p>Enable "Media Type" in Column Configuration to view this chart</p>
                                </div>
                            </div>
                        </div>
                    );
                }
                
                if (mediaTypeData.length === 0) {
                    const filteredData = getFilteredChartData();
                    const uniqueMediaTypes = [...new Set(filteredData.map(r => r['Media Type']))].filter(Boolean);

                    return (
                        <div className="h-96 flex items-center justify-center">
                            <div className="text-center p-4 bg-yellow-50 rounded border">
                                <p className="text-gray-700 font-medium mb-2">No media type chart data available</p>
                                <div className="text-sm text-gray-600 space-y-1">
                                    <p>Filtered rows: {filteredData.length}</p>
                                    <p>Unique media types found: {uniqueMediaTypes.join(', ') || 'None'}</p>
                                </div>
                            </div>
                        </div>
                    );
                }

                const mediaTypeKeys = mediaTypeData.length > 0 ?
                    Object.keys(mediaTypeData[0]).filter(key => key !== 'name' && !key.includes('Value')) : [];

                return (
                    <div className="h-96">
                        <div className="text-xs text-gray-500 mb-2">
                            Showing {mediaTypeData.length} brands with media type data (100% stacked bars based on impressions)
                        </div>
                        <ResponsiveContainer width="100%" height="85%">
                            <BarChart data={mediaTypeData} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis
                                    dataKey="name"
                                    angle={-45}
                                    textAnchor="end"
                                    height={80}
                                    tick={{ fontSize: 11 }}
                                    interval={0}
                                />
                                <YAxis
                                    domain={[0, 100]}
                                    tick={{ fontSize: 12 }}
                                />
                                <Tooltip
                                    formatter={(value, name) => [`${value}% (${mediaTypeData.find(d => d.name === name)?.[`${name}Value`] || 'N/A'} impressions)`, name]}
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

            default:
                return null;
        }
    };

    const renderColumnConfig = () => {
        return (
            <div className="mb-4">
                <button
                    onClick={() => setShowColumnConfig(!showColumnConfig)}
                    className="w-full bg-red-500 text-white py-3 px-4 mb-4 rounded-lg hover:bg-red-600 transition-all duration-200 flex items-center justify-between shadow-md"
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

    const renderFilters = () => {
        const options = getFilterOptions();

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
                            {getFilteredChartData().length} rows
                        </span>
                    </div>
                    <div className={`transform transition-transform duration-200 ${showFilters ? 'rotate-180' : ''}`}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M6 9L12 15L18 9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                    </div>
                </button>

                <div className={`overflow-hidden transition-all duration-300 ease-in-out ${showFilters ? 'max-h-screen opacity-100' : 'max-h-0 opacity-0'}`}>
                    <div className="bg-gray-50 p-4 rounded-lg mt-2 border">
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
                            {Object.entries(options).map(([filterType, values]) => (
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
                                                        className="mr-2 accent-pink-500"
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

    return (
        <div className="flex h-screen bg-gray-50">
            <div className="w-1/4 bg-white border-r border-gray-200 p-6 flex flex-col">
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
                

                
                {uploadedFiles.length > 0 && (
                    <div className="mb-4 flex-1 overflow-y-auto">
                        <h3 className="font-medium text-gray-800 mb-3">Uploaded Files ({uploadedFiles.length}):</h3>
                        <div className="space-y-2">
                            {uploadedFiles.map((file, index) => (
                                <div key={index} className="bg-blue-50 p-3 rounded-lg">
                                    <div className="flex justify-between items-start">
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm text-blue-700 font-medium truncate">{file.name}</p>
                                            <p className="text-xs text-blue-600">
                                                {(file.size / 1024).toFixed(1)} KB • {file.rowsAdded} rows
                                            </p>
                                            <p className="text-xs text-blue-500">{file.uploadedAt}</p>
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
                    <div className="space-y-3">
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

                <div className="mt-auto pt-4 border-t border-gray-200">
                    <div className="text-xs text-gray-500">
                        <p className="mb-2 font-medium">Features:</p>
                        <ul className="space-y-1">
                            <li>• Data processing & transformation</li>
                            <li>• Smart column sorting</li>
                            <li>• Editable cells & column names</li>
                            <li>• Bulk editing capabilities</li>
                            <li>• Interactive charts with filtering</li>
                            <li>• SOV, Ad Type & Media Type analysis</li>
                            <li>• Configurable column mapping</li>
                        </ul>
                    </div>
                                            <p className="text-xs text-gray-400 mt-2">
                            Built with ❤️ by OneVue Team
                        </p>
                </div>
            </div>

            <div className="w-3/4 p-6 overflow-auto">
<div className="flex justify-between items-center mb-2 bg-[#ef4445] p-4 rounded-lg shadow-sm border">
                    <div>
                        <h1 className="text-2xl font-bold text-white">
                            Excel Data Transformer
                        </h1>
                        <p className="text-sm text-white">
                            Transform and analyze your Gemius marketing data with configurable columns
                        </p>
                    </div>

                    {transformedData.length > 0 && (
                        <div className="flex items-center space-x-4 text-sm text-gray-600">
                            <div className="flex items-center space-x-2">
                                <span>✎</span>
                                <span>Click cells to edit</span>
                            </div>
                            <div className="flex items-center space-x-2">
                                <span className="text-gray-400">✎</span>
                                <span>Click headers to rename</span>
                            </div>
                            <div className="flex items-center space-x-2">
                                <span className="text-gray-400">↕</span>
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
                                <div className="p-4 bg-yellow-50 border-b">
                                    <h4 className="font-medium text-gray-800 mb-3">Bulk Edit File Names</h4>
                                    <div className="flex items-center space-x-3">
                                        <div className="flex-1">
                                            <label className="block text-sm text-gray-600 mb-1">Select File Name to Change:</label>
                                            <select
                                                value={selectedFileName}
                                                onChange={(e) => setSelectedFileName(e.target.value)}
                                                className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:border-blue-500"
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
                                                className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:border-blue-500"
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
                                                                    className="w-full px-1 py-0 border-0 outline-none bg-yellow-50 focus:bg-yellow-100 font-medium"
                                                                    autoFocus
                                                                />
                                                            ) : (
                                                                <div
                                                                    onClick={() => handleHeaderClick(header)}
                                                                    className="cursor-pointer hover:bg-yellow-50 min-h-[20px] flex-1 flex items-center"
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
                                        {getSortedData().map((row, rowIndex) => (
                                            <tr key={rowIndex} className={rowIndex % 2 === 0 ? 'bg-gray-50' : 'bg-white'}>
                                                {Object.keys(row).map((column) => {
                                                    const actualRowIndex = transformedData.findIndex(originalRow =>
                                                        JSON.stringify(originalRow) === JSON.stringify(row)
                                                    );
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
                                                                    className="w-full px-1 py-0 border-0 outline-none bg-yellow-50 focus:bg-yellow-100"
                                                                    autoFocus
                                                                />
                                                            ) : (
                                                                <div
                                                                    onClick={() => handleCellClick(actualRowIndex, column)}
                                                                    className="cursor-pointer hover:bg-yellow-50 min-h-[20px] w-full"
                                                                >
                                                                    {row[column]}
                                                                </div>
                                                            )}
                                                        </td>
                                                    );
                                                })}
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
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
                                            className="px-3 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:border-pink-400"
                                        >
                                            <option value="new-heritage-red">New Heritage Red</option>
                                            <option value="sunburst">Sunburst</option>
                                            <option value="flamingo">Flamingo</option>
                                            <option value="lake">Lake</option>
                                            <option value="mint">Mint</option>
                                            <option value="orchid">Orchid</option>
                                        </select>
                                    </div>
                                    <button
                                        onClick={copyChartData}
                                        className="bg-red-500 text-white px-3 py-1 rounded text-sm hover:bg-red-600 transition-all duration-200 flex items-center shadow-md"
                                    >
                                        <span className="mr-1">⧉</span>
                                        Copy Data
                                    </button>
                                </div>
                            </div>

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

                            <div>
                                <h3 className="text-lg font-semibold mb-4">
                                    {activeChart === 'impression' && 'Share of Voice (SOV) - Impression Distribution'}
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
                            <p className="text-sm text-gray-400 mt-2 mb-20">
                                Multiple files will be combined into one dataset
                            </p>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default ExcelDataTransformer;
