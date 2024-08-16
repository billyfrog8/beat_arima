let chart;
let trainData, testData, arimaForecast, ohlcData;
let userForecast = Array(10).fill(null);
let userScore = 0, arimaScore = 0;
let isDrawing = false;


function getGameData() {
    fetch('/get_data')
        .then(response => response.json())
        .then(data => {
            trainData = data.train_data;
            testData = data.test_data;
            arimaForecast = data.arima_forecast;
            userScore = data.user_score;
            arimaScore = data.arima_score;
            ohlcData = data.ohlc_data;
            initChart();
            initCandlestickChart();
            updateScore();
            // Stock info will be hidden until forecast is submitted
            document.getElementById('stock-info').style.display = 'none';
        });
}

function initChart() {
    const ctx = document.getElementById('forecastChart').getContext('2d');
    
    Chart.defaults.font.family = "'Poppins', sans-serif";
    Chart.defaults.font.size = 14;

    const range = calculateChartRange(trainData);

    chart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: Array.from({length: 100}, (_, i) => i),
            datasets: [{
                label: 'Historical Data',
                data: trainData.concat(Array(10).fill(null)),
                borderColor: 'rgba(54, 162, 235, 1)',
                borderWidth: 2,
                pointRadius: 0,
                fill: false
            }, {
                label: 'User Forecast',
                data: Array(90).fill(null).concat(userForecast),
                borderColor: 'rgba(255, 99, 132, 1)',
                borderWidth: 2,
                pointRadius: 0,
                fill: false
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                x: {
                    title: {
                        display: true,
                        text: 'Time'
                    },
                    grid: {
                        color: 'rgba(255, 255, 255, 0.1)'
                    }
                },
                y: {
                    title: {
                        display: true,
                        text: 'Value'
                    },
                    grid: {
                        color: 'rgba(255, 255, 255, 0.1)'
                    },
                    suggestedMin: range.suggestedMin,
                    suggestedMax: range.suggestedMax,
                    ticks: {
                        callback: function(value) {
                            return value.toFixed(2);
                        }
                    }
                }
            },
            plugins: {
                legend: {
                    labels: {
                        color: 'white',
                        usePointStyle: true,
                        padding: 20
                    }
                },
                tooltip: {
                    enabled: true
                }
            },
            interaction: {
                intersect: false,
                mode: 'index'
            },
            animation: {
                duration: 0
            }
        }
    });


    const canvas = chart.canvas;
    canvas.addEventListener('mousedown', startDrawing);
    canvas.addEventListener('mousemove', draw);
    canvas.addEventListener('mouseup', stopDrawing);
    canvas.addEventListener('mouseout', stopDrawing);
}

function calculateChartRange(data) {
    const minValue = Math.min(...data.filter(v => v !== null));
    const maxValue = Math.max(...data.filter(v => v !== null));
    const range = maxValue - minValue;
    const padding = range * 0.1;
    return {
        suggestedMin: minValue - padding,
        suggestedMax: maxValue + padding
    };
}



function initCandlestickChart() {
    const isDarkMode = document.body.classList.contains('dark-mode');
    const textColor = isDarkMode ? 'white' : 'black';
    const plotBgColor = isDarkMode ? 'rgba(0, 0, 0, 0)' : 'rgba(255, 255, 255, 0)';
    const gridColor = isDarkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)';

    const trace = {
        x: Array.from({length: 90}, (_, i) => i),
        close: ohlcData.slice(0, 90).map(d => d[4]),
        high: ohlcData.slice(0, 90).map(d => d[2]),
        low: ohlcData.slice(0, 90).map(d => d[3]),
        open: ohlcData.slice(0, 90).map(d => d[1]),
        type: 'candlestick',
        xaxis: 'x',
        yaxis: 'y'
    };

    const layout = {
        dragmode: 'zoom',
        showlegend: false,
        xaxis: {
            rangeslider: {visible: false},
            title: 'Time',
            tickmode: 'array',
            tickvals: Array.from({length: 10}, (_, i) => i * 10),
            ticktext: Array.from({length: 10}, (_, i) => i * 10),
            showgrid: false,
            gridcolor: gridColor,
            tickcolor: textColor,
            linecolor:'#cccccc' ,
            linewidth:1
        },
        yaxis: {
            title: 'Price',
            showgrid: false,
            gridcolor: gridColor,
            tickcolor: textColor
        },
        paper_bgcolor: plotBgColor,
        plot_bgcolor: plotBgColor,
        font: {
            color: textColor
        },
        margin: {
            l: 50,
            r: 20,
            b: 40,
            t: 20,
            pad: 4
        },
        height: 300
    };

    Plotly.newPlot('candlestickChart', [trace], layout, {displayModeBar: false});
}

