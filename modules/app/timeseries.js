/**
 * Utilities to manage "timeseries"
 * A timeserie is a dictionary of
 * {
 *   <dd/mm/yy> : {
 *     date : Date objet
 *     points : [ { map key values} }
 *   }
 *  }
 */

import * as DateUtils from '../lib/dates.js';
import { cloneJSON } from '../lib/utils.js';
import { updateMap } from './estimations.js';

/**
 * Given a node with start / end / MDs return a timeserie where points
 * will contain a unique element with the FTEs for every rol for that day.
 * The FTEs in the MDs divided by the number of workind days in that period
 */
export function getNodeTS(node) {
  var data={};

  if ( node.data?.start_date && node.data?.end_date ) {
    // The working days
    var list_days=DateUtils.getListDates(DateUtils.str2Date(node.data.start_date), DateUtils.str2Date(node.data.end_date), dt => {
      return !DateUtils.isWeekend(dt);
    });
    var num_days=list_days.length;

    // Compute the FTEs
    // TODO: it is a linear distribution but we could have other algorithms as fex. taking
    // into account holidays, summer, ...
    var ftes={};
    for(const k in node.data.md) {
      ftes[k]=node.data.md[k]/num_days;
    }

    // Finally, create all the elements for that TS, one for every day
    list_days.forEach(dt => {
      const s_date=DateUtils.date2Str(dt);
      data[s_date] = {
        date : dt,
        points : [ cloneJSON(ftes)]
      }
    });
  }

  return data;
}

/**
 * Add in t1 the timeserie t2
 */
export function extendsTS(t1, t2) {
  for (const k in t2) {
    if ( !t1[k] ) {
      t1[k]={
        date : t2[k].date,
        points : []
      }
    }

    //TODO :do we have to use clone .... if we do not use it
    //if something is changed in t2 the data is altered...
    t2[k].points.forEach( point => {
      t1[k].points.push(cloneJSON(point));
    });
  }
}

/**
 * Collapse all the points creating a unique point with the sum of all the values
 * TODO : other collapse functions could be possible.
 */
export function collapseTSPoints(ts) {
  for(const k in ts) {
    var acum={};
    ts[k].points.forEach( point => {
      updateMap(acum, point);
    });
    ts[k].points=[ acum ];
  }
}

/**
 * Group the ts in groups, creating a new TS 
 * {
 *   <group_key> : {
 *     date   : null, => not has sense, there are several dates
 *     points : []
 *   }
 * }
 * The other approach is o return something like:
 * {
 *   <group_key> : [ TS_ele, ... ]
 * }
 * where TS_ele is { date:...., points: .....}
 *
 * The difference between the two approaches:
 * - First is "more symetric", we get a new TS BUT we lose the info about the individual dates
 * - Second is the opposite, we don't lose info but is not so nice :-(
 *
 * Let's try the first one ....
 */
export function groupTS(ts, fKey) {
  var groupTS={};
  for(const k in ts) {
    var key=fKey(ts[k].date);
    if ( !groupTS[key] ) {
      groupTS[key] = {
        date : null,
        points : []
      };
    }
    ts[k].points.forEach(point => {
      groupTS[key].points.push(cloneJSON(point));
    });
  }

  return groupTS;
}

/**
 * Calculate:
 * - Maximum value
 * - Minimums value
 * - Average value
 * among the points.
 */
export function averageTS(ts) {
  for(const period in ts) {
    var item=ts[period];

    // We're going to create those new values
    item['max']={};
    item['min']={};
    item['avg']={};
    var tot_points=item.points.length;
    item.points.forEach(point => {
      for(const k in point) {
        if ( !item['max'][k] || point[k]>item['max'][k]) item['max'][k]=point[k];
        if ( !item['min'][k] || point[k]<item['min'][k]) item['min'][k]=point[k];

        if ( !item['avg'][k] ) item['avg'][k]=0;
        item['avg'][k] += point[k]/tot_points;
      }
    });
  }
}

