import { walk_tree } from './exports.js';
import * as DateUtils from './dates.js';

document.addEventListener("custom.planning.refresh", function (evt) {
  buildPlanning(evt.detail.ePlanning, evt.detail.jstree);
  buildGantt(evt.detail.eGantt, evt.detail.jstree);
});

/**
 * Used to group the dates (by month-year)
 */ 
function getKeyDate(dt) {
  return (dt.getMonth() + 1).toString().padStart(2, "0") + "-" + dt.getFullYear().toString().substring(2);
}

// ----------------------------------------------------------------------- Gantt
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
        var eCell=document.createElement('div');
        eRow.appendChild(eCell);

        if ( item.periods[name] ) {
          eCell.classList.add("busy");
          eCell.classList.add("level_" + item.level);
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
        'periods' : DateUtils.groupByMonth(DateUtils.getListDates(my_start, my_end), getKeyDate)
      });
    }
  });

  var headers=['Task', ...DateUtils.getListPeriods(DateUtils.getListDates(start_date, end_date), getKeyDate)];

  return {
    'headers' : headers,
    'list'    : list
  }
}

// -------------------------------------------------------------------- Planning
function buildPlanning(eTable, jstree) {
  removeChildren(eTable);
  const planning=getPlanning(jstree);

  var eHeader=document.createElement('div');
  eTable.appendChild(eHeader);
  planning.headers.forEach(name => {
    var eCell=document.createElement('div');
    eCell.innerHTML=name;
    eHeader.appendChild(eCell);
  });

  planning.list.forEach(item => {
    var eRow=document.createElement('div');
    eTable.appendChild(eRow);

    var eCell=document.createElement('div');
    eCell.innerHTML=item['Rol'];
    eRow.appendChild(eCell);
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
  var ftes_rol_period={};
  var start_date=null;
  var end_date=null;
  walk_tree(jstree, node => {
    if ( !node.data.isComposed ) {
      if ( node.data.start_date && node.data.end_date ) {
        const my_start=DateUtils.str2Date(node.data.start_date);
        const my_end=DateUtils.str2Date(node.data.end_date);
        log_low_debug("my_start: " + my_start);
        log_low_debug("my_end: " + my_end);
        if ( !start_date || my_start<start_date) {
          start_date=my_start;
        }
        if ( !end_date || my_end>end_date) end_date=my_end;
        log_low_debug("start_date: " + start_date);
        log_low_debug("end_date:   " + end_date);
        const periods=DateUtils.groupByMonth(DateUtils.getListDates(my_start, my_end), getKeyDate);
        var total_days=0;
        for(const k in periods) {
          total_days += periods[k].length;
        }

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
  log_low_debug("start_date : " + start_date);
  log_low_debug("end_date : " + end_date);

  const period_names=Object.keys(DateUtils.groupByMonth(DateUtils.getListDates(start_date, end_date), getKeyDate)).sort();
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
