/**
 * Logging utilities.
 */

// ------------------------------------------------------------------- CONSTANTS
// Levels
const LOG_LEVEL_LOW_DEBUG=10;
const LOG_LEVEL_DEBUG=20;
const LOG_LEVEL_INFO=30;
const LOG_LEVEL_WARN=40;
const LOG_LEVEL_ERROR=50;
const LOG_LEVEL_NONE=1000;

// As URL parameter low_level
const LOG_LEVELS = {
  "low_debug" : LOG_LEVEL_LOW_DEBUG,
  "debug"     : LOG_LEVEL_DEBUG,
  "info"      : LOG_LEVEL_INFO,
  "warn"      : LOG_LEVEL_WARN,
  "error"     : LOG_LEVEL_ERROR
};

// Current log level (its value is a LOG_LEVEL_XXX)
// var LOG_LEVEL=null;
const LOG_LEVEL_DEFAULT=LOG_LEVEL_NONE;

// --------------------------------------------------------------------- GENERIC
/**
 * Return the current log level
 */
function log_get_level() {
  if ( !window.LOG_LEVEL ) {
    const queryString = window.location.search;
    const urlParams = new URLSearchParams(queryString);
    const value=urlParams.get("log_level");

    window.LOG_LEVEL = value && LOG_LEVELS[value] ? LOG_LEVELS[value] : LOG_LEVEL_DEFAULT;
  }

  return window.LOG_LEVEL;
}

/**
 * Useful for example  in low_level, if the generation of the msg is "long"
 * log_level_enabled(LOG_LEVEL_LOW_DEBUG) && log_low_debug(<long message>)
 * OR you can use a nicer
 * log_is_low_debug() && log_low_debug(<long message>)
 *
 */
function log_level_enabled(my_log_level) {
  return log_get_level() <= my_log_level;
}

// ---------------------------------------------------------------------- LEVELS
// LOW DEBUG
function log_is_low_debug() {
  return log_level_enabled(LOG_LEVEL_LOW_DEBUG);
}

function log_low_debug(msg) {
  if ( log_get_level() <= LOG_LEVEL_LOW_DEBUG ) console.log(msg);
}

// DEBUG
function log_is_debug() {
  return log_level_enabled(LOG_LEVEL_DEBUG);
}

function log_debug(msg) {
  if ( log_get_level() <= LOG_LEVEL_DEBUG ) console.log(msg);
}

// INFO
function log_is_info() {
  return log_level_enabled(LOG_LEVEL_INFO);
}

function log_info(msg) {
  if ( log_get_level() <= LOG_LEVEL_INFO ) console.info(msg);
}

// WARN
function log_is_warn() {
  return log_level_enabled(LOG_LEVEL_WARN);
}

function log_warn(msg) {
  if ( log_get_level() <= LOG_LEVEL_WARN ) console.warn(msg);
}

// ERROR
function log_is_error() {
  return log_level_enabled(LOG_LEVEL_ERROR);
}

function log_error(msg) {
  if ( log_get_level() <= LOG_LEVEL_ERROR ) console.error(msg);
}

// Default
function log(msg) {
  log_debug(msg);
}

/*
function log(msg, level=LOG_LEVEL_DEBUG) {
  // First time: get the lovel from params or use the default
  if (LOG_LEVEL===null ) {
    const queryString = window.location.search;
    const urlParams = new URLSearchParams(queryString);
    const value=urlParams.get("log_level");

    LOG_LEVEL = value ? parseInt(value) : LOG_LEVEL_DEFAULT;
  }

  if ( LOG_LEVEL===LOG_LEVEL_NONE || level < LOG_LEVEL ) return false;

  if ( level==LOG_LEVEL_LOW_DEBUG || level===LOG_LEVEL_DEBUG ) {
    console.log(msg);
  } else if ( level===LOG_LEVEL_INFO ) {
    console.info(msg);
  } else if ( level===LOG_LEVEL_WARN ) {
    console.warn(msg);
  } else if ( level===LOG_LEVEL_ERROR ) {
    console.error(msg);
  } else {
    return false;
  }

  return true;
}
*/
/*
console.group("Group heading");
console.log("First line");
console.log("Second line");
console.log("Last line");
console.groupEnd();
*/
