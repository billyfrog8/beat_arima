# Can you beat ARIMA forecasts?
In my time series forecasting class I didn't exactly believe in the power of simple ARIMA models. I always thought I could simply draw a line and get about the same accuracy. Well it turns out ARIMA is often better than me, but more importantly in my opinion unbiased. I made a simple game using real stock price data to try to draw a line that would beat an autofitted ARIMA model at forecasting 10 periods into the future.

Using hourly data for each S&P500 stock, a random chunk of 100 candles is selected where an ARIMA model is trained on 90 periods and a forecast is calculated for the next 10 periods. The user draws a forecast on the chart to try to beat the ARIMA model based on mean squared error. After submitting their forecast, the selected stock, timeframe, and forecast are revealed.

The game uses a Flask app to run the backend server. To play the game, download the repository here, navigate to the directory in the terminal, type python run app.py and follow the link.

TUTORIAL: Click the play button

![2025-01-18 10-29-35](https://github.com/user-attachments/assets/5f7abbb1-72dc-4a31-a2ff-d1eaf92ba1a7)
