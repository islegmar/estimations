import * as DateUtils from '../lib/dates.js';
import * as Log from '../lib/log.js';
import { removeChildren, groupListElements, getGroupListElements, formatString } from '../lib/utils.js';

import { walk_tree } from './exports.js';

document.addEventListener("custom.planning.refresh", function (evt) {
  const eContainer=evt.detail.container;
  buildGantt(eContainer.querySelector('#gantt'), evt.detail.jstree);
  buildPlanning(eContainer, evt.detail.jstree);
});

/**
 * Used to group the dates (by month-year)
 */ 
function getKeyDate(dt) {
  return (dt.getMonth() + 1).toString().padStart(2, "0") + "-" + dt.getFullYear().toString().substring(2);
}

/* Given the denomination of a group in format mm-yy (see getKeyDate) , it gives the start and end date. */
function getDatesInGroup(group) {
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
    throw new Eror("Group '" + group + "' does not have the format month-year");
  }

  Log.log_is_low_debug() && Log.log_low_debug("group : '" + group + "' => start : '" + start + "', end : '" + end + "'");

  return {
    'start' : start,
    'end' : end
  };
}

// ----------------------------------------------------------------------- Gantt
/**
 * Build the table with the FTEs and also add the listerner to show the details.
 */
function buildGantt(eTable, jstree) {
  removeChildren(eTable);
  const gantt=getGantt(jstree);
  
  var eHeader=document.createElement('div');
  eTable.appendChild(eHeader);
  gantt.headers.forEach(name => {
    var eCell=document.createElement('div');
    eCell.innerHTML=name;
    eHeader.appendChild(eCell);
  });

  gantt.list.forEach(item => {
    var eRow=document.createElement('div');
    eTable.appendChild(eRow);

    var eCell=document.createElement('div');
    eCell.innerHTML=item['name'];
    eRow.appendChild(eCell);

    gantt.headers.forEach(name => {
      if ( name !== 'Task' ) {
        var period_name=name;

        var eCell=document.createElement('div');
        eRow.appendChild(eCell);

        var eSpan=document.createElement('span');
        eCell.appendChild(eSpan);

        if ( item.periods[period_name] ) {
          eSpan.classList.add("busy");
          eSpan.classList.add("level_" + item.level);

          // Now compute the shift
          // item.periods[name] is the number of dates this task has in this period,
          // so we have to compute this based on the number of possible dates it has
          // my_perc is a % "spacing" this task in that period. 
          // - my_perc = 0% => it takes the whole month
          // - my_perc > 0% => it takes partial tht can be 
          //   + end of the period   => left margin
          //   + start of the period => right margin
          const period_dates=getDatesInGroup(period_name);
          const number_days_period=DateUtils.getListDates( 
            period_dates.start,
            period_dates.end
          ).length;
          const my_days=item.periods[period_name].length;
          var my_perc=100-parseInt(100*my_days/number_days_period);
          // It shouln't happen but ....
          if ( my_perc<0 ) my_perc=0;

          // Ok, are we in the bebinning or the end?
          var is_at_end=null;
          if ( my_perc > 0 ) {
            // If my first date is the first date of the period => is the end
            if ( item.periods[period_name][0].getTime() === period_dates.start.getTime() ) {
              is_at_end=true;
              eSpan.style.right=my_perc + "%";
            } else {
              is_at_end=false;
              eSpan.style.left=my_perc + "%";
            }
          } else {
            eSpan.style.right=0;
          }
          
          if ( Log.log_is_low_debug() ) {
            Log.log_low_debug(
              "Period : " + period_name + 
              ", number_days_period : " + number_days_period + 
              ", my_days : " + my_days + 
              ", my_perd : " + my_perc + 
              ", my_first_date : " + item.periods[period_name][0] +
              ", period_first_date : " + period_dates.start +
              ", is_at_end : " + is_at_end + 
              "."
            );
          }
        }
      }
    });
  });
}

function getGantt(jstree) {
  var start_date=null;
  var end_date=null;
  var list=[];

  walk_tree(jstree, (node, level) => {
    if ( node.data.start_date && node.data.end_date ) {
      const my_start=DateUtils.str2Date(node.data.start_date);
      const my_end=DateUtils.str2Date(node.data.end_date);

      if ( !start_date || my_start<start_date) start_date=my_start;
      if ( !end_date || my_end>end_date) end_date=my_end;

      list.push({
        'name'  : node.text,
        'level' : level,
        'periods' : groupListElements(DateUtils.getListDates(my_start, my_end), getKeyDate)
      });
    }
  });

  const period_names=getGroupListElements(DateUtils.getListDates(start_date, end_date), getKeyDate);
  var headers=['Task', ...period_names];

  return {
    'headers' : headers,
    'list'    : list
  }
}

