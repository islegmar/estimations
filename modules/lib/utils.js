import * as Log from './log.js';

/**
 * Several utilities.
 */
// TODO : not nice but ...
export function cloneJSON(data) {
  return JSON.parse(JSON.stringify(data));
}

/**
 * If the data has the _include attribute load it and it in the file
 * TODO : now works only with 1 include at the first level
 */ 
export function loadExternal(data, callback, url_prefix ) {
  if ( data.hasOwnProperty("_includes") ) {
    updateJSONWithExternals(data, data["_includes"], data => {
      delete data["_includes"];
      callback(data);
    }, url_prefix);
  } else {
    callback(data);
  }
}

/**
 * TODO : if the new JSON loaded has also _include they are not loaded.
 */
export function updateJSONWithExternals(data, urls, callback, url_prefix, error_if_duplicate=true, update_if_duplicate=true ) {
  var url = urls.shift();
  if ( url_prefix ) {
    url = url_prefix + url;
  }
  Log.log_debug("updateJSONWithExternals(urls=" + urls + ", url=" + url + ")");
  fetchJSONFile(url, new_data => {
    for(const k in new_data ) {
      if ( data.hasOwnProperty(k) && error_if_duplicate ) {
          throw new Error("Duplicated key '" + k + "' found in the original data '" + JSON.stringify(data) + "' and in the updated '" + JSON.stringify(new_data));
      }

      if ( !data.hasOwnProperty(k) || update_if_duplicate ) {
        Log.log("Add key " + k + " with value " + new_data[k]);
        data[k] = new_data[k];
      }
    }
    if ( urls.length>0 ) {
      updateJSONWithExternals(data, urls, callback, url_prefix, error_if_duplicate, update_if_duplicate);
    } else {
      callback(data);
    }
  });
}

export function eachRecursive(obj, action) {
  for (var k in obj) {
    if (typeof obj[k] == "object" && obj[k] !== null) {
      if ( action ) {
        action(k, obj[k], obj);
      }
      eachRecursive(obj[k], action);
    } else {
      if ( action ) {
        action(k, obj[k], obj);
      }
    }
  }
}

export function makeSafeForCSS(name) {
    return name.replace(/[^a-zA-Z0-9]/g, function(s) {
        var c = s.charCodeAt(0);
        if (c == 32) return '-';
        if (c >= 65 && c <= 90) return '_' + s.toLowerCase();
        return '__' + ('000' + c.toString(16)).slice(-4);
    });
}

export function getClassName(str) {
  const class_name = makeSafeForCSS(str);
  return class_name;
}

export function getElementInArrayOfObjects(list, key, value) {
   var found=null;
   list.forEach(ele => {
     if ( key in ele && ele[key]===value ) {
       found=ele;
     }
   });

   return found;
}

export function removeChildren($parent) {
  while ($parent.firstChild) {
    $parent.removeChild($parent.firstChild);
  }
}

/**
 * Convert an array of Objects in a dictionary indexed by one field.
 */
export function groupBy(list, key) {
  var data={};
  list.forEach(item => data[item[key]]=item);

  return data;
}

/**
 * Convert a map in an array of objects so it can be nicely shown in a list
 */
export function map2List(data, keyField, skipValues) {
  var list=[];
  for(const keyValue in data ){
    if ( !skipValues || !skipValues.includes(keyValue) ) {
      if ( keyField in data[keyValue] ) {
        const errorMsg="The field " + keyField + " already exists in " + JSON.stringify(data[keyValue]);
        throw new Error(errorMsg);
      } else {
        // TODO : sure it can be done using standard JS and one line but ...
        var item={};
        item[keyField]=keyValue;
        list.push(update(item, data[keyValue]));
      }
    }
  }

  return list;
}

/**
 * Update a map with the value of other.
 * TODO: probably alread exists a standard method.
 */
export function update(data, newValues, overwriteIfExists=false, addIfNotExist=true) {
  for (const key in newValues ) {
    if ( !(key in data) && addIfNotExist || (key in data) && overwriteIfExists ) {
      data[key]=newValues[key];
    }
  }

  // Return data to concat the calls
  return data;
}

String.prototype.capitalize = function() {
    return this.charAt(0).toUpperCase() + this.slice(1);
}

export function fetchJSONFile(path, callback, keepComments) {
  if ( !path ) {
    callback(null);
  } else {
    var httpRequest = new XMLHttpRequest();
    httpRequest.onreadystatechange = function() {
      if (httpRequest.readyState === 4) {
        if (httpRequest.status === 200 || httpRequest.status === 0) {
          var data = JSON.parse(httpRequest.responseText);
          if ( !keepComments) removeCommentsFromJSON(data);
          if (callback) callback(data);
        } else {
          alert("ERROR : " + httpRequest.status + " : ·" + httpRequest.responseText);
        }
      }
    };
    httpRequest.open('GET', path);
    httpRequest.send(); 
  }
}

