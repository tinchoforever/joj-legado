// Dimensions of sunburst.
var width = 700;
var height = 600;
var radius = Math.min(width, height) / 2;
var myLocale = {
  "decimal": ",",
  "thousands": ".",
  "grouping": [3],
  "currency": ["$", ""],
  "dateTime": "%a %b %e %X %Y",
  "date": "%m/%d/%Y",
  "time": "%H:%M:%S",
  "periods": ["AM", "PM"],
  "days": ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"],
  "shortDays": ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"],
  "months": ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"],
  "shortMonths": ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"]
}
var localeFormatter =  d3.locale(myLocale);

var formatNumber = localeFormatter.numberFormat(",.f");

// Breadcrumb dimensions: width, height, spacing, width of tip/tail.
var b = {
  w: 75, h: 30, s: 3, t: 10
};
function google_colors(n) {
  var colores_g = ["#FFBA31", "#B14C72", "#32BE94", "#009DBF", "#ED605F"];
  return colores_g[n % colores_g.length];
}

// Mapping of step names to colors.
var colors = {
  "villa olímpica": "#FFBA31",
  "parque olímpico": "#B14C72",
  "centros de salud de villa lugano": "#32BE94",
  "puente lacarra": "#009DBF",
  "ramal caaguazu": "#ED605F",
  "decreto 433": "#FFBA31",
  "convocatoria abierta":"#FFBA31",
  "convocatoria directa":"#32BE94",
};

// Total size of all segments; we set this later, after loading the data.
var totalSize = 0; 

var vis = d3.select("#chart").append("svg:svg")
    .attr("width", width)
    .attr("height", height)
    .append("svg:g")
    .attr("id", "container")
    .attr("transform", "translate(" + width / 2 + "," + height / 2 + ")");

var partition = d3.layout.partition()
    .size([2 * Math.PI, radius * radius])
    .value(function(d) { return d.size; });

var arc = d3.svg.arc()
    .startAngle(function(d) { return d.x; })
    .endAngle(function(d) { return d.x + d.dx; })
    .innerRadius(function(d) { return Math.sqrt(d.y); })
    .outerRadius(function(d) { return Math.sqrt(d.y + d.dy); });

// Use d3.text and d3.csv.parseRows so that we do not need to have a header
// row, and can receive the csv as an array of arrays.
d3.csv("obras.csv", function(data) {
  var json = buildHierarchy(data);
  createVisualization(json);
});

// Main function to draw and set up the visualization, once we have the data.
function createVisualization(json) {

  // Basic setup of page elements.
  drawLegend();
  
  // Bounding circle underneath the sunburst, to make it easier to detect
  // when the mouse leaves the parent g.
  vis.append("svg:circle")
      .attr("r", radius)
      .style("opacity", 0);

  // For efficiency, filter nodes to keep only those large enough to see.
  var nodes = partition.nodes(json)
      .filter(function(d) {
      return (d.dx > 0.005); // 0.005 radians = 0.29 degrees
      });
  
  var path = vis.data([json]).selectAll("path")
      .data(nodes)
      .enter().append("svg:path")
      .attr("display", function(d) { return d.depth ? null : "none"; })
      .attr("d", arc)
      .attr("fill-rule", "evenodd")
      .style("fill", function(d) { 
        var c= colors[d.name.toLowerCase()];
        if(d.parent && d.parent.name != "root"){
          c = colors[d.parent.name.toLowerCase()];
          step = 0.5;
          if (!c){
           c= colors[d.parent.parent.name.toLowerCase()];
           step = step *2;
          }
          c = d3.hsl(c).brighter(step);  
          
        }
        

        return c;})
      .style("opacity", 1)
      .on("mouseover", mouseover);

  // Add the mouseleave handler to the bounding circle.
  d3.select("#container").on("mouseleave", mouseleave);

  // Get total size of the tree = value of root node from partition.
  totalSize = path.node().__data__.value;


  d3.select("svg")
    .append("text")
    .attr("class","label main")
     .attr('transform', 'translate(350, 260)')
      .attr("dy", "0.2em")
      .attr("text-anchor", "middle")
      .text("Elegí algún círcuclo.");

  d3.select("svg")
    .append("text")
    .attr("class","btn price")
     .attr('transform', 'translate(350, 230)')
      .attr("dy", "0.2em")
      .attr("text-anchor", "middle")
      .text("$");
  d3.select("svg")
    .append("text")
    .attr("class","btn small percentage")
     .attr('transform', 'translate(350, 210)')
      .attr("dy", "0.2em")
      .attr("text-anchor", "middle")
      .text("%");

 };
