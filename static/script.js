document.addEventListener('DOMContentLoaded', function() {
    const cityInput = document.getElementById('cityInput');
    const searchBtn = document.getElementById('searchBtn');
    const geolocationBtn = document.getElementById('geolocationBtn');
    const loading = document.getElementById('loading');
    const error = document.getElementById('error');
    const currentWeather = document.getElementById('currentWeather');
    const forecast = document.getElementById('forecast');
    const forecastContainer = document.getElementById('forecastContainer');

    // Load default city on page load
    loadWeather('London');

    // Event listeners
    searchBtn.addEventListener('click', function() {
        const city = cityInput.value.trim();
        if (city) {
            loadWeather(city);
        } else {
            showError('Please enter a city name');
        }
    });

    cityInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            searchBtn.click();
        }
    });

    geolocationBtn.addEventListener('click', function() {
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                function(position) {
                    const { latitude, longitude } = position.coords;
                    loadWeatherByCoords(latitude, longitude);
                },
                function() {
                    showError('Unable to retrieve your location. Please enter a city manually.');
                }
            );
        } else {
            showError('Geolocation is not supported by your browser');
        }
    });

    function loadWeather(city) {
        showLoading();
        hideError();
        hideWeather();

        fetch(`/weather?city=${encodeURIComponent(city)}`)
            .then(response => response.json())
            .then(data => {
                hideLoading();
                if (data.error) {
                    showError(data.error);
                } else {
                    displayWeather(data);
                }
            })
            .catch(err => {
                hideLoading();
                showError('Failed to fetch weather data. Please try again.');
                console.error('Error:', err);
            });
    }

    function loadWeatherByCoords(lat, lon) {
        // Reverse geocoding - get city name from coordinates
        // For simplicity, we'll use the weather API with coordinates
        showLoading();
        hideError();
        hideWeather();

        // OpenWeatherMap doesn't support direct coords in the weather endpoint
        // We'll use a workaround: fetch weather by coordinates
        // Note: This requires a separate API or we can use the city name from a geocoding service
        // For simplicity, we'll ask user to enter city name
        // In production, you'd use OpenWeatherMap's geocoding API or a reverse geocoding service
        
        // Alternative: Use a free reverse geocoding service
        fetch(`https://api.openweathermap.org/geo/1.0/reverse?lat=${lat}&lon=${lon}&limit=1&appid=${getApiKey()}`)
            .then(response => response.json())
            .then(data => {
                if (data && data.length > 0) {
                    const city = data[0].name;
                    cityInput.value = city;
                    loadWeather(city);
                } else {
                    hideLoading();
                    showError('Could not determine your city. Please enter manually.');
                }
            })
            .catch(err => {
                hideLoading();
                showError('Failed to get your location. Please enter a city manually.');
                console.error('Error:', err);
            });
    }

    function getApiKey() {
        // This is a workaround - in production, you'd get this from the server
        // For now, we'll use a placeholder (should match the one in .env)
        // The actual API key is stored on the server, so this function is just for the reverse geocoding
        // which should ideally be done server-side as well
        return 'YOUR_API_KEY_HERE'; // This will be replaced by server-side call
    }

    function displayWeather(data) {
        const current = data.current;
        const forecastData = data.forecast;

        // Update current weather
        document.getElementById('cityName').textContent = `${current.city}, ${current.country}`;
        document.getElementById('weatherDescription').textContent = current.description;
        document.getElementById('weatherIcon').src = current.icon;
        document.getElementById('weatherIcon').alt = current.description;
        document.getElementById('tempC').textContent = `${current.temperature_c}°C`;
        document.getElementById('tempF').textContent = `${current.temperature_f}°F`;
        document.getElementById('feelsLike').textContent = `${current.feels_like_c}°C / ${current.feels_like_f}°F`;
        document.getElementById('humidity').textContent = `${current.humidity}%`;
        document.getElementById('pressure').textContent = `${current.pressure} hPa`;
        document.getElementById('windSpeed').textContent = `${current.wind_speed} m/s`;
        document.getElementById('clouds').textContent = `${current.clouds}%`;
        document.getElementById('visibility').textContent = `${current.visibility} km`;

        // Show current weather
        currentWeather.style.display = 'block';

        // Update forecast
        forecastContainer.innerHTML = '';
        forecastData.forEach(day => {
            const card = document.createElement('div');
            card.className = 'forecast-card';
            card.innerHTML = `
                <div class="day">${day.day}</div>
                <div class="date">${day.date}</div>
                <img src="${day.icon}" alt="${day.description}">
                <div class="temp">${day.avg_temp_c}°C / ${day.avg_temp_f}°F</div>
                <div class="desc">${day.description}</div>
                <div class="extra-details">
                    💧 ${day.humidity}% | 💨 ${day.wind_speed} m/s
                </div>
            `;
            forecastContainer.appendChild(card);
        });

        // Show forecast
        forecast.style.display = 'block';

        // Update background gradient based on temperature
        updateBackground(current.temperature_c);
    }

    function updateBackground(tempC) {
        let gradient;
        if (tempC < 0) {
            gradient = 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)';
        } else if (tempC < 10) {
            gradient = 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)';
        } else if (tempC < 20) {
            gradient = 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)';
        } else if (tempC < 30) {
            gradient = 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)';
        } else {
            gradient = 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)';
        }
        document.body.style.background = gradient;
    }

    function showLoading() {
        loading.style.display = 'block';
    }

    function hideLoading() {
        loading.style.display = 'none';
    }

    function showError(message) {
        error.textContent = message;
        error.style.display = 'block';
    }

    function hideError() {
        error.style.display = 'none';
    }

    function hideWeather() {
        currentWeather.style.display = 'none';
        forecast.style.display = 'none';
    }
});
