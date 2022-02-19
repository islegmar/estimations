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

export function isWeekend(dt) {
  var dayOfWeek = dt.getDay();
  return (dayOfWeek === 6) || (dayOfWeek === 0);
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

export function getTotWorkingDays(list) {
  var tot=0;

  list.forEach(dt => {
    if ( !isWeekend(dt) ) ++tot;
  });

  return tot;
}
