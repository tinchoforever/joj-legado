var chartDiv = d3.select('#chart').node();



var defaults = {
  width: chartDiv.getBoundingClientRect().width -20,
  height: 400   ,
  uid:"chart", 
  margin: {top: 50, right: 0, bottom: 0, left: 0}, 
  child: "name", 
  value: "value"
}; 

var cf = defaults; 
var margin = cf.margin,
    width = cf.width,
    height = cf.height - margin.top - margin.bottom,
    formatNumber = d3.format(",d"),
    transitioning;

  // Great way to do a tooltip. 
 var tooltip = d3.select("body")
  .append("div")
  .style("position", "absolute")
  .style("z-index", "10")
  .style("visibility", "hidden")
  .style("color", "white")
  .style("padding", "8px")
  .style("background-color", "rgba(0, 0, 0, 0.75)")
  .style("border-radius", "6px")
  .style("font", "12px sans-serif")
  .text("tooltip"); 
  
 // Format number depending on the value: 
  function formatNumber(d_) {
    // this function can be called as formatNumber_tangible_data, which is in scripts.js 
    var d = Math.abs(d_); 
    var decs = Math.floor(d) == 0? d - Math.floor(d): d % Math.floor(d) ;
    if(decs == 0) d_ = Math.round(d_);  
    if(d > 100000) return d3.format(",d")(Math.round(d_));
    if(d > 10000) return d3.format("d")(Math.round(d_)); 
    if(decs == 0) return d3.format("d")(Math.round(d_)); 
    if( d > 10 &  decs > 0.1) return d3.format(".1f")(d_); 
    if( d > 10 & decs <= 0.1) return d3.format(".0f")(d_); 
    if( d > 0 & decs  > 0.01) return d3.format(".2f")(d_); 
    if( d > 0 & decs <= 0.01) return d3.format("e")(d_);
    return d3.format("s")(d_); 
  }

function make_title(d){
  console.log("making_title", d); 
       return d[cf.child] ? d[cf.child] + " (" + formatNumber(d[cf.value]) + ")" : d.key + " (" + formatNumber(d[cf.value]) + ")";
    }

function google_colors(n) {
var colores_g = ["#3366cc", "#dc3912", "#ff9900", "#109618", "#990099", "#0099c6", "#dd4477", "#66aa00", "#b82e2e", "#316395", "#994499", "#22aa99", "#aaaa11", "#6633cc", "#e67300", "#8b0707", "#651067", "#329262", "#5574a6", "#3b3eac"];
return colores_g[n % colores_g.length];
}

var x = d3.scale.linear()
    .domain([0, width])
    .range([0, width]);

var y = d3.scale.linear()
    .domain([0, height])
    .range([0, height]);

var treemap = d3.layout.treemap()
    .children(function(d, depth) { return depth ? null : d._children; })
    .sort(function(a, b) { return a.value - b.value; })
    .ratio(height / width * 0.5 * (1 + Math.sqrt(5)))
    .round(false);

var svg = d3.select("#chart").append("svg")
    .attr("width", width + margin.left + margin.right)
    .attr("height", height + margin.bottom + margin.top)
    .style("margin-left", -margin.left + "px")
    .style("margin.right", -margin.right + "px")
    .classed("treemap-svg", true)
  .append("g")
    .attr("transform", "translate(" + margin.left + "," + margin.top + ")")
    .style("shape-rendering", "crispEdges");

var grandparent = svg.append("g")
    .attr("class", "grandparent");

grandparent.append("rect")
    .attr("y", -margin.top)
    .attr("width", width)
    .attr("height", margin.top);

grandparent.append("text")
    .attr("x", 6)
    .attr("y", 6 - margin.top)
    .attr("dy", "1.3em");

