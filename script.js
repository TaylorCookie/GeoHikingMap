'use strict';

class Entry {
  ////////////////////////////////////////////////////////
  //CREATE NEW ID FROM IMPORT LIBRARY LATER///////////////
  ////////////////////////////////////////////////////////
  id = (Date.now() + '').slice(-10);

  constructor(
    coords,
    distance = 0,
    duration = 0,
    steps = 0,
    park,
    trail,
    date
  ) {
    this.coords = coords; //[latitude, longitude]
    this.distance = distance; //in miles
    this.duration = duration; //in min
    this.steps = steps;
    this.park = this._formatParkandTrails(park);
    this.trail = this._formatParkandTrails(trail);
    this.date = new Date(date);

    this._setDescription();
  }

  //formats the park and trails to standard 'teST PARk' => 'Test Park'
  _formatParkandTrails(input) {
    return input
      .toLowerCase()
      .split(' ')
      .map((word) => word[0].toUpperCase() + word.slice(1))
      .join(' ');
  }

  // sets the description as "Cascade Canyon, Grand Tetons ( January 2021)"
  _setDescription() {
    const months = [
      'January',
      'February',
      'March',
      'April',
      'May',
      'June',
      'July',
      'August',
      'September',
      'October',
      'November',
      'December',
    ];

    this.dateFormatted = `${
      months[this.date.getMonth()]
    } ${this.date.getFullYear()}`;

    this.description = `${this.trail}, ${this.park} (${
      months[this.date.getMonth()]
    } ${this.date.getFullYear()})`;
  }
}

//////////////////////////////////////////////////////////////
//////////////////////////////////////////////////////////////
//APPLICATION

const form = document.querySelector('.form');
const entryList = document.querySelector('.entry__list');
const btnHideSidebar = document.querySelector('.hide__sidebar');
const btnShowSidebar = document.querySelector('.show__sidebar');
const sidebar = document.querySelector('.sidebar');
const btnShowMore = document.querySelector('.show__more');
const btnSettings = document.querySelector('.btn__settings');
const btnDeleteAll = document.querySelector('.delete__all');
const btnSort = document.querySelector('.sort');
const btnZoomToFit = document.querySelector('.zoom__to-fit');

//Modals
const modal = document.querySelector('.modal');
const overlay = document.querySelector('.overlay');
const btnOpenModal = document.querySelectorAll('.show-modal');
const btnCloseModal = document.querySelector('.close-modal');
const formSortBy = document.querySelector('.form__sort--by');

//instantiated once created
let entryDetailsContainers;

//input fields
const inputDistance = document.querySelector('.form__input--distance');
const inputDuration = document.querySelector('.form__input--duration');
const inputSteps = document.querySelector('.form__input--steps');
const inputTrail = document.querySelector('.form__input--trail');
const inputDate = document.querySelector('.form__input--date');
const inputPark = document.querySelector('.form__input--park');

class App {
  //change to set default zoom amount when page loads
  //7 is about the size of a state, increase to see more drilled down
  _defaultZoom = 7;
  _map;
  _mapEvent;
  _entries = [];
  _markers = [];
  _isSidebarHidden = false;
  _showDetails = false;

