import { h } from "preact";
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

export function tiny(value) {
  if (value.length > 35) {
    return `${value.slice(0, 20)}...${value.slice(value.length - 10)}`;
  }
  return value;
}

export function formatDocumentUri(uri) {
  if (!uri) return <p>Empty!</p>;
  if (uri.length > 30) {
    return (
      <a href={uri} target="_blank" rel="noopener noreferrer">
        {uri.slice(0, 12)}
        {"..."}
        {uri.slice(uri.length - 5)}
      </a>
    );
  }
  return (
    <a href={uri} target="_blank" rel="noopener noreferrer">
      {uri}
    </a>
  );
}