export function  getURLParam(key, defValue=null) {
  const queryString = window.location.search;
  const urlParams = new URLSearchParams(queryString);
  const value=urlParams.get(key);

  return value ? value : defValue;
}

/**
 * Some fun : load a CSS dynamic
 * If a parameter css=.... is specified, it is loaded
 */
export function addCss(css_param){
  const p_css = getURLParam(css_param);
  
  if ( p_css ) {
    var $ = document; // shortcut
    var cssId = 'myCss';  // you could encode the css path itself to generate id..
    if (!$.getElementById(cssId)) {
      var head  = $.getElementsByTagName('head')[0];
      var link  = $.createElement('link');
      link.id   = cssId;
      link.rel  = 'stylesheet';
      link.type = 'text/css';
      link.href = p_css;
      link.media = 'all';
      head.appendChild(link);
    }
  }
}

/**
 * Collapsable
 */
export function collapsable($root){
  $root.querySelectorAll('.collapsable').forEach($ele => {
    $ele.querySelector('.header').addEventListener('click', function() {
      const $parent=this.closest('.collapsable');
      // Toggle class
      if ( $parent.classList.contains("collapsed") ) {
        $parent.classList.remove("collapsed");
      } else {
        $parent.classList.add("collapsed");
      }
    });
  });
}

/**
 * Because JSON does not accept comments (ehem, ehem!!) I decide to add an attribute
 * _comment to do that BUT when parsing as JSON is a good idea to remove them
 */
export function removeCommentsFromJSON(obj) {
  for (let k in obj) {
    if ( k==="_comment" ) {
      delete obj[k];
    } else if (typeof obj[k] === "object") {
      removeCommentsFromJSON(obj[k]);
    }
  }
}

export function filterMap(src, filter) {
  var data={};
  for(const k in src) {
    if ( filter(k, src[k])) data[k]=src[k];
  }
  return data;
}

export const formatterDecimal = new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
});
export const formatterCost = new Intl.NumberFormat('es-ES', {
    style: "currency",
    currency: 'EUR'
});
export function formatString(value, formatter=formatterDecimal) {
  const ret= value ? formatter.format(value) : "";
  return ret;
}
export function formatDataValue(data, key, formatter=formatterDecimal) {
    const value=data && data.hasOwnProperty(key) ? data[key] : "";
    return formatString(value, formatter);
}

export function round(value, num_dec=2) {
  return Math.round(value * 10 ** num_dec)/10 ** num_dec;
}

export function lsSetJSON(name, data) {
  localStorage.setItem(name, JSON.stringify(data));
}

export function lsGetJSON(name) {
  return JSON.parse(localStorage.getItem(name));
}

export function lsDelJSON(name) {
  return localStorage.removeItem(name);
}

/**
 * Process sequentally a list of files uploaded by the user using <input type='file'>
 *
 * A typical use:
 *    <input type='file'>.addEventListener('change', function(e) {
 *      loadLocalFiles(
 *        e.target.files, 
 *        (file, txt_result) => {
 *          // Process single file
 *        },
 *        tot => {
 *          // All files processed
 *        }
 *      );
 *    });
 *
 *  TODO: 
 *  - use Array instead the integer files_processed
 *  - provide as reply two arrays with the files processed and the not processed
 */    
export function loadLocalFiles(files_to_process, onFile, onDone, ind_files_processed=0, allowed=['application/json']) {
  if  ( files_to_process.length==ind_files_processed ) {
    if ( onDone ) {
      onDone(ind_files_processed);
    }
  } else {
    // files_to_process is a FileList so we can not use shift()
    // const file=files_to_process.shift();
    const file=files_to_process[ind_files_processed];

    // For some weird reason after processing all the files we get an "extra call" where file=undefined
    if ( file ) {
      if ( !allowed || allowed.includes(file.type) ) {
        var reader = new FileReader();
      
        reader.onload = function(e) {
          if ( onFile ) {
            onFile(file, reader.result);
          }
          loadLocalFiles(files_to_process, onFile, onDone, ind_files_processed+1);
        }
        reader.readAsText(file);    
      } else {
        alert("File  of type '" + file.type + "' not in the list of supported '" + JSON.stringify(allowed) + "'");
        loadLocalFiles(files_to_process, onFile, onDone, ind_files_processed+1);
      }
    }
  }
}

