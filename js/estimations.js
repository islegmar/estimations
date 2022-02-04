// =============================================================================
// Estimations
//
// We manage several data strcutures:
// - d_flat:
//   - d_flat_original
//   - d_flat_normalized
//   - d_flat_estimated
// - d_tree
//
// [d_flat_original] we get from the server has a very simple structure that is 
// easy to maintain manually. For example:
// - It is flat, it is just a dictionary where every key is the name of a task 
//   and its contents is all the data, including estimations od the child activities
//
// [d_flat_normalized] TBD
//
// [d_flat_estimated] 
// - The 'effort' is kept as simple as possible but later has to be "expanded" in the 
//   real numbers with the all the MD: For example an activiby can be something like
//   + duration : 10d
//   + BE : 2
//   + FE : 0.5
//   and that will be expanded (taking into account the duration, the type of task...) in (all
//   the nunbers are MD):
//   + BE : 20 => 2xBE during 10 days
//   + FE : 5  => 0.5xFE during 10 days
//   + QA : 10 => 40% of development 20+5
//   + TL : 5  => 0.5xTL during 10 days
//   + .....
//
// [d_tree]  Based on that data we build tree_data that is for convenience a tree stucture that 
// can be used for be shown in tree.
// NOTE : here we could have decided to build a GENERIC tree_data independent of the 
//        tool used to render it and convert this one to the one used byt the tool but ....
//        I'm lazy so the tree_data has already the struct needed by the tool used to dender it :-(
//
// =============================================================================

// ------------------------------------------------------------------- flat_data

/**
 * Return flat_data with all their items normalized
 */
function getFlatDataNormalized(data, roles, type_activities, config) {
  var new_data={};
  for (const key in data ) {
    new_data[key] = getFlatItemNormalized(data[key], roles, type_activities, config);
  }

  return new_data;
}
/**
 * Normalize one of the items in flat data.
 * Once notmalized:
 * - If it is Composed it would have "tasks" as an array of {}
 * - If it is Simple,it will have the field "effort" with the values in MD
 */
function getFlatItemNormalized(item, roles, type_activities, config) {
  var data = cloneJSON(item);

  // Check the data we're going to check does not have some of the 
  // reserved keys that wew're going to use now
  const reserved_keys = [ "effort", "original", "md" ];
  reserved_keys.forEach( key => {
    if ( data.hasOwnProperty(key) ) {
      throw new Error ("Item '" + JSON.stringify(data) + "' contains the reserved key '" +key + "'");
    }
  });
  data.original = cloneJSON(item);
  // This is a field that will be calculated every time that the tree is refreshed
  // the tree and it is the number of MD of the activity:
  // - Composed tasks : sum of the MDs of all their tasks
  // - Simple   tasks : the same as the effort except the weight factor

  // Composed : tasks
  if ( data.hasOwnProperty("tasks") ) {
    var tasks_normalized=[];
    data.tasks.forEach(item => {
      var my_item=typeof item==="string" ? {"name":item} : cloneJSON(item);
      // Set some default values
      if ( !item.hasOwnProperty("weight") ) {
        my_item.weight=1.0;
      }
      tasks_normalized.push(my_item);
    });

    data.tasks=tasks_normalized;
  // Simple : estimations
  // create a key "effort" : {} that will contain all the 
  // data needed to compute the effort
  // - The value for all the roles
  // - The field type
  // In fact we say eveything is effort except those fields
  } else {
    // notes with contain the "rational calculation" for the MD so instead 
    // the "cold number" of MD per rol we understand where those values come from
    var notes="";

    // 1> Keep in effort all the roles used in this task with their values as they 
    // are defined
    var effort={};
    for (const rol in roles ) {
      if ( data.hasOwnProperty(rol) ) {
        effort[rol]=data[rol];
        delete data[rol];
      }
    }

    // Following attributes are used in the calculations
    // - type
    // - duration
    // - size
    var type_activity = data.hasOwnProperty("type") ? data.type : null;
    const duration = data.hasOwnProperty("duration") ? data.duration : null;
    const size = data.hasOwnProperty("size") ? data.size : null;

    // 2> Initial calculation of the MD
    // duration : the values is the factor
    if ( duration ) {
      notes += duration + " days of ";
      var my_notes=[];
      for ( const rol in effort) {
        my_notes.push(effort[rol] + "x" + rol);
        effort[rol] *= duration;
      }
      notes += my_notes.join(" + ");
    // Working size sizes, instead of "time!
    } else if ( size ) {
      // Usually in type we have the name of the squad EXCEPT
      // if we have defined one squad by default
      if ( !data.hasOwnProperty("team") && config.default_squad ) {
        type_activity=config.default_squad;
      }
      // Do nothing in this first phase
      // The calculation will be done later
    // the values is directly the effort
    } else {
      var my_notes=[];
      for ( const rol in effort) {
        my_notes.push(effort[rol] + "MD " + rol);
      }
      notes += my_notes.join(" + ");
    }

    // 3> If the activity has a type, further calculation
    if ( type_activity ) {
      if ( type_activities.hasOwnProperty(type_activity) ) {
        const type_cfg=type_activities[type_activity];
        const calculation=type_cfg["calculation"];
        if ( calculation==="percentage" ) {
          notes += " + ";
          // Get base value...
          var base=0.0;
          type_cfg.base.forEach(k => {
            base += effort[k];
          });
          // notes += base + " of " + cfg.base.join("+") + " => ";

          // Compute the derived base on that value
          var my_notes=[];
          for (const k in type_cfg.derived) {
            effort[k]=base*type_cfg.derived[k];
            my_notes.push(type_cfg.derived[k]*100.0 + "% " + k);
          }
          notes += my_notes.join(" + ");
        } else if ( calculation==="squad" ) {
          const size_cfg=config.sizes[size];

          notes += "[" + size + "] " + size_cfg.duration + " days of ";

          var my_notes=[];
          for(const rol in type_cfg.roles ) {
            effort[rol] = size_cfg.duration * type_cfg.roles[rol];
            my_notes.push(type_cfg.roles[rol] + "x" + rol);
          }
          notes += my_notes.join(" + ");
        } else if ( calculation==="formula" ) {
          type_cfg.derived.forEach(entry => {
            for(const new_rol in entry) {
              var expr=entry[new_rol];
              log("[formula] " + new_rol + " : (1) " + expr + " (item:" + JSON.stringify(item) + ")");
              notes += " => " + new_rol + " = " + expr;
              for (const existing_rol in effort) {
                expr=expr.replaceAll("{" + existing_rol + "}", effort[existing_rol]);
                // expr=expr.replaceAll("{" + existing_rol + "}", effort[existing_rol] * roles[existing_rol].cost );
              }
              log("[formula] " + new_rol + " : (2) " + expr + " (item:" + JSON.stringify(item) + ")");
              // notes += "=" + expr;
              effort[new_rol] = eval(expr);
            }
          });
        } else {
          alert("Unknown task type '" + type_activity + "' in '" + JSON.stringify(effort) + "'");
        }
        notes += " (" + type_activity + ")";
      } else {
        throw new Error("Unknown type of effort '" + type_activity +"' in " + JSON.stringify(effort));
      }
    } else {
      notes += " (pure effort)";
    }

    // Ok after all this long piece of code we have
    // - effort that is a map with the roles and the MD
    // - notes that explain how we get the result
    data.effort = effort;
    if ( data.hasOwnProperty("notes") ) {
      data.notes = notes + " - " + data.notes;
    } else {
      data.notes = notes;
    }
  }

  return data;
}

