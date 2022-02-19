import * as Log from './lib/log.js';
import { collapsable, lsGetJSON, lsSetJSON, getURLParam, fetchJSONFile, extendsJSON, loadExternal, removeCommentsFromJSON, loadLocalFiles } from './lib/utils.js';

import { updateConfiguration, getConfiguration, createJSTree } from './app/tree.js';
import { getFlatDataNormalized } from './app/estimations.js';

// ------------------------------------------------------------------- Functions
/**
 * Save JSON in local storage and put it in 'container' so we can take a look (debug).
 * The data can represent an object (usually this is the case) or an array (roles).
 * - Object:
 *   - Remove comments
 *   - Load _includes
 * Array:
 *   - Just store it.
 */
function saveData(container, name, data, callback) {
  Log.log_low_debug("saveData(name:" + name + "). isArray : " + Array.isArray(data));
  if ( data ) {
    if ( !Array.isArray(data) ) {
      removeCommentsFromJSON(data);
    }
    loadExternal(data, upd_data => {
      updateConfiguration(name, upd_data);
      container.querySelector(".content").innerHTML='';
      container.querySelector(".content").appendChild(renderjson.set_show_to_level('all')(getConfiguration(name)));
      if ( callback ) {
        callback(upd_data);
      }
    }, getURLParam("baseDataURL"));
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
      // several files, like with the estimations
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

  const root=getURLParam("root", null);

  // TODO : find a nicer way for rebuilding the tree from scratch and remove usage of jquery
  $("#tree_tasks").empty();
  $("#tree_tasks").append("<div class='content'></div>");
  createJSTree(
    $('#tree_tasks'), 
    $('#tree_tasks .content'), 
    $('#bTreeSearch'), 
    root, 
    $('#select_activity'),
    $('#edit_node'),
    $('#new_task'),
    $('#col_selector')
  );
}


document.addEventListener('DOMContentLoaded', function() {
  // ------------------------------------------------------------------- Listeners
  document.getElementById('bRender').addEventListener('click', function(){
    generatesTree();
  });
  collapsable(document);
  
  $( function() {
    $( ".tabs" ).tabs();
  });
  
  // ------------------------------------------------------------------------ Main
  
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
            // By default, create an empty project so we can start working
            if ( !estimations ) estimations = { "MyProject" : { "tasks" : [] }};

            // In estimations because it can have includes, we need a callback to 
            // render when all the data has been loaded
            saveData(container, 'estimations', estimations, function() {
              generatesTree();
            });
          });
        });
      });
    });
  });
});
