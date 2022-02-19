import { daysHuman2Number, daysNumber2Human, getValue } from '../lib/utils.js';
import * as Form from '../lib/forms.js';

import { getTreeNodeData } from './node.js';
import { getAllCostCenters } from './estimations.js';

// ------------------------------------------------------------------- Edit Node
export function buildFormEditNode($container, $p_edit_node, roles) {
  if ( $p_edit_node ) {
    var $sel_cost_center=$p_edit_node.find("select[name='cost_center']");
    getAllCostCenters(roles).forEach(cost_center => {
      $sel_cost_center.append($("<option>").val(cost_center).text(cost_center));
    });

    $p_edit_node.find("button").click(function() {
      const tree_node = $container.data("sel_node");

      var data=Form.getData($p_edit_node[0]);

      tree_node.data.description    = getValue(data, "description");
      tree_node.data.my_weight      = getValue(data, "weight");
      tree_node.data.my_cost_center = getValue(data, "cost_center");
      tree_node.data.my_start_date  = getValue(data, "start_date");
      tree_node.data.my_end_date    = getValue(data, "end_date");
      tree_node.data.my_duration    = getValue(data, "duration");

      $.modal.close();
      $container.trigger("custom.refresh");
    });
  }
}

export function showFormEditNode($p_edit_node, tree_node) {
  var data = {
    "description" : tree_node.data.description,
    "weight"      : tree_node.data.my_weight,
    "cost_center" : tree_node.data.my_cost_center
  };

  if ( tree_node.data.isComposed || tree_node.data.duration_template === "pending" ) {
    data["duration"]=tree_node.data.my_duration;
  }
  if ( tree_node.data.isComposed ) {
    data["start_date"] = tree_node.data.start_date;
    data["end_date"]   = tree_node.data.end_date;
  }

  Form.setData($p_edit_node[0], data);

  $p_edit_node.modal();
}

export function buildFormNewTask($container, $p_new_task, d_flat) {
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
}
