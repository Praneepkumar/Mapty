class Workout {
  date = new Date();
  id = (Date.now() + '').slice(-10);
  clicks = 0;
  constructor(distance, duration, coords) {
    this.distance = distance; //in km
    this.duration = duration; //in minutes
    this.coords = coords; //[lat,lng]
  }
  _setDescription() {
    // prettier-ignore
    const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

    this.description = `${this.type[0].toUpperCase()}${this.type.slice(1)} on ${
      months[this.date.getMonth()]
    } ${this.date.getDate()}`;
  }
  _click() {
    return this.clicks++;
  }
}
class Running extends Workout {
  type = 'running';
  constructor(distance, duration, coords, cadence) {
    super(distance, duration, coords);
    this.cadence = cadence;
    this._calcPace();
    this._setDescription();
  }
  _calcPace() {
    //mins/km
    this.pace = this.duration / this.distance;
    return this.pace;
  }
}
class Cycling extends Workout {
  type = 'cycling';
  constructor(distance, duration, coords, elevationGain) {
    super(distance, duration, coords);
    this.elevationGain = elevationGain;
    this._calcSpeed();
    this._setDescription();
  }
  _calcSpeed() {
    //km/hr
    this.speed = this.distance / (this.duration / 60);
    return this.speed;
  }
}

////////////////////////////////////////////////////////////////////////////////////////////////////////////
//Application Architecture
const form = document.querySelector('.form');
const containerWorkouts = document.querySelector('.workouts');
const inputType = document.querySelector('.form__input--type');
const inputDistance = document.querySelector('.form__input--distance');
const inputDuration = document.querySelector('.form__input--duration');
const inputCadence = document.querySelector('.form__input--cadence');
const inputElevation = document.querySelector('.form__input--elevation');

class App {
  #map;
  #mapClickEvent;
  #workouts = [];
  #mapZoomLevel = 13;
  constructor() {
    this._getPosition();
    form.addEventListener('submit', this._newWorkout.bind(this));
    inputType.addEventListener('change', this._toggleElevationField);
    containerWorkouts.addEventListener('click', this._moveToPopup.bind(this));
    this._getLocalStorage();
  }

  _getPosition() {
    if (navigator.geolocation)
      navigator.geolocation.getCurrentPosition(this._loadMap.bind(this), () =>
        alert('cannot fetch your current location')
      );
  }

