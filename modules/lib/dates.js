/**
 * Return an array of Dates between 2 dates (included)
 */
export function getListDates(d_start, d_end, fCheck=null) {
  var dt=new Date(d_start);
  var list=[];
  while ( dt<=d_end ) {
    if ( !fCheck || fCheck(dt) ) {
      list.push(new Date(dt));
    }
    dt.setDate(dt.getDate()+1);
  }
  return list;
}

export function sumWorkingDays(dt, tot) {
  var my_dt=new Date(dt);
  --tot; // If tot=1 => do nothing
  while ( tot>0 ) {
    my_dt.setDate(my_dt.getDate()+1);
    if ( !isWeekend(my_dt) ) --tot;
  }

  return my_dt;
}

export function substractWorkingDays(dt, tot) {
  var my_dt=new Date(dt);
  --tot; // If tot=1 => do nothing
  while ( tot>0 ) {
    my_dt.setDate(my_dt.getDate()-1);
    if ( !isWeekend(my_dt) ) --tot;
  }

  return my_dt;
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

export function getNowAsStr() {
  return date2Str(new Date());
}

export function getTotWorkingDays(list) {
  var tot=0;

  list.forEach(dt => {
    if ( !isWeekend(dt) ) ++tot;
  });

  return tot;
}

export function getNumberDays(date1, date2) {
  var diff = date2.getTime() - date1.getTime();

  return parseInt(diff / (1000 * 3600 * 24));
}
