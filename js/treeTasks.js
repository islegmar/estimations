// grid : https://everyething.com/example-of-deitch-jsTree-grid
//
/**
 * Create the object jstree
 */
function createJSTree($container_parent, $container, $search, tree_data, d_flat, list_roles, typeAcctivitites, config, root_node, $p_select_activity, $p_edit_node, $p_new_task, $p_col_selector) {
  var roles=listOfMaps2Map(list_roles);
  const d_tree = tree_data ? tree_data[0] : getJsTreeData(d_flat, root_node);

  // ---- Columns to be shown for every row
  var columns=[
    {header: "Name" },
    {header: "Cost", "columnClass" : "cost", "wideCellClass" : "number", value : function(node){ return formatDataValue(node.data, "cost", formatterCost);}},
    {header: "O. CostCenter", "columnClass" : "costCenter", value : "cost_center" },
    {header: "CostCenter", "columnClass" : "costCenter", value : "final_cost_center" },
    {header: "O. Weight", "columnClass" : "oWeight", "wideCellClass" : "number", value: function(node){ return formatDataValue(node.data, "my_weight"); }},
    {header: "Weight", "columnClass" : "weight", "wideCellClass" : "number", value: function(node){ return formatDataValue(node.data, "weight"); }}
  ];

  for (const rol_name in roles){
    columns.push({
      header: rol_name, 
      "columnClass" : "rol_" + rol_name , 
      "wideCellClass" : "number", 
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
          value : function(node){ 
            // Not use formatDataValue because some columns can be effort 
            // and other costs, so when this field was calculated it was already
            // taken into account the type of data so the proper formatted was applied
            return getValue(node.data.additional_columns, col_name);
          }
        });
      }
    });
  }
  // TODO : not possible to show the assumptions as a list
  columns.push({header: "Notes", "columnClass" : "notes", value: function(node){ return node.data.notes_computed + node.data.notes_template; }});
  columns.push({header: "Assumptions", "columnClass" : "assumptions", value : "assumptions"});

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
          // TODO : remove all jquery
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

  /*
  $(document).on('dnd_stop.vakata dnd_move.vakata drop', function(e, data) {
    log(">>>> DROP");
  });
  */
  $(document).on('dnd_stop.vakata', function(e, data) {
    const jstree=$container.jstree(true);
    updateTreeData(jstree, d_flat, roles, config);
    jstree.redraw(true);
  });
  
  $container.on("loaded.jstree", function (e, data) {
    if ( $p_col_selector ) {
      for (const rol in roles) {
        if ( roles[rol].hasOwnProperty("hidden") && roles[rol]["hidden"] ) {
          $p_col_selector.find("input[name='" + rol + "']").click();
        }
      }
    }
  });
  // Recalculate the efforts
  // - Init, after the tree is rendered
  // - When some is checked / unchecked
  // - When a node is moved
  // To cancel the drop must be dine before, this event is triggered after is done
  $container.on("custom.refresh loaded.jstree check_node.jstree uncheck_node.jstree move_node.jstree", function (e, data) {
    const jstree=$container.jstree(true);
    updateTreeData(jstree, d_flat, roles, config);
    jstree.redraw(true);
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
      log("Action " + action + " on node " + JSON.stringify(tree_node));
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
        // TODO: manage it nicer ..
        if ( tree_node.data.isComposed || tree_node.data.duration_template === "pending" ) {
          $p_edit_node.addClass("composed");
        } else {
          $p_edit_node.removeClass("composed");
        }
        $p_edit_node.modal();
      } else {
        throw new Error("Unknown action '" + action + "'");
      }
    });

    // Create a node
    $p_select_activity.find("button").click(function() {
      const tree_node = $container.data("sel_node");

      const activity=$p_select_activity.find("select").children("option:selected").val();
      log("Activity : " + activity);

      const child = getTreeNodeData(activity, d_flat);
      child.id=true;
      const jstree=$container.jstree(true);
      jstree.create_node( tree_node, child, "last"); 

      $.modal.close();
      $container.trigger("custom.refresh");
    });

  }

  // Edit a node
  if ( $p_edit_node ) {
    var $sel_cost_center=$p_edit_node.find(".cost_center select");
    getAllCostCenters(roles).forEach(cost_center => {
      $sel_cost_center.append($("<option>").val(cost_center).text(cost_center));
    });

    $p_edit_node.find("button").click(function() {
      const tree_node = $container.data("sel_node");

      const desc=$p_edit_node.find("input[name='description']").val();
      tree_node.data.description=desc;

      const my_weight=parseFloat($p_edit_node.find("input[name='weight']").val());
      tree_node.data.my_weight=my_weight;

      if ( tree_node.data.isComposed || tree_node.data.duration_template === "pending" ) {
        const duration=$p_edit_node.find("input[name='duration']").val();
        tree_node.data.duration=daysHuman2Number(duration);
      }

      const cost_center=$p_edit_node.find("*[name='cost_center']").val();
      tree_node.data.cost_center=cost_center;

      $.modal.close();
      $container.trigger("custom.refresh");
    });
  }
  
  // New Task
  if ( $p_new_task ) {
    $p_new_task.find("button").click(function(e) {
      const tree_node = $container.data("sel_node");

      const name=$p_new_task.find("input[name='name']").val();
      if ( d_flat[name] ) {
        alert("Name '" + name + "' already used, please chose another name.");
      } else {
        // TODO: do we have to save it in the cache?
        d_flat[name] = { "tasks" : [] };

        const child = getTreeNodeData(name, d_flat);
        child.id=true;
        const jstree=$container.jstree(true);
        jstree.create_node( tree_node, child, "last"); 

        $.modal.close();
        $container.trigger("custom.refresh");
      }
    });
  }

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
}

