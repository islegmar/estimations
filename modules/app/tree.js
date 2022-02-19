import * as Log from '../lib/log.js';
import { cloneJSON, listOfMaps2Map, removeChildren, formatDataValue, formatterCost, formatterDecimal, extendsJSON } from '../lib/utils.js';

import { buildFormEditNode, showFormEditNode, buildFormNewTask } from './forms.js';
import { getJsTreeData, getTreeNodeData, getNodeMDAndUpdate, updateTreeData, cleanMDTreeNode } from './node.js';
import { export2CSVTree, export2JSONTree, exportCosts, exportPlanning } from './exports.js';
import { getFlatDataNormalized } from './estimations.js';

// grid : https://everyething.com/example-of-deitch-jsTree-grid

// Original data, coming from the JSONs
var config={};
var typeActivities={};
var templates={};  // templates (aka. estimations) no normalized, comind directly from the JSON
var list_roles=[]; 
// the project as exported tree. TODO: Not sure this should be managed as a config instead an argument in the creator but now it is easier taht way
var project=null; 

// Derived data
var roles=null; // as a map (TODO: remove it)
var d_flat=null; // templates normalized

/**
 * Update the tree data confuration
 */
export function updateConfiguration(name, data) {
  if ( name === "config" ) {
    extendsJSON(config, data);
  } else if ( name === "roles" ) {
    list_roles=data;
    roles=listOfMaps2Map(list_roles);
  } else if ( name === "types" ) {
    extendsJSON(typeActivities, data);
  } else if ( name === "estimations" ) {
    if ( !templates ) templates={};
    extendsJSON(templates, data);
  } else if ( name === "project" ) {
    project=data;
  } else {
    throw new Error("Unnamenown configuration '" + name + "'");
  }
  // TODO: not sure if it is the best way but ....
  // Every time something changes, normalize the estimations
  if ( name !== "project" ) {
    d_flat=getFlatDataNormalized(
      templates,
      list_roles,
      typeActivities, 
      config
    );
  }
}

export function getConfiguration(name) {
  if ( name === "config" ) {
    return config;
  } else if ( name === "roles" ) {
    return list_roles;
  } else if ( name === "types" ) {
    return typeActivities;
  } else if ( name === "estimations" ) {
    return templates;
  } else if ( name === "project" ) {
    return project;
  } else {
    throw new Error("Unnamenown configuration '" + name + "'");
  }
}

//
/**
 * Create the object jstree
 */