  _loadMap(position) {
    let { latitude, longitude } = position.coords;
    let coords = [latitude, longitude];

    this.#map = L.map('map').setView(coords, this.#mapZoomLevel);

    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(this.#map);

    this.#map.on('click', this._showForm.bind(this));
    this.#workouts.forEach(work => this._renderWorkoutMarker(work));
  }

  _showForm(mapE) {
    this.#mapClickEvent = mapE;
    form.classList.remove('hidden');
    inputDistance.focus();
  }
  _hideForm() {
    form.style.display = 'none';
    form.classList.add('hidden');
    form.style.display = 'grid';
    this._clearInputFields();
  }
  _clearInputFields() {
    //prettier-ignore
    inputDistance.value = inputDuration.value = inputCadence.value = inputElevation.value = '';
  }
  _newWorkout(e) {
    e.preventDefault();
    //check for valid inputs
    let validInputs = (...inputs) => inputs.every(inp => Number.isFinite(inp));
    //check for positive inputs
    let positiveInputs = (...inputs) => inputs.every(inp => inp > 0);

    //clear inputs

    //Get data from form

    let type = inputType.value;
    let distance = +inputDistance.value;
    let duration = +inputDuration.value;
    let workout;
    let { lat, lng } = this.#mapClickEvent.latlng;

    //if activity is running create running object
    if (type === 'running') {
      let cadence = +inputCadence.value;
      //checking whether data input is valid
      if (
        !validInputs(distance, duration, cadence) ||
        !positiveInputs(distance, duration, cadence)
      ) {
        this._clearInputFields();
        return alert('Input should be a number & positive');
      }
      workout = new Running(distance, duration, [lat, lng], cadence);
    }

    //if activity is cycling create cycling object
    if (type === 'cycling') {
      let elevation = +inputElevation.value;
      //checking whether data input is valid
      if (
        !validInputs(distance, duration, elevation) ||
        !positiveInputs(distance, duration)
      ) {
        this._clearInputFields();
        return alert('Input should be a number & positive ');
      }

      workout = new Cycling(distance, duration, [lat, lng], elevation);
    }
    //workout._click();

    //add new object to workout array
    this.#workouts.push(workout);

    //Render workout on map as marker
    this._renderWorkoutMarker(workout);

    //Render new workout on the list
    this._renderWorkout(workout);

    //Hide the form and clear input fields
    this._hideForm();

    //set local storage to all workouts
    this._setLocalStorage();
  }
  _toggleElevationField() {
    inputCadence.closest('.form__row').classList.toggle('form__row--hidden');
    inputElevation.closest('.form__row').classList.toggle('form__row--hidden');
  }
  _renderWorkoutMarker(workout) {
    L.marker(workout.coords)
      .addTo(this.#map)
      .bindPopup(
        L.popup({
          maxWidth: 250,
          minWidth: 100,
          autoClose: false,
          closeOnClick: false,
          className: `${workout.type}-popup`,
        })
      )
      .setPopupContent(
        `${workout.type === 'running' ? '🏃‍♂️' : '🚴‍♀️'} ${workout.description}`
      )
      .openPopup();
  }
  _renderWorkout(workout) {
    let html = `<li class="workout workout--${workout.type}" data-id="${
      workout.id
    }">
    <h2 class="workout__title">${workout.description}</h2>
    <div class="workout__details">
      <span class="workout__icon">${
        workout.type === 'running' ? '🏃‍♂️' : '🚴‍♀️'
      }</span>
      <span class="workout__value">${workout.distance}</span>
      <span class="workout__unit">km</span>
    </div>
    <div class="workout__details">
      <span class="workout__icon">⏱</span>
      <span class="workout__value">${workout.duration}</span>
      <span class="workout__unit">min</span>
    </div>
    `;
    if (workout.type === 'running')
      html += `<div class="workout__details">
    <span class="workout__icon">⚡️</span>
    <span class="workout__value">${workout.pace.toFixed(2)}</span>
    <span class="workout__unit">min/km</span>
  </div>
  <div class="workout__details">
    <span class="workout__icon">🦶🏼</span>
    <span class="workout__value">${workout.cadence}</span>
    <span class="workout__unit">spm</span>
  </div>
</li>`;
    else
      html += `<div class="workout__details">
<span class="workout__icon">⚡️</span>
<span class="workout__value">${workout.speed.toFixed(2)}</span>
<span class="workout__unit">km/hr</span>
</div>
<div class="workout__details">
<span class="workout__icon">⛰</span>
<span class="workout__value">${workout.elevationGain}</span>
<span class="workout__unit">M</span>
</div>
</li>`;

    form.insertAdjacentHTML('afterend', html);
  }
  _moveToPopup(e) {
    let workoutEl = e.target.closest('.workout');
    if (!workoutEl) return;
    let workout = this.#workouts.find(work => work.id === workoutEl.dataset.id);
    //console.log(workout);
    this.#map.setView(workout.coords, this.#mapZoomLevel, {
      animation: true,
      pan: {
        duration: 1,
      },
    });
  }
  _setLocalStorage() {
    localStorage.setItem('workout', JSON.stringify(this.#workouts));
  }
  _getLocalStorage() {
    const data = JSON.parse(localStorage.getItem('workout'));
    if (!data) return;
    this.#workouts = data;
    this.#workouts.forEach(work => this._renderWorkout(work));
  }
  reset() {
    localStorage.clear();
    location.reload();
  }
}

let app = new App();
