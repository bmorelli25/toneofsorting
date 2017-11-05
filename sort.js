let queue = null;
let worker = null;

if (typeof AudioContext == 'undefined') {
  AudioContext = webkitAudioContext;
}

const audio = new AudioContext();

const master = audio.createGain();
master.gain.setValueAtTime(0.20, audio.currentTime);
master.connect(audio.destination);

const volume = document.querySelector('#volume');
volume.onchange = function() {
  master.gain.setValueAtTime(Number(this.value) / 100, audio.currentTime);
};

const track = audio.createGain();
track.gain.setValueAtTime(0, audio.currentTime);
track.connect(master);

const tone = audio.createOscillator();

tone.type = 'triangle';
tone.frequency.value = 440;
tone.connect(track);
tone.start();

const algorithm = document.querySelector('#algorithm');
algorithm.onchange = function() {
  if (algorithm.value == 'quickSort') {
    pivot.disabled = false;
  } else {
    pivot.disabled = true;
  }
};

const pivot = document.querySelector('#pivot');
pivot.disabled = true;

const sort = document.querySelector('#sort');
sort.onclick = function click(event) {
  if (worker) {
    worker.terminate();
  }

  queue = new Array();
  worker = new Worker('algorithms.js');
  worker.onmessage = function message(event) {
    queue.push(event);
  };

  const algorithm = document.querySelector('#algorithm');
  const pivot = document.querySelector('#pivot');
  const shuffle = document.querySelector('#shuffle');
  const size = document.querySelector('#size');

  let length = Number(size.value);
  let array = new Array(length);
  for (var i = 0; i < array.length; i++) {
    array[i] = i + 1;
  }

  array.sort(function(a, b) {
    switch (shuffle.value) {
      case 'random':
        return Math.random() > 0.5 ? -1 : 1;
      case 'ascending':
        return a - b;
      case 'descending':
        return b - a;
    }
  });

  const visualization = document.querySelector('#visualization');
  visualization.innerHTML = '';

  for (var i = 0; i < array.length; i++) {
    let element = document.createElement('span');

    let value = array[i];
    element.dataset.value = value;

    let percent = (value / array.length) * 100;

    if (array.length <= 10) {
      element.className = 'ball';
      element.innerText = array[i];
    } else {
      element.className = 'bar';
      element.style.height = percent + '%';
    }

    if (array.length >= 100) {
      element.style.backgroundColor = 'hsl(' + ((percent / 100) * 360) + ', 85%, 60%)';
    }

    visualization.appendChild(element);
  }

  worker.postMessage([algorithm.value, array, pivot.value]);
};

let then = performance.now();
window.requestAnimationFrame(function tick(now) {

  const container = document.querySelector('#visualization');
  const elements = container.querySelectorAll('span');

  let delay = Number(document.querySelector('#delay').value);

  for (var i = 0; i < elements.length; i++) {
    if (elements[i].style.translate != '0px') {
      elements[i].style.transition = 'all ' + (delay / 1000) + 's';
      elements[i].style.transform = 'translate(0px)';
      //elements[i].style.translate = '0px';
    }
  }

  if (now - then > delay) {
    for (var i = 0; i < elements.length; i++) {
      elements[i].classList.remove('test');
      elements[i].classList.remove('swap');
    }

    let event = (queue || []).shift();
    if (event) {
      let element1 = elements[event.data[1]];
      let element2 = elements[event.data[2]];

      let value1 = Number(element1.dataset.value);
      let value2 = Number(element2.dataset.value);

      let distance = Math.floor(element1.offsetLeft - element2.offsetLeft);

      if (event.data[0] == 'test') {
        element1.classList.add('test');
        element2.classList.add('test');

        let factor = ((value1 / elements.length) + (value2 / elements.length) / 2);
        let frequency = 440 + (factor * 440);

        tone.frequency.linearRampToValueAtTime(frequency, audio.currentTime);

        track.gain.cancelScheduledValues(audio.currentTime);
        track.gain.linearRampToValueAtTime(0.75, audio.currentTime);
        track.gain.linearRampToValueAtTime(0, audio.currentTime + delay);
      }

      if (event.data[0] == 'swap') {
        let factor = ((value1 / elements.length) + (value2 / elements.length) / 2);
        let frequency = 440 - (factor * 440);

        tone.frequency.linearRampToValueAtTime(frequency, audio.currentTime);

        track.gain.cancelScheduledValues(audio.currentTime);
        track.gain.linearRampToValueAtTime(1, audio.currentTime);
        track.gain.linearRampToValueAtTime(0, audio.currentTime + delay);

        let temp = document.createElement('span');
        element1.parentNode.insertBefore(temp, element1);
        element1.classList.add('swap');

        element2.parentNode.insertBefore(element1, element2);
        element2.classList.add('swap');

        temp.parentNode.insertBefore(element2, temp);
        temp.parentNode.removeChild(temp);

        element1.style.transition = '';
        element1.style.transform = 'translate(' + (distance * 1) + 'px)';

        element2.style.transition = '';
        element2.style.transform = 'translate(' + (distance * -1) + 'px)';
      }
    } else {
      track.gain.cancelScheduledValues(0);
      track.gain.linearRampToValueAtTime(0, audio.currentTime);
    }

    then = now;
  }

  window.requestAnimationFrame(tick);
});