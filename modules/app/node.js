import * as Log from '../lib/log.js';
import { getValue, daysHuman2Number, daysNumber2Human, round } from '../lib/utils.js';

import { getRootNodes, getCost, getCostsByCenter, sumMaps, updateMap, computeExpressionEffort, computeExpressionCost } from './estimations.js';
// ------------------------------------------------------------------- tree_data
// d_flat_data => templates_normalized

/**
 * Convert the flat data (templates) in a tree data that can be rendered.
 * @param root_node if specified we want to render only from the several roots
 */
export function getJsTreeData(d_flat_data, root_node) {
  const roots = root_node ? [ root_node ] : getRootNodes(d_flat_data);
  var treeData = [];
  roots.forEach(root => {
    treeData.push(getTreeNodeData(root, d_flat_data));
  });
  return treeData;
}

/** 
 * Returns the representation of a node in a tree structure, so it can be used
 * when rendering the tree, adiing the children nodes.
 */
export function getTreeNodeData(name, d_flat_data) {
  Log.log_is_low_debug() && Log.log_low_debug("getTreeNodeData(d_flat_data[" + name + "]: " + JSON.stringify(d_flat_data[name]) + ")");
  // data keeps all the info that will be shown in the tree for ecah row
  // data.notes es computed every time we refresh the tree, for this reason we leave it here empty
  const my_flat_data=d_flat_data[name];
  const isComposed = my_flat_data.hasOwnProperty("tasks");

  // TODO: fix the mess of duration
  var my_node={
    text : name, 
    name : name,
    data : {
      isComposed         : isComposed,
      // --- Data from the template, do not change
      // TIP : If they do not have template_ is becuase the value is never changed and they user like that
      duration_template  : getValue(my_flat_data, "duration", ""),
      notes_template     : getValue(my_flat_data, "notes", ""),
      assumptions        : getValue(my_flat_data, "assumptions", []).join(),
      effort             : getValue(my_flat_data, "effort", null),
      // --- Can be edited (usually using a form)
      // TIP : if they start with my_ is because the final value used is another and this one is used as base.
      // For example we can set the value my_start_date BUT at the end it will be used start_date
      description        : getValue(my_flat_data, "description", ""),
      my_duration        : null,
      my_cost_center     : getValue(my_flat_data, "cost_center"),
      my_start_date      : getValue(my_flat_data, "start_date"),
      my_end_date        : getValue(my_flat_data, "end_date"),
      my_weight          : getValue(my_flat_data, "weight", "1.0"),
      // --- Computed everytime the tree is refreshed 
      md                 : null,
      additional_columns : null,
      duration           : null,
      notes              : null,
      weight             : null,
      cost               : null,
      cost_center        : null,
      start_date         : null,
      end_date           : null,
      // if has_error==true can be the node itself or any of their
      // children has an error
      has_error          : false,
      error_msg          : null
    },
    state : {
      opened : true,
      checked : true
    }
  };

  // Add the children nodes
  if ( my_node.data.isComposed ) {
    my_node['children']=[];
    my_flat_data["tasks"].forEach(child_flat => {
      var child_node=getTreeNodeData(child_flat["name"], d_flat_data);

      // Ok, when we have build the node with the data from the template
      // from the parent node we have some info than now we can overwrite 
      // here with the most localized version

      if ( child_flat.hasOwnProperty("description") ) {
        child_node.data.description=child_flat.description;
      }
      child_node.data.my_weight=child_flat.weight;

      my_node.children.push(child_node);
    });
  }

  return my_node;
}

/**
 * Recursive methid, recalculate node data.
 */