/*
function getAsList(){
  return "<ul><li>One</li><li>Two</li></ul>";
}
*/

// ------------------------------------------------------------------- tree_data
/**
 * Convert the flat data (templates) in a tree data that can be rendered.
 * @param root_node if specified we want to render only from the several roots
 */
function getJsTreeData(d_flat_data, root_node) {
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
function getTreeNodeData(name, d_flat_data) {
  log_is_low_debug() && log_low_debug("getTreeNodeData(d_flat_data[" + name + "]: " + JSON.stringify(d_flat_data[name]) + ")");
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
      // Computed everytime te tree is refreshed
      md                 : null,
      weight             : null,
      cost               : null,
      notes_computed     : null,
      additional_columns : null,
      // This is the one used in the calculation
      final_cost_center  : null,
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
function getNodeMDAndUpdate(jstree, node, weight, parent_duration, parent_cost_center, roles, config) {
  log_group_start("getNodeMDAndUpdate(" + node.text + ")");
  // This is the effort of this node that for the composed is the sum of the effort of allthe children
  var my_effort={};
  
  if ( log_is_low_debug() ) {
    log_low_debug("getNodeMDAndUpdate(weight:" + weight +" , parent_duration:" + parent_duration + ", parent_cost_center : " + parent_cost_center + ")");
    log_low_debug("node.data : " + JSON.stringify(node.data, null, 2));
  }
  const children = node.children;

  node.data.final_cost_center=node.data.cost_center ? node.data.cost_center : parent_cost_center;

  // COMPOSED node
  if ( node.data.isComposed /*children.length>0*/ ) {
    log_low_debug("With nodes");
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
      var child_effort = getNodeMDAndUpdate(jstree, child_node, real_weight, parent_duration, parent_cost_center, roles, config);

      my_effort = sumMaps(my_effort, child_effort);
      node.data.cost += child_node.data.cost;
      updateMap(node.data.additional_columns, child_node.data.additional_columns);

      if ( child_node.data.has_error ) {
        node.data.has_error=true;
      }
    });
  // SIMPLE node
  } else {
    log_low_debug("Pure estimation");
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
              log_low_debug("base : " + base);
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
    log_is_low_debug() && log_low_debug("Final my_effort: " + JSON.stringify(my_effort));
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

  log_group_end();

  if ( node.data.has_error ) {
    node.icon="img/warning.png";
  } else if ( !node.data.isComposed ) {
    node.icon="img/simple.png";
  } else {
    delete node.icon;
  }

  return my_effort;
}

function updateTreeData(jstree, d_flat_data, roles, config) {
  cleanMDTreeNode(jstree);
  jstree.get_node('#').children.forEach(id => {
    getNodeMDAndUpdate(jstree, jstree.get_node(id), 1.0, null, null, roles, config);
  });
}

/**
 * Recursive case. Clean the values for the calculated fields before we start a new calculation.
 */
function cleanMDTreeNode(jstree, node) {
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

// ------------------------------------------------------------------ Export CSV
function export2CSVTree(jstree, roles) {
  var list=[];
  var max_level=0;
  jstree.get_node('#').children.forEach(id => {
    export2CSVNode(jstree, jstree.get_node(id), list);
  });

  log("max_level : " + max_level);
  log(JSON.stringify(list, null, 2));

  // Headers in order
  var headers=[];

  var max_level=0;
  list.forEach(item => {
    max_level=item.level > max_level ? item.level : max_level;
  });

  for(var ind=0; ind<=max_level; ++ind) {
    headers.push("Name_" + ind);
  }

  headers.push("weight");
  headers.push("my_weight");

  roles.forEach(rol => {
    headers.push(rol);
  });

  headers.push("cost");
  headers.push("notes");
  headers.push("description");
  headers.push("assumptions");


  downloadCSV(list, headers);
}

function export2CSVNode(jstree, node, list, level=0) {
  var line={
    level : level,
    notes : node.data.notes_computed + node.data.notes_template,
    descripion : node.data.description,
    assumptions : node.data.assumptions,
    weight: node.data.weight,
    my_weight: node.data.my_weight,
    cost : node.data.cost
  };
  line["Name_" + level]=node.text;
  for (const k in node.data.md) {
    line[k]=node.data.md[k];
  }
  if ( node.data.additional_columns ) {
    for(const k in node.data.additional_columns ) {
      line[k]=node.data.additional_columns[k];
    }
  }
  list.push(line);

  // COMPOSED nore
  const children = node.children;
  if ( children.length>0 ) {
    children.forEach(id => {
      const child_node=jstree.get_node(id);
      export2CSVNode(jstree, child_node, list, level+1);
    });
  }
}

// ---------------------------------------------------------------- Export Costs
function exportCosts(map_roles) {
  const centers=getAllCostCenters(map_roles);
  var headers=['Rol', ...centers];

  var list=[];
  var costs_centers={};
  centers.forEach(center => {
    costs_centers[center]=getCostsByCenter(map_roles, center);
  });
  Object.keys(map_roles).forEach( rol => {
    var item={'Rol' : rol};
    centers.forEach(center => {
      item[center]=costs_centers[center][rol];
    });
    list.push(item);
  });

  downloadCSV(list, headers, 'costs.csv');
}

// ----------------------------------------------------------------- Export JSON
// Ok, exporting to JSON is not "a symetric process"; that is, the data can not 
// be exported in "flat" format as was initially imported becuase when the tree
// manipulation we have created "instances from the templates": cahnge data of 
// some nodes, altering the child nodes .... so we MUST import the data as a tree
// but then this has to be detected when importing and that means the import 
// process has to handle two "types of json":
// - Flat format (based on templates)
// - Tree format (based on instances)
// Another option is to import the CSV format that already has this tree format ...
// TODO: Ok exporting directly the json from the jstree is fast and it works BUT .... it
// opens a whole world of incompatibilities becausse as the software evolves the
// data structure is going to change and that means incompatibilities :-(
// The solution (not so fast and more work but safer) is to export to a neutral format
// that can be imported again
function export2JSONTree(jstree) {
  downloadData(JSON.stringify(jstree.get_json(), null, 2), 'export.json', 'application/json');
}
