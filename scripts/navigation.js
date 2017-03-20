

// some colour variables
  var tcBlack = "#130C0E";

// rest of vars
var w = 960,
    h = 800,
    maxNodeSize = 60,
    nodeSize = 40,
    x_browser = 20,
    y_browser = 25,
    root,
    nodesMap = {},
    otherNodes,
    dataRoot,
    linksList;
 
var vis;
var pathsSVG;
var nodesSVG;
var force = d3.layout.force(); 
var zoom = d3.behavior.zoom();

var mainKey = 'name';

function generateNodeID(node) {
  node.id = node[mainKey].replace(/(,|&|\||\s)/g,"_").toLowerCase();
  return node.id;
}

function generateLinkID(link) {
  return link.source.id + '-' + link.target.id;
}

function processNodes(nodesList) {
  var id;
  var rootNode;
  nodesList.forEach(function(node) {
    id = generateNodeID(node);
    if (!nodesMap[id]) {
      node.id = id;
      nodesMap[id] = node;
    }
  });

  nodesList.forEach(function(node) {
    if (node.children) {
      node.children = node.children.map(function(node) {
        id = generateNodeID(node);
        return nodesMap[id];
      });

      if (!node.expand) {
        node._children = node.children;
        node.children = null;
      }

      if (!rootNode && node.root) {
        rootNode = node;
      }
    }
  });

  if (!rootNode) {
    rootNode = nodesList[0];
  }

  return rootNode;
}

vis = d3.select("#vis").append("svg").attr("width", w).attr("height", h);
d3.select("#vis").append("svg").call(zoom);

d3.json("data/navigation.json", function(json) {
  dataRoot = json;


  // Build the path
  var defs = vis.insert("svg:defs")
      .data(["end"]);


  defs.enter().append("svg:path")
      .attr("d", "M0,-5L10,0L0,5");
 
  pathsSVG = vis.insert("svg:g").attr("class", "paths");
  nodesSVG = vis.insert("svg:g").attr("class", "nodes");

  root = processNodes(dataRoot.nodes);
  root.fixed = true;
  root.x = w / 2;
  root.y = h / 4;

  update();
});

function setIds(nodes, offset) {
  nodes.forEach(function(node) {
    if (!node.id) {
      node.id = ++offset;
    }
  });
}

function findNodeByKey(nodes, key) {
  for (var i=0; i<nodes.length; ++i) {
    if (nodes[i][mainKey] === key) {
      return nodes[i];
    }
  }
  return null;
}

function createMap(nodes) {
  var map = {};
  nodes.forEach(function(d) {
    map[d[mainKey]] = d;
  });
  return map;
}

function processLinks(nodes, nodesLinks) {
  var links = [];
  var nodesMap = createMap(nodes);
  var source, target;
  nodesLinks.forEach(function(link) {
    source = nodesMap[link.source];
    if (!source) {
      source = findNodeByKey(otherNodes, link.source);
      if (source) {
        //source.id = nodes.length;
        nodes.push(source);
        nodesMap[link.source] = source;
      }
    }

    target = nodesMap[link.target];
    if (!target) {
      target = findNodeByKey(otherNodes, link.target);
      if (target) {
        //target.id = nodes.length;
        nodes.push(target);
        nodesMap[link.target] = target;
      }
    }

    if (source && target) {
      links.push({
        source: source,
        target: target
      });
    }
  });

  return links;
}

var resetHighlight = function() {
  d3.select("svg").classed("highlight", false);
  d3.selectAll(".highlight").classed("highlight", false);
};
 
/**
 *   
 */
