import * as DateUtils from '../lib/dates.js';
import * as Log from '../lib/log.js';
import { removeChildren, groupListElements, getGroupListElements, formatString } from '../lib/utils.js';

import { walk_tree } from './exports.js';
import * as TS  from '/modules/app/timeseries.js';

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

          // Now compute the box
          // item.periods[name] is the number of dates this task has in this period,
          // so we have to compute this based on the number of possible dates it has
          // my_perc is a % "spacing" this task in that period. 
          const period_dates=getDatesInGroup(period_name);
          const number_days_period=DateUtils.getListDates(period_dates.start, period_dates.end).length;

          const task_dates=item.periods[period_name];
          const my_first_date=task_dates[0];
          const my_last_date=task_dates[task_dates.length-1];

          // We haver to compute for the box
          // - space in the start
          // - space at the end
          // - width
          const number_days_start = my_first_date < period_dates.start ? 0 : DateUtils.getListDates( period_dates.start, my_first_date   ).length - 1;
          const number_days_end   = my_last_date  > period_dates.end   ? 0 : DateUtils.getListDates( my_last_date      , period_dates.end).length - 1;
          const perc_start=parseInt(100*number_days_start/number_days_period);
          const perc_end=parseInt(100*number_days_end/number_days_period);
          const perc_width=100-(perc_start+perc_end);

          eSpan.style.left=perc_start + "%";
          eSpan.style.width=perc_width + "%";

          if ( Log.log_is_low_debug() ) {
            Log.log_low_debug(
              "Period : " + period_name + 
              ", period_limits : [" + DateUtils.date2Str(period_dates.start) + ", " + DateUtils.date2Str(period_dates.end) + "]" +
              ", task_limits : [" + DateUtils.date2Str(my_first_date) + ", " + DateUtils.date2Str(my_last_date) + "]" +
              ", number_days_period : " + number_days_period + 
              ", number_days_start : " + number_days_start + 
              ", number_days_end : " + number_days_end +
              ", perc_start : " + perc_start +
              ", perc_end : " + perc_end +
              ", perc_width : " + perc_width +
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
        var period_name=name;

        var eCell=document.createElement('div');
        if ( item[period_name] ) {
          eCell.innerHTML=item[period_name];
        }
        eRow.appendChild(eCell);
      }
    });
  });
}

/**
 * - Header : periods of fime
 * - Row    : every row is a rol and for every period show the infor about FTEs.
 */
export function getPlanning(jstree) {
  // 1> For the root node (project)
  // - Get all the Simple Tasks
  // - For every day, sum the FTEs for every rol for all the tasks
  // - Maks monthly groups with all those FTEs.
  // - Calculate dtatistichal data as max/min/avg
  var all_ts={};
  get_simple_nodes(jstree, null).forEach(node => {
    TS.extendsTS(all_ts, TS.getNodeTS(node));
  });
  TS.collapseTSPoints(all_ts);
  var gr_ts=TS.groupTS(all_ts, dt => {
    return (dt.getMonth() + 1).toString().padStart(2, "0") + "-" + dt.getFullYear().toString().substring(2);
  });
  TS.averageTS(gr_ts);

  // 2> Get the list of all the roles
  var roles=[];
  for(const period in gr_ts) {
    gr_ts[period].points.forEach(point => {
      for(const rol in point) {
        if ( !roles.includes(rol) ) roles.push(rol);
      }
    });
  }

  // 3> Build the list
  var list=[];
  roles.forEach(rol => {
    var row={'Rol' : rol};
    for(const period in gr_ts) {
      var item=gr_ts[period];

      row[period]=''
      if ( item.max[rol] ) row[period] += 'Max : ' + formatString(item.max[rol]) + "<br/>";
      if ( item.min[rol] ) row[period] += 'Min : ' + formatString(item.min[rol]) + "<br/>";
      if ( item.avg[rol] ) row[period] += 'Avg : ' + formatString(item.avg[rol]);
    }
    list.push(row);
  });

  // 4> Get need to get an ordered and continuous list of periods.
  // In fr_ts the keys are the periods but:
  // - The are not ordered
  // - The can not be compelte (if in a period there are no FTEs, it will not appear)
  var start_date=null;
  var end_date=null;
  for(const period in gr_ts) {
    var dates=getDatesInGroup(period);
    if ( !start_date || dates.start < start_date) start_date=dates.start;
    if ( !end_date   || dates.end   > end_date  ) end_date=dates.end;
  }
  const period_names=getGroupListElements(DateUtils.getListDates(start_date, end_date), getKeyDate);

  return {
    'headers' : ['Rol', ...period_names],
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

/**
 * Return a list of simple nodes children of a certain node.
 */
function get_simple_nodes(jstree, root) {
  var list=[];

  walk_tree(jstree, node => {
    if ( !node.data.isComposed ) list.push(node);
  }, root);

  return list;
}
