/**
 * Utilities to manage "timeseries"
 * A timeserie is a dictionary of
 * {
 *   <key> : {
 *     date : Date objet
 *     <attr1> : [ { object } },
 *     <attr2> : [ { object } }
 *     ...
 *   }
 *  }
 *  where:
 *  - key usually represents a date (as dd/mm/yyyy) or a grpup (as mm-yyyy)
 *  - attrX : is a list of "points", that represerts infor as ftes, costs ... and every
 *    point is an onbject that in this case is a map { <rol> : <value> } where the value 
 *    depends on the attribute (eg. if the attribute is ftes represnets the ftes for that rol)
 */

import * as DateUtils from '../lib/dates.js';
import { cloneJSON } from '../lib/utils.js';
import { updateMap, getCostsByCenter } from './estimations.js';

/**
 * Return a TS from a node that represents a task:
 * - key : the dd/mm/yyyy in the range start / end of that task
 * - attributes:
 *   + ftes : the FTEs for every rol (and for that day)
 *   + costs : the cost for that rol (and for that day)
 */
export function getNodeTS(node, map_roles) {
  var data={};

  if ( node.data?.start_date && node.data?.end_date ) {
    const costs_by_rol=getCostsByCenter(map_roles, node.data.center_costs)
    // The working days
    var list_days=DateUtils.getListDates(DateUtils.str2Date(node.data.start_date), DateUtils.str2Date(node.data.end_date), dt => {
      return !DateUtils.isWeekend(dt);
    });
    var num_days=list_days.length;

    // Compute the FTEs
    // TODO: it is a linear distribution but we could have other algorithms as fex. taking
    // into account holidays, summer, ...
    var ftes={};
    var costs={};
    for(const k in node.data.md) {
      ftes[k]  = node.data.md[k]/num_days;
      costs[k] = ftes[k]*8.0*costs_by_rol[k];
    }

    // Finally, create all the elements for that TS, one for every day
    list_days.forEach(dt => {
      const s_date=DateUtils.date2Str(dt);
      data[s_date] = {
        date : dt,
        ftes  : [ cloneJSON(ftes)],
        costs : [ cloneJSON(costs)]
      }
    });
  }

  return data;
}

/**
 * Add the points from t2's attributes as points in t1
 */
export function extendsTSAttributes(t1, t2) {
  const attrs=getAttributes(t2);

  for (const key in t2) {
    if ( !t1[key] ) {
      t1[key]={
        date : t2[key].date
      }
      attrs.forEach(attr => {
        t1[key][attr]=[];
      });
    }

    // Add all the points for all the attributes
    attrs.forEach(attr => {
      // That could be an extends of one array with another but ...
      // TODO :do we have to use clone .... if we do not use it
      // if something is changed in t2 the data is altered...
      t2[key][attr].forEach( item => {
        t1[key][attr].push(cloneJSON(item));
      });
    });
  }
}

/**
 * Group all the points using fUpd for a certain attribute in a single one
 * creating a unique poing.
 * If fUpd is not set, the points are added
 * TODO : other collapse functions could be possible.
 * => rename as groupTSAttributeValues()
 */
export function groupTSAttributeValues(ts, attr, fUpd) {
  addNewTSAttribute(ts, attr, attr, points => {
    return [updateMap({}, points, fUpd)];
  });
}

/**
 * Calculate:
 * - Maximum value
 * - Minimums value
 * - Average value
 * among the points.
 * TODO: use addNewTSAttribute, so those values become new attributes (now they are objects instead list-of-points)
 * FIXME: avg is not calculated ok because I divide the FTEs for any rol
 * by the same ror:points when this is not true, becuase maybe some points
 * have some roles and other not.
 */
export function averageTS(ts) {
  for(const period in ts) {
    var item=ts[period];

    // We're going to create those new values
    item['max']={};
    item['min']={};
    // item['avg']={};
    var tot_points=item.ftes.length;
    item.ftes.forEach(point => {
      for(const k in point) {
        if ( !item['max'][k] || point[k]>item['max'][k]) item['max'][k]=point[k];
        if ( !item['min'][k] || point[k]<item['min'][k]) item['min'][k]=point[k];

        //if ( !item['avg'][k] ) item['avg'][k]=0;
        //item['avg'][k] += point[k]/tot_points;
      }
    });
  }
}

/**
 * Using the points for a certain attribute and an fUpd, create a new 
 * serie of points for a new attribute.
 * In fact, averageTS and groupTSAttribuetValues are special casa of this method.
 */
export function addNewTSAttribute(ts, src_attr, new_attr,  fNewData) {
  for(const key in ts) {
    var item=ts[key];

    item[new_attr]=fNewData(item[src_attr]);
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
 * TODO: rename as groupTSKeys()
 */
export function groupTSKey(ts, fKey) {
  var groupTS={};

  const attrs=getAttributes(ts);
  for (const k in ts) {
    var key=fKey(ts[k].date);
    if ( !groupTS[key] ) {
      groupTS[key]={
        date : null
      }
      attrs.forEach(attr => {
        groupTS[key][attr]=[];
      });
    }

    // Add all the points for all the attributes
    attrs.forEach(attr => {
      ts[k][attr].forEach( item => {
        groupTS[key][attr].push(cloneJSON(item));
      });
    });
  }

  return groupTS;
}


// ----------------------------------------------------------- Private Functions
/**
 * Let's suppose is an homogeneous TS, so all the elements have all the 
 * attributes and as attribute we only consideer [].
 */
function getAttributes(ts) {
  var attrs=[];

  const one_ele=ts[Object.keys(ts)[0]];
  for(const prop in one_ele) {
    if ( Array.isArray(one_ele[prop]) ) {
      attrs.push(prop);
    }
  }

  return attrs;
}
