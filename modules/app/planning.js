import * as DateUtils from '../lib/dates.js';
import { getKeyMonthYear as getKeyDate, getDatesInGroupMonthYear as getDatesInGroup } from '../lib/dates.js';
import * as Log from '../lib/log.js';
import { removeChildren, groupListElements, getGroupListElements, formatString, formatterCost} from '../lib/utils.js';

import { walk_tree } from './exports.js';
import { showGraphics } from './graphics.js';
import * as TS  from './timeseries.js';

document.addEventListener("custom.planning.refresh", function (evt) {
  const eContainer=evt.detail.container;
  buildGantt(eContainer.querySelector('#gantt'), evt.detail.jstree, evt.detail.map_roles);
});

// ----------------------------------------------------------------------- Gantt
/**
 * Build the table with the Gantt that contains all the tasks / periods.
 * If a Task is clicable, a detail view for the FTEs for that task is shown
 */
function buildGantt(eTable, jstree, map_roles) {
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
    eCell.classList.add("busy");
    eCell.classList.add("level_" + item.level);
    eCell.classList.add("clicable");
    eCell.addEventListener('click', buildPlanning.bind(this, document.querySelector("#detail_task_by_rol"), jstree, item.node, map_roles), false);
    eRow.appendChild(eCell);

    gantt.headers.forEach(name => {
      if ( name !== 'Task' ) {
        var period_name=name;

        var eCell=document.createElement('div');
        eRow.appendChild(eCell);

        var eSpan=document.createElement('span');
        eCell.appendChild(eSpan);

        if ( item.periods && item.periods[period_name] ) {
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
    var info={
      'name'  : node.text,
      'level' : level,
      'node'  : node
    };
    if ( node.data.start_date && node.data.end_date ) {
      const my_start=DateUtils.str2Date(node.data.start_date);
      const my_end=DateUtils.str2Date(node.data.end_date);

      if ( !start_date || my_start<start_date) start_date=my_start;
      if ( !end_date || my_end>end_date) end_date=my_end;

      info['periods'] = groupListElements(DateUtils.getListDates(my_start, my_end), getKeyDate)
    }
    list.push(info);
  });

  const period_names=getGroupListElements(DateUtils.getListDates(start_date, end_date), getKeyDate);
  var headers=['Task', ...period_names];

  return {
    'headers' : headers,
    'list'    : list
  }
}

// -------------------------------------------------------------------- Planning
// TODO: change the name, this is confusing.
// Here we show, given a Task, the detail FTEs for the different periods
function buildPlanning(eContainer, jstree, node, map_roles) {
  showGraphics(jstree, node, map_roles);

  eContainer.querySelector('.header').innerHTML = node.text;

  var eTable=eContainer.querySelector('.content');

  removeChildren(eTable);
  const planning=getPlanning(jstree, node, map_roles);

  // Header: Rol + Periods
  var eHeader=document.createElement('div');
  eTable.appendChild(eHeader);
  planning.headers.forEach(name => {
    var eCell=document.createElement('div');
    eCell.innerHTML=name;
    eCell.classList.add('clicable');
    eHeader.appendChild(eCell);
  });

  planning.list.forEach(item => {
    var eRow=document.createElement('div');
    eTable.appendChild(eRow);

    var eCell=document.createElement('div');
    eCell.innerHTML=item['Rol'];
    eCell.classList.add('clicable');
    eRow.appendChild(eCell);

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
export function getPlanning(jstree, root, map_roles) {
  // 1> For the root node (project)
  // all_ts:
  // - key : dd/mm/yyyy
  // - attributes :
  //   + ftes : several points, every point is the FTE required by one task (node)
  //   + costs : several points, every point is the Cost associated by one task (node)
  var all_ts={};
  get_simple_nodes(jstree, root).forEach(node => {
    TS.extendsTSAttributes(all_ts, TS.getNodeTS(node, map_roles));
  });
  // Grouping the attributes' values mean sum, so now we have:
  // - key : dd/mm/yyyy
  // - attributes :
  //   + ftes : one point, with the sum => total FTEs for that day
  //   + costs : one point, with the sum => total Cost for that day
  TS.groupTSAttributeValues(all_ts, 'ftes');
  TS.groupTSAttributeValues(all_ts, 'costs');
  // Grouping the keys:
  // - key : mm-yyyy
  // - attributes :
  //   + ftes : several points, each of them the total FTEs for a single day
  //   + costs : several points, each of them the total cost for a single day
  // NOTE: while suming the points representing the costs has sense (I will get the total
  // cost for that period), it is not the same with the FTEs
  var gr_ts=TS.groupTSKey(all_ts, s_dt => {
    var dt=DateUtils.str2Date(s_dt);
    return (dt.getMonth() + 1).toString().padStart(2, "0") + "-" + dt.getFullYear().toString().substring(2);
  });
  // Add new "attributes"
  // - min : min FTEs for every rol in that period
  // - max : max FTEs for every rol in that period
  // - avg : avg FTEs for every rol in that period
  // TODO: that probably will be changed in the future. I put "attributes" because now those new 
  // values are {} instead [{}] as it is with the attributes.
  TS.averageTS(gr_ts, 'ftes');
  // Sum again the costs, so now 
  // - costs : single point with the sum of the costs => total cost by rol during that period
  TS.groupTSAttributeValues(gr_ts, 'costs');
  // Add a new attribute with the total cost per period, summing the costs for every rol
  for(const period in gr_ts) {
    gr_ts[period].costs.forEach(item => {
      var tot=0;
      for(const rol in item) {
        tot+=item[rol];
      }
      item['Total']=tot;
    });
  }

  // 2> Get the list of all the roles
  var roles=[];
  for(const period in gr_ts) {
    gr_ts[period].ftes.forEach(point => {
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
      if ( item.ftes_max[0][rol] )   row[period] += 'Max : '  + formatString(item.ftes_max[0][rol]) + "<br/>";
      if ( item.ftes_min[0][rol] )   row[period] += 'Min : '  + formatString(item.ftes_min[0][rol]) + "<br/>";
      if ( item.ftes_avg[0][rol] )   row[period] += 'Avg : '  + formatString(item.ftes_avg[0][rol]) + "<br/>";
      if ( item.costs[0][rol] ) row[period] += formatString(item.costs[0][rol], formatterCost);
    }
    list.push(row);
  });
  // Add a list row with the totals
  var totals={'Rol' : 'Totals'};
  for(const period in gr_ts) {
    totals[period]=0;
    gr_ts[period].costs.forEach(item => {
      totals[period]+=item['Total'];
    });
    totals[period] = formatString(totals[period], formatterCost);
  }
  list.push(totals);

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

// ---------------------------------------------------------- Internal Functions

/**
 * Given a task (node), show the FTE's info for the different roles.
 */
function periodshowDetailTaskByRol(eContainer, jstree, node) {
  eContainer.querySelector(".header").innerHTML=rol;

  var eTable=eContainer.querySelector(".content");
  removeChildren(eTable);

}

/**
 * Return a list of simple nodes children of a certain node.
 */
export function get_simple_nodes(jstree, root) {
  var list=[];

  walk_tree(jstree, node => {
    if ( !node.data.isComposed ) list.push(node);
  }, root);

  return list;
}


