import * as Log from './lib/log.js';
import { collapsable, lsDelJSON, lsGetJSON, lsSetJSON, getURLParam, fetchJSONFile, extendsJSON, loadExternal, removeCommentsFromJSON  } from './lib/utils.js';

import { createJSTree } from './app/tree.js';
import { getFlatDataNormalized } from './app/estimations.js';

// ------------------------------------------------------------------- Functions
/**
 * Save JSON in local storage and put the JSON in a container so we can take a look (debug).
 * The data can represe nt an object (usually this is the case) or an arrya (roles).
 * If if is an object:
 *   - Remove comments
 *   - Load _includes
 * If it is an array, just store it.
 * The data can 
 */
function saveData(container, name, new_data, callback) {
  Log.log_low_debug("saveData(name:" + name + "). isArray : " + Array.isArray(new_data));
  if ( new_data ) {
    if ( Array.isArray(new_data) ) {
      lsSetJSON(name, new_data);
    } else {
      removeCommentsFromJSON(new_data);
      
      var data=lsGetJSON(name);
      if ( !data ) {
        Log.log_low_debug("New data ....");
        data={};
      } else {
        Log.log_low_debug("Updating ....");
      }
      extendsJSON(data, new_data);

      // Ok for the especial case of estimations we have to keep the original 
      // so we can later can compute the root node
      /*
      if ( name==="estimations" ) {
        lsSetJSON(name + "_original", data);
      }
      */
      loadExternal(data, upd_data => {
        container.querySelector(".content").innerHTML='';
        container.querySelector(".content").appendChild(renderjson.set_show_to_level('all')(data));
        lsSetJSON(name, data);
        if ( callback ) {
          callback(upd_data);
        }
      }, getURLParam("baseDataURL"));
    }
  } else {
    lsDelJSON(name);
  }
}


/**
 * Set the listener that will allow to upload JSON with data
 */
function setListenerUploadJSON(container, name, url, url_prefix) {
  container.querySelector("input").addEventListener('change', function(e) {
    loadLocalFiles(
      e.target.files, 
      // Secuencial process of the files uploaded. In some cases we allow upload
      // several files. like with the estimations
      (file, txt_result) => {
        saveData(container, name, JSON.parse(txt_result));
      },
      tot => {
        Log.log_low_debug("Processed : " + tot + " files");
      }
    );
  });
}

/**
 * Generates the tree
 */ 
function generatesTree() {
  // TODO : redo this show part, ugly
  //        It should managed by treeTask
  $("#pSearchTree").show();

  // TODO : not like this code for getting the root node. The fact
  //        normalize needs all the data to work ...

  const config=lsGetJSON('config');
  const roles=lsGetJSON('roles');
  const typeActivities=lsGetJSON('types');
  var   estimations=lsGetJSON('estimations');
  const project=lsGetJSON('project');

  // TODO : unify
  if ( project ) {
    // TODO : find a nicer way for rebuilding the tree from scratch and remove usage of jquery
    $("#tree_tasks").empty();
    $("#tree_tasks").append("<div class='content'></div>");
    createJSTree(
      $('#tree_tasks'), 
      $('#tree_tasks .content'), 
      $('#bTreeSearch'), 
      project,
      estimations, 
      roles, 
      typeActivities, 
      config, 
      null, 
      $('#select_activity'),
      $('#edit_node'),
      $('#new_task'),
      $('#col_selector')
    );
  } else {
    if ( config && roles && typeActivities && estimations ) {
      estimations=getFlatDataNormalized(
        estimations,
        roles,
        typeActivities, 
        config
      );

      // Ok we need to do a "trick" to get the root node
      // const estimations_original=lsGetJSON("estimations_original");
      // const my_roots=getRootNodes(estimations).filter( k=> estimations_original.hasOwnProperty(k));
      // const root = my_roots.length==1 ? my_roots[0] : null;
      const root=getURLParam("root", null);
      const createRoot=getURLParam("createRoot", "false");

      if ( createRoot === "true" ) {
        estimations[root] = { "tasks" : [] };
      }

      // TODO : find a nicer way for rebuilding the tree from scratch and remove usage of jquery
      $("#tree_tasks").empty();
      $("#tree_tasks").append("<div class='content'></div>");
      createJSTree(
        $('#tree_tasks'), 
        $('#tree_tasks .content'), 
        $('#bTreeSearch'), 
        null,
        estimations, 
        roles, 
        typeActivities, 
        config, 
        root, 
        $('#select_activity'),
        $('#edit_node'),
        $('#new_task'),
        $('#col_selector')
      );
    }
  }
}


document.addEventListener('DOMContentLoaded', function() {
  // ------------------------------------------------------------------- Listeners
  
  document.getElementById('bRender').addEventListener('click', function(){
    generatesTree();
  });
  
  // ------------------------------------------------------------------------ Main
  collapsable(document);
  
  $( function() {
    $( ".tabs" ).tabs();
  });
  
  // Cleanup
  lsDelJSON('config');
  lsDelJSON('roles');
  lsDelJSON('types');
  lsDelJSON('project');
  lsDelJSON('estimations');
  
  // Get the data in order. Maybe some data is not specified
  var container=null;
  fetchJSONFile(getURLParam("config"), function(config) {
    container=document.getElementById('load_config');
    setListenerUploadJSON(container, 'config');
    if ( !config ) config = {};
    saveData(container, 'config', config);
  
    fetchJSONFile(getURLParam("roles"), function(roles) {
      container=document.getElementById('load_roles');
      setListenerUploadJSON(container, 'roles');
      if ( !roles ) roles = [];
      saveData(container, 'roles', roles);
  
      fetchJSONFile(getURLParam("types"), function(typeActivities) {
        container=document.getElementById('load_types');
        setListenerUploadJSON(container, 'types');
        if ( !typeActivities ) typeActivities = {};
        saveData(container, 'types', typeActivities);
  
        fetchJSONFile(getURLParam("project"), function(project) {
          container=document.getElementById('load_project');
          setListenerUploadJSON(container, 'project');
          if ( !project ) project = null;
          saveData(container, 'project', project);
  
          fetchJSONFile(getURLParam("estimations"), function(estimations) {
            container=document.getElementById('load_estimations');
            setListenerUploadJSON(container, 'estimations');
            // In estimations because it can have includes, we need a callback to 
            // render when all the data has been loaded
            if ( getURLParam("createRoot", "false") === "true" ) {
                if ( !estimations ) estimations={};
               const root=getURLParam("root", null);
               estimations[root] = { "tasks" : [] };
            }

            if ( estimations ) {
              saveData(container, 'estimations', estimations, function() {
                generatesTree();
              });
            }
          });
        });
      });
    });
  });
});
