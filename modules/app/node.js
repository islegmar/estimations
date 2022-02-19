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

  // Some atttributes can be changed later (edited or computed) but we
  // want to keep the "original" value coming from the template
  var my_duration=getValue(my_flat_data, "duration", null);
  var my_node={
    text : name, 
    name : name,
    data : {
      isComposed        : isComposed,
      // Data from the template, do not change
      duration_template    : !my_duration || ["inherit", "pending"].includes(my_duration) ? my_duration : daysHuman2Number(my_duration),
      notes_template       : getValue(my_flat_data, "notes", ""),
      assumptions          : getValue(my_flat_data, "assumptions", []).join(),
      effort               : getValue(my_flat_data, "effort", null),
      // Can be edited (usually using a form)
      my_weight         : getValue(my_flat_data, "weight", 1.0),
      description       : getValue(my_flat_data, "description", ""),
      duration          : !my_duration || ["inherit", "pending"].includes(my_duration) ? null : daysHuman2Number(my_duration),
      // cost_center initially comes from the template and can be edited in the form but it is NOT the one used in the calculation
      cost_center       : getValue(my_flat_data, "cost_center"),
      my_start_date     : getValue(my_flat_data, "start_date"),
      my_end_date       : getValue(my_flat_data, "end_date"),
      // Computed everytime te tree is refreshed
      md                 : null,
      weight             : null,
      cost               : null,
      notes_computed     : null,
      additional_columns : null,
      // This is the one used in the calculation
      final_cost_center  : null,
      start_date         : null,
      end_date           : null,
      // if has_error==true can be the node itself or any of their
      // chiñdren has an error
      has_error         : false,
      error_msg         : null
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

      // Ok, when we have build the node with the data from that node but
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
 * Ok, this is one of those "dangerous" functions because they have
 * side effects when calling it:
 * - It returns an object with the MDs for a certain node (that corresponds
 *   to an activity in the tree)
 * - Updates some info from that node as de MDs calculated and other fields
 *
 * Why we don't do two functions, one for getting the values and another for set?
 * The problem is that perform those two actions we have to cross the entire tree
 * (basically for the weight in the parent nodes) so the "easiest way" is that when 
 * travessing and getting the data we update.
 * @params
 * - jstree : the jquery object so we can access to other nodes
 * - node   : the node (in jstree) we can get/ser the MDs
 * - d_flat_data : the data in flat mode 
 * - weight 
 */
export function getNodeMDAndUpdate(jstree, node, weight, parent_duration, parent_cost_center, parent_start_date, parent_end_date, roles, config) {
  Log.log_group_start("getNodeMDAndUpdate(" + node.text + ")");
  // This is the effort of this node that for the composed is the sum of the effort of allthe children
  var my_effort={};
  
  if ( Log.log_is_low_debug() ) {
    Log.log_low_debug("getNodeMDAndUpdate(weight:" + weight +" , parent_duration:" + parent_duration + ", parent_cost_center : " + parent_cost_center + ")");
    Log.log_low_debug("node.data : " + JSON.stringify(node.data, null, 2));
  }
  const children = node.children;

  node.data.final_cost_center=node.data.cost_center ? node.data.cost_center : parent_cost_center;
  node.data.start_date=node.data.my_start_date ? node.data.my_start_date : parent_start_date;
  node.data.end_date=node.data.my_end_date ? node.data.my_end_date : parent_end_date;

  // COMPOSED node
  if ( node.data.isComposed /*children.length>0*/ ) {
    Log.log_low_debug("With nodes");
    // TODO: do we have to do something, some check, between the value of parent_duration (arguments) 
    // and this one? Eg. in the argument has a value and this is null, which one should be valid?
    parent_duration = node.data.duration ? node.data.duration : parent_duration;
    parent_cost_center = node.data.cost_center ? node.data.cost_center : parent_cost_center;
    node.data.cost=0.0;
    node.data.additional_columns={};

    children.forEach(id => {
      // In the original info from the nodes, the weight of some nodes can be other than 1.0
      const child_node=jstree.get_node(id);
      var real_weight=weight*child_node.data.my_weight;
      // TODO - Maybe the function getNodeMD... should not return nothing, just update the node, so we can use the updated info
      // later (as with the cost)
      var child_effort = getNodeMDAndUpdate(jstree, child_node, real_weight, parent_duration, parent_cost_center, node.data.start_date, node.data.end_date, roles, config);

      my_effort = sumMaps(my_effort, child_effort);
      node.data.cost += child_node.data.cost;
      updateMap(node.data.additional_columns, child_node.data.additional_columns);

      if ( child_node.data.has_error ) {
        node.data.has_error=true;
      }
    });
  // SIMPLE node
  } else {
    Log.log_low_debug("Pure estimation");
    if ( node.state.checked ) {
      var my_duration = null;

      if ( node.data.duration_template==="pending" ) {
        my_duration = node.data.duration;
        if ( !my_duration ) {
          node.data.has_error = true;
          node.data.error_msg = "duration not set in node";
        }
      } else if ( node.data.duration_template==="inherit" ) {
        my_duration = parent_duration;
        if ( !my_duration ) {
          node.data.has_error = true;
          node.data.error_msg = "Inherit duration and not set in parent";
        }
      } else {
        my_duration=1.0;
      }

      if ( !node.data.has_error ) {
        for (const k in node.data.effort ) {
          my_effort[k] = node.data.effort[k] * weight * my_duration;
        }

        // Compute the costs 
        var roles_costs=getCostsByCenter(roles, node.data.final_cost_center);
        node.data.cost=getCost(my_effort, roles_costs);

        // But... this is not all!!!! Maybe we have defined some additional columns that
        // must be computed now!!!!
        node.data.additional_columns={};
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
              col_value=computeExpressionEffort(col_cfg.formula, my_effort, roles);
            // Column is a calculated cost
            } else if ( col_cfg.hasOwnProperty("isCost") && col_cfg["isCost"] && col_cfg.hasOwnProperty("base") ) {
              const base=col_cfg["base"];
              Log.log_low_debug("base : " + base);
              // Base is a rol
              if ( roles[base] ) {
                col_value=computeExpressionCost("{" + base + "}", my_effort, roles_costs)
              // Base is a computed field
              } else if ( map_additional_columns[base].hasOwnProperty("formula") ) {
                col_value=computeExpressionCost(map_additional_columns[base].formula, my_effort, roles_costs)
              }
            }
            node.data.additional_columns[col_name]=col_value;
          });
        }
      }
    }
    Log.log_is_low_debug() && Log.log_low_debug("Final my_effort: " + JSON.stringify(my_effort));
  }

  // -------------------------------------
  // Update the info of the node
  // -------------------------------------
  node.data.md={};
  for ( const k in my_effort) {
    node.data.md[k]=round(my_effort[k]);
  }
  node.data.weight=weight;

  // NOTES
  node.data.notes_computed="";
  if ( weight!=1.0 ) {
    node.data.notes_computed+="[x" + weight + "] ";
  }
  if ( node.data.isComposed ) {
    if ( node.data.duration ) {
      node.data.notes_computed+="[" + daysNumber2Human(node.data.duration) + "] Team : ";
      var my_notes=[];
      for ( const k in node.data.md ) {
        my_notes.push(round(node.data.md[k]/node.data.duration) + "x" + k);
      }
      node.data.notes_computed+=my_notes.join(" + ");
    }
  } else {
    if ( node.data.duration_template==="inherit" ) {
      node.data.notes_computed+="[parent_duration:" + parent_duration + "]";
    }
    if ( node.data.duration_template==="pending" ) {
      node.data.notes_computed+="[my_duration:" + node.data.duration + "]";
    }
  }

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

  return my_effort;
}

export function updateTreeData(jstree, d_flat_data, roles, config) {
  cleanMDTreeNode(jstree);
  jstree.get_node('#').children.forEach(id => {
    getNodeMDAndUpdate(jstree, jstree.get_node(id), 1.0, null, null, null, null, roles, config);
  });
}

/**
 * Recursive case. Clean the values for the calculated fields before we start a new calculation.
 */
export function cleanMDTreeNode(jstree, node) {
  // Special case, the node '#' is not shown and its child (see below) is our root 
  if ( !node ) {
    node=jstree.get_node('#');
  } else {
    node.data.md                 = {};
    node.data.weight             = null;
    node.data.cost               = null;
    node.data.notes_computed     = "";
    node.data.has_error          = false;
    node.data.error_msg          = null;
    node.data.additional_columns = [];
  }

  //Set the effort in all the child nodes
  node.children.forEach(id => {
    cleanMDTreeNode(jstree, jstree.get_node(id));
  });
}