  constructor() {
    //get data from local storage
    this._getLocalStorage();

    //get current location
    this._getPosition();

    ///////////////////////////////////////////////////////////////////////EVENT HANDLERS///////////////////////////////
    //////////////////////////////////////////////////////////
    //form submission handler
    form.addEventListener('submit', this._newEntry.bind(this));

    //move to marker when a list item is clicked
    entryList.addEventListener('click', this._moveToMarker.bind(this));

    //zoom to fit all markers into view
    btnZoomToFit.addEventListener('click', this._showAllMarkers.bind(this));

    //handlers for hiding/displaying the sidebar
    [btnHideSidebar, btnShowSidebar].forEach((btn) =>
      btn.addEventListener('click', this._showOrHideSidebar.bind(this))
    );

    //show more button for showing/hiding additional information
    btnShowMore.addEventListener('click', this._showMore.bind(this));

    //show/close modal
    [btnSettings, btnCloseModal, overlay].forEach((el) => {
      el.addEventListener('click', this._settingsModalOpenClose);
    });
    //close settings modal on esc key press
    document.addEventListener(
      'keydown',
      this._settingsModalCloseOnEsc.bind(this)
    );

    //handle submitting of sorting form within settings window
    formSortBy.addEventListener('submit', this._sort.bind(this));

    //delete entry when delete button is clicked--event delegation
    entryList.addEventListener('click', this._deleteEntry.bind(this));

    //delete all button handler
    btnDeleteAll.addEventListener('click', this._reset.bind(this));
  }

  ///////////////////////////////////////////////////////////////////////////SHOWING AND HIDING///////////////////////////////////////////////////////////////////////////////////////
  //display or hide sidebar
  _showOrHideSidebar() {
    sidebar.classList.toggle('hidden');

    //display the show sidebar button
    btnHideSidebar.classList.toggle('hidden');

    //hide the button once it is pushed
    btnShowSidebar.classList.toggle('hidden');

    // //if sidebar is hidden
    // if (this._isSidebarHidden) {
    //   //display the sidebar
    //   sidebar.style.display = 'flex';

    //   //display the hide sidebar button
    //   btnHideSidebar.style.display = 'block';

    //   //hide the button once it is pushed
    //   btnShowSidebar.style.display = 'none';
    // } else {
    //   //hide the sidebar
    //   sidebar.style.display = 'none';

    //   //display the show sidebar button
    //   btnShowSidebar.style.display = 'block';

    //   //hide the button once it is pushed
    //   btnHideSidebar.style.display = 'none';
    // }

    //invert sidebar bool
    this._isSidebarHidden = !this._isSidebarHidden;

    //the map bugs out and shifts when sidebar gets shown or hidden, so resize it
    this._map.invalidateSize();
  }

  _showMore() {
    //invert showDetails
    this._showDetails = !this._showDetails;

    //select all containers and toggle hidden on each container
    document
      .querySelectorAll('.entry__details-container')
      .forEach((container) => {
        container.classList.toggle('hidden');
      });

    //change the button to the opposite message
    if (this._showDetails) {
      btnShowMore.innerHTML = 'Show Less';
    } else {
      btnShowMore.innerHTML = 'Show More';
    }
  }

  //open the settings modal
  _settingsModalOpenClose() {
    modal.classList.toggle('hidden');
    overlay.classList.toggle('hidden');
  }

  //close settings modal on esc key press
  _settingsModalCloseOnEsc(e) {
    if (e.key === 'Escape' && !modal.classList.contains('hidden')) {
      this._settingsModalOpenClose();
    }
  }

  //click on map results in form being displayed
  _showForm(e) {
    this._mapEvent = e;

    //if the sidebar is hidden, show it
    if (this._isSidebarHidden) {
      this._showOrHideSidebar();
    }

    //display form
    form.classList.remove('hidden');
    //focus on date
    inputDate.focus();
  }

  //hide the form from the user and clear input fields
  _hideForm() {
    //clear input fields
    inputDistance.value = '';
    inputDuration.value = '';
    inputSteps.value = '';
    inputPark.value = '';
    inputTrail.value = '';
    inputDate.value = '';

    //hide form
    //skip the animation of adding 'hidden' class to form
    form.style.display = 'none';
    form.classList.add('hidden');
    setTimeout(() => (form.style.display = 'flex'), 1000);
  }