// -------------------------------------------------------------------- Planning
function buildPlanning(eContainer, jstree) {
  var eTable=eContainer.querySelector('#planning');

  removeChildren(eTable);
  const planning=getPlanning(jstree);

  var eHeader=document.createElement('div');
  eTable.appendChild(eHeader);
  planning.headers.forEach(name => {
    var eCell=document.createElement('div');
    eCell.innerHTML=name;
    eCell.classList.add('clicable');
    eHeader.appendChild(eCell);
    if ( name !== "Task" ) {
      eCell.addEventListener('click', showDetailByPeriod.bind(this, eContainer.querySelector("#detail_by_period"), name, jstree), false);
    }
  });

  planning.list.forEach(item => {
    var eRow=document.createElement('div');
    eTable.appendChild(eRow);

    var eCell=document.createElement('div');
    eCell.innerHTML=item['Rol'];
    eCell.classList.add('clicable');
    eRow.appendChild(eCell);

    eCell.addEventListener('click', showDetailByRol.bind(this, eContainer.querySelector("#detail_by_rol"), item['Rol'], jstree), false);

    planning.headers.forEach(name => {
      if ( name !== 'Rol' ) {
        var eCell=document.createElement('div');
        eCell.innerHTML=formatString(item[name]);
        eRow.appendChild(eCell);
      }
    });
  });
}

export function getPlanning(jstree) {
  // 1> Build ftes_rol_period that is a map by rol and period so given a rol 
  // we have the sum of all the FTEs needed for every period adding the need of all 
  // the simple tasks.
  var ftes_rol_period={};
  var start_date=null;
  var end_date=null;
  walk_tree(jstree, node => {
    // We only check the simple tasks because we the composed
    // we will have multiple sums when processing parent / child tasks.
    if ( !node.data.isComposed ) {
      if ( node.data.start_date && node.data.end_date ) {
        const my_start=DateUtils.str2Date(node.data.start_date);
        const my_end=DateUtils.str2Date(node.data.end_date);
        if ( !start_date || my_start<start_date) start_date=my_start;
        if ( !end_date   || my_end>end_date    ) end_date=my_end;

        // To compute the FTES we have to compute how many working days we have in the range [my_start, my_end]
        const list_dates=DateUtils.getListDates(my_start, my_end);
        var total_days=0;
        list_dates.forEach(dt => {
          // TODO : we could consideer other holidays and even some "special periods" as 
          // the summer/christmas
          if ( !DateUtils.isWeekend(dt) ) ++total_days;
        });
        if ( total_days === 0 ) {
          throw new Error("There are no working days in the period [" + my_start + "," + my_end + "]");
        }

        // Now create groups in months
        const periods=groupListElements(list_dates, getKeyDate);

        // Finally, for every rol and period compute the number of FTEs and add them.
        // NOTE : We're using a linear distribution here but another algorithm should be possible
        for (const rol in node.data.md ) {
          for(const period in periods) {
            if ( !ftes_rol_period[rol] ) ftes_rol_period[rol]={};
            if ( !ftes_rol_period[rol][period] ) ftes_rol_period[rol][period]=0;
            ftes_rol_period[rol][period] += node.data.md[rol]/total_days;
          }
        }
      }
    }
  });
  Log.log_low_debug("start_date : " + start_date);
  Log.log_low_debug("end_date : " + end_date);

  // 2> Create the data structured as table so it can be exported as CSV and displayed
  // - Header : Rol + Periods (months)
  // - Every line : FTEs for that rol in the different periods
  const period_names=Object.keys(groupListElements(DateUtils.getListDates(start_date, end_date), getKeyDate)).sort();
  var headers=['Rol', ...period_names];

  var list=[];
  for (const rol in ftes_rol_period ) {
    var item={'Rol' : rol};
    period_names.forEach(period => {
      item[period]=ftes_rol_period[rol][period] ? ftes_rol_period[rol][period] : "";
    });
    list.push(item);
  }

  return {
    'headers' : headers,
    'list'    : list
  }
}

/**
 * Show the detail of the FTEs for a certain rol.
 */
