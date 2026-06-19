import os
import requests
from flask import Flask, render_template, request, jsonify
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

app = Flask(__name__)
app.config['SECRET_KEY'] = os.getenv('SECRET_KEY', 'dev-secret-key-change-in-production')

# Get API key from environment
API_KEY = os.getenv('OPENWEATHER_API_KEY')
BASE_URL = "https://api.openweathermap.org/data/2.5/weather"
FORECAST_URL = "https://api.openweathermap.org/data/2.5/forecast"

def kelvin_to_celsius(kelvin):
    """Convert Kelvin to Celsius"""
    return round(kelvin - 273.15, 1)

def kelvin_to_fahrenheit(kelvin):
    """Convert Kelvin to Fahrenheit"""
    return round((kelvin - 273.15) * 9/5 + 32, 1)

def get_weather_icon(icon_code):
    """Get weather icon URL"""
    return f"http://openweathermap.org/img/wn/{icon_code}@2x.png"

@app.route('/')
def index():
    """Render the main dashboard page"""
    return render_template('index.html')

@app.route('/weather', methods=['GET'])
def get_weather():
    """Get current weather and forecast for a city"""
    city = request.args.get('city')
    
    if not city:
        return jsonify({'error': 'City name is required'}), 400
    
    if not API_KEY:
        return jsonify({'error': 'API key not configured'}), 500
    
    try:
        # Get current weather
        current_params = {
            'q': city,
            'appid': API_KEY
        }
        current_response = requests.get(BASE_URL, params=current_params)
        current_response.raise_for_status()
        current_data = current_response.json()
        
        # Get 5-day forecast (3-hour intervals)
        forecast_params = {
            'q': city,
            'appid': API_KEY,
            'cnt': 40  # 5 days * 8 intervals per day
        }
        forecast_response = requests.get(FORECAST_URL, params=forecast_params)
        forecast_response.raise_for_status()
        forecast_data = forecast_response.json()
        
        # Process current weather data
        weather_data = {
            'city': current_data['name'],
            'country': current_data['sys']['country'],
            'temperature_c': kelvin_to_celsius(current_data['main']['temp']),
            'temperature_f': kelvin_to_fahrenheit(current_data['main']['temp']),
            'feels_like_c': kelvin_to_celsius(current_data['main']['feels_like']),
            'feels_like_f': kelvin_to_fahrenheit(current_data['main']['feels_like']),
            'humidity': current_data['main']['humidity'],
            'pressure': current_data['main']['pressure'],
            'wind_speed': current_data['wind']['speed'],
            'wind_deg': current_data['wind'].get('deg', 0),
            'description': current_data['weather'][0]['description'].capitalize(),
            'icon': get_weather_icon(current_data['weather'][0]['icon']),
            'clouds': current_data['clouds']['all'],
            'visibility': current_data.get('visibility', 0) / 1000  # Convert to km
        }
        
        # Process forecast data (group by day)
        forecast_days = {}
        for item in forecast_data['list']:
            date = item['dt_txt'].split(' ')[0]  # Get YYYY-MM-DD
            if date not in forecast_days:
                forecast_days[date] = []
            forecast_days[date].append({
                'time': item['dt_txt'].split(' ')[1][:5],  # HH:MM
                'temp_c': kelvin_to_celsius(item['main']['temp']),
                'temp_f': kelvin_to_fahrenheit(item['main']['temp']),
                'description': item['weather'][0]['description'].capitalize(),
                'icon': get_weather_icon(item['weather'][0]['icon']),
                'humidity': item['main']['humidity'],
                'wind_speed': item['wind']['speed']
            })
        
        # Take first 5 days of forecast
        forecast_list = []
        for i, (date, entries) in enumerate(list(forecast_days.items())[:5]):
            # Get daily average and midday forecast
            avg_temp_c = sum(e['temp_c'] for e in entries) / len(entries)
            avg_temp_f = sum(e['temp_f'] for e in entries) / len(entries)
            # Find midday forecast (closest to 12:00)
            midday = min(entries, key=lambda x: abs(int(x['time'].split(':')[0]) - 12))
            
            forecast_list.append({
                'date': date,
                'day': ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'][
                    datetime.strptime(date, '%Y-%m-%d').weekday()
                ],
                'avg_temp_c': round(avg_temp_c, 1),
                'avg_temp_f': round(avg_temp_f, 1),
                'description': midday['description'],
                'icon': midday['icon'],
                'humidity': midday['humidity'],
                'wind_speed': midday['wind_speed'],
                'entries': entries[:8]  # Limit to 8 entries per day
            })
        
        return jsonify({
            'current': weather_data,
            'forecast': forecast_list
        })
        
    except requests.exceptions.RequestException as e:
        return jsonify({'error': f'Failed to fetch weather data: {str(e)}'}), 500
    except KeyError as e:
        return jsonify({'error': f'Invalid response from weather API: {str(e)}'}), 500

# Import datetime for day names
from datetime import datetime

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000)
