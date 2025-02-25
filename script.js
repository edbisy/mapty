'use strict';

class Workout {
  date = new Date();
  id = (Date.now() + '').slice(-10);
  clicks = 0;
  constructor(coords, distance, duration) {
    this.coords = coords; // [lat,lng]
    this.distance = distance; // in km
    this.duration = duration; //in km
  }

  _setDescription() {
    // prettier-ignore
    const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    this.description = `${this.type[0].toUpperCase()}${this.type.slice(1)} on ${
      months[this.date.getMonth()]
    } ${this.date.getDate()}`;
  }

  click() {
    this.clicks++;
  }
}

class Running extends Workout {
  type = 'running';
  constructor(coords, distance, duration, cadence) {
    super(coords, distance, duration);
    this.cadence = cadence;
    this.calcPace();
    this._setDescription();
  }

  calcPace() {
    //minutes per kilometer
    this.pace = this.duration / this.distance;
    return this.pace;
  }
}
class Cycling extends Workout {
  type = 'cycling';
  constructor(coords, distance, duration, elevationGain) {
    super(coords, distance, duration);
    this.elevationGain = elevationGain;
    this.calcSpeed();
    this._setDescription();
  }

  calcSpeed() {
    this.speed = this.distance / this.duration;
    return this.speed;
  }
}

// const run1 = new Running([39, -12], 5.2, 24, 178);
// const Cycling1 = new Cycling([39, -12], 27, 95, 523);
// console.log(run1, Cycling1);

//application architecture
const form = document.querySelector('.form');
const containerWorkouts = document.querySelector('.workouts');
const inputType = document.querySelector('.form__input--type');
const inputDistance = document.querySelector('.form__input--distance');
const inputDuration = document.querySelector('.form__input--duration');
const inputCadence = document.querySelector('.form__input--cadence');
const inputElevation = document.querySelector('.form__input--elevation');

class App {
  #map;
  #mapEvent;
  #workouts = [];
  constructor() {
    //get users position
    this._getPosition();
    //get data from local storage
    this.getLocalStorage();
    //attach event handlers
    form.addEventListener('submit', this._newWorkout.bind(this));
    inputType.addEventListener('change', this._toggleElevantionField);
    containerWorkouts.addEventListener('click', this._moveToPopUp.bind(this));
  }

  _getPosition() {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        this._loadMap.bind(this),
        function () {
          alert('could not get your position');
        }
      );
    }
  }

  _loadMap(position) {
    const latitude = position.coords.latitude;
    const longitude = position.coords.longitude;
    // console.log(`https://www.google.co.il/maps/@${latitude},${latitude}`);

    const coords = [latitude, longitude];
    this.#map = L.map('map').setView(coords, 13);

    L.tileLayer('https://{s}.tile.openstreetmap.fr/hot//{z}/{x}/{y}.png', {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(this.#map);

    //handling clicks on map
    this.#map.on('click', this._showForm.bind(this));

    //render the marker
    this.#workouts.forEach(workout => this._renderWorkoutMarker(workout));
  }

  _showForm(mapE) {
    this.#mapEvent = mapE;
    form.classList.remove('hidden');
    inputDistance.focus();
  }

  _hideForm() {
    //clear input fields
    inputDistance.value = '';
    inputDuration.value = '';
    inputCadence.value = '';
    inputElevation.value = '';
    //hide the form
    form.style.display = 'none';
    form.classList.add('hidden');
    setTimeout(() => (form.style.display = 'grid'), 1000);
  }

  _toggleElevantionField() {
    inputElevation.closest('.form__row').classList.toggle('form__row--hidden');
    inputCadence.closest('.form__row').classList.toggle('form__row--hidden');
  }

  _newWorkout(e) {
    const validInput = (...inputs) => inputs.every(inp => Number.isFinite(inp));
    e.preventDefault();
    const allPositive = (...inputs) => inputs.every(inp => inp > 0);
    //get data from form
    const type = inputType.value;
    const distance = Number(inputDistance.value);
    const duration = Number(inputDuration.value);
    const lat = this.#mapEvent.latlng.lat;
    const lng = this.#mapEvent.latlng.lng;
    const latAndLng = [lat, lng];
    let workout;
    //if workout running,create running object
    if (type === 'running') {
      const cadence = Number(inputCadence.value);
      
      if (
        !validInput(distance, duration, cadence) ||
        !allPositive(distance, duration, cadence)
      )
        return alert('inputs have to be positive numbers');

      workout = new Running(latAndLng, distance, duration, cadence);
    }
    // if workout cycling create cycling object
    if (type == 'cycling') {
      const elevation = Number(inputElevation.value);
      //check if data is valid
      if (
        !validInput(distance, duration, elevation) ||
        !allPositive(distance, duration)
      )
        return alert('inputs have to be positive numbers');
      workout = new Cycling(latAndLng, distance, duration, elevation);
    }
    //add new object to workout array
    this.#workouts.push(workout);
    // console.log(this.#workouts);
    // render workout on map as marker
    this._renderWorkoutMarker(workout);
    //render workout on list
    this._renderWorkout(workout);
    //hide form + clear inpud fields
    this._hideForm();
    //set local storage to all workouts
    this._setLocalStorage();
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
        `${workout.type === 'running' ? '🏃‍♂️' : '🚴‍♀️'}${workout.description}`
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
      </div>`;

    if (workout.type === 'running') {
      html += `<div class="workout__details">
        <span class="workout__icon">⚡️</span>
        <span class="workout__value">${workout.pace.toFixed(1)}</span>
        <span class="workout__unit">min/km</span>
      </div>
      <div class="workout__details">
        <span class="workout__icon">👣</span>
        <span class="workout__value">${workout.cadence}</span>
        <span class="workout__unit">spm</span>
      </div>
    </li> -->`;
    }
    if (workout.type === 'cycling') {
      html += `<div class="workout__details">
        <span class="workout__icon">⚡️</span>
        <span class="workout__value">${workout.speed.toFixed(1)}</span>
        <span class="workout__unit">km/h</span>
      </div>
      <div class="workout__details">
        <span class="workout__icon">⛰</span>
        <span class="workout__value">${workout.elevationGain}</span>
        <span class="workout__unit">m</span>
      </div>
    </li>`;
    }
    form.insertAdjacentHTML('afterend', html);
  }

  _moveToPopUp(e) {
    const workoutEl = e.target.closest('.workout');
    if (!workoutEl) return;
    const workout = this.#workouts.find(
      workOut => workOut.id === workoutEl.dataset.id
    );
    // console.log(workout);
    this.#map.setView(workout.coords, 13, {
      animate: true,
      pan: { duration: 1 },
    });

    //using public interface
    // workout.click();
    // console.log(this.#workouts);
  }

  _setLocalStorage() {
    localStorage.setItem('workouts', JSON.stringify(this.#workouts));
  }
  getLocalStorage() {
    const data = JSON.parse(localStorage.getItem('workouts'));
    // console.log(data);

    if (!data) return;
    this.#workouts = data;
    this.#workouts.forEach(workout => this._renderWorkout(workout));
  }
  reset() {
    localStorage.removeItem('workouts');
    location.reload();
  }
}

const app = new App();
