// grid : https://everyething.com/example-of-deitch-jsTree-grid
//
/**
 * Create the object jstree
 */
function createJSTree($container_parent, $container, $search, d_flat, roles, typeAcctivitites, config, root_node, $p_select_activity, $p_edit_node, $p_new_task, $p_col_selector) {
  const d_tree = getJsTreeData(d_flat, root_node);

  // ---- Columns to be shown for every row
  var columns=[
    {width: 200, header: "Name" },
    {header: "Description", value: "description", "columnClass" : "Description"},
    {header: "Cost", "columnClass" : "cost", "wideCellClass" : "number", value : function(node){ return formatDataValue(node.data, "cost", formatterCost);}},
    {header: "O. Weight", "columnClass" : "oWeight", "wideCellClass" : "number", value: function(node){ return formatDataValue(node.data, "my_weight"); }},
    {header: "Weight", "columnClass" : "weight", "wideCellClass" : "number", value: function(node){ return formatDataValue(node.data, "weight"); }}
  ];

  for (const rol_name in roles){
    columns.push({
      header: rol_name, 
      "columnClass" : "rol_" + rol_name , 
      "wideCellClass" : "number", 
      value : function(node){ 
        const rol_cfg=roles[rol_name];

        // Sepecial cases:
        // - Column not represent a Rol but a Cost 
        // - Column is a calculated field
        if ( !rol_cfg.hasOwnProperty("cost") ) {
          // Column is an calculated effort 
          if ( rol_cfg.hasOwnProperty("formula") ) {
            return formatString(computeExpressionEffort(rol_cfg.formula, node.data.md, roles));
          // Column is a calculated cost
          } else if ( rol_cfg.hasOwnProperty("isCost") && rol_cfg["isCost"] && rol_cfg.hasOwnProperty("base") ) {
            const base=rol_cfg["base"];
            // Base is a rol
            if ( roles[base].hasOwnProperty("cost") ) {
              return formatString(computeExpressionCost("{" + base + "}", node.data.md, roles), formatterCost);
            // Base is a computed field
            } else if ( roles[base].hasOwnProperty("formula") ) {
              return formatString(computeExpressionCost(roles[base].formula, node.data.md, roles), formatterCost);
            }
          }
        // Column is simple a cost with its rol
        } else  {
          return formatDataValue(node.data.md, rol_name); 
        }
      }
    });
  }
  // TODO : not possible to show the assumptions as a list
  columns.push({header: "Assumptions", "columnClass" : "assumptions", value : "assumptions"});
  columns.push({header: "Notes", "columnClass" : "notes", value: function(node){ return node.data.notes_computed + node.data.notes_template; }});

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
    updateTreeData(jstree, d_flat, roles);
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
    updateTreeData(jstree, d_flat, roles);
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
    $container.on("custom.select_node", function(e, $node, action) {
      log("Action " + action + " on node " + JSON.stringify($node));
      $container.data("sel_node", $node);
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
        if ( $node.data.isComposed ) {
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
      const $node = $container.data("sel_node");

      const activity=$p_select_activity.find("select").children("option:selected").val();
      log("Activity : " + activity);

      const child = getTreeNodeData(activity, d_flat);
      child.id=true;
      const jstree=$container.jstree(true);
      jstree.create_node( $node, child, "last"); 

      $.modal.close();
      $container.trigger("custom.refresh");
    });

  }

  // Edit a node
  if ( $p_edit_node ) {
    $p_edit_node.find("button").click(function() {
      const $node = $container.data("sel_node");

      const desc=$p_edit_node.find("input[name='description']").val();
      $node.data.description=desc;

      const my_weight=parseFloat($p_edit_node.find("input[name='weight']").val());
      $node.data.my_weight=my_weight;

      if ( $node.data.isComposed ) {
        const duration=$p_edit_node.find("input[name='duration']").val();
        $node.data.duration=daysHuman2Number(duration);
      }

      $.modal.close();
      $container.trigger("custom.refresh");
    });
  }
  
  // New Task
  if ( $p_new_task ) {
    $p_new_task.find("button").click(function(e) {
      const $node = $container.data("sel_node");

      const name=$p_new_task.find("input[name='name']").val();
      if ( d_flat[name] ) {
        alert("Name '" + name + "' already used, please chose another name.");
      } else {
        // TODO: do we have to save it in the cache?
        d_flat[name] = { "tasks" : [] };

        const child = getTreeNodeData(name, d_flat);
        child.id=true;
        const jstree=$container.jstree(true);
        jstree.create_node( $node, child, "last"); 

        $.modal.close();
        $container.trigger("custom.refresh");
      }
    });
  }

  $('#bExportCSV').click(function(){
    export2CSVTree($container.jstree(true), Object.keys(roles));
  });
  $('#bExportJSON').click(function(){
    export2JSONTree($container.jstree(true), Object.keys(roles));
  });
}

