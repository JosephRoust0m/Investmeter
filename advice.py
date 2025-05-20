import numpy as np
import pandas as pd
from sklearn.ensemble import RandomForestRegressor
from flask import Flask, request, jsonify

app = Flask(__name__)

def train_model(prices):
    # Convert price list into a DataFrame
    df = pd.DataFrame({'prices': prices})

    # Create lagged features (previous day's price)
    df['prices_prev'] = df['prices'].shift(1)
    df.dropna(inplace=True)  # Remove empty rows

    # Prepare data for training
    X = df[['prices_prev']]
    y = df['prices']  # Target: next day's price

    model = RandomForestRegressor(n_estimators=100)
    model.fit(X, y)

    return model

@app.route('/analyze', methods=['POST'])
def analyze():
    data = request.json
    prices = data.get("prices")
    current_price = prices[len(prices) - 1]
    model = train_model(prices)

    # Predict next `N` days based on the last known price
    predictions = []
    last_price = prices[-1]

    for i in range(len(prices)):
        pred = model.predict([[last_price]])[0]
        predictions.append(pred)
        last_price = pred  # Update with predicted price

    #get the average of the predictions   
    average_prediction = float(np.mean(predictions))
    
    prediction=((average_prediction-current_price)/current_price)*100
    #print(prediction)
    return jsonify({"prediction": prediction})

if __name__ == '__main__':
    app.run(port=5000)