function reSortRoot(root,value_key) {
    //console.log("Calling");
    for (var key in root) {
      if (key == "key") {
        root.name = root.key;
        delete root.key;
      }
      if (key == "values") {
        root.children = [];
        for (item in root.values) {
          root.children.push(reSortRoot(root.values[item],value_key));
        }
        delete root.values;
      }
      if (key == value_key) {
        root.value = parseFloat(root[value_key]);
        delete root[value_key];
      }
    }
    return root;
  }
d3.csv("legado-compras.csv", function(csv) {

      // Add, remove or change the key values to change the hierarchy. 
      var nested_data =  d3.nest()
        .key(function(d) { return d.Agruparea; })
        .sortKeys(d3.ascending)
        .key(function(d) { return d.IniciativaResumen; })
        .sortKeys(d3.ascending)
        .key(function(d) { return d.NombreExt; })
        .sortKeys(d3.ascending)
        .entries(csv)
      
      // Creat the root node for the treemap
      var root = {};
      
      // Add the data to the tree
      root.key = "Obras JOJ";
      root.values = nested_data;
    
      // Change the key names and children values from .next and add values for a chosen column to define the size of the blocks
      root = reSortRoot(root,"Total");
      
      // DEBUG
      //$("#rawdata").html(JSON.stringify(root));
  
  //var names = d3.map(root, function(d){return d[cf.;}).keys()
  //console.log("names", names); 
  initialize(root);
  accumulate(root);
  layout(root);
  display(root);
  
  function initialize(root) {
    root.x = root.y = 0;
    root.dx = width;
    root.dy = height;
    root.depth = 0;
  }

  // Aggregate the values for internal nodes. This is normally done by the
  // treemap layout, but not here because of our custom implementation.
  // We also take a snapshot of the original children (_children) to avoid
  // the children being overwritten when when layout is computed.
  function accumulate(d) {
    return (d._children = d.children)
        ? d.value = d.children.reduce(function(p, v) { return p + accumulate(v); }, 0)
        : d.value;
  }

  // Compute the treemap layout recursively such that each group of siblings
  // uses the same size (1×1) rather than the dimensions of the parent cell.
    // This optimizes the layout for the current zoom state. Note that a wrapper
  // object is created for the parent node for each group of siblings so that
  // the parent’s dimensions are not discarded as we recurse. Since each group
  // of sibling was laid out in 1×1, we must rescale to fit using absolute
  // coordinates. This lets us use a viewport to zoom.
  function layout(d) {
    if (d._children) {
      treemap.nodes({_children: d._children});
      d._children.forEach(function(c) {
        c.x = d.x + c.x * d.dx;
        c.y = d.y + c.y * d.dy;
        c.dx *= d.dx;
        c.dy *= d.dy;
        c.parent = d;
        layout(c);
      });
    }
  }
  
  function display(d) {
    //c20.domain(names)
    grandparent
        .datum(d.parent)
        .on("click", transition)
      .select("text")
        .text(name(d));

    var g1 = svg.insert("g", ".grandparent")
        .datum(d)
        .attr("class", "depth");

    var g = g1.selectAll("g")
        .data(d._children)
      .enter().append("g");

    g.filter(function(d) { return d._children; })
        .classed("children", true)
        .on("click", transition);

    g.selectAll(".child")
        .data(function(d) { return d._children || [d]; })
      .enter().append("rect")
        .attr("class", "child")
        .call(rect)
    ;

    g.append("rect")
        .attr("class", "parent")
        .call(rect)
      // .append("title")
      //  .text(function(d) { return formatNumber(d.value); });
    .on("mouseover", function(d) {
              tooltip.html(make_title(d));
              tooltip.transition();
              return tooltip.style("visibility", "visible").style("opacity", 1) //transition().duration(5000).style("opacity", 0);
          })
          .on("mousemove", function() {
              tooltip.style("opacity", 1);
              return tooltip.style("top", (d3.event.pageY-10)+"px").style("left",(d3.event.pageX+10)+"px");
          })
          .on("mouseout", function(){return tooltip.style("visibility", "hidden");});

    g.append("text")
        .attr("dy", ".75em")
        .text(function(d) { return d.name  })
        .call(text);
    
    // g.append("text.sub")
    //     .attr("dy", "1em")
    //     .text(function(d) { return " $"  + formatNumber(d.value);  })
    //     .call(text);
    // g.selectAll("text").each(insertLinebreaks)
    
    //console.log("rects", g.selectAll("rect")); 

    function transition(d) {
      if (transitioning || !d) return;
      if (!d._children[0].name) return;
      transitioning = true;


      var g2 = display(d);
          //console.log("displayed", g2);
      var t1 = g1.transition().duration(750),
          t2 = g2.transition().duration(750);

      // Update the domain only after entering new elements.
      x.domain([d.x, d.x + d.dx]);
      y.domain([d.y, d.y + d.dy]);

      // Enable anti-aliasing during the transition.
      svg.style("shape-rendering", null);

      // Draw child nodes on top of parent nodes.
      svg.selectAll(".depth").sort(function(a, b) { return a.depth - b.depth; });

      // Fade-in entering text.
      g2.selectAll("text").style("fill-opacity", 0);

      // Transition to the new view.
      t1.selectAll("text").call(text).style("fill-opacity", 0);
      t2.selectAll("text").call(text).style("fill-opacity", 1);
      t1.selectAll("rect").call(rect);
      t2.selectAll("rect").call(rect);
      //g.selectAll("text").each(function(s){console.log("s",s)});
     
      // Remove the old node when the transition is finished.
      t1.remove().each("end", function() {
        svg.style("shape-rendering", "crispEdges");
        transitioning = false;
      });
      
      //t2.each("end", wrapAll);;
    }
    return g;
  }

  function text_size(d){
    var dx = x(d.x + d.dx) - x(d.x); 
    var dy = y(d.y + d.dy) - y(d.y); 
    var ref = (cf.width*cf.height) / (760 * 400); 
    var ss = 10 + 220 * ref * dx*dy/(cf.width*cf.height); 
    //console.log("size", ss, dx,dy); 
    var s = Math.floor(Math.max(9, ss)); 
    return s;
  }
  
  function wrap_size(d){
    var w = x(d.x + d.dx) - x(d.x); 
    var text = d3.select(this); 
    var self = this;
    var cl = self.getComputedTextLength(); 
    var fs = parseFloat(text.style("font-size")); 
    var ss = w / cl * fs /3.4; 
    ss = Math.max(12,ss) + "px"; 
    var len = d.name.length; 
    /*console.log("name", d.name, 
                "length", len,
                "font", fs, 
                "cl" , cl,
                "cl/len", cl /len,
                "w", w, 
                "prop", w / cl, 
                "ss", ss
               );
    */
    text.style("font-size", ss); 
    text.attr("dy", ".65em"); 
  }

  function text(text) {
    text
      //.style("font-size", function(d){return wrap_txt(d)})
      .attr("x", function(d) { return x(d.x) + 6; })
      //.attr("dx", function(d) {return x(d.x + d.dx) - x(d.x)})
      .attr("y", function(d) { return y(d.y) + Math.max(6,text_size(d) /10); })
      .attr("width", function(d) { return x(d.x + d.dx) - x(d.x); })
    
    text.each(wrap_size);
  }

  
  function color_rect(d,i){
    //console.log("col", d, i); 
    return c20(d.name); 
  }

  function rect(rect) {
    rect.attr("x", function(d) { return x(d.x); })
        .attr("y", function(d) { return y(d.y); })
        .attr("width", function(d) { return x(d.x + d.dx) - x(d.x); })
        .attr("height", function(d) { return y(d.y + d.dy) - y(d.y); })
        .style("fill", function(d,i){return google_colors(i)})
        .style("fill-opacity", 0.6);
  }

  function name(d) {
    return d.parent
        ? name(d.parent) + " // "  + d.name: d.name;
  }
});

var insertLinebreaks = function (d) {
    el = d3.select(this);
    var words = el.text().split(' ');
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