function startDrawing(event) {
    isDrawing = true;
    draw(event);
}

function draw(event) {
    if (!isDrawing) return;

    const rect = event.target.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    const xValue = chart.scales.x.getValueForPixel(x);
    const yValue = chart.scales.y.getValueForPixel(y);

    if (xValue >= 90 && xValue <= 99) {
        const index = Math.floor(xValue) - 90;
        userForecast[index] = yValue;
        chart.data.datasets[1].data = Array(90).fill(null).concat(userForecast);
        chart.update('none');
    }
}

function stopDrawing() {
    isDrawing = false;
}

function erase() {
    userForecast = Array(10).fill(null);
    chart.data.datasets[1].data = Array(100).fill(null);
    chart.update();
}

function done() {
    if (userForecast.some(v => v === null)) {
        alert("Please provide a forecast for all 10 points.");
        return;
    }

    fetch(`/submit_forecast/${userForecast.join(',')}`)
        .then(response => response.json())
        .then(data => {
            // Update existing datasets
            chart.data.datasets[0].data = trainData; // Historical data
            chart.data.datasets[1].data = Array(90).fill(null).concat(userForecast); // User forecast
            
            // Add or update Actual Data
            let actualDataset = chart.data.datasets.find(ds => ds.label === 'Actual Data');
            if (!actualDataset) {
                actualDataset = {
                    label: 'Actual Data',
                    borderColor: 'rgba(75, 192, 192, 1)',
                    borderWidth: 2,
                    pointRadius: 0,
                    fill: false
                };
                chart.data.datasets.push(actualDataset);
            }
            actualDataset.data = trainData.concat(data.test_data);

            // Add or update ARIMA Forecast
            let arimaDataset = chart.data.datasets.find(ds => ds.label === 'ARIMA Forecast');
            if (!arimaDataset) {
                arimaDataset = {
                    label: 'ARIMA Forecast',
                    borderColor: 'rgba(153, 102, 255, 1)',
                    borderWidth: 2,
                    borderDash: [5, 5],
                    pointRadius: 0,
                    fill: false
                };
                chart.data.datasets.push(arimaDataset);
            }
            arimaDataset.data = trainData.concat(arimaForecast);

            // Recalculate y-axis scale
            const allData = chart.data.datasets.flatMap(ds => ds.data.filter(v => v !== null));
            const range = calculateChartRange(allData);

            chart.options.scales.y.suggestedMin = range.suggestedMin;
            chart.options.scales.y.suggestedMax = range.suggestedMax;

            chart.update();

            document.getElementById('result').textContent = `${data.result} (User MSE: ${data.user_mse.toFixed(2)}, ARIMA MSE: ${data.arima_mse.toFixed(2)})`;
            userScore = data.user_score;
            arimaScore = data.arima_score;
            updateScore();
            updateStockInfo(data.stock_info);

            // Update candlestick chart to show all 100 periods
            Plotly.update('candlestickChart', {
                x: [Array.from({length: 100}, (_, i) => i)],
                close: [ohlcData.map(d => d[4])],
                high: [ohlcData.map(d => d[2])],
                low: [ohlcData.map(d => d[3])],
                open: [ohlcData.map(d => d[1])]
            });
        });
}

function resetChartData() {
    chart.data.datasets = [];  // Clear all datasets
    chart.update();  // Update the chart to clear it visually
}