/**
 * Extends a JSON with another. 
 * TODO: check if it exists a standard way. Now in this implementation 
 *       only work for Dictionaries (so it JSON is a list it would fail)
 */
export function extendsJSON(old_json, new_json, allow_overwrite=true) {
  // Make a clone so avoid "side effects" if new_json is changed
  var my_new_json = cloneJSON(new_json);
  for (const k in my_new_json ) {
    if ( allow_overwrite || !old_json.hasOwnProperty(k) ) {
      old_json[k] = my_new_json[k];
    }
  }
}

/**
 * Convert a human expression of days in a number with the days.
 * The format is <value>[d|w|m] where:
 * - d : days
 * - w : week => 5 days
 * - m : month => 20 days
 * If no format specified or is a number are days.
 * TODO: pass as optional an argument with a map unit => number of days
 */
export function daysHuman2Number(duration) {
  Log.log_debug("duration:" + duration);

  if ( !duration ) return null;

  var value=null;
  if (typeof duration == "string" ) {
    const tags=duration.match(/(\d+\.?\d*)([^\d]*)/ );
    if ( tags ) {
      value = parseFloat(tags[1]);
      const unit = tags[2];

      Log.log_debug("Duration : '" + duration + "' => value : '" + tags[1] + "', unit : '" + tags[2] + "'");
         
      if ( unit==="d" ) {
        value *= 1.0;
      } else if ( unit==="w" ) {
        value *= 5.0;
      } else if ( unit==="m" ) {
        value *= 20.0;
      } else if (unit) {
        throw new Error("Unknown unit '" + unit + "' in duration '" + duration + "'");
      }
    } else {
      Log.log_error("Not possible to parse the string with the duration '" + duration + "'. Set 1.0 as duration");
      value=1.0;
    }
  } else {
    value=parseFloat(duration);
    Log.log_debug("Number. duration : " + duration + " => value : " + value);
  }

  return value;
}
/*
 * TODO: pass as optional an argument with a map unit => number of days
 */
export function daysNumber2Human(duration) {
  var value=null;
  var unit=null;

  if ( duration/20.0 > 1.0 ) {
    value=round(duration/20.0);
    unit="m";
  } else if ( duration/5.0 > 1.0 ) {
    value=round(duration/5.0);
    unit="w";
  } else {
    value=duration;
    unit="d";
  }

  return value + "" + unit;
}

// TODO: escape character quote 
export function convertArrayOfObjectsToCSV(data, keys, quote='"', columnDelimiter=',', lineDelimiter='\n') {
  var result, ctr, keys, columnDelimiter, lineDelimiter, data;

  if (data == null || !data.length) {
    return null;
  }

  result = '';

  ctr = 0;
  keys.forEach(key => {
    if (ctr > 0) result += columnDelimiter;
    result += quote + (key) + quote;
    ctr++;
  });
  result += lineDelimiter;

  data.forEach(function(item) {
    ctr = 0;
    keys.forEach(function(key) {
      if (ctr > 0) result += columnDelimiter;

      result += quote + (item[key] ? item[key]: "") + quote;
      ctr++;
    });
    result += lineDelimiter;
  });

  return result;
}

export function downloadCSV(data, headers, filename='export.csv', mimetype='application/csv') {
  downloadData(convertArrayOfObjectsToCSV(data, headers), filename, mimetype);
}

export function downloadData(data, filename, mimetype) {
  if (data == null) return;

  /*
  if (!csv.match(/^data:text\/csv/i)) {
    csv = 'data:text/csv;charset=utf-8,' + csv;
  }
  */
  var down_data = 'data:' + mimetype + ';charset=utf-8,' + encodeURIComponent(data);

  var link = document.createElement('a');
  link.setAttribute('href', down_data);
  link.setAttribute('download', filename);
  link.click();
}

export function getValue(data, prop, def="", use_def_if_empty=false) {
  return data && data.hasOwnProperty(prop) && (!use_def_if_empty || data[prop]) ? data[prop] : def;
}

/**
 * Convert an array of objets (so we matter the order) in a map.
 */
export function listOfMaps2Map(listMaps) {
  var map={};

  listMaps.forEach(item => {
    for(const k in item ) {
      map[k]=item[k];
    }
  });

  return map;
}

/**
 * Return a map where the list elements are grouped.
 */
export function groupListElements(list, fKey) {
  var groups={};
  list.forEach(ele => {
    const key=fKey(ele);
    if ( !groups[key] ) groups[key]=[];
    groups[key].push(ele);
  });

  return groups;
}

/*
downloadCSV(
  [ 
    { "name" : "Pepe, Antonio", "age" : 13},
    { "name" : "Juan", "age" : 88}
  ],
  ["name", "age"]
);
*/