/*
function getAsList(){
  return "<ul><li>One</li><li>Two</li></ul>";
}
*/

// ------------------------------------------------------------------- tree_data
/**
 * Convert the flat data in a tree data that can be rendered.
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
  var my_node={
    text : name, 
    name : name,
    data : {
      isComposed        : isComposed,
      my_weight         : getValue(my_flat_data, "weight", "1.0"),
      duration_template : daysHuman2Number(getValue(my_flat_data, "duration", null)),
      notes_template    : getValue(my_flat_data, "notes", ""),
      description       : getValue(my_flat_data, "description", ""),
      assumptions       : getValue(my_flat_data, "assumptions", []).join(),
      effort            : getValue(my_flat_data, "effort", null),
      md                : null,
      weight            : null,
      duration          : null,
      cost              : null,
      md                : null,
      notes_computed    : null
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
function getNodeMDAndUpdate(jstree, node, weight, parent_duration, roles) {
  log_group_start("getNodeMDAndUpdate(" + node.name + ")");
  // This is the effort of this node that for the composed is the sum of the effort of allthe children
  var my_effort={};
  
  if ( log_is_low_debug() ) {
    log_low_debug("getNodeMDAndUpdate(weight:" + weight +" , parent_duration:" + parent_duration +")");
    log_low_debug("node.data : " + JSON.stringify(node.data, null, 2));
    log_low_debug("node.data : " + JSON.stringify(node.data, null, 2));
  }
  const children = node.children;

  // COMPOSED node
  if ( children.length>0 ) {
    log_low_debug("With nodes");
    children.forEach(id => {
      // In the original info from the nodes, the weight of some nodes can be other than 1.0
      const child_node=jstree.get_node(id);
      var my_weight=weight*child_node.data.my_weight;
      var parent_duration = node.data.duration;
      var child_effort = getNodeMDAndUpdate(jstree, child_node, my_weight, parent_duration, roles);

      my_effort = sumEffort(my_effort, child_effort, 1.0);
    });
  // SIMPLE node
  } else {
    log_low_debug("Pure estimation");
    if ( node.state.checked ) {
      const original_md=node.data.effort;
      for (const k in original_md ) {
        // my_effort[k] = original_md[k] * weight * (original_node_config.hasOwnProperty("duration") && original_node_config.duration==="inherit" ? parent_duration : 1.0);
        // TODO: duration==="inherit" or "pending"
        my_effort[k] = original_md[k] * weight;
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
  node.data.cost=getCost(my_effort, roles);
  node.data.weight=weight;

  node.data.notes_computed="";
  if ( weight!=1.0 ) {
    node.data.notes_computed+="[x" + weight + "] ";
  }
  if ( node.data.isComposed && node.data.duration ) {
    node.data.notes_computed+="[" + daysNumber2Human(node.data.duration) + "] Team : ";
    var my_notes=[];
    for ( const k in node.data.md ) {
      my_notes.push(round(node.data.md[k]/node.data.duration) + "x" + k);
    }
    node.data.notes_computed+=my_notes.join(" + ");
  }
  // TODO: the mix with some attributes in data, other in original ....
  if ( !node.data.isComposed && node.data.duration_templte==="inherit" ) {
    node.data.notes_computed+="[parent_duration:" + parent_duration + "]";
  }
  log_group_end();

  return my_effort;
}

function updateTreeData(jstree, d_flat_data, roles) {
  cleanMDTreeNode(jstree);
  jstree.get_node('#').children.forEach(id => {
    getNodeMDAndUpdate(jstree, jstree.get_node(id), 1.0, null, roles);
  });
}

/**
 * Recursive case. Clean all the values of MD before we start a new calculation.
 */
function cleanMDTreeNode(jstree, node) {
  // Special case, the node '#' is not shown and its child (see below) is our root 
  if ( !node ) {
    node=jstree.get_node('#');
  } else {
    delete node.data.md;
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
function export2JSONTree(jstree, roles) {
  /*
  var json={};
  jstree.get_node('#').children.forEach(id => {
    export2JSONNode(jstree, jstree.get_node(id), json);
  });
  */
  downloadData(JSON.stringify(jstree.get_json(), null, 2), 'export.json', 'application/json');
}

function export2JSONNode(jstree, node, json) {
  const children = node.children;
  if ( children.length>0 ) {
    var my_childs=[];
    children.forEach(id => {
      const child_node=jstree.get_node(id);
      my_childs.push(child_node.text);
    });
    json[node.text] = { "tasks" : my_childs };

    children.forEach(id => {
      const child_node=jstree.get_node(id);
      export2JSONNode(jstree, child_node, json);
    });
  } else {
    const original_node_config=node.data._original_node_config;
    var my_item=cloneJSON(original_node_config.original);
    json[node.text]=my_item;
  }
}
