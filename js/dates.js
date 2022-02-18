/**
 * Return an array of Dates between 2 dates (included)
 */
export function getListDates(d_start, d_end) {
  var dt=new Date(d_start);
  var list=[];
  while ( dt<=d_end ) {
    list.push(new Date(dt));
    dt.setDate(dt.getDate()+1);
  }
  return list;
}

export function groupByMonth(list, fKey, skipWeekend=true) {
  var months={};
  list.forEach(dt => {
    var dayOfWeek = dt.getDay();
    if ( !skipWeekend || (dayOfWeek !== 6) && (dayOfWeek !== 0) ) {
      const key=fKey(dt);
      if ( !months[key] ) months[key]=[];
      months[key].push(dt);
    }
  });

  return months;
}

/**
 * Return a list of periods build from the dates in list.
 * If the dates in list are ordered, the periods will be ordered too.
 */ 
export function getListPeriods(list, fKey) {
  var periods=[];
  list.forEach(dt => {
    const period=fKey(dt);
    if ( !periods.includes(period) ) {
      periods.push(period);
    }
  });

  return periods;
}

/**
 * We could use moment or other libraries....
 * Convert a date in dd/mm/yyyy
 */
export function str2Date(str) {
  const values=str.match(/(\d+)\/(\d+)\/(\d+)/);
  if ( values ) {
    return new Date(parseInt(values[3]), parseInt(values[2])-1, parseInt(values[1]));
  } else {
    log_error("Error parsing date '" + str + "' with format dd/mm/yyyy");
  }
}

export function date2Str(dt) {
  return dt.getDate().toString().padStart(2, "0") + "/" + 
    (dt.getMonth() + 1).toString().padStart(2, "0") + "/" + 
    dt.getFullYear();
}
