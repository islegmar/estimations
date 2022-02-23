import * as DateUtils from '../lib/dates.js';
import * as Log from '../lib/log.js';

import { walk_tree } from './exports.js';
import { get_simple_nodes } from './planning.js';
import * as TS  from './timeseries.js';

const COLORS=['blue', 'red', 'green', 'cyan', 'yellow', 'orange'];

export function showGraphics(jstree, root, map_roles) {
  // graphic_ftes_roles_per_day("chart_ftes_daily", jstree, root);
  graphic_ftes_roles_per_period("chart_ftes_period", jstree, root, map_roles);
  graphic_costs("chart_costs", jstree, root, map_roles);
}

// -------------------------------------------------------------------- Graphics
function graphic_ftes_roles_per_day(name, jstree, root) {
  var data=get_dataset_roles_ftes_by_day(jstree, root);

  var xValues = [];
  data.dates.forEach(dt => {
    xValues.push(DateUtils.date2Str(dt));
  });
  var datasets=data.datasets;

  graphic_multi_line(name, xValues, datasets, root.text, 'Dates (no weekend)', 'FTEs');
}

function graphic_ftes_roles_per_period(name, jstree, root, map_roles) {
  var data=get_dataset_roles_ftes_by_period(jstree, root, map_roles);

  var xValues = data.dates;
  var datasets=data.datasets;

  graphic_multi_line(name, xValues, datasets, root.text, 'Months', 'FTEs (average)');
}

function graphic_costs(name, jstree, root, map_roles) {
  var data=get_dataset_costs(jstree, root, map_roles);

  var xValues = data.dates;
  var datasets=data.datasets;

  graphic_multi_line(name, xValues, datasets, root.text, 'Months', 'Costs (€)');
}

function graphic_multi_line(name, xValues, datasets, title, x_label, y_label) {

  // Build the graphic
  new Chart(name, {
    type: "line",
    data: {
      labels: xValues,
      datasets: datasets
    },
    options: {
      bezierCurve: false,
      title : {
        display: true,
        'text' : title
      },
      scales: {
        xAxes: [{
          display: true,
          scaleLabel: {
            display: true,
            labelString: x_label
          }
        }],
        yAxes: [{
          display: true,
          scaleLabel: {
            display: true,
            labelString: y_label
          },
          ticks : {
            min:0
          }
        }]
      },
      legend: {
        display: true,
        labels : {
          useLineStyle:true
        }
      }
    }
  });
}
// -------------------------------------------------------------------- Datasets
/**
 * Dataset = [ Points per Rol ]
 * PointsPerRol = ( Day, FTEs for that Rol and Day )
 */
function get_dataset_roles_ftes_by_day(jstree, root) {
  // 1> For the root node (project)
  // - Get all the Simple Tasks
  // - For every day, sum the FTEs for every rol for all the tasks
  var all_ts={};
  get_simple_nodes(jstree, root).forEach(node => {
    TS.extendsTSAttributes(all_ts, TS.getNodeTS(node));
  });
  TS.groupTSAttributeValues(all_ts, 'ftes');

  // all_ts contains for every day all the FTEs per rol, that are the points we want to show
  // We want to get the date range so all the days are shown.
  const date_limits=getMinMaxDates(Object.keys(all_ts));
  const dates_in_graphic=DateUtils.getListDates(date_limits.min, date_limits.max, dt => {
    return !DateUtils.isWeekend(dt);
  });

  // Now the points that are the FTEs per rol and day
  // Our dataset (number of lines) will consist in all the roles.
  var datasets={};
  for(const period in all_ts) {
    all_ts[period].ftes.forEach(point => {
      for(const rol in point) {
        if ( !datasets[rol] ) {
          datasets[rol]={
            data:[],
            borderColor:COLORS[Object.keys(datasets).length % COLORS.length],
            fill:false,
            label:rol,
            lineTension:0
          };
        }
      }
    });
  }
  var all_roles=Object.keys(datasets);

  // Now get the points
  dates_in_graphic.forEach(dt => {
    const s_dt=DateUtils.date2Str(dt);
    all_roles.forEach(rol => {
      const value = all_ts[s_dt] && all_ts[s_dt].ftes[0][rol] ? all_ts[s_dt].ftes[0][rol] : 0;
      if (all_ts[s_dt]) {
        console.log(">>> s_dt : " + s_dt);
        console.log(">>> rol : " + rol);
        console.log(">>> points : " + JSON.stringify(all_ts[s_dt].ftes[0]));
        console.log(">>> points : " + JSON.stringify(all_ts[s_dt].ftes[0][rol]));
        console.log(">>> value : " + value);
      }

      datasets[rol].data.push(value);
    });
  });
  console.log(JSON.stringify(datasets, null,2));

  return {
    'dates'    : dates_in_graphic,
    'datasets' : Object.values(datasets)
  }
}

