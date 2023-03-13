export function setElementPositionInViewport(element, x = 0, y = 0) {
  element.style.left = Math.min(window.innerWidth - element.offsetWidth, Math.max(0, x)) + 'px'
  element.style.top = Math.min(window.innerHeight - element.offsetHeight, Math.max(0, y)) + 'px'
}