function showDetailByRol(eContainer, rol, jstree) {
  eContainer.querySelector(".header").innerHTML=rol;

  var eTable=eContainer.querySelector(".content");
  removeChildren(eTable);

  // 1> Get the data
  var list=[];
  var start_date=null;
  var end_date=null;
  // Here every row is a task (composed/simple) as in gantt but 
  // where we're going to show the info in the simple tasks for 
  // participation of that rol in the different periods
  walk_tree(jstree, (node, level) => {
    if ( node.data.start_date && node.data.end_date ) {
      const my_start=DateUtils.str2Date(node.data.start_date);
      const my_end=DateUtils.str2Date(node.data.end_date);

      if ( !start_date || my_start<start_date) start_date=my_start;
      if ( !end_date || my_end>end_date) end_date=my_end;

      var item={
        'name'  : node.text,
        'level' : level,
        'periods' : groupListElements(DateUtils.getListDates(my_start, my_end), getKeyDate),
        'info' : null
      };

      if ( !node.data.isComposed && node.data.md[rol] ) { 
        item.info={};
        var total_days=0;
        for(const period in item.periods ) {
          var period_days=0;
          item.periods[period].forEach( dt => {
            if ( !DateUtils.isWeekend(dt) ) ++period_days;
          });
          total_days += period_days;
          item.info[period] = {
            'period_days' : period_days
          }
        }
        var ftes = node.data.md[rol]/total_days;
        for(const period in item.info ) {
          item.info[period]["ftes"]=ftes;
          item.info[period]["task"]=node.data.md[rol];
          item.info[period]["rol_days"]=ftes*item.info[period]["period_days"];
        }
      }

      list.push(item);
    }
  });

  // 2> Build the table
  // - Header : periods
  // - Every row : task (composed/simple) marking the periods and info when the rol participates
  const period_names=Object.keys(groupListElements(DateUtils.getListDates(start_date, end_date), getKeyDate)).sort();
  var headers=['Task', ...period_names];

  var eHeader=document.createElement('div');
  eTable.appendChild(eHeader);
  headers.forEach(name => {
    var eCell=document.createElement('div');
    eCell.innerHTML=name;
    eHeader.appendChild(eCell);
  });

  list.forEach(item => {
    var eRow=document.createElement('div');
    eTable.appendChild(eRow);

    var eCell=document.createElement('div');
    eCell.innerHTML=item['name'];
    eRow.appendChild(eCell);

    headers.forEach(name => {
      if ( name !== 'Task' ) {
        var eCell=document.createElement('div');
        eRow.appendChild(eCell);

        if ( item.info && item.info[name]) {
          const my_info = item.info[name];

          eCell.classList.add("working");
          eCell.innerHTML  = "";
          eCell.innerHTML += "<b>Days : "     + formatString(my_info.period_days) + "</b><br/>";
          eCell.innerHTML += "<b>Rol Days : " + formatString(my_info.rol_days)    + "</b><br/>";
          eCell.innerHTML += "Task : "     + formatString(my_info.task) + "<br/>";
          eCell.innerHTML += "FTEs : "     + formatString(my_info.ftes);
        } else {
          eCell.classList.add("busy");
          eCell.classList.add("level_" + item.level);
        }
      }
    });
  });
}

/**
 * Show the detail of the FTEs for a certain Period
 * - Header : the roles.
 * - Every row is a task with info if that rol is involved
 */
function showDetailByPeriod(eContainer, period, jstree) {
  eContainer.querySelector(".header").innerHTML=period;

  var eTable=eContainer.querySelector(".content");
  removeChildren(eTable);

  // 1> Get the data
  var roles=[];
  var list=[];
  // Here every row is a task (composed/simple) as in gantt but 
  // where we're going to show the info in the simple tasks for 
  // participation of the different roles for thar period
  walk_tree(jstree, (node, level) => {
    var item={
      'name'  : node.text,
      'level' : level
    };
    if ( node.data.start_date && node.data.end_date ) {
      const my_start=DateUtils.str2Date(node.data.start_date);
      const my_end=DateUtils.str2Date(node.data.end_date);
      const list_dates=DateUtils.getListDates(my_start, my_end);
      const total_working_days=DateUtils.getTotWorkingDays(list_dates);

      const groups=groupListElements(list_dates, getKeyDate);
      if ( groups[period] ) {
        const period_working_days=DateUtils.getTotWorkingDays(groups[period]);
        for(const rol in node.data.md ) {
          if ( !roles.includes(rol) ) roles.push(rol);

          var ftes = node.data.md[rol]/total_working_days;
          item[rol]={
            "period_days" : period_working_days,
            "ftes"        : ftes,
            "task"        : node.data.md[rol],
            "rol_days"    : ftes*period_working_days
          };
        }
      }
    }
    list.push(item);
  });

  // 2> Build the table
  // - Header : roles
  // - Every row : task (composed/simple) marking the periods and info when the rol participates
  var headers=['Task', ...roles];

  var eHeader=document.createElement('div');
  eTable.appendChild(eHeader);
  headers.forEach(name => {
    var eCell=document.createElement('div');
    eCell.innerHTML=name;
    eHeader.appendChild(eCell);
  });

  list.forEach(item => {
    var eRow=document.createElement('div');
    eTable.appendChild(eRow);

    var eCell=document.createElement('div');
    eCell.innerHTML=item['name'];
    eRow.appendChild(eCell);

    headers.forEach(name => {
      if ( name !== 'Task' ) {
        var eCell=document.createElement('div');
        eRow.appendChild(eCell);

        if ( item[name] ) {
          const my_info = item[name];

          eCell.classList.add("working");
          eCell.innerHTML  = "";
          eCell.innerHTML += "<b>Task : "     + formatString(my_info.task)     + "</b><br/>";
          eCell.innerHTML += "<b>FTEs : "     + formatString(my_info.ftes)     + "</b><br/>";
          eCell.innerHTML += "<b>Rol Days : " + formatString(my_info.rol_days) + "</b><br/>";
          eCell.innerHTML += "Days : "     + formatString(my_info.period_days);
        } else {
          eCell.classList.add("busy");
          eCell.classList.add("level_" + item.level);
        }
      }
    });
  });
}
