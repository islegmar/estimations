# Technical Notes

This is how the data is processed:
- Normalization (done once)
- Build data tree (done once)
- Compute the MDs (done every time tree is refreshed)

## Normalization

The initial data is in a "human" friendly format, so it is easy to write it. During the process we convert it in a "computer" friendly format, easy to prpcess.
The final format is different if the task is composed or simple.

Maybe for ALL the nodes we can have those **common** attributes that in some cases can be ""

    {
      "duration"    : number indicating days or "" if not set
      "notes"       : original value + the notes during the normalization process or "" if not set
      "assumptions" : original value or [] if not set
      "description" : original value or "" if not set
    }

### Composed

    { 
      <COMMON>
      "tasks" : [
        { "name" : "<name>", "weight" : "<weight or 1.0>", [<any other aytribute as description,....> => NOT set default values },
        ...
      ]
    }
        
### Simple

In this case we have more than a normalization because in this step we already perform some calculations using ohter config files (`config`, `roles` and `types`)

    {
      <COMMON>
      "effort" : { 
        "<rol>" : "<value>"   => rol ONLY if it is in roles (=> should we add all of them?)
      }
    }

## Tree node creation

Using as basis the task template's normalized data, a node is created in the tree


    {
      text : name,          => Used???
      name : name,          => The template's name
      data : { ===> This is where we keep all the data that is shown in the tree
        _original_node_config : my_flat_data,  => REMOVE

        isComposed : true|false   => If the template used is a Composed or not. Some checks/actions depend on that.

        # TEMPLATE values 
        # They are the one defined in the templates and do not change
        effort : {                => Template : number of MD per each rol
        },
        my_weight : <number>      => Weight
        assumptions : <string>    => Assumptions
        notes : "",               => Notes calculated with only the info from the template
        duration: <number>,       => Duration

        # EDITABLE values
        # Those values can be edited in  form
        weight : <number>         => Calculated taken into account the their parents' weights
        description : <string>    => Initial : template
        comments : <string>       => Initial : template

        # CALCULATED values
        # Those values are calculated automatically every time the tree is refreshed
        cost  : <formatted String> 
        md : {                    => Number of MD per each rol 
          <rol> : <formatted Number>
        },
        (*) notes
      },
      state : {
        opened : true,
        checked : true
      },
      children : [
         ...
      ]
    }
