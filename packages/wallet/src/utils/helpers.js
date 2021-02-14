// Debounce function for performance improvement
// credit to https://davidwalsh.name/javascript-debounce-function
export function debounce(func, wait, immediate) {
  var timeout;
  return function () {
    var context = this,
      args = arguments;
    var later = function () {
      timeout = null;
      if (!immediate) func.apply(context, args);
    };
    var callNow = immediate && !timeout;
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
    if (callNow) func.apply(context, args);
  };
}

export function memoize(method) {
  let cache = {};

  return async function () {
    let args = JSON.stringify(arguments);
    cache[args] = cache[args] || method.apply(this, arguments);
    return cache[args];
  };
}

// count decimals for number in representation like "0.123456"
export function countDecimals(value) {
  if (Math.floor(value) !== value) {
    const [base, tail] = value.toString().split(".");
    return tail ? tail.length : 0;
  }
  return 0;
}
