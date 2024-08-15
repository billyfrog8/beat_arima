from flask import Flask, render_template, jsonify
from pmdarima import auto_arima
from sklearn.metrics import mean_squared_error
import pandas as pd
import os
import random

app = Flask(__name__)

class ForecastGame:
    def __init__(self):
        self.stock_data_dir = 'stock_data'
        self.generate_data()
        self.fit_arima()
        self.user_score = 0
        self.arima_score = 0

    def generate_data(self):
        stock_files = os.listdir(self.stock_data_dir)
        self.selected_file = random.choice(stock_files)
        
        df = pd.read_csv(os.path.join(self.stock_data_dir, self.selected_file))
        df['Datetime'] = pd.to_datetime(df['Datetime'])
        
        if len(df) > 100:
            self.start_idx = random.randint(0, len(df) - 100)
            window = df.iloc[self.start_idx:self.start_idx+100]
        else:
            self.start_idx = 0
            window = df.iloc[-100:]
        
        self.data = window['Close'].values
        
        self.train_data = self.data[:90].tolist()
        self.test_data = self.data[90:].tolist()
        
        self.ohlc_data = window[['Datetime', 'Open', 'High', 'Low', 'Close']].values.tolist()
        self.start_date = window['Datetime'].iloc[0].strftime('%Y-%m-%d')
        self.end_date = window['Datetime'].iloc[-1].strftime('%Y-%m-%d')

    def fit_arima(self):
        model = auto_arima(self.train_data, seasonal=False, stepwise=True, suppress_warnings=True)
        self.arima_forecast = model.predict(n_periods=10).tolist()

game = ForecastGame()

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/get_data')
def get_data():
    return jsonify({
        'train_data': game.train_data,
        'test_data': game.test_data,
        'arima_forecast': game.arima_forecast,
        'user_score': game.user_score,
        'arima_score': game.arima_score,
        'ohlc_data': game.ohlc_data,
        'stock_info': {
            'ticker': game.selected_file.split('.')[0],
            'start_date': game.start_date,
            'end_date': game.end_date
        }
    })

@app.route('/play_again')
def play_again():
    game.generate_data()
    game.fit_arima()
    return jsonify({
        'train_data': game.train_data,
        'arima_forecast': game.arima_forecast,
        'ohlc_data': game.ohlc_data,
        'stock_info': {
            'ticker': game.selected_file.split('.')[0],
            'start_date': game.start_date,
            'end_date': game.end_date
        }
    })

@app.route('/submit_forecast/<forecast>')
def submit_forecast(forecast):
    user_forecast = [float(x) for x in forecast.split(',')]
    user_mse = mean_squared_error(game.test_data, user_forecast)
    arima_mse = mean_squared_error(game.test_data, game.arima_forecast)

    if user_mse < arima_mse:
        result = "User wins!"
        game.user_score += 1
    else:
        result = "ARIMA wins!"
        game.arima_score += 1

    return jsonify({
        'result': result,
        'user_mse': user_mse,
        'arima_mse': arima_mse,
        'test_data': game.test_data,
        'user_score': game.user_score,
        'arima_score': game.arima_score,
        'stock_info': {
            'ticker': game.selected_file.split('.')[0],
            'start_date': game.start_date,
            'end_date': game.end_date
        }
    })

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    app.run(host="0.0.0.0", port=port)