export function recalculateNodeData(jstree, node, parent_node, roles, config) {
  Log.log_group_start("recalculateNodeData(" + node.text + ")");
  
  if ( Log.log_is_low_debug() ) {
    // Log.log_low_debug("recalculateNodeData(weight:" + weight +" , parent_duration:" + parent_duration + ", parent_cost_center : " + parent_cost_center + ")");
    Log.log_low_debug("node.data : " + JSON.stringify(node.data, null, 2));
  }

  // Attributes that recalculated every time
  // Can get the value from the parent
  node.data.cost_center = getValue(node.data, "my_cost_center", getValue(parent_node.data, "cost_center", null), true);
  node.data.start_date  = getValue(node.data, "my_start_date" , getValue(parent_node.data, "start_date" , null), true);
  node.data.end_date    = getValue(node.data, "my_end_date"   , getValue(parent_node.data, "end_date"   , null), true);
  node.data.weight      = parseFloat(getValue(node.data, "my_weight", "1.0")) * parseFloat(getValue(parent_node.data, "weight", "1.0"));

  // Attributes that are calculated 
  node.data.md                 = {};
  node.data.additional_columns = {};
  node.data.notes              = "";
  node.data.cost               = 0.0;
  node.data.has_error          = false;
  node.data.error_msg          = "";

  // The computation of the duration is a little but more complicated ...
  // We do NOT set a default value for duration because if its value is null 
  // has a meaning. For example if duration is inherit and the value is null that
  // means there is an error
  node.data.duration = null;
  if ( node.data.duration_template==="pending" ) {
    if ( node.data.my_duration ) {
      node.data.duration = daysHuman2Number(node.data.my_duration);
    } else {
      node.data.has_error = true;
      node.data.error_msg = "duration not set in node";
    }
  } else if ( node.data.duration_template==="inherit" ) {
    if ( parent_node.data.duration ) {
      node.data.duration = parent_node.data.duration;
    } else {
      node.data.has_error = true;
      node.data.error_msg = "Inherit duration and not set in parent";
    }
  } else {
    // Unless we have set an specific value for the duration, we get the one from the parent
    node.data.duration = daysHuman2Number(getValue(node.data, "my_duration", getValue(parent_node.data, "duration", null), true));
  }

  // COMPOSED node
  if ( node.data.isComposed ) {
    Log.log_low_debug("With nodes");
    node.children.forEach(id => {
      const child_node=jstree.get_node(id);
      recalculateNodeData(jstree, child_node, node, roles, config);

      // Acumulated Data
      node.data.cost += child_node.data.cost;
      updateMap(node.data.md                , child_node.data.md);
      updateMap(node.data.additional_columns, child_node.data.additional_columns);

      if ( child_node.data.has_error ) {
        node.data.has_error=true;
      }
    });
  // SIMPLE node
  } else {
    Log.log_low_debug("Pure estimation");
    if ( node.state.checked && !node.data.has_error ) {
      for (const k in node.data.effort ) {
        node.data.md[k] = node.data.effort[k] * node.data.weight * (node.data.duration ? node.data.duration : 1.0);
      }

      // Compute the costs 
      var roles_costs=getCostsByCenter(roles, node.data.cost_center);
      node.data.cost=getCost(node.data.md, roles_costs);

      // But... this is not all!!!! Maybe we have defined some additional columns that
      // must be computed now!!!!
      if ( config.hasOwnProperty("additional_columns") ) {
        // We process the columns in order because values of some columns depends of other
        // BUT to access the information is better to have a map
        var map_additional_columns={};
        var list_additional_columns=[];
        config.additional_columns.forEach(item => {
          for ( const col_name in item ) {
            map_additional_columns[col_name]=item[col_name];
            list_additional_columns.push(col_name);
          }
        });

        list_additional_columns.forEach(col_name => {
          var col_cfg = map_additional_columns[col_name];
          var col_value=null;

          // Column is an calculated effort 
          if ( col_cfg.hasOwnProperty("formula") ) {
            col_value=computeExpressionEffort(col_cfg.formula, node.data.md, roles);
          // Column is a calculated cost
          } else if ( col_cfg.hasOwnProperty("isCost") && col_cfg["isCost"] && col_cfg.hasOwnProperty("base") ) {
            const base=col_cfg["base"];
            Log.log_low_debug("base : " + base);
            // Base is a rol
            if ( roles[base] ) {
              col_value=computeExpressionCost("{" + base + "}", node.data.md, roles_costs)
            // Base is a computed field
            } else if ( map_additional_columns[base].hasOwnProperty("formula") ) {
              col_value=computeExpressionCost(map_additional_columns[base].formula, node.data.md, roles_costs)
            }
          }
          node.data.additional_columns[col_name]=col_value;
        });
      }
    }
    Log.log_is_low_debug() && Log.log_low_debug("Final MDs: " + JSON.stringify(node.data.md));
  }

  // -------------------------------------
  // Update some final info for the node
  // -------------------------------------
  // NOTES
  node.data.notes="";
  if ( node.data.weight!=1.0 ) {
    node.data.notes+="[x" + node.data.weight + "] ";
  }
  if ( node.data.isComposed ) {
    if ( node.data.duration ) {
      node.data.notes+="[" + daysNumber2Human(node.data.duration) + "] Team : ";
      var my_notes=[];
      for ( const k in node.data.md ) {
        my_notes.push(round(node.data.md[k]/node.data.duration) + "x" + k);
      }
      node.data.notes+=my_notes.join(" + ");
    }
  } else {
    if ( node.data.duration_template==="inherit" ) {
      node.data.notes+="[parent_duration:" + parent_node.data.duration + "]";
    }
    if ( node.data.duration_template==="pending" ) {
      node.data.notes+="[my_duration:" + node.data.duration + "]";
    }
  }
  node.data.notes = node.data.notes + node.data.notes_template;

  if ( node.data.description ) {
    node.text=node.data.description;
  }

  Log.log_group_end();

  if ( node.data.has_error ) {
    node.icon="img/warning.png";
  } else if ( !node.data.isComposed ) {
    node.icon="img/simple.png";
  } else {
    delete node.icon;
  }
}

export function updateTreeData(jstree, d_flat_data, roles, config) {
  // cleanMDTreeNode(jstree);
  jstree.get_node('#').children.forEach(id => {
    recalculateNodeData(jstree, jstree.get_node(id), jstree.get_node('#'), roles, config);
  });
}

/**
 * Recursive case. Clean the values for the calculated fields before we start a new calculation.
 */
/*
export function cleanMDTreeNode(jstree, node) {
  // Special case, the node '#' is not shown and its child (see below) is our root 
  if ( !node ) {
    node=jstree.get_node('#');
  } else {
    node.data.md                 = {};
    node.data.weight             = null;
    node.data.cost               = null;
    node.data.notes              = "";
    node.data.has_error          = false;
    node.data.error_msg          = null;
    node.data.additional_columns = [];
  }

  //Set the effort in all the child nodes
  node.children.forEach(id => {
    cleanMDTreeNode(jstree, jstree.get_node(id));
  });
}
*/