  ///////////////////////////////////////////////////////////////////////////MAP STUFF////////////////////////////////////////////////////////////////////////////////////////////////
  //get location if browser supports
  _getPosition() {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        this._loadMap.bind(this),
        //failure function
        function () {
          alert('Unable to get your position');
        }
      );
    }
    //if browser does not support geolocation
    else {
      alert('This browser does not support geolocation');
    }
  }

  //success function of _getPosition, loads the map
  _loadMap(position) {
    const { latitude, longitude } = position.coords;

    //L is Leaflet namespace
    this._map = L.map('map').setView([latitude, longitude], this._defaultZoom);

    //import from Leaflet/openstreetmap
    L.tileLayer('http://{s}.tile.openstreetmap.fr/osmfr/{z}/{x}/{y}.png', {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(this._map);

    //event handler to show form on map click
    this._map.on('click', this._showForm.bind(this));

    //change the default hand to a crosshair on map
    L.DomUtil.addClass(this._map._container, 'crosshair-cursor-enabled');

    //render local storage entries on map
    this._entries.forEach((entry) => {
      this._renderEntryMarker(entry);
    });

    //set view to current location
    this._map.setView([latitude, longitude], this._defaultZoom);
  }

  _showAllMarkers() {
    //guard clause
    if (this._markers.length === 0) {
      //hide the modal settings window
      this._settingsModalOpenClose();

      return;
    }

    //set grouping of markers
    const group = new L.featureGroup(this._markers);

    //scale map to fit all markers
    this._map.fitBounds(group.getBounds());

    //hide the modal settings window
    this._settingsModalOpenClose();
  }

  ///////////////////////////////////////////////////////////////////////////ENTRY STUFF//////////////////////////////////////////////////////////////////////////////////////////////
  //create new entry, submission puts pin on the map
  _newEntry(e) {
    e.preventDefault();

    //get data from form
    const { lat, lng } = this._mapEvent.latlng;
    const distance = Number(inputDistance.value);
    const duration = Number(inputDuration.value);
    const steps = Number(inputSteps.value);
    const trail = inputTrail.value;
    const park = inputPark.value;
    //store date as a new Date object
    const date = new Date(`${inputDate.value}T00:00:00`);

    //create new variable to hold entry
    let newEntry = new Entry(
      [lat, lng],
      distance,
      duration,
      steps,
      park,
      trail,
      date
    );

    //add new object to entry array
    this._entries.push(newEntry);

    //render entry on list
    this._renderEntryInList(newEntry);

    //hide form
    this._hideForm();

    //render entry on map on marker
    this._renderEntryMarker(newEntry);

    //store all entries in local storage
    this._setLocalStorage();
  }

  //callback function for deleting entry
  _deleteEntry(e) {
    e.preventDefault();

    //guard clause to ignore all clicks other than delete button
    if (!e.target.classList.contains('delete__entry')) return;

    //guard clause
    //check to ensure button was meant to be pressed
    if (!confirm('Are you sure you want to delete?')) return;

    //get the entry element that will be removed
    const entryElement = e.target.closest('.entry');

    //get id to be deleted
    const idToDelete = entryElement.dataset.id;

    //find which entry within the _entries array has the matching id
    const entry = this._entries.find((entry) => {
      return entry.id == idToDelete;
    });

    //find index of the object to be deleted
    const index = this._entries.indexOf(entry);

    //update the _entries array without found entry
    if (index > -1) {
      this._entries.splice(index, 1);
    }

    //update local storage
    this._setLocalStorage();

    //remove entry from list
    entryElement.style.display = 'none';

    //find corresponding marker from the map
    const markerToDelete = this._markers.find((marker) => {
      const { lat, lng } = marker._latlng;
      return entry.coords[0] === lat && entry.coords[1] === lng;
    });

    //remove marker from _markers
    this._markers.splice(this._markers.indexOf(markerToDelete), 1);

    //remove marker from map
    this._map.removeLayer(markerToDelete);
  }

  //puts a new marker on the map
  _renderEntryMarker(entry) {
    //how marker appears on map
    const marker = L.marker(entry.coords)
      .addTo(this._map)
      .bindPopup(
        L.popup({
          maxWidth: 250,
          minWidth: 100,
          autoClose: false,
          closeOnClick: false,
          className: 'leaflet__marker',
        })
      )
      .setPopupContent(`${entry.trail}, ${entry.park}`)
      .openPopup();

    //add marker to array
    this._markers.push(marker);
  }

  //displays each entry within the sidebar
  _renderEntryInList(entry) {
    //check if details should be hidden or shown
    let show;
    this._showDetails ? (show = '') : (show = 'hidden');

    //build html string
    let html = `
    <li class="entry" data-id="${entry.id}">
        <div class="entry__row">
          <h2 class="entry__title">${entry.description}</h2>
          <button class="delete__entry">❌</button>
        </div>
        
        <div class="entry__details-container ${show}">
          <div class="entry__details">
              <span class="entry__icon">🚶‍♂️</span>
              <span class="entry__value">${entry.distance}</span>
              <span class="entry__unit">mi</span>
          </div>

          <div class="entry__details">
              <span class="entry__icon">⏱</span>
              <span class="entry__value">${entry.duration}</span>
              <span class="entry__unit">min</span>
          </div>

          <div class="entry__details">
              <span class="entry__icon">🐾</span>
              <span class="entry__value">${entry.steps}</span>
              <span class="entry__unit">steps</span>
          </div>

        </div>

      </li>`;

    //add html to page
    entryList.insertAdjacentHTML('afterbegin', html);
  }

  //clicking on an item in the list moves the map to the corresponding marker
  _moveToMarker(e) {
    const entryElement = e.target.closest('.entry');

    //guard clause
    if (!entryElement) return;

    //find the corresponding marker
    const entry = this._entries.find(
      (entry) => entry.id === entryElement.dataset.id
    );

    //Leaflet set map view to marker
    this._map.setView(entry.coords, this._defaultZoom, {
      animate: true,
      pan: {
        duration: 1,
      },
    });
  }

  ///////////////////////////////////////////////////////////////////////////STORAGE STUFF////////////////////////////////////////////////////////////////////////////////////////////
  _setLocalStorage() {
    localStorage.setItem('entries', JSON.stringify(this._entries));
  }

  _getLocalStorage() {
    //get data from local storage and convert to object
    const data = JSON.parse(localStorage.getItem('entries'));

    //guard clause
    if (!data) return;

    //set variable to data
    this._entries = data;

    //render each entry in list
    this._entries.forEach((entry) => {
      this._renderEntryInList(entry);
    });
  }

  _sort(e) {
    e.preventDefault();

    const sortBy = e.target.children[0].value.toLowerCase();
    const incDec = e.target.children[1].value.toLowerCase();

    //sorts based on options selected by user
    if (sortBy === 'date') {
      if (incDec === 'increasing') {
        //sort by dates by oldest on top
        this._entries.sort((a, b) => new Date(b[sortBy]) - new Date(a[sortBy]));
      } else {
        //sort by dates by newest on top
        this._entries.sort((a, b) => new Date(a[sortBy]) - new Date(b[sortBy]));
      }
    } else {
      if (incDec === 'increasing') {
        //sort the entries by incresing within entries list
        this._entries.sort((a, b) => b[sortBy] - a[sortBy]);
      } else {
        //sort the entries by decreasing within entries list
        this._entries.sort((a, b) => a[sortBy] - b[sortBy]);
      }
    }

    //set in local storage
    this._setLocalStorage();

    //clear the entries from the list
    entryList.innerHTML = '';

    //add the entries back in correct order
    this._getLocalStorage();

    //close the modal window
    this._settingsModalOpenClose();
  }

  //remove all entries from local storage and reload
  _reset() {
    //check to ensure the button was not clicked by accident
    if (confirm('Are you sure you want to delete all entries?')) {
      localStorage.removeItem('entries');
      location.reload();
    }
  }
}

//start the app
let app = new App();
