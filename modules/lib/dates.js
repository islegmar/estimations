import { groupListElements, getGroupListElements} from '../lib/utils.js';
import * as Log from '../lib/log.js';

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

export function sortPeriodsMonthYear(periods) {
  var start_date=null;
  var end_date=null;
  periods.forEach(period => {
    var dates=getDatesInGroupMonthYear(period);
    if ( !start_date || dates.start < start_date) start_date=dates.start;
    if ( !end_date   || dates.end   > end_date  ) end_date=dates.end;
  });

  return getGroupListElements(getListDates(start_date, end_date), getKeyMonthYear);
}

export function getKeyMonthYear(dt) {
  return (dt.getMonth() + 1).toString().padStart(2, "0") + "-" + dt.getFullYear().toString().substring(2);
}

/* Given the denomination of a group in format mm-yy (see getKeyDate) , it gives the start and end date. */
export function getDatesInGroupMonthYear(group) {
  var start=null;
  var end=null;
  const values=group.match(/(\d+)-(\d+)/);
  if ( values ) {
    const month=parseInt(values[1]-1);
    const year=values[2].length==2 ? 2000 + parseInt(values[2]) : parseInt(values[2]);
    Log.log_is_low_debug() && Log.log_low_debug("group : '" + group + "' => month (start 0) : '" + month + "', year : '" + year + "'");
    start=new Date(year, month, 1);
    end=new Date(year, month, 1);

    while ( true ) {
      end.setDate(end.getDate()+1);
      if ( end.getMonth()!=month ) {
        end.setDate(end.getDate()-1);
        break;
      }
    }

  } else {
    throw new Error("Group '" + group + "' does not have the format month-year");
  }

  Log.log_is_low_debug() && Log.log_low_debug("group : '" + group + "' => start : '" + start + "', end : '" + end + "'");

  return {
    'start' : start,
    'end' : end
  };
}
