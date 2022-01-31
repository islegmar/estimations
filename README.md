# Estimations

- [Overview](#overiew)
- [Learning by example](#learning-by-example)
  - [Just get some numbers](#just-get-some-numbers)
  - [Calculated fields](#calculated-fields)
  - [Millenials doing estimations](#millenials-doing-estimations)
  - [But, can be used at larger scale?](#but-can-be-used-at-larger-scale)
  - [I want more!!!](#i-want-more)
- [Using the sandbox](#using-the-sandbox)
- [The config files](#the-config-files)
  - [Estimations](#estimations-1)
  - [Estimations](#config)
  - [Roles](#roles)
  - [Type Activities](#typeactivities)
- [What's next](#whats-next)
- [Q&A](#qa)
- [Roadmap](#roadmap)

## Overview
This is a **reusable database** for a **rational** calculation of **efforts and costs** for a serie of **structured activities**.

What does it mean?
- Reusable : very often we have to estimate the same over and over again, so let's store them to reuse them later.
- Database : the main idea of the entire tool is the search for simplicity and in this case database just mean JSON to keep the data.
- Rational : usually when we do estimations (at least at certain level) we don't put directly the number of days a certain rol will be busy. We use other criterias like a team working por a period, .... This tool is able to manage those concepts.
- Efforts and Costs : this is the main objective, how many days will take and ... how much that would cost.
- Structured Activities : very important, this is **not** a planning tool but it allows the definition of a serie of activities, their parent - child relation and the efforts involved.

So let's start **learning by example**.

## Learning by example

### Just get some numbers

Our company is specialized in the devolopment of plugins for a well known CMS. We start a new project that consists in the development of 2 plugins. So at this stage the project is:
- 1 week of **Definition** with the customer
- **Development** of two Plugins

Before we start we have to configure the [roles](demo/data/config/roles.json) we are going to use so we can start to write down the activities and estimations.

First, the project has Definition and Development

    {
      "Project" : { "tasks" : ["Definition", "Development" }
    }

and now we have to provide value for the those phases:


**1 week of Definition**

Which are the roles involed in this activity? Let's suppose 1 PO at 100% and some BE / FE providing support (for example at 50%). If we put this info

    {
      "Project" : { "tasks" : ["Definition", "Development" ] },
      "Definition" : { "duration" : 7, "PO" : 1, "BE" : 0.5, "FE" : 0.5 }
    }

where the duration of 7 days correspond to 1 week.

**Development of two plugins**

Our company has very well stablished the development of a **standard** plugin.

    "Plugin standard" : { "duration" : 5, "BE" : 1, "FE" : 0.5}

that is: during 5 days, 1 BE at 100% and 1 FE at 50%

We have to develop 2  of them and our fist analysis:
- One plugin is an standard one
- The other more complex, used to browse AWS data, has the double of complexity:

We can put all together in [a file with the estimations](demo/data/projects/project01.json) that produces [the following result](index.html?roles=demo/data/config/roles.json&types=demo/data/config/typeActivities.json&estimations=demo/data/projects/project01.json&config=demo/data/config/config.json):
- An activity can appear more than once (in this case "Plugin standard") with a different **weight**.
- When an activity is used several times we can use the field **description**.
- The tree allows to deactivate some parts so the efforts and costs are adjusted.
- We get the sum of efforts and costs at all the levels.
- In **Notes** we get the rational description how the values are obtained, not just the total *cold* number that provides little information about where this value comes from.

### Calculated fields

A very common practice is that the effort for some roles are set while for others are **derived** of those. Let's suppose we have a rule like:
- Development effort is set from the values of BE and FE
- QA is a 30% of that development effort

Those kind of rules can be set in the file [typeActivities](demo/data/config/typeActivities.json).

    { 
      "development" : { 
        "_comment" : "Development tasks",
        "calculation" : "percentage",
        "base" : ["BE", "FE"], 
        "derived" : {
          "QA" : 0.3 
        }
      }
    }

What it says is that in a task of **type development** the effort of QA = 30% (BE+FE) (look at the calculation method *percentage*)

To introduce this change, we change the effort from:


    "STD Plugin" : { "duration" : 5, "BE" : 1, "FE" : 0.5}

to:

    "STD Plugin" : { "type" : "development", "duration" : 5, "BE" : 1, "FE" : 0.5}

As you can see the only modification is to add the new attribute **type** which value has to match with one of the keys in the file *typeActivities*. 

If we put [all together](demo/data/projects/project02.json) we get [this new view](index.html?roles=demo/data/config/roles.json&types=demo/data/config/typeActivities.json&estimations=demo/data/projects/project02.json&config=demo/data/config/config.json) where:
- The effort (and cost) of QA appears *magically*.
- In Notes is shown where this value of QA comes from.

### Millenials doing estimations

_Eveything looks fine but... you know... we are cooler and this things like the man day is so... baby boomer. For measuring we prefer use things as squads and the sizes of Sturbucks coffee cups_

I see, but a end we're talking about time... and money but nevertheless let's wee what can we do for you.

Our company is able to do something more than just plugins, so the customer has asked us to develop two modules that according our *size of coffee cups*:
- Module#1 : size S, it is just a piece of cake.
- Module#2 : size XL; really, no idea what is this about.

all this work will be done by one squad composed by:
- 2 BE
- 1 FE
- 1 QA

The first thing is to map the sizes we are using with days (remember, it is always time & money) in [the config file](demo/data/config/config.json).
To configure the squad we add the info in the file [typeActivities](demo/data/config/typeActivities.json)

    "red_squad" : { 
      "calculation" : "squad",
      "roles" : {
        "BE" : 2,
        "FE" : 1,
        "QA" : 0.3 
      }
    }

where:
- The calculation method is *squad* (before it was *percentage*)
- Under **roles** is the team composition.

Finally we have two add those two activities in or estimations

    "Module#1" : { "type" : "red_squad", "size" : "S" },
    "Module#2" : { "type" : "red_squad", "size" : "XL" },


Here you can see [the final file](demo/data/projects/project03.json) and the [demo](index.html?roles=demo/data/config/roles.json&types=demo/data/config/typeActivities.json&estimations=demo/data/projects/project03.json&config=demo/data/config/config.json)

### But, can be used at larger scale

Once we have more and more *standard* estimations to be reused, the amount of information makes it difficult to put it in one single file. To solve that we can use the **_includes** attribute in the files with the estimations.

In our company every department has very clear which are their duties so the PMO has defined [the activities](demo/data/includes/pmo.json) they usually perform. 

Also the Development environment has its [list of activities](demo/data/includes/development.json).

With this building blocks we can start to organize our project:

    {
      "_includes" : [ "pmo.json", "development.json" ],
      "My Project" : { 
        "tasks" : [ 
          "Meetings with the customer",
          "STD Module#1",
          "STD Module#2",
          "Project Acceptance"
        ]
      }
    }

Here you can see [the final file](demo/data/projects/project04.json) and the [demo](index.html?roles=demo/data/config/roles.json&types=demo/data/config/typeActivities.json&estimations=demo/data/projects/project04.json&config=demo/data/config/config.json&baseDataURL=demo/data/includes/)

### I want more!!!

_Ok, you have convinced me. Now: I want more!!!_

#### Default squad

If you're using the squad model and you have a default squad configuration, the you define its name in the [config](demo/data/config/config.default-squad.json) in the attribute **default\_squad**. Of course, you have to remember to [define its composition](demo/data/config/typeActivities.json).

Once we have this configuration in place define the effort can be so simple as 

    "Module#1" : { "size" : "S" }

Here you can see [the final file](demo/data/projects/project05.json) and the [demo](index.html?roles=demo/data/config/roles.json&types=demo/data/config/typeActivities.json&estimations=demo/data/projects/project05.json&config=demo/data/config/config.default-squad.json&baseDataURL=demo/data/includes/)

## Using the sandbox

TBD

## The config files

### estimations

This is the core file, where we're going to put the estimations. The idea is to keep it **as simple as possible** so it could be maintained manually, without the need of other tools.

It is a **flat map** that defines the **templates** of the activities. So, it **does not have** the tree structure we have seen in the demos. 

Every line in the map has the form:

    "<name activity>" : { [description, assumptions, notes] <config> }

where *name activity* must be unique inside the file.

All the activities can have the same optional attributes:
each of them with an specific config but also sharing some common attributes:
- **description** : string with a description.
- **notes** : string with custom notes that will be added to the ones that automatically generates the tool, as we have seen in the previous examples.
- **assumptions** : an array of strings with the assumptions for an activity.

We can distinguish two kind of activities:
- *Composed* by other activities
- *Simple* with the effort

#### Composed

They are composed by other activities and in its *expanded* form looks like:

    "MyActivity" : { 
      "tasks" : [
        { "name" : "MySubactivity#1, "weight" : <number>, "description" : <string> },
        { "name" : "MySubactivity#2, "weight" : <number>, "description" : <string> },
        ...
      ]
    }

where the names of the child activities can be again simple or composed.

It accepts a more *compact* form:

    "MyActivity" : { "tasks" : ["MySubactivity#1, "MySubactivity#2] }

where for both subactivities:
- weight : 1.0
- no adtional description

and both notations can be mixed:

    "MyActivity" : { 
      "tasks" : [
        "MySubactivity#1,
        { "name" : "MySubactivity#2, "weight" : 2., "description" : <string> },
        ...
      ]
    }

#### Simple

Here is we we get finally the numbers.

It has the form:

    "MyActivity" : { [type] [duration] [size] [rol1 : <number>, <rol2> : number .....] }

How is the *number of days* computed with this info? (remember, we still pay the people for the hours, not for the cup of coffess).

The calculation is done in two stages:
- In the first stage we look at the roles (if any) defined in the activity and ignore the **type** attribute.
- In the second we apply the effects of the **type** attribute.

*First stage*: 

The meaning of the number that goes with every rol depends on the other parameters:
- If exists the parameter **duration**, its value is the number of days the activity lasts and number with the rol indicates how many of that rol will be involved, where factions are allowed. So if duration=10 and BE=1.5 means 1.5 of the rol BE working during 10 days and that means 15 days of BE.
- If there are no **duration** the numbers of the roles is just the number of days for that rol.

So at the end of this stage we have a serie of roles with effort in days... except in an especial case, where there are no roles but well the attribute **size**, which value is a *fancy way* to specify the duration. In [this configuration file](demo/data/config/config.json) we can find the relation between sizes and durations. 


*Second stage*: 

Here is where the effect of the attribute **type** is applied. As we have seen, its value has to match with one the keys defined in [this configuration file](demo/data/config/typeActivities.json) and depending on the value of the attribute **calculation** associated to our type:
- *percentage* : the number of days for the roles in **derived** as calculated using as base the sum of the values of the ones defined in **base**.
- *squad* : its a serie of roles that compose the squad and the number for each indicates how many (similar to when we use the attribute duration). In order to compute the number of days we need the duration of the activity that, as we have seen before, is deduced from the value of **size**.

### config

TBD

### roles 

TBD

### typeActivities

TBD

## What's next?

Ok, I guess after this short introduction we get enough knowledge by your self. As I have mentioned before one of the main worries was to develop something simple that can be run out of the box, without no installation, so you can run it locally in your machines without installing anything, as it is indicated before.

But if you prefer to use it right now you you can go to the [sandbox](index.html) where you will be able to upload your own config files and see the estimations.

## Q&A

### Can I lunch my application locally?

If you access directly to the pages using a browser you are going to have CORS problem. In order to avoud it, two options:

If you have python installed:

    python3 -m http.server --directory web 9090

otherwise, run the browser in **insecure** mode:

    <chrome> --disable-web-security  --user-data-dir=~/chromeTemp

### Which is the best way to manage my own database of estimations?

TBD

## Roadmap:
- DONE : Add in **estimations** file the special attribute `"_includes" : <arrray URIs>`   that will include other files with estimations. That would allow the creation of a real database of reusable estimations that can be included when we do the estimations for an specific project (the main restimations file)
- DONE : In **config** define a `"default squad" : <name>`. With it the estimations can be so *clean* as `"activity1" : { "size" : "S" }, "activity2" : { "size" : "L" } ....`
- DONE : manage several root nodes
- DONE : Drag & drop in the tree with the recalculation of the data (see what to do with the weights on cascade if any in the original tree)
- DONE : possibility create and remove nodes in the tree
- DONE : Possibility of modify some nodes in the tree, like description, weights, ...
- DONE : When showing the combo with the activies: alphabetical order, add more info like if the task is Composed or Simple
- DONE : In Composed task, if duration is set, compute the size team
- DONE : Possibility of read several estimation files that are acumulative
- DONE : Export in CSV
- DONE : Export in JSON
- In **roles** add the attribute `Department` that will allow to get also the costs by department as the sum of the costs of all the roles in that department
- When exporting in CSV onfigure in config the fields to be exported and their order
- Import the exported JSON (that IS not the same as the original flat_data)
