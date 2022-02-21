import * as DateUtils from '../lib/dates.js';
import * as Log from '../lib/log.js';

import { walk_tree } from './exports.js';
import { get_simple_nodes } from './planning.js';
import * as TS  from './timeseries.js';

const COLORS=['blue', 'red', 'green', 'cyan', 'yellow', 'orange'];

/*
https://stackoverflow.com/questions/27910719/in-chart-js-set-chart-title-name-of-x-axis-and-y-axis

Explore time scales. If using says something not implemented, maybe a plugin is required ...

 scales: {
   xAxes: [ {
     type: 'time',
     display: true,
     scaleLabel: {
       display: true,
       labelString: 'Date'
     },
     ticks: {
       major: {
         fontStyle: 'bold',
         fontColor: '#FF0000'
       }
     }
   }],
*/
export function showGraphics(jstree, root) {
  var data=get_dataset_roles_ftes_by_day(jstree, root);

  // X values
  var xValues = [];
  data.dates.forEach(dt => {
    xValues.push(DateUtils.date2Str(dt));
  });

  // Sets for the Y values
  var datasets=data.datasets;

  // Build the graphic
  new Chart("myChart", {
    type: "line",
    data: {
      labels: xValues,
      datasets: datasets
    },
    options: {
      title : {
        display: true,
        'text' : root.text
      },
      scales: {
        xAxes: [{
          display: true,
          scaleLabel: {
            display: true,
            labelString: 'Dates (no weekends)'
          }
        }],
        yAxes: [{
          display: true,
          scaleLabel: {
            display: true,
            labelString: 'FTEs'
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
    TS.extendsTS(all_ts, TS.getNodeTS(node));
  });
  TS.collapseTSPoints(all_ts);

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
    all_ts[period].points.forEach(point => {
      for(const rol in point) {
        if ( !datasets[rol] ) {
          datasets[rol]={
            data:[],
            borderColor:COLORS[Object.keys(datasets).length % COLORS.length],
            fill:false,
            label:rol
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
      if (all_ts[s_dt]) {
        console.log(">>> rol : " + rol);
        console.log(">>> points : " + JSON.stringify(all_ts[s_dt].points[0]));
        console.log(">>> points : " + JSON.stringify(all_ts[s_dt].points[0][rol]));
      }

      datasets[rol].data.push(all_ts[s_dt] && all_ts[s_dt].points[0][rol] ? all_ts[s_dt].points[0][rol] : 0);
    });
  });
  console.log(JSON.stringify(datasets, null,2));

  return {
    'dates'    : dates_in_graphic,
    'datasets' : Object.values(datasets)
  }
}

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
