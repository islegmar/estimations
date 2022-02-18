import * as DateUtils from './dates.js';
import { getPlanning } from './planning.js';

// ------------------------------------------------------------------ Export CSV
export function export2CSVTree(jstree, roles) {
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
export function exportCosts(map_roles) {
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

export function exportPlanning(jstree) {
  const planning=getPlanning(jstree);
  downloadCSV(planning.list, planning.headers, 'planning.csv');
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
export function export2JSONTree(jstree) {
  downloadData(JSON.stringify(jstree.get_json(), null, 2), 'export.json', 'application/json');
}

export function walk_tree(jstree, callback, node, level) {
  if ( !node ) {
    walk_tree(jstree, callback, jstree.get_node('#'), 0);
  } else {
    if ( node.id !== "#" ) {
      callback(jstree.get_node(node.id), level);
    }
    node.children.forEach(id => {
      walk_tree(jstree, callback, jstree.get_node(id), level+1);
    });
  }
}
