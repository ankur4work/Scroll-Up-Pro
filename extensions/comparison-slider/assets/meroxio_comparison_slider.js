'use strict'
const imageComparisonSlider = document.querySelector('[data-component="m-image-comparison-slider"]')

function setSliderstate(e, element) {
  const sliderRange = element.querySelector('[data-m-image-comparison-range]');

  if (e.type === 'input') {
    sliderRange.classList.add('m-image-comparison__range--active');
    return;
  }

  sliderRange.classList.remove('m-image-comparison__range--active');
  element.removeEventListener('mousemove', moveSliderThumb);
}

function moveSliderThumb(e) {
  const sliderRange = document.querySelector('[data-m-image-comparison-range]');
  const thumb = document.querySelector('[m-image-comparison-thumb]');
  let position = e.layerY - 20;

  if (e.layerY <= sliderRange.offsetTop) {
    position = -20;
  }

  if (e.layerY >= sliderRange.offsetHeight) {
    position = sliderRange.offsetHeight - 20;
  }

  // thumb.style.transition = 'width 0.1s ease-in-out';
}

function moveSliderRange(e, element) {
  const value = e.target.value;
  const slider = element.querySelector('[data-m-image-comparison-slider]');
  const imageWrapperOverlay = element.querySelector('[data-m-image-comparison-overlay]');

  slider.style.left = `${value}%`;
  imageWrapperOverlay.style.width = `${value}%`;
  imageWrapperOverlay.style.transition = 'width';

  element.addEventListener('mousemove', moveSliderThumb);
  setSliderstate(e, element);
}

function init(element) {
  const sliderRange = element.querySelector('[data-m-image-comparison-range]');

  if ('ontouchstart' in window === false) {
    sliderRange.addEventListener('mouseup', e => setSliderstate(e, element));
    sliderRange.addEventListener('mousedown', moveSliderThumb);
  }

  sliderRange.addEventListener('input', e => moveSliderRange(e, element));
  sliderRange.addEventListener('change', e => moveSliderRange(e, element));
}

init(imageComparisonSlider);
