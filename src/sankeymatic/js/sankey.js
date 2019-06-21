d3.sankey = function() {
    "use strict";
     var sankey = {},
         nodeWidth = 24,
         nodePadding = 8,
         size = [1, 1],
         nodes = [],
         links = [],
         rightJustifyEndpoints = false,
         leftJustifyOrigins = false,
         curvature = 0.5;
   
     // ACCESSORS //
     sankey.curvature = function(x) {
       if (x === undefined) { return curvature; }
       curvature = +x;
       return sankey;
     };
   
     sankey.nodeWidth = function(x) {
       if (x === undefined) { return nodeWidth; }
       nodeWidth = +x;
       return sankey;
     };
   
     sankey.nodePadding = function(x) {
       if (x === undefined) { return nodePadding; }
       nodePadding = +x;
       return sankey;
     };
   
     sankey.nodes = function(x) {
       if (x === undefined) { return nodes; }
       nodes = x;
       return sankey;
     };
   
     sankey.links = function(x) {
       if (x === undefined) { return links; }
       links = x;
       return sankey;
     };
   
     sankey.size = function(x) {
       if (x === undefined) { return size; }
       size = x;
       return sankey;
     };
   
    sankey.rightJustifyEndpoints = function (x) {
       if (x === undefined) { return rightJustifyEndpoints; }
       rightJustifyEndpoints = x;
       return sankey;
     };
   
     sankey.leftJustifyOrigins = function (x) {
       if (x === undefined) { return leftJustifyOrigins; }
       leftJustifyOrigins = x;
       return sankey;
     };
   
     // FUNCTIONS //
   
     // valueSum: Add up all the 'value' keys from a list of objects (happens a lot):
     function valueSum(nodelist) {
       return d3.sum(nodelist, function(d) { return d.value; });
     }
   
     // computeNodeLinks: Populate the sourceLinks and targetLinks for each node.
     // Also, if the source and target are not objects, assume they are indices.
     function computeNodeLinks() {
       nodes.forEach(function(node) {
         node.sourceLinks = [];  // Links that have this node as source.
         node.targetLinks = [];  // Links that have this node as target.
       });
   
       links.forEach(function(link) {
         // Are either of the values just an index? Then convert to nodes:
         if (typeof link.source === "number") { link.source = nodes[link.source]; }
         if (typeof link.target === "number") { link.target = nodes[link.target]; }
   
         // Add this link to the affected source & target:
         link.source.sourceLinks.push(link);
         link.target.targetLinks.push(link);
       });
     }
   
     // computeNodeValues: Compute the value (size) of each node by summing the
     // associated links.
     function computeNodeValues() {
       // Each node will equal the greater of the flows coming in or out:
       nodes.forEach(function(node) {
         node.value = Math.max( valueSum(node.sourceLinks), valueSum(node.targetLinks) );
       });
     }
   
     // computeLinkDepths: Compute the y-offset of the source endpoint (sy) and
     // target endpoints (ty) of links, relative to the source/target node's y-position.
     function computeLinkDepths() {
       function ascendingSourceDepth(a, b) { return a.source.y - b.source.y; }
       function ascendingTargetDepth(a, b) { return a.target.y - b.target.y; }
   
       nodes.forEach(function(node) {
         node.sourceLinks.sort(ascendingTargetDepth);
         node.targetLinks.sort(ascendingSourceDepth);
       });
       nodes.forEach(function(node) {
         var sy = 0, ty = 0;
         node.sourceLinks.forEach(function(link) {
           link.sy = sy;
           sy += link.dy;
         });
         node.targetLinks.forEach(function(link) {
           link.ty = ty;
           ty += link.dy;
         });
       });
     }
   
     // computeNodeBreadths: Iteratively assign the breadth (x-position) for each node.
     // Nodes are assigned the maximum breadth of incoming neighbors plus one;
     // nodes with no incoming links are assigned breadth zero, while
     // nodes with no outgoing links are assigned the maximum breadth.
     function computeNodeBreadths() {
       var remainingNodes = nodes,
           nextNodes,
           x = 0;
   
       function updateNode(node) {
           // Set x-position and width:
           node.x = x;
           node.dx = nodeWidth;
           node.sourceLinks.forEach(function(link) {
             // Only add it to the nextNodes list if it is not already present:
             if (nextNodes.indexOf(link.target) === -1) {
               nextNodes.push(link.target);
             }
           });
       }
   
       function moveOriginsRight() {
         nodes.forEach(function(node) {
           // If this node is not the target for any others, then it's an origin
           if (!node.targetLinks.length) {
             // Now move it as far right as it can go:
             node.x = d3.min(node.sourceLinks, function(d) { return d.target.x; }) - 1;
           }
         });
       }
   
       function moveSinksRight(last_x_position) {
         nodes.forEach(function(node) {
           // If this node is not the source for any others, then it's a dead-end
           if (!node.sourceLinks.length) {
             // Now move it all the way to the right of the diagram:
             node.x = last_x_position;
           }
         });
       }
   
       function scaleNodeBreadths(kx) {
         nodes.forEach(function(node) { node.x *= kx; });
       }
   
       // Work from left to right.
       // Keep updating the breadth (x-position) of nodes that are targets of
       // recently-updated nodes.
       while (remainingNodes.length && x < nodes.length) {
         nextNodes = [];
         remainingNodes.forEach(updateNode);
         remainingNodes = nextNodes;
         x += 1;
       }
   
       // Force endpoint nodes all the way to the right?
       if (rightJustifyEndpoints) {
         moveSinksRight(x - 1);
       }
   
       // Force origins to appear just before their first target node?
       // (In this case, we have to do extra work to UN-justify these nodes.)
       if (!leftJustifyOrigins) {
         moveOriginsRight();
       }
   
       // Apply a scaling factor to the breadths to calculate an exact x-coordinate
       // for each node:
       scaleNodeBreadths( (size[0] - nodeWidth) / (x - 1) );
     }
   
     // computeNodeDepths: Compute the depth (y-position) for each node.
     function computeNodeDepths(iterations) {
       var alpha = 1,
           // Group nodes by column & make an iterator for each set:
           nodesByBreadth = d3.nest()
             // fixed this sort to actually be numeric so the columns are handled in order:
             .key(function(d) { return d.x; })
             .sortKeys( function(a,b) { return a - b; } )
             .entries(nodes)
             .map(function(d) { return d.values; });
   
       function initializeNodeDepth() {
         // Calculate vertical scaling factor for all nodes given the diagram height:
         var ky = d3.min(nodesByBreadth,
           function(nodes) {
             return (size[1] - (nodes.length - 1) * nodePadding) / valueSum(nodes);
           });
   
         nodesByBreadth.forEach(function(nodes) {
           nodes.forEach(function(node, i) {
             node.y = i; // i = a counter (0 - number of nodes at this level)
             // console.log(node.x, node.y, node.value);
             // scale every node's raw value to the final height in the graph
             node.dy = node.value * ky;
           });
         });
   
         // convert links' raw dy value to the scale of the graph
         links.forEach( function(link) { link.dy = link.value * ky; } );
       }
   
       // vertical_center: Y-position of the middle of a node.
       function vertical_center(node) { return node.y + node.dy / 2; }
   
       function resolveCollisions() {
         nodesByBreadth.forEach(function(nodes) {
           var current_node,
               y_distance,
               current_y = 0,
               nodes_in_group = nodes.length,
               i;
   
           // sort functions for determining what order items should be processed in:
           function ascendingDepth(a, b) { return a.y - b.y; }
   
           // Push any overlapping nodes down.
           nodes.sort(ascendingDepth);
           for (i = 0; i < nodes_in_group; i += 1) {
             current_node = nodes[i];
             y_distance = current_y - current_node.y;
             if (y_distance > 0) { current_node.y += y_distance; }
             current_y = current_node.y + current_node.dy + nodePadding;
           }
   
           // If the last/bottom-most node goes outside the bounds, push it back up.
           y_distance = current_y - nodePadding - size[1];
           if (y_distance > 0) {
             current_node.y -= y_distance;
             current_y = current_node.y;
   
             // From there, push any now-overlapping nodes back up.
             for (i = nodes_in_group - 2; i >= 0; i -= 1) {
               current_node = nodes[i];
               y_distance = current_node.y + current_node.dy + nodePadding - current_y;
               if (y_distance > 0) { current_node.y -= y_distance; }
               current_y = current_node.y;
             }
           }
         });
       }
   
       function relaxLeftToRight(alpha) {
         function weightedSource(link) {
           return (link.source.y + link.sy + link.dy / 2) * link.value;
         }
   
         nodesByBreadth.forEach(function(nodes) {
           nodes.forEach(function(node) {
             if (node.targetLinks.length) {
               // Value-weighted average of the y-position of source node centers
               // linked to this node:
               var y_position = d3.sum(node.targetLinks, weightedSource)
                   / valueSum(node.targetLinks);
               node.y += (y_position - vertical_center(node)) * alpha;
             }
           });
         });
       }
   
       function relaxRightToLeft(alpha) {
         function weightedTarget(link) {
           return (link.target.y + link.ty + link.dy / 2) * link.value;
         }
   
         nodesByBreadth.slice().reverse().forEach(function(nodes) {
           nodes.forEach(function(node) {
             if (node.sourceLinks.length) {
               // Value-weighted average of the y-positions of target node centers
               // linked to this node:
               var y_position = d3.sum(node.sourceLinks, weightedTarget)
                   / valueSum(node.sourceLinks);
               node.y += (y_position - vertical_center(node)) * alpha;
             }
           });
         });
       }
   
       //
       initializeNodeDepth();
       resolveCollisions();
       computeLinkDepths();
   
       while (iterations > 0) {
         iterations -= 1;
   
         // Make each round of moves progressively weaker:
         alpha *= 0.99;
         relaxRightToLeft(alpha);
         resolveCollisions();
         computeLinkDepths();
   
         relaxLeftToRight(alpha);
         resolveCollisions();
         computeLinkDepths();
       }
     }
   
     // SVG path data generator, to be used as "d" attribute on "path" element selection.
     sankey.link = function() {
       function link(d) {
         var x0 = d.source.x + d.source.dx, // x-end of prior-node
             x1 = d.target.x,               // x-beginning of next-node
             // construct a function for interpolating between the above two values:
             xi = d3.interpolateNumber(x0, x1),
             // pick two points given the curvature and its converse:
             x2 = xi(curvature),
             x3 = xi(1 - curvature),
             y0 = d.source.y + d.sy + d.dy / 2,
             y1 = d.target.y + d.ty + d.dy / 2;
         return "M" + x0 + "," + y0
              + "C" + x2 + "," + y0
              + " " + x3 + "," + y1
              + " " + x1 + "," + y1;
       }
   
       return link;
     };
   
     sankey.layout = function(iterations) {
       computeNodeLinks();
       computeNodeValues();
       computeNodeBreadths();
       computeNodeDepths(iterations);
       return sankey;
     };
   
     // Given a new set of node positions, calculate where the flows must now be:
     sankey.relayout = function() {
       computeLinkDepths();
       return sankey;
     };
   
     return sankey;
   };