var formatDecimalComma = d3.format(",.f");

// Fade all but the current sequence, and show it in the breadcrumb trail.
function mouseover(d) {

  var percentage = (100 * d.value / totalSize).toPrecision(3);
  var percentageString = " (" +  percentage + "%)";
  var priceString =  "$" + formatDecimalComma(Math.round(d.value,2));
  if (percentage < 0.1) {
    percentageString = "< 0.1%";
  }

  d3.select("#percentage")
      .text(percentageString);
  
  var detail = " " ;
  if (d.parent.name != "root"){

    var l2 = d.parent;
    if (l2.parent.name != "root"){
      var l1 = l2.parent;
       detail += " fue utilizado en "+ toTitleCase(l1.name) + " con " + toFirstCase(l2.name) + " para " +  d.name.toUpperCase() ;
    }else {
      //tipo de compra de un proveedor.
      detail += " fue utilizado en "+ toTitleCase(l2.name) + " con " + toFirstCase(d.name);  
    }
    
  }else {
    //tipo de compra.
    detail += "fue utilizado en "+ toTitleCase(d.name);
  }
  
  insertLinebreaks(d3.select('svg text.label'), detail);
  d3.select('svg text.price').text(priceString);
  d3.select('svg text.percentage').text(percentageString);
 

  var sequenceArray = getAncestors(d);
  //updateBreadcrumbs(sequenceArray, percentageString);

  // Fade all the segments.
  d3.selectAll("path")
      .style("opacity", 0.3);

  // Then highlight only those that are an ancestor of the current segment.
  vis.selectAll("path")
      .filter(function(node) {
                return (sequenceArray.indexOf(node) >= 0);
              })
      .style("opacity", 1);

  $('#chart').animate({    
                    scrollLeft: 200
                }, 800);
}

// Restore everything to full opacity when moving off the visualization.
function mouseleave(d) {

  // Hide the breadcrumb trail
  d3.select("#trail")
      .style("visibility", "hidden");

  // Deactivate all segments during transition.
  d3.selectAll("path").on("mouseover", null);

  // Transition each segment to full opacity and then reactivate it.
  d3.selectAll("path")
      .transition()
      .duration(1000)
      .style("opacity", 1)
      .each("end", function() {
              d3.select(this).on("mouseover", mouseover);
              d3.select(this).on("click", mouseover);
            });

  d3.select("#explanation")
      .style("visibility", "hidden");
}

// Given a node in a partition layout, return an array of all of its ancestor
// nodes, highest first, but excluding the root.
function getAncestors(node) {
  var path = [];
  var current = node;
  while (current.parent) {
    path.unshift(current);
    current = current.parent;
  }
  return path;
}

function initializeBreadcrumbTrail() {
  // Add the svg area.
  var trail = d3.select("#sequence").append("svg:svg")
      .attr("width", width)
      .attr("height", 90)
      .attr("id", "trail");
  // Add the label at the end, for the percentage.
  trail.append("svg:text")
    .attr("id", "endlabel")
    .style("fill", "#000");
}

// Generate a string that describes the points of a breadcrumb polygon.
function breadcrumbPoints(d, i) {
  var points = [];
  points.push("0,0");
  points.push(b.w*4 + ",0");
  points.push(b.w*4 + b.t + "," + (b.h / 2));
  points.push(b.w*4 + "," + b.h);
  points.push("0," + b.h);
  if (i > 0) { // Leftmost breadcrumb; don't include 6th vertex.
    points.push(b.t + "," + (b.h / 2));
  }
  return points.join(" ");
}