/**
 * Dataset = [ Points per Rol ]
 * PointsPerRol = ( Day, FTEs for that Rol and Day )
 */
function get_dataset_roles_ftes_by_period(jstree, root, map_roles) {
  // All FTEs all the tasks
  var all_ts={};
  get_simple_nodes(jstree, root).forEach(node => {
    TS.extendsTSAttributes(all_ts, TS.getNodeTS(node, map_roles));
  });
  // Sum per day
  TS.groupTSAttributeValues(all_ts, 'ftes');
  // Group by period
  var gr_ts=TS.groupTSKey(all_ts, s_dt => {
    return DateUtils.getKeyMonthYear(DateUtils.str2Date(s_dt));
  });
  // Average them
  TS.averageTS(gr_ts, 'ftes');

  const periods=DateUtils.sortPeriodsMonthYear(Object.keys(gr_ts));
  const roles=TS.getValueNames(gr_ts);

  // Now the points that are the FTEs per rol and period
  // Our dataset (number of lines) will consist in all the roles.
  var datasets={};
  periods.forEach(period => {
    roles.forEach(rol => {
      if ( !datasets[rol] ) {
        datasets[rol]={
          data:[],
          borderColor:COLORS[Object.keys(datasets).length % COLORS.length],
          fill:false,
          label:rol,
          lineTension:0
        };
      }
      const value = gr_ts[period] && gr_ts[period].ftes_avg[0].hasOwnProperty(rol) ? gr_ts[period].ftes_avg[0][rol] : 0;
      datasets[rol].data.push(value);
    });
  });

  return {
    'dates'    : periods,
    'datasets' : Object.values(datasets)
  }
}

function get_dataset_costs(jstree, root, map_roles) {
  // All FTEs all the tasks
  var all_ts={};
  get_simple_nodes(jstree, root).forEach(node => {
    TS.extendsTSAttributes(all_ts, TS.getNodeTS(node, map_roles));
  });
  // Sum per day
  TS.groupTSAttributeValues(all_ts, 'ftes');
  // Group by period
  var gr_ts=TS.groupTSKey(all_ts, s_dt => {
    return DateUtils.getKeyMonthYear(DateUtils.str2Date(s_dt));
  });
  // Sum the costs per period
  TS.groupTSAttributeValues(gr_ts, 'costs');

  const periods=DateUtils.sortPeriodsMonthYear(Object.keys(gr_ts));
  const roles=TS.getValueNames(gr_ts);

  // Now the points that are the FTEs per rol and period
  // Our dataset (number of lines) will consist in all the roles.
  var datasets={};
  var acum_costs={};
  // Acum Costs
  datasets['COST_TOTAL']={
    data:[],
    borderColor:COLORS[Object.keys(datasets).length % COLORS.length],
    fill:false,
    label:'Total Cost',
    lineTension:0
  };
  datasets['COST_PERIOD']={
    data:[],
    borderColor:COLORS[Object.keys(datasets).length % COLORS.length],
    fill:false,
    label:'Cost by period',
    lineTension:0
  };
  var tot_cost=0;
  periods.forEach(period => {
    var tot_cost_period=0;
    roles.forEach(rol => {
      const value = gr_ts[period] && gr_ts[period].costs[0].hasOwnProperty(rol) ? gr_ts[period].costs[0][rol] : 0;
      /*
      if ( !datasets[rol] ) {
        datasets[rol]={
          data:[],
          borderColor:COLORS[Object.keys(datasets).length % COLORS.length],
          fill:false,
          label:rol,
          lineTension:0
        };
      }
      datasets[rol].data.push(value);
      */
      tot_cost += value;
      tot_cost_period += value;
    });
    datasets['COST_PERIOD'].data.push(tot_cost_period);
    datasets['COST_TOTAL'].data.push(tot_cost);
  });

  return {
    'dates'    : periods,
    'datasets' : Object.values(datasets)
  }
}

// --------------------------------------------------------- Internanl Functions 
function getMinMaxDates(list_str_dates) {
  var min=null;
  var max=null;
  list_str_dates.forEach(s_dt => {
    const dt=DateUtils.str2Date(s_dt);
    if ( !min || dt < min ) min=dt;
    if ( !max || dt > max ) max=dt;
  });

  return {
    min : min,
    max : max
  };
}