function playAgain() {
    fetch('/play_again')
        .then(response => response.json())
        .then(data => {
            trainData = data.train_data;
            arimaForecast = data.arima_forecast;
            ohlcData = data.ohlc_data;
            userForecast = Array(10).fill(null);
            
            // Reset forecast chart
            const isDarkMode = document.body.classList.contains('dark-mode');
            const textColor = isDarkMode ? 'white' : 'black';
            const gridColor = isDarkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)';
            const axisLineColor = '#cccccc'; // Light grey for both modes

            // Recalculate y-axis scale
            const range = calculateChartRange(trainData);

            chart.data.datasets = [{
                label: 'Historical Data',
                data: trainData.concat(Array(10).fill(null)),
                borderColor: 'rgba(54, 162, 235, 1)',
                borderWidth: 2,
                pointRadius: 0,
                fill: false
            }, {
                label: 'User Forecast',
                data: Array(100).fill(null),
                borderColor: 'rgba(255, 99, 132, 1)',
                borderWidth: 2,
                pointRadius: 0,
                fill: false
            }];
            chart.options.scales.x.title.color = textColor;
            chart.options.scales.x.grid.color = gridColor;
            chart.options.scales.x.ticks.color = textColor;
            chart.options.scales.x.borderColor = axisLineColor;
            chart.options.scales.y.title.color = textColor;
            chart.options.scales.y.grid.color = gridColor;
            chart.options.scales.y.ticks.color = textColor;
            chart.options.scales.y.borderColor = axisLineColor;
            chart.options.scales.y.suggestedMin = range.suggestedMin;
            chart.options.scales.y.suggestedMax = range.suggestedMax;
            chart.update();
            
            // Reset candlestick chart
            Plotly.react('candlestickChart', [{
                x: Array.from({length: 90}, (_, i) => i),
                close: ohlcData.slice(0, 90).map(d => d[4]),
                high: ohlcData.slice(0, 90).map(d => d[2]),
                low: ohlcData.slice(0, 90).map(d => d[3]),
                open: ohlcData.slice(0, 90).map(d => d[1]),
                type: 'candlestick',
                xaxis: 'x',
                yaxis: 'y'
            }], {
                dragmode: 'zoom',
                showlegend: false,
                xaxis: {
                    rangeslider: {visible: false},
                    title: 'Time',
                    tickmode: 'array',
                    tickvals: Array.from({length: 10}, (_, i) => i * 10),
                    ticktext: Array.from({length: 10}, (_, i) => i * 10),
                    showgrid: false,
                    gridcolor: gridColor,
                    tickcolor: textColor,
                    linecolor: axisLineColor,
                    linewidth: 1
                },
                yaxis: {
                    title: 'Price',
                    showgrid: false,
                    gridcolor: gridColor,
                    tickcolor: textColor
                },
                paper_bgcolor: isDarkMode ? 'rgba(0, 0, 0, 0)' : 'rgba(255, 255, 255, 0)',
                plot_bgcolor: isDarkMode ? 'rgba(0, 0, 0, 0)' : 'rgba(255, 255, 255, 0)',
                font: {
                    color: textColor
                },
                margin: {
                    l: 50,
                    r: 20,
                    b: 40,
                    t: 20,
                    pad: 4
                },
                height: 300
            }, {displayModeBar: false});

            document.getElementById('result').textContent = '';
            document.getElementById('stock-info').style.display = 'none';
        })
        .catch(error => console.error('Error:', error));
}


function updateScore() {
    document.getElementById('score').textContent = `User: ${userScore} | ARIMA: ${arimaScore}`;
}

function updateStockInfo(stockInfo) {
    const stockInfoElement = document.getElementById('stock-info');
    stockInfoElement.textContent = `Stock: ${stockInfo.ticker}, Period: ${stockInfo.start_date} to ${stockInfo.end_date}`;
    stockInfoElement.style.display = 'block';
}

function toggleDarkMode() {
    document.body.classList.toggle('dark-mode');
    const isDarkMode = document.body.classList.contains('dark-mode');
    localStorage.setItem('darkMode', isDarkMode);
    
    // Reinitialize charts to apply color changes
    initChart();
    initCandlestickChart();
}

document.getElementById('done').addEventListener('click', done);
document.getElementById('erase').addEventListener('click', erase);
document.getElementById('play-again').addEventListener('click', playAgain);
document.getElementById('dark-mode-toggle').addEventListener('click', toggleDarkMode);

// Check for saved dark mode preference
if (localStorage.getItem('darkMode') === 'true') {
    document.body.classList.add('dark-mode');
}

getGameData();