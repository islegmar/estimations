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
        'periods' : groupListElements(DateUtils.getListDates(my_start, my_end), getKeyDate)
      });
    }
  });

  const period_names=Object.keys(groupListElements(DateUtils.getListDates(start_date, end_date), getKeyDate)).sort();
  var headers=['Task', ...period_names];

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
  log_low_debug("start_date : " + start_date);
  log_low_debug("end_date : " + end_date);

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
