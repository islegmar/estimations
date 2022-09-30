/**
 * Utilities fo manage the form's data
 * NOTE: I know this is reinventing the wheel but it is now the fastest.
 */

/**
 * Return an object with the form's data.
 * NOTE: container can be anby container, not must be a <form>
 * TODO: find a nicer for hide_and_seek and the use of parentNode (ideals with CSS)
 */
export function getData(eContainer, hide_and_seek=true) {
  var data={};
  eContainer.querySelectorAll("input, text, select").forEach( ele => {
    if ( !hide_and_seek || ele.parentNode.style.display !== "none") {
      data[ele.name]=ele.value;
    }
  });

  return data;
}


/**
 * Set the data for a form.
 * NOTE: container can be anby container, not must be a <form>
 * TODO: find a nicer for hide_and_seek and the use of parentNode (ideals with CSS)
 */
export function setData(eContainer, data, hide_and_seek=true) {
  eContainer.querySelectorAll("input, text, select").forEach( ele => {
    if ( data.hasOwnProperty(ele.name) ) {
      ele.parentNode.style.display="";
      ele.value = data[ele.name];
    } else if ( hide_and_seek ) {
      ele.parentNode.style.display="none";
    }
  });
}
