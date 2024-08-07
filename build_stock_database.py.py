import yfinance as yf
import pandas as pd
from datetime import datetime, timedelta
import os

# Get S&P 500 tickers
sp500 = pd.read_html('https://en.wikipedia.org/wiki/List_of_S%26P_500_companies')[0]
tickers = sp500['Symbol'].tolist()

# Set date range (e.g., last 5 years)
end_date = datetime.now()
start_date = end_date - timedelta(days=1*365)

# Create a directory for the CSV files
if not os.path.exists('stock_data'):
    os.makedirs('stock_data')

# Download and save data for each ticker
for ticker in tickers:
    print(f"Downloading data for {ticker}")
    stock = yf.Ticker(ticker)
    data = stock.history(start=start_date, end=end_date, interval="1h")
    
    if not data.empty:
        # Save to CSV
        data.to_csv(f'stock_data/{ticker}.csv')
    else:
        print(f"No data available for {ticker}")

print("Database creation complete.")