/**
 * Compute the md using the effort
 * In this case we will calculate ONLY for the leaf nodes becuase the 
 * acummulated will be computed when showing the tree 
 */
function setMD(d_flat_data, roles, type_activities, config) {
  for(const activity in d_flat_data) {
    var data = d_flat_data[activity];
    if ( !data.hasOwnProperty("tasks") ) {
      const md_notes=computeMD(data.effort, roles, type_activities, config);
      data.md=md_notes.md;
      if ( !data.notes ) {
        data.notes="";
      }
      data.notes+=md_notes.notes;
    }
  }
}


/**
 * Return a tree structure.
 * TODO : sure it can do it better but ...
 */ 
function getRootNodes(d_flat) {
  var roots=[];

  // Get all the tasks referenced as a child
  var all_tasks=[];
  for (const activity in d_flat) {
    var my_d_flat=d_flat[activity];
    if ( d_flat[activity].hasOwnProperty("tasks") ) {
      d_flat[activity]["tasks"].forEach(item => {
        all_tasks.push(item["name"]);
      });
    } else {
      all_tasks.push(activity);
    }
  }

  // Search the one that is NOT referenced => they are the roots
  for (const activity in d_flat) {
    if ( !all_tasks.includes(activity) ) {
      roots.push(activity);
    }
  }

  return roots;
}

// ------------------------------------------------------------------- tree_data
// All the methods can be found in js/html/treeTasks.js

// ------------------------------------------------------------------- list_data
/**
 * Given the struct with the estimations, return it as a list to be displayed.
 */
function getEffortAsList(data) {
  removeCommentsFromJSON(data);
  setEfforts(data);

  var list = [];
  for (const activity in data) {
    var my_data=data[activity];
    my_data["Activity"] = activity;
    for(const rol in data[activity]["effort"]) {
      my_data[rol] = data[activity]["effort"][rol];
    }
    if ( data[activity].hasOwnProperty("tasks") ) {
      my_data["tasks"] = data[activity]["tasks"].join(",");
    }
    list.push(my_data);
  }

  return list;
}


// ---- Utilities
/**
 * Utility : given 2 efforts, each of them representing the effort for different roles, 
 * return the sum of both.
 */
function sumEffort(eff1, eff2, weight) {
  const ret = cloneJSON(eff1);

  for (const k in eff2 ) {
    if ( !(ret.hasOwnProperty(k)) ){
      ret[k]=0.0;
    }
    ret[k]+=eff2[k]*weight;
  }

  return ret;
}

function getCost(mds, roles) {
  var cost=0.0;
  for(var rol in mds ) {
    if ( roles.hasOwnProperty(rol) ) {
      cost += mds[rol] * 8.0 * roles[rol]["cost"];
    }
  }

  return cost;
}