// Update the breadcrumb trail to show the current sequence and percentage.
function updateBreadcrumbs(nodeArray, percentageString) {

  // Data join; key function combines name and depth (= position in sequence).
  var g = d3.select("#trail")
      .selectAll("g")
      .data(nodeArray, function(d) { return d.name + d.depth; });
 
  // Add breadcrumb and label for entering nodes.
  var entering = g.enter().append("svg:g");

  entering.append("svg:polygon")
      .attr("points", breadcrumbPoints)
      .style("fill", function(d) { return colors[d.name] ? colors[d.name] : "blue"; });

  entering.append("svg:text")
      .attr("x", (b.w*1.5 + b.t) / 2)
      .attr("y", b.h / 2)
      .attr("dy", "0.0em")
      .attr("text-anchor", "middle")
      .text(function(d) { return d.name; });

  // Set position for entering and updating nodes.
  g.attr("transform", function(d, i) {
    return "translate(" + i * (b.w*2+ b.s) + ", 0)";
  });

  // Remove exiting nodes.
  g.exit().remove();

  g.selectAll('text').each(insertLinebreaks);
  // Now move and update the percentage at the end.
  d3.select("#trail").select("#endlabel")
      .attr("x", (nodeArray.length + 0.25) * (b.w + b.s))
      .attr("y", b.h / 2)
      .attr("dy", "0.35em")
      .attr("text-anchor", "middle")
      .text(percentageString);

  // Make the breadcrumb trail visible, if it's hidden.
  d3.select("#trail")
      .style("visibility", "");

}

function drawLegend() {

  // Dimensions of legend item: width, height, spacing, radius of rounded rect.
  var li = {
    w: 75, h: 30, s: 3, r: 3
  };

  var legend = d3.select("#legend").append("svg:svg")
      .attr("width", li.w)
      .attr("height", d3.keys(colors).length * (li.h + li.s));

  var g = legend.selectAll("g")
      .data(d3.entries(colors))
      .enter().append("svg:g")
      .attr("transform", function(d, i) {
              return "translate(0," + i * (li.h + li.s) + ")";
           });

  g.append("svg:rect")
      .attr("rx", li.r)
      .attr("ry", li.r)
      .attr("width", li.w)
      .attr("height", li.h)
      .style("fill", function(d) { return d.value; });

  g.append("svg:text")
      .attr("x", li.w / 2)
      .attr("y", li.h / 2)
      .attr("dy", "0.35em")
      .attr("text-anchor", "middle")
      .text(function(d) { return d.key; });
}

function toggleLegend() {
  var legend = d3.select("#legend");
  if (legend.style("visibility") == "hidden") {
    legend.style("visibility", "");
  } else {
    legend.style("visibility", "hidden");
  }
}

// Take a 2-column CSV and transform it into a hierarchical structure suitable
// for a partition layout. The first column is a sequence of step names, from
// root to leaf, separated by hyphens. The second column is a count of how 
// often that sequence occurred.
function buildHierarchy(csv) {
  var root = {"name": "root", "children": []};
  for (var i = 0; i < csv.length; i++) {
    var size = +csv[i].precio_total;
    if (isNaN(size)) { // e.g. if this is a header row
      continue;
    }
    var parts = [];
    
    parts.push(csv[i]["tipo"]);
    parts.push(csv[i]["proveedor"]);
    parts.push(csv[i]["detalle"]);
    



    var currentNode = root;
    for (var j = 0; j < parts.length; j++) {
      var children = currentNode["children"];
      var nodeName = parts[j];
      var childNode;
      if (j + 1 < parts.length) {
   // Not yet at the end of the sequence; move down the tree.
  var foundChild = false;
  for (var k = 0; k < children.length; k++) {
    if (children[k]["name"] == nodeName) {
      childNode = children[k];
      foundChild = true;
      break;
    }
  }
  // If we don't already have a child node for this branch, create it.
  if (!foundChild) {
    childNode = {"name": nodeName, "children": []};
    children.push(childNode);
  }
  currentNode = childNode;
      } else {
  // Reached the end of the sequence; create a leaf node.
  childNode = {"name": nodeName, "size": size};
  children.push(childNode);
      }
    }
  }
  return root;
};

var insertLinebreaks = function (el,d) {
    var words = d.split(' ');
    el.text('');

    for (var i = 0; i < words.length; i=i+4) {
        var t = words[i] + " "; 
        t += (words[i+1] ? words[i+1] + " " : " ");
        t += (words[i+2] ? words[i+2]  + " ": " ");
        t += (words[i+3] ? words[i+3]  + " ": " ");

        var tspan = el.append('tspan').text(t);
        if (i > 0)
            tspan.attr('x', 0).attr('dy', '20');
    }
};


var toFirstCase = function(lower){
  return lower.toLowerCase().replace(/^\w/, function (chr) {
    return chr.toUpperCase();
  });
}

function toTitleCase(str) {
    return str.replace(
        /\w\S*/g,
        function(txt) {
            return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();
        }
    );
}