// export function createJSTree($container_parent, $container, $search, tree_data, d_flat, list_roles, typeAcctivitites, config, root_node, $p_select_activity, $p_edit_node, $p_new_task, $p_col_selector) {
export function createJSTree($container_parent, $container, $search, root_node, $p_select_activity, $p_edit_node, $p_new_task, $p_col_selector) {
  if ( !d_flat ) return;

  const d_tree = project ? project[0] : getJsTreeData(d_flat, root_node);

  // ---- Columns to be shown for every row
  var columns=[
    {header: "Name" },
    {header: "Cost"         , "columnClass" : "cost", "wideCellClass" : "number", value : function(node){ return formatDataValue(node.data, "cost", formatterCost);}},
    {header: "O. CostCenter", "columnClass" : "oCostCenter", value : "cost_center", "_hidden" : true },
    {header: "CostCenter"   , "columnClass" : "costCenter", value : "final_cost_center" },
    {header: "O. Weight"    , "columnClass" : "oWeight", "wideCellClass" : "number", value: function(node){ return formatDataValue(node.data, "my_weight"); }, "_hidden": true},
    {header: "Weight"       , "columnClass" : "weight", "wideCellClass" : "number", value: function(node){ return formatDataValue(node.data, "weight"); }}
  ];

  for (const rol_name in roles){
    columns.push({
      header: rol_name, 
      "columnClass" : "rol_" + rol_name , 
      "wideCellClass" : "number", 
      "_hidden" : roles[rol_name]["hidden"],
      value : function(node){ 
        return formatDataValue(node.data.md, rol_name); 
      }
    });
  }
  if ( config.hasOwnProperty("additional_columns") ) {
    config.additional_columns.forEach(item => {
      for ( const col_name in item ) {
        columns.push({
          header: col_name, 
          "columnClass" : "rol_" + col_name , 
          "wideCellClass" : "number", 
          "_hidden" : item[col_name]["hidden"],
          value : function(node){ 
            return formatDataValue(node.data.additional_columns, col_name, item[col_name]["isCost"] ? formatterCost : formatterDecimal); 
          }
        });
      }
    });
  }
  // TODO : not possible to show the assumptions as a list
  columns.push({header: "Notes", "columnClass" : "notes", value: function(node){ return node.data.notes_computed + node.data.notes_template; }});
  columns.push({header: "Assumptions", "columnClass" : "assumptions", value : "assumptions", "_hidden" : true});

  columns.push({header: "My Start Date", "columnClass" : "my_start_date", value : "my_start_date", "_hidden" : true});
  columns.push({header: "My End Date", "columnClass" : "my_end_date", value : "my_end_date", "_hidden" : true});
  columns.push({header: "Start Date", "columnClass" : "start_date", value : "start_date", "_hidden" : false});
  columns.push({header: "End Date", "columnClass" : "end_date", value : "end_date", "_hidden" : false});

  // Show the checkboxes to show/hide columns in the tree
  if ( $p_col_selector ) {
    var eGroup=$p_col_selector.find(".content")[0];
    removeChildren(eGroup);

    columns.forEach(item => {
      if ( item.hasOwnProperty("columnClass") ) {
        var eLabel=document.createElement('label');
        eLabel.innerHTML=item.header;
        eGroup.appendChild(eLabel);
    
        var eCb=document.createElement('input');
        eCb.name=item.header;
        eCb.type='checkbox';
        eCb.checked = true;
        // TODO : not sure is the better way to pass argument. Use of bind with EventListener?
        eCb.custom_class = item.columnClass;
        eCb.custom_container = $container_parent;
        eLabel.prepend(eCb);  // Use prepend so first the checkbox and then the label

        eCb.addEventListener('change', function(event) {
          var ele=event.currentTarget;
          if ( ele.checked ) {
            ele.custom_container.find("." + ele.custom_class).show();
            ele.custom_container.find("." + ele.custom_class).children().show();
          } else {
            ele.custom_container.find("." + ele.custom_class).hide();
            ele.custom_container.find("." + ele.custom_class).children().hide();
          }
        });
      }
    });
  }

  // ---- Build jstree
  $container.jstree({
    grid : {
      columns: columns,
      resizable: true
    },
    core: {
      data: d_tree,
      check_callback : function (operation, node, parent, position, more) {
        // If the parent is originally a node with direct estimations, it can have children so we have to cancel the movement
        if (operation === "move_node") {  
          // log("check_callback(operation:" + operation + ", node:" + node.text + ",parent:" + parent.text + ",position:" + position + ", more:" + more);
          // log("check_callback(parent.data:" + parent.data + ")");
          if ( parent && parent.data ) {
            if ( !parent.data.isComposed ) {
              return false;
            }
          }
        }  
      }
    },
    checkbox : {
      keep_selected_style : false,
      tie_selection: false,
      whole_node : false
    },
    contextmenu : {
      items : function($node) {
        var items={};

        if ( $node.data.isComposed ) {
          items["addTask"] = {
            "label" : "Add Task",
            "action" : function (obj) {
              $container.trigger("custom.select_node", [$node, "addTask"]);
            }
          };
          items["newTask"] = {
            "label" : "New Task",
            "action" : function (obj) {
              $container.trigger("custom.select_node", [$node, "newTask"]);
            }
          };
        }
        items["edit"] = {
          "label" : "Edit",
          "action" : function (obj) {
            $container.trigger("custom.select_node", [$node, "edit"]);
          }
        };
        items["delete"] = {
          "label" : "Delete",
          "action" : function (obj) {
            const jstree=$container.jstree(true);
            jstree.delete_node( $node );

            $container.trigger("custom.refresh");
          }
        };

        return items;
      }
    },
    plugins: ["grid", "checkbox", "search", "dnd", "contextmenu"]
  });

  // Uncheck the columns that are marked as hidden in the configuration
  // Later we can change its visibility clicking in the corresponding checkbox
  $container.on("loaded.jstree", function (e, data) {
    if ( $p_col_selector ) {
      columns.forEach(item => {
        if ( item._hidden ) {
          $p_col_selector.find("input[name='" + item.header + "']").click();
        }
      });
    }
  });
  // Recalculate the efforts
  // - Init, after the tree is rendered
  // - When some is checked / unchecked
  // - When a node is moved
  // To cancel the drop must be dine before, this event is triggered after is done
  $container.on("dnd_stop.vakata loaded.jstree check_node.jstree uncheck_node.jstree move_node.jstree", function (e, data) {
    $container.trigger("custom.refresh");
  });
  $container.on("custom.refresh", function (e, data) {
    const jstree=$container.jstree(true);
    updateTreeData(jstree, d_flat, roles, config);
    jstree.redraw(true);
    document.dispatchEvent(new CustomEvent("custom.planning.refresh", {
      detail : {
        jstree    : jstree, 
        container : document.getElementById('tab_planning')
      }
    }));
  });


  // TODO : ugly code
  var to=false;
  $search.keyup(function () {
    if(to) { clearTimeout(to); }
    to = setTimeout(function () {
      var v = $search.val();
      const jstree=$container.jstree(true);
      // TODO : We get an error 
      //   jstree.search is not a function
      // when we perform the search AFTER the tree is rebuild (not the first time)
      // BUT it works ??!!
      // All this "rebuild jstree" must be redone (see comments in index.html)
      jstree.search(v);
    }, 250);
  });
  
  // TODO : more ugly code
  //        The creation of a new node in the tree consists in:
  //        - Open the cotext menu in a node => we have to keep $node that will be the parent
  //        - Select from the list of all the activities the one we are woing to create. Because 
  //          the list can vey long we can not put it as a menu option, so a popup is shown with 
  //          all the options and when the usr clicks accept => actvity
  //        So, se have two events and each select one of the piece of information needed
  //        - $node
  //        - activity
  //        The solution here keeping data in $container is not nice but ....
  if ( $p_select_activity ) {
    // An action has bee triggered on a node in the tree
    // Depending on the action it would show a certain popup to request the data needed to perform the 
    // action. 
    // TODO : the node affected should be pass to the popup BUT not know ho to 
    //        to do it, so we save the data in $container (ugly!)
    $container.on("custom.select_node", function(e, tree_node, action) {
      Log.log_debug("Action " + action + " on node " + JSON.stringify(tree_node));
      $container.data("sel_node", tree_node);
      if ( action==="addTask" ) {
        // Fill the select with all the possible activities
        // Note: we do it every time because the list of taks can change
        const $pSel=$p_select_activity.find("select");
        $pSel.empty();
        Object.keys(d_flat).sort().forEach(key => {
          const type = d_flat[key].hasOwnProperty("tasks") ? "Composed" : "Simple";
          $pSel.append($("<option>").val(key).text(key + " - " + type));
        });

        $p_select_activity.modal();
      } else if ( action==="newTask" ) {
        $p_new_task.modal();
      } else if ( action==="edit" ) {
        showFormEditNode($p_edit_node, tree_node);
      } else {
        throw new Error("Unknown action '" + action + "'");
      }
    });

    // Create a node
    $p_select_activity.find("button").click(function() {
      const tree_node = $container.data("sel_node");

      const activity=$p_select_activity.find("select").children("option:selected").val();
      Log.log_debug("Activity : " + activity);

      const child = getTreeNodeData(activity, d_flat);
      child.id=true;
      const jstree=$container.jstree(true);
      jstree.create_node( tree_node, child, "last"); 

      $.modal.close();
      $container.trigger("custom.refresh");
    });

  }

  // Edit a node
  buildFormEditNode($container, $p_edit_node, roles);
  
  // New Task
  buildFormNewTask($container, $p_new_task, d_flat);

  $('#bExportCSV').click(function(){
    var names=[];
    for(const ind in list_roles) {
      for(const k in list_roles[ind] ) {
        names.push(k);
      }
    }
    if ( config.hasOwnProperty("additional_columns") ) {
      config.additional_columns.forEach(item => {
        for ( const k in item ) {
          names.push(k);
        }
      });
    }
    export2CSVTree($container.jstree(true), names);
  });
  $('#bExportJSON').click(function(){
    export2JSONTree($container.jstree(true));
  });
  $('#bExportCosts').click(function(){
    exportCosts(roles);
  });
  $('#bExportPlanning').click(function(){
    exportPlanning($container.jstree(true));
  });
}