function update() {
  var nodes = flatten(root);
      //nodesLinks = processLinks(nodes, dataRoot.links);
  linksList = d3.layout.tree().links(nodes);
 
  // Restart the force layout.
  force.nodes(nodes)
        .links(linksList)
        .gravity(0.05)
    .charge(-1000)
    .chargeDistance(300)
    .linkDistance(150)
    .friction(0.5)
    .linkStrength(function(l, i) {return 0.6; })
    .size([w, h])
    .on("tick", tick)
        .start();
 
   var path = pathsSVG.selectAll("path.link")
      .data(linksList, generateLinkID);
 
    path.enter().insert("svg:path")
      .attr("id", generateLinkID)
      .attr("class", "link")
      .style("stroke", "#eee");
 
 
  // Exit any old paths.
  path.exit().remove();
 
 
 
  // Update the nodes…
  var node = nodesSVG.selectAll("g.node")
      .data(nodes, function(d) { return d.id; });
 
 
  // Enter any new nodes.
  var nodeEnter = node.enter().append("svg:g")
      .attr("id", function(d) { 
        return d.id;
      })
      .attr("class", function(d) { 
        var className = "node";
        if (d.children) {
          className += " expanded";
        } else if (d._children){
          className += " collapsed";
        }
        return className;
      })
      //.attr("transform", function(d) { return "translate(" + d.x + "," + d.y + ")"; })
      .on("click", click)
      .call(force.drag);
 
  // Append a circle
  nodeEnter.append("svg:circle")
      //.attr("r", function(d) { return Math.sqrt(d.size) / 50 || 4.5; })
      .attr("r", nodeSize/2)

  // Append images
  var images = nodeEnter.append("svg:image")
        .attr("xlink:href",  function(d) { return d.img;})
        .attr("x", function(d) { return -nodeSize/2;})
        .attr("y", function(d) { return -nodeSize/2;})
        .attr("height", nodeSize)
        .attr("width", nodeSize);

  var onNodeHover = function(d) {
    d3.select("svg").classed("highlight", true);
    d3.select("#" + d.id).classed("highlight", true);
    linksList.forEach(function(link) {
      var nodeID;
      var linkID
      if (link.source == d) {
        nodeID = link.target.id;
      } else if (link.target == d) {
        nodeID = link.source.id;
      }
      if (nodeID) {
        console.log(d3.select(nodeID), d3.select(generateLinkID(link)));
        d3.select("#" + nodeID).classed("highlight", true);
        d3.select("#" + generateLinkID(link)).classed("highlight", true);
      }
    })
  };

  // make the image grow a little on mouse over and add the text details on click
  var setEvents = images
          // Append hero text
          .on( 'click', function (d) {
              if (d) {
                d3.select(".title").html("<a href='" + d.link + "' >"  + d[mainKey] + " ⇢"+ "</a>");
                d3.select(".description").html(d.description);
              }
           })

          .on( 'mouseenter', onNodeHover)
          // set back
          .on( 'mouseleave', resetHighlight);

  // Append hero name on roll over next to the node as well
  nodeEnter.append("text")
      .attr("class", "nodetext")
      .attr("x", x_browser)
      .attr("y", y_browser +15)
      .text(function(d) { return d[mainKey]; });
 
  // Exit any old nodes.
  node.exit().remove();

  // Re-select for update.
  path = pathsSVG.selectAll("path.link");
  node = nodesSVG.selectAll("g.node");

  function tick() {
    path.attr("d", function(d) {
       var dx = d.target.x - d.source.x,
           dy = d.target.y - d.source.y,
           dr = Math.sqrt(dx * dx + dy * dy);
       return "M" + d.source.x + "," 
              + d.source.y 
              //+ "A" + dr + "," 
              //+ dr + " 0 0,1 " 
              + "L"
              + d.target.x + "," 
              + d.target.y;
    });
    node.attr("transform", nodeTransform);    
  }
}


/**
 * Gives the coordinates of the border for keeping the nodes inside a frame
 * http://bl.ocks.org/mbostock/1129492
 */ 
function nodeTransform(d) {
    d.x =  Math.max(maxNodeSize, Math.min(w - (d.imgwidth/2 || 16), d.x));
    d.y =  Math.max(maxNodeSize, Math.min(h - (d.imgheight/2 || 16), d.y));
    return "translate(" + d.x + "," + d.y + ")";
   }

/**
 * Toggle children on click.
 */ 
function click(d) {
  if (d3.event.defaultPrevented) return; // ignore drag
  if (d.children) {
    d._children = d.children;
    d.children = null;
    d3.select(this).classed("collapsed", true);
    d3.select(this).classed("expanded", false);
  } else if (d._children) {
    d.children = d._children;
    d._children = null;
    d3.select(this).classed("collapsed", false);
    d3.select(this).classed("expanded", true);
  } else {
    d3.select(this).classed("collapsed", false);
    d3.select(this).classed("expanded", false);
  }
 
  if (d.children || d._children) {
    resetHighlight();
    update();
  }
}


/**
 * Returns a list of all nodes under the root.
 */ 
function flatten(root) {
  var nodes = [];
 
  function recurse(node) {
    if (!node.x) {
      node.x = w / 2;
      node.y = h / 2;
    }
    if (node.children) {
      node.children.forEach(recurse);
    }

    nodes.push(node);
  }
 
  recurse(root);
  return nodes;
}