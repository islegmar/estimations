import { getTreeNodeData } from './node.js';
import { getAllCostCenters } from './estimations.js';

// ------------------------------------------------------------------- Edit Node
export function buildFormEditNode($container, $p_edit_node, roles) {
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

      if ( tree_node.data.isComposed ) {
        tree_node.data.my_start_date=$p_edit_node.find("*[name='start_date']").val();
        tree_node.data.my_end_date=$p_edit_node.find("*[name='end_date']").val();
      }

      $.modal.close();
      $container.trigger("custom.refresh");
    });
  }
}

export function showFormEditNode($p_edit_node, tree_node) {
  // TODO: manage it nicer ..
  if ( tree_node.data.isComposed || tree_node.data.duration_template === "pending" ) {
    $p_edit_node.addClass("composed");
  } else {
    $p_edit_node.removeClass("composed");
  }
  if ( tree_node.data.isComposed ) {
    $p_edit_node.find(".start_date").show();
    $p_edit_node.find(".end_date").show();
  } else {
    $p_edit_node.find(".start_date").hide();
    $p_edit_node.find(".end_date").hide();
  }
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
