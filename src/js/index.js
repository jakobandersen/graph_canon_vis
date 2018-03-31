"strict";

class TNode {
  constructor(createTime, parent) {
    this.parent = parent;

    // event data
    this.createTime = createTime;
    this.refineAbortTime = null;
    this.destroyTime = null;
    this.pruneTime = null;
    this.canonTime = null;
    this.canonEndTime = null;

    // gui
    this.selected = false;
    this.pruned = false;
    this.refineAbort = false;
    this.canon = false;
    this.wasCanon = false;
  }

  setSettings(settings, parseSettings) {
    // from base classes this should be called first
    this.selected =
      this.createTime != null && settings.time == this.createTime ||
      this.destroyTime != null && parseSettings.withDestroy && settings.time == this.destroyTime
      ;
    this.pruned = this.pruneTime != null && settings.time >= this.pruneTime;
    this.refineAbort = this.refineAbortTime != null && settings.time >= this.refineAbortTime;
    this.canon = false;
    if(this.canonTime != null && settings.time >= this.canonTime) {
      if(this.canonEndTime == null || settings.time < this.canonEndTime)
        this.canon = true;
    }
    this.wasCanon = this.canonEndTime != null && settings.time >= this.canonEndTime;

    if(this.createTime != null && settings.time < this.createTime) {
      this.hide();
      return;
    }
    if(parseSettings.destroyNodes && this.destroyTime != null
        && settings.time > this.destroyTime) {
      this.hide();
      return;
    }
    this.show();
  }

  show() {
    this.wasVisible = this.visible;
    this.visible = true;
  }

  hide() {
    this.wasVisible = this.visible;
    this.visible = false;
  }
}

class TreeNode extends TNode {
  constructor(createTime, id, indVertex) {
    super(createTime, null);
    this.id = id;
    this.indVertex = indVertex;
    this.targetCell = null;
    this.partition = null;

    this.treeChildren = [];
    this.auts = [];
    this.children = [];

    // event data
    this.createEndTime = null;
    this.beforeDescendTimes = new Set();

    // used by gui
    this.visible = false;
    this.children = [];
    this.key = "t-" + this.id;
    this.cssClass = "node tnode";
    this.cssEdgeClass = "edge tedge";
  }

  setTargetAndPartition(createEndTime, targetCell, pi) {
    this.createEndTime = createEndTime;
    this.targetCell = targetCell;
    this.pi = pi;
    this.cellOf = [];
    for(let i = 0; i != this.pi.elements.length; ++i)
      this.cellOf.push(0);
    for(let iCell = 0; iCell != this.pi.cells.length; ++iCell) {
      let cell = this.pi.cells[iCell];
      let cellEnd = iCell + 1 == this.pi.cells.length
        ? this.pi.elements.length : this.pi.cells[iCell + 1];
      for(let i = cell; i != cellEnd; ++i)
        this.cellOf[this.pi.elements[i]] = cell;
    }
  }

  setRefineAbort(time) {
    this.refineAbortTime = time;
  }

  setDestroy(destroyTime) {
    this.destroyTime = destroyTime;
  }

  addBeforeDescend(time) {
    this.beforeDescendTimes.add(time);
  }

  setPrune(time) {
    this.pruneTime = time;
  }

  setCanon(time) {
    this.canonTime = time;
  }

  setCanonEnd(time) {
    this.canonEndTime = time;
  }

  setCanonWorse(time) {
    this.canonWorse = time;
  }

  setContent(div) {
    div.style('white-space', 'nowrap');
    let header = "Id: " + this.id;
    if(this.targetCell != null)
      header += ", Tar: " + this.targetCell;
    div.append('span').text(header);
    if(this.pi != null) {
      let pi = "(";
      for(let iCell = 0; iCell != this.pi.cells.length; ++iCell) {
        let cell = this.pi.cells[iCell];
        let cellEnd = iCell + 1 == this.pi.cells.length
          ? this.pi.elements.length : this.pi.cells[iCell + 1];
        pi += this.pi.elements[cell];
        for(let i = cell + 1; i < cellEnd; ++i) {
          pi += " " + this.pi.elements[i];
        }
        if(cellEnd != this.pi.elements.length) {
          pi += " | ";
        }
      }
      pi += ")";
      div.append('br');
      div.append('span')
        .text(pi);
    }
  }

  addChild(t) {
    t.parent = this;
    t.level = this.level + 1;
    this.treeChildren.push(t);
    this.children.push(t);
  }

  addLeafAut(createTime, to, perm) {
    console.assert(to != null, "");
    let a = new AutNode(createTime, this, perm, to);
    this.auts.push(a);
    this.children.push(a);
    return a;
  }

  addImplicitAut(createTime, tag, perm) {
    let a = new AutNode(createTime, this, perm, null);
    a.tag = tag;
    this.auts.push(a);
    this.children.push(a);
    return a;
  }

  setSettings(settings, parseSettings) {
    for(let t of this.treeChildren)
      t.setSettings(settings, parseSettings);
    for(let t of this.auts)
      t.setSettings(settings, parseSettings);
    super.setSettings(settings, parseSettings);
    if(this.beforeDescendTimes.has(settings.time))
      this.selected = true;
  }

  show() {
    super.show();
    this.children = this.treeChildren.concat(this.auts).filter(t => t.visible);
  }
}

class AutNode extends TNode {
  constructor(createTime, parent, perm, to = null) {
    super(createTime, parent);
    this.perm = perm;
    this.to = to;

    // event data

    // used by gui
    this.children = [];
    this.key = "a-" + parent.id + "-" + createTime;
    this.label = "Aut";
    this.cssClass = "node anode";
    this.cssEdgeClass = "edge aedge";
    if(to != null) this.isLeafAut = true;
  }

  setContent(div) {
    div.style('white-space', 'nowrap');
    let header = "Aut";
    if(!this.to) header += " implicit(" + this.tag + ")";
    div.append('span').text(header);
    div.append('br');
    let s = "";
    let printed = [];
    for(let i = 0; i != this.perm.length; ++i) printed.push(false);
    let anyPrinted = false;
  	for(let i = 0; i != printed.length; ++i) {
  		if(printed[i]) continue;
  		if(this.perm[i] == i) continue;
  		anyPrinted = true;
  		let start = i;
  		s += '(' + i;
  		printed[i] = true;
  		for(let next = this.perm[i]; next != start; next = this.perm[next]) {
  			console.assert(!printed[next]);
  			printed[next] = true;
        s += ' ' + next;
  		}
  		s += ')';
  	}
  	if(!anyPrinted) s += "(0)";
    div.append('span').text(s);
  }
}

class Tree {
    constructor() {
      this.root = null;
      this.nodes = new Map();
    }

    getNodeFromId(id) {
      if(id == null) return null;
      let n = this.nodes.get(id);
      if(n == undefined) return null;
      else return n;
    }

    add(t, parentId) {
      if(parentId != null) {
        let parent = this.nodes.get(parentId);
        console.assert(parent != undefined, "Parent id (%d) does not exist.", parentId);
        parent.addChild(t);
      } else {
        t.level = 0;
        this.root = t;
      }
      console.assert(this.nodes.get(t.id) == undefined, "Id (%d) already taken.", t.id);
      this.nodes.set(t.id, t);
    }

    addLeafAutomorphism(createTime, fromId, toId, perm) {
      let from = this.getNodeFromId(fromId);
      let to   = this.getNodeFromId(toId);
      console.assert(from, "From-id (%d) does not exist.", fromId);
      console.assert(to,     "To-id (%d) does not exist.", toId);
      return from.addLeafAut(createTime, to, perm);
    }

    addImplicitAutomorphism(createTime, id, tag, perm) {
      let t = this.getNodeFromId(id);
      console.assert(id, "Id (%d) does not exist.", id);
      return t.addImplicitAut(createTime, tag, perm);
    }

    setSettings(settings, parseSettings) {
      this.root.setSettings(settings, parseSettings);
    }
}

class Visualizer {
  dispose() {
    this.container.html("");
  }

  constructor(container, data, parseSettings) {
    this.container = d3.select(container);
    this.rawData = data;
    this.parseSettings = parseSettings;

    this.animationTime = 700;
    this.nodeRounding = 5;
    let width = this.width = $(this.container.node()).width();
    let height = this.height = $(this.container.node()).height();

    this.compileInput();
    this.createInterface();
    this.createGraphVis();

    // Set up graphics
    // =========================================================================
    let nodeSize = [100, 12*3*this.n];
    let zoom = d3.zoom().on("zoom", () => {
      this.svg.attr("transform", d3.event.transform);
    });
    this.svg = this.svg
      .attr("width", width)
      .attr("height", height)
      .call(zoom)
      .append("g");

    this.gfxTree = d3.hierarchy(this.tree.root, d => d.children);
    function saveChildren(tree) {
      tree._children = tree.children;
      if(!tree.children) return;
      for(let t of tree.children)
        saveChildren(t);
    }
    saveChildren(this.gfxTree);
    this.tree.setSettings({
      'time': this.events.length - 1
    }, this.parseSettings)
    this.layout = d3.tree()
      // rotated, and with margin
      .size([height, width])
      .nodeSize(nodeSize)
      .separation(function separation(a, b) {
        return 0.5;
      });

    this.updateGfx();
    this.updateSettings();
  }

  createGraphVis() {
    let distance = this.parseSettings.graphVertexDistance;
    let width = this.parseSettings.graphWidth;
    let height = this.parseSettings.graphHeight;
    let tick = () => {
      for(let g of this.graphVis.graphs) {
        g.selectAll('line')
          .attr("x1", (d) => d.source.x)
          .attr("y1", (d) => d.source.y)
          .attr("x2", (d) => d.target.x)
          .attr("y2", (d) => d.target.y)
          ;
        g.selectAll('g')
          .attr("transform", (d) => {return "translate(" + d.x + ", " + d.y + ")"})
          ;
      }
    };
    this.graphVis = {
      graphs: new Set(),
      width: width,
      height: height,
      radius: 15,
      dragStarted: (d) => {
        if(!d3.event.active)
          this.graphVis.simulation.alphaTarget(0.3).restart();
        d.fx = d.x;
        d.fy = d.y;
      },
      dragged: (d) => {
        d.fx = d3.event.x;
        d.fy = d3.event.y;
      },
      dragEnded: (d) => {
        if(!d3.event.active)
          this.graphVis.simulation.alphaTarget(0);
        d.fx = null;
        d.fy = null;
      },
      simulation: d3.forceSimulation(this.g.vertices)
        .force("link", d3.forceLink(this.g.edges).distance((d) => distance))
        .force("charge", d3.forceManyBody())
        .force("center", d3.forceCenter(width / 2, height / 2))
        .on("tick", tick),
    };
  }

  toogleTreeNode(d) {
    if(d.pi == undefined) return;
    if(d.graphVisWindow != undefined) {
      this.graphVis.graphs.delete(d.graphVisSvg);
      d.graphVisWindow.remove();
      d.graphVisWindow = undefined;
      d.graphVisSvg = undefined;
      return;
    }
    let cellOf = d.cellOf;

    let window = this.container
      .append('div')
      .style("width", this.graphVis.width)
      .style('display', 'inline-block')
      .style('border', '1px')
      .style('border-style', 'solid')
      .style('background-color', 'white')
      .style('position', 'absolute')
      .style("left", (d3.event.pageX - this.graphVis.width / 2) + "px")
      .style("top", (d3.event.pageY + 50) + "px");
    let header = window
      .append('div')
      .style('background-color', 'lightsteelblue');
    $(window.node()).draggable({ handle: header.node(), cursor: "grab" });

    header
      .append('span')
      .text('Id ' + d.id)
      .style('pointer-eventts', 'none')
      .style('padding-left', '2px');
    header
      .append('span')
      .style('float', 'right')
      .html('&times;')
      .style('padding-right', '2px')
      .style('cursor', 'pointer')
      .on('click', () => {
        this.toogleTreeNode(d);
      });
    let svg = window
      .append("svg")
      .attr("width", this.graphVis.width)
      .attr("height", this.graphVis.height);
    svg.selectAll('line')
      .data(this.g.edges)
      .enter()
      .append("line")
      .style("stroke", "black")
      .style("stroke-width", 1)
      ;
    let nodes = svg.selectAll('g')
      .data(this.g.vertices)
      .enter()
      .append('g')
      .call(d3.drag()
        .on("start", this.graphVis.dragStarted)
        .on("drag", this.graphVis.dragged)
        .on("end", this.graphVis.dragEnded)
      );
    nodes
      .append("circle")
      .attr("r", this.graphVis.radius)
      .style("stroke", "black")
      .style("fill", (d) => this.cellColours[cellOf[d.index]])
      ;
    nodes
      .append('text')
      .attr("text-anchor", "middle")
      .attr("dominant-baseline", "central")
      .style("pointer-events", "none")
      .text((d) => d.index)
    this.graphVis.graphs.add(svg);
    this.graphVis.simulation.restart();
    d.graphVisWindow = window;
    d.graphVisSvg = svg;
  }

  compileInput() {
    this.tree = new Tree();
    let es = this.events = [];
    let data = [];
    // compile input
    let prev = null;
    let currentCanon = null;
    for(let e of this.rawData) {
      // e.g., the before_descend event can happen multiple times in row
      if(JSON.stringify(prev) == JSON.stringify(e)) continue;
      data.push(e);
      prev = e;
      switch(e.type) {
        case "graph":
          this.n = e.graph.n;
          let vertices = [];
          for(let i = 0; i != this.n; ++i)
            vertices.push({});
          let edges = [];
          for(let edge of e.graph.edges)
            edges.push({source: edge.src, target: edge.tar})
          this.g = {vertices: vertices, edges: edges};
          break;
        case "tree_create_node_begin": {
          let t = new TreeNode(es.length, e.id, e.ind_vertex);
          this.tree.add(t, e.parent);
          es.push(e);
          break;}
        case "tree_create_node_end": {
          let t = this.tree.getNodeFromId(e.id);
          t.setTargetAndPartition(es.length, e.target_cell, e.pi);
          //es.push(e);
          break;}
        case "refine_abort": {
          let t = this.tree.getNodeFromId(e.id);
          t.setRefineAbort(es.length);
          //es.push(e);
          break;}
        case "tree_destroy_node": {
          let t = this.tree.getNodeFromId(e.id);
          t.setDestroy(es.length);
          if(this.parseSettings.withDestroy)
            es.push(e);
          break;}
        case "tree_before_descend": {
          if(!this.parseSettings.withBeforeDescend) break;
          let t = this.tree.getNodeFromId(e.id);
          t.addBeforeDescend(es.length);
          es.push(e);
          break;}
        case "tree_prune_node": {
          let t = this.tree.getNodeFromId(e.id);
          t.setPrune(es.length);
          es.push(e);
          break;}
        case "canon_new_best": {
          if(currentCanon) currentCanon.setCanonEnd(es.length);
          let t = this.tree.getNodeFromId(e.id);
          currentCanon = t;
          t.setCanon(es.length);
          es.push(e);
          break;}
        case "canon_worse": {
          let t = this.tree.getNodeFromId(e.id);
          t.setCanonWorse(es.length);
          es.push(e);
          break;}
        case "automorphism_leaf": {
          let t = this.tree.addLeafAutomorphism(es.length, e.from, e.to, e.perm);
          es.push(e);
          break;}
        case "automorphism_implicit": {
          let t = this.tree.addImplicitAutomorphism(es.length, e.id, e.tag, e.perm);
          es.push(e);
          break;}
      }
    }
    this.data = data;
  }

  createInterface() {
    let div = this.container
      .append("div")
      .style("padding-bottom", 5);
    this.log = this.container
      .append("div").append("span").text("Final search tree.");
    this.svg = this.container
      .append("svg")
      .attr("style", "border: 1px solid;");
    let legend = this.container
      .append("div")
      .style("padding-top", 5);
    let colours = this.container
      .append("div")
      .style("padding-top", 5);

    let makeBox  = function(s, r, l) {
      let rect = legend.append("svg")
        .attr("width", "1.8ex").attr("height", "1.8ex")
        .attr("class", "node " + s)
        .append("rect")
        .attr("width", "1.8ex").attr("height", "1.8ex");
      if(r != null)
        rect.attr("class", r)
      legend.append("span")
        .style("padding-left", 5)
        .style("padding-right", 20)
        .text(l);
    };
    makeBox("tnode", null, "Ordinary tree node")
    makeBox("tnode", "selected", "Tree node of interest for current event")
    makeBox("tnode", "pruned", "Pruned tree node")
    makeBox("tnode", "refineAborted", "Tree node with aborted refinement")
    makeBox("tnode", "canon", "Current best candidate leaf")
    makeBox("tnode", "wasCanon", "Leaf that was once the best candidate")
    makeBox("tnode", "canonWorse", "Leaf that was worse than the current best leaf at the time of construction")
    makeBox("anode", null, "(With two edges) Explicit automorphism")
    makeBox("anode", null, "(With one edge) Implicit automorphism")

    div.append('label').attr("for", "time").text("Time: ");
    div.append('input')
      .attr('id', 'time')
      .attr('required', true)
      .attr('pattern', '[1-9][0-9]*')
      .attr("type", "numeric")
      .attr("value", this.events.length + 1)
      .attr("style", "width: 50; text-align: right;")
      .on("keyup", () => {
        if(d3.event.which === 13) $("#update").click();
      });
    div.append('input')
      .attr("id", "update")
      .attr("type", "button")
      .attr("value", "Update")
      .on("click", this.updateSettings.bind(this));
    div.append('input')
      .attr("type", "button")
      .attr("value", "Prev")
      .on("click", () => {
        let time = parseInt($("#time").val());
        if(!time) return;
        if(time == 1) return;
        --time;
        $("#time").val(time);
        this.updateSettings();
      });
    div.append('input')
      .attr("id", "next")
      .attr("type", "button")
      .attr("value", "Next")
      .on("click", () => {
        let time = parseInt($("#time").val());
        if(!time) return;
        ++time;
        $("#time").val(time);
        this.updateSettings();
      });
    div.append('label').attr("for", "animationTime").text("Animation Time: ");
    div.append('input')
      .attr('id', 'animationTime')
      .attr('required', true)
      .attr('pattern', '[1-9][0-9]*')
      .attr("type", "numeric")
      .attr("value", this.animationTime)
      .attr("style", "width: 50; text-align: right;");
    div.append('label').attr("for", "delay").text("Delay: ");
    div.append('input')
      .attr('id', 'delay')
      .attr('required', true)
      .attr('pattern', '[1-9][0-9]*')
      .attr("type", "numeric")
      .attr("value", 50)
      .attr("style", "width: 50; text-align: right;");
    div.append('input')
      .attr("type", "button")
      .attr("value", "Play")
      .on("click", () => {
        if(this.interval) return;
        let animationTime = parseInt($("#animationTime").val());
        if(!animationTime) return;
        if(animationTime < 10) animationTime = 10;
        this.animationTime = animationTime;
        $("#animationTime").val(animationTime);

        let delay = parseInt($("#delay").val());
        if(!delay) return;
        if(delay < 10) delay = 10;
        $("#delay").val(delay);

        this.interval = setInterval(() => {
          let time = parseInt($("#time").val());
          if(time > this.events.length) {
            clearInterval(this.interval);
            this.interval = null;
          }
          $("#next").click();
        }, animationTime + delay);
      });
      div.append('input')
        .attr("type", "button")
        .attr("value", "Stop")
        .on("click", () => {
          if(!this.interval) return;
          clearInterval(this.interval);
          this.interval = null;
        });

      // colours for ordered partitions
      colours
        .append('div').append('span').text('Partition colours:')
      let p = colours.append('div')
      this.cellColours = [];
      for(let i = 0; i != this.n; ++i) {
        let c = 'hsl(' + (i*360/this.n) + ', 100%, 50%)';
        this.cellColours.push(c);
        p.append('span').text(i)
          .style('display', 'inline-block')
          .style('width', 100/this.n + "%")
          .style('box-sizing', 'border-box')
          .style('height', "3ex")
          .style('border', '1px')
          .style('border-style', 'solid')
          .style('text-align', 'center')
          .style('background-color', c)
          ;
      }
  }

  updateSettings() {
    let time = parseInt($("#time").val());
    if(!time) return;
    if(time <= 1) {
      time = 1;
      $("#time").val(time)
    }
    if(time > this.events.length + 1) {
      time = this.events.length + 1;
      $("#time").val(time)
    }
    --time;
    let msg = (() => {
      if(time == this.events.length)
        return "Final search tree.";
      let nodeIdToMsg = id => {
        let t = this.tree.getNodeFromId(id);
        let ancenstors = [];
        for(let p = t; p.parent; p = p.parent)
          ancenstors.push(p);
        ancenstors.reverse();
        let s = "T<";
        if(ancenstors.length == 0) s += ">";
        else {
          s += ancenstors[0].indVertex;
          for(let i = 1; i != ancenstors.length; ++i)
            s += " " + ancenstors[i].indVertex;
          s += ">";
        }
        s += " (id=" + t.id + ")";
        return s;
      }
      let event = this.events[time];
      switch(event.type) {
        case "tree_create_node_begin":
          return "Construction of node " + nodeIdToMsg(event.id) + " begins.";
        case "tree_create_node_end":
          return "Construction of node " + nodeIdToMsg(event.id) + " ends.";
        case "refine_abort":
          return "Construction of node " + nodeIdToMsg(event.id) + " is aborted during refinement.";
        case "tree_destroy_node":
          return "Node " + nodeIdToMsg(event.id) + " is deallocated.";
        case "tree_before_descend":
          return "Node " + nodeIdToMsg(event.id) + " is updated before creating/inspecting its children.";
        case "tree_prune_node":
          return "Node " + nodeIdToMsg(event.id) + " is pruned from the tree.";
        case "canon_new_best":
          return "Node " + nodeIdToMsg(event.id) + " is marked as the best candidate for a canonical ordering.";
        case "canon_worse":
          return "Node " + nodeIdToMsg(event.id) + " is a leaf, but worse than the current best leaf.";
        case "automorphism_leaf":
          return "An explicit automorphism is discovered by comparing nodes " + nodeIdToMsg(event.from) + " and " + nodeIdToMsg(event.to) + ".";
        case "automorphism_implicit":
          return "An implicit automorphism is discovered from node " + nodeIdToMsg(event.id) + ".";
        default:
          msg = "TODO: make pretty messge for event: " + JSON.stringify(event);
          break;
      }
    })();
    this.log.text(msg);
    let settings = {
      'time': time
    };
    this.tree.setSettings(settings, this.parseSettings);
    this.updateGfx();
  }

  updateGfx() {
    function updateChildren(tree) {
      if(!tree._children) return;
      tree.children = tree._children.filter(t => t.data.visible);
      if(tree.children.length == 0) {
        tree.children = null;
        return;
      }
      tree.children.forEach(updateChildren);
    }
    updateChildren(this.gfxTree);

    let self = this;
    function setCoords(tree, visibleAncenstor) {
      let x = tree.x;
      let y = tree.y;
      tree.y = tree.data.y = x + self.height / 2;
      tree.x = tree.data.x = y + 100;
      if(!visibleAncenstor) {
        // set the initial cooridnates
        tree.x0 = tree.data.x0 = tree.x;
        tree.y0 = tree.data.y0 = tree.y;
      }
      if(!tree.parent || tree.data.wasVisible) {
        visibleAncenstor = tree;
      } else if(!tree.data.wasVisible) {
        tree.x0 = tree.data.x0 = visibleAncenstor.x0;
        tree.y0 = tree.data.y0 = visibleAncenstor.y0;
      }

      if(tree.children == undefined) return tree;
      for(let c of tree.children)
        setCoords(c, visibleAncenstor);
      return tree;
    }
    let t = setCoords(this.layout(this.gfxTree));
    let gfxNodes = t.descendants();

    let nodeSelection = this.updateGfxNodes(gfxNodes);
    this.updateGfxTreeEdges(gfxNodes);
    this.updateGfxLeafAutEdges(gfxNodes);

    nodeSelection.each(function(d) {
      d.x0 = d.data.x0 = d.x;
      d.y0 = d.data.y0 = d.y;
      d.data.wasVisible = true;
    });
  }

  updateGfxNodes(gfxNodes) {
    let selection = this.svg.selectAll('g.node')
      .data(gfxNodes, d => d.data.key);
    let enter = selection.enter().append('g');
    let update = enter.merge(selection);
    let exit = selection.exit();
    let self = this;

    // Create
    // =========================================================================
    enter
      .attr('class', d => d.data.cssClass)
      .attr("transform", function(d) {
        let x = d.x0;
        let y = d.y0;
        if(x == undefined) {
          // TODO: find out why this is needed
          x = d.x;
          y = d.y;
        }
        return "translate(" + x + "," + y + ")";
      });
    let shape = enter.append('rect')
      .attr('class', d => d.data.cssClass)
      .attr('rx', this.nodeRounding)
      .attr('ry', this.nodeRounding)
      .on('click', (d) => this.toogleTreeNode(d.data))
      ;
    enter.filter(d => d.data.parent != null)
      .append('text')
      .attr('x', -2)
      .attr('y', -3)
      .attr('text-anchor', 'end')
      .text(d => d.data.indVertex);
    // Content
    // -------------------------------------------------------------------------
    let fo = enter.append('foreignObject');
    let div = fo.append('xhtml:div')
      .style('pointer-events', 'none')
      .attr("id", d => d.data.key + "_l")
      // https://stackoverflow.com/questions/36776313/chrome-returns-0-for-offsetwidth-of-custom-html-element
      .style('display', 'inline-block');
    // Actual node content
    div.each(function(d) {
      d.data.setContent(d3.select(this));
    });
    // Set sizes for the foreginObject and the node shape
    // -------------------------------------------------------------------------
    fo.each(function(d) {
      let div = $("#" + d.data.key + "_l");
      d.data.width = div.outerWidth();
      d.data.height = div.outerHeight();
    });
    fo.each(function(d) {
      let w = d.data.width;
      let h = d.data.height;
      d3.select(this)
        .attr('width', w)
        .attr('height', h)
        .attr('x', self.nodeRounding)
        .attr('y', -h / 2);
    });
    shape.each(function(d) {
      let w = d.data.width;
      let h = d.data.height;
      d3.select(this)
        .attr('width', w + 2 * self.nodeRounding)
        .attr('height', h + 2 * self.nodeRounding)
        .attr('x', 0)
        .attr('y', -h / 2 - self.nodeRounding);
    });

    // Update
    // =========================================================================
    update.transition()
  	  .duration(this.animationTime)
  	  .attr("transform", d => "translate(" + d.x + "," + d.y + ")");
    update.select("rect")
      .attr("class", d => {
        let c = d.data.cssClass;
        if(d.data.selected) c += " selected";
        if(d.data.pruned) c += " pruned";
        if(d.data.refineAbort) c += " refineAborted";
        if(d.data.canon) c += " canon";
        if(d.data.wasCanon) c += " wasCanon";
        if(d.data.canonWorse) c += " canonWorse";
        return c;
      });

    // Exit
    // =========================================================================
    exit.transition()
      .duration(this.animationTime)
      .attr("transform", function(d) {
        let p = d.parent;
        if(!p) return; // TODO: hmm, should that happen?
        while(!p.data.visible) p = p.parent;
        return "translate(" + p.x + "," + p.y + ")";
      })
      .remove();

    return update;
  }

  updateGfxTreeEdges(gfxNodes) {
    let selection = this.svg.selectAll('path.edge')
      .data(gfxNodes.filter(d => d.data.parent != null), d => d.data.key);
    let enter = selection.enter().insert('path', "g");
    let update = enter.merge(selection);
    let exit = selection.exit();

    // Create
    // =========================================================================
    enter
      .attr('class', d => d.data.cssEdgeClass)
      .attr('d', d => {
        let x = d.x0;
        let y = d.y0;
        let s = {'x': x, 'y': y};
        let t = {'x': d.parent.x0 + d.parent.data.width, 'y': d.parent.y0};
        return this.gfxDiagonal(s, t);
      });

    // Update
    // =========================================================================
    update.transition()
      .duration(this.animationTime)
      .attr('d', d => {
        let s = {'x': d.x, 'y': d.y};
        let t = {'x': d.parent.x + d.parent.data.width, 'y': d.parent.y};
        return this.gfxDiagonal(s, t);
      });

    // Exit
    // =========================================================================
    exit.transition()
      .duration(this.animationTime)
      .attr('d', d => {
        let p = d.parent;
        while(!p.data.visible) p = p.parent;
        let s = {'x': p.x + p.data.width, 'y': p.y};
        return this.gfxDiagonal(s, s);
      })
     .remove();
  }

  updateGfxLeafAutEdges(gfxNodes) {
    let selection = this.svg.selectAll('path.laedge')
      .data(gfxNodes.filter(d => d.data.isLeafAut != null), d => d.data.key);
    let enter = selection.enter().insert('path', "g");
    let update = enter.merge(selection);
    let exit = selection.exit();

    // Create
    // =========================================================================
    enter
      .attr('class', 'edge laedge')
      .attr('d', d => {
        let x = d.x0;
        let y = d.y0;
        let s = {'x': d.data.to.x0 + d.data.to.width, 'y': d.data.to.y0};
        let t = {'x': x, 'y': y};
        return this.gfxDiagonal(s, t);
      });

    // Update
    // =========================================================================
    update.transition()
      .duration(this.animationTime)
      .attr('d', d => {
        let s = {'x': d.data.to.x + d.data.to.width, 'y': d.data.to.y};
        let t = {'x': d.x, 'y': d.y};
        return this.gfxDiagonal(s, t);
      });

    // Exit
    // =========================================================================
    exit.transition()
      .duration(this.animationTime)
      .attr('d', d => {
        let p;
        p = d.data.to;
        while(!p.visible) p = p.parent;
        let s = {'x': p.x0 + p.width, 'y': p.y0};

        p = d.parent;
        while(!p.data.visible) p = p.parent;
        let t = {'x': p.x, 'y': p.y};
        return this.gfxDiagonal(s, t);
      })
     .remove();
  }

  gfxDiagonal(s, d) {
    // Creates a curved (diagonal) path
    return `M ${s.x} ${s.y}
            C ${(s.x + d.x) / 2} ${s.y},
              ${(s.x + d.x) / 2} ${d.y},
              ${d.x} ${d.y}`
  }
}

let visualizer = null;
$(document).ready(function() {
  let outer = d3.select("body div");
  let div = outer.append("div");
  div.append("label")
    .text("Server-side logs:");
  let serverSideLogs = div.append("select")
    .attr("id", "serverSide");
  div.append("input")
    .attr("id", "logLoad")
    .attr("type", "button")
    .attr("value", "Load log");

  div = outer.append("div");
  div.style("padding-bottom", 5);
  div.append("input")
    .attr("id", "logUpload")
    .attr("type", "button")
    .attr("value", "Upload log");
  div.append("input")
    .attr("id", "logInput")
    .attr("type", "file");
  div.append("input")
    .attr("id", "logReload")
    .attr("type", "button")
    .attr("value", "Reload log");
  div.append("label")
    .text("Show 'destroy' events");
  div.append("input")
    .attr("id", "withDestroy")
    .attr("type", "checkbox");
  div.append("label")
    .text("Show 'before descend' events");
  div.append("input")
    .attr("id", "withBeforeDescend")
    .attr("type", "checkbox");
  div.append("label")
    .text("Destroy nodes");
  div.append("input")
    .attr("id", "destroyNodes")
    .attr("type", "checkbox");
  div.append("label")
    .text("Graph vertex distance");
  div.append("input")
    .attr("id", "graphVertexDistance")
    .attr('required', true)
    .attr('pattern', '[1-9][0-9]*')
    .attr("type", "numeric")
    .attr("value", 100)
    .style("width", 40)
    .style("text-align", "right")
    .style("margin-left", "2px");
    div.append("label")
      .text("Graph width")
      .style("margin-left", "2px");
    div.append("input")
      .attr("id", "graphWidth")
      .attr('required', true)
      .attr('pattern', '[1-9][0-9]*')
      .attr("type", "numeric")
      .attr("value", parseInt($(outer.node()).width()*0.8/3))
      .style("width", 40)
      .style("text-align", "right")
      .style("margin-left", "2px");
    div.append("label")
      .text("Graph height")
      .style("margin-left", "2px");
    div.append("input")
      .attr("id", "graphHeight")
      .attr('required', true)
      .attr('pattern', '[1-9][0-9]*')
      .attr("type", "numeric")
      .attr("value", 350)
      .style("width", 40)
      .style("text-align", "right")
      .style("margin-left", "2px");

  let container = outer.append("div")
      .style("width", "80%")
      .style("height", "700px");

  container = container.node();

  function getSettings() {
    let dist = parseInt($("#graphVertexDistance").val());
    let width = parseInt($("#graphWidth").val());
    let height = parseInt($("#graphHeight").val());
    if(dist < 20) dist = 20;
    if(width < 50) width = 50;
    if(height < 50) height = 50;
    $("#graphVertexDistance").val(dist);
    $("#graphWidth").val(width);
    $("#graphHeight").val(height);
    return {
      withDestroy: $("#withDestroy").prop("checked"),
      withBeforeDescend: $("#withBeforeDescend").prop("checked"),
      destroyNodes: $("#destroyNodes").prop("checked"),
      graphVertexDistance: dist,
      graphWidth: width,
      graphHeight: height,
    }
  };
  $("#logLoad").click(function() {
    let f = serverSideLogs.node().options[serverSideLogs.node().selectedIndex].value;
    $.getJSON("logs/" + f + ".json", log => {
      if(visualizer) visualizer.dispose();
      visualizer = new Visualizer(container, log, getSettings());
    }).fail(function(jqxhr, textStatus, error) {
      let err = textStatus + ", " + error;
      console.log("Loading of server-side log 'logs/" + f + ".json' failed:" + err);
    });
  });
  $("#logUpload").click(function() {
    let reader = new FileReader();
    reader.onload = function(event) {
        let log = JSON.parse(event.target.result);
        if(visualizer) visualizer.dispose();
        visualizer = new Visualizer(container, log, getSettings());
    };
    let fs = $("#logInput").prop("files");
    if(fs.length == 0) return;
    reader.readAsText(fs[0]);
  });
  $("#logReload").click(function() {
    if(!visualizer) return;
    let log = visualizer.rawData;
    visualizer.dispose();
    visualizer = new Visualizer(container, log, getSettings());
  });

  $.getJSON("logs.json", list => {
    for(let l of list) {
      serverSideLogs.append("option")
        .attr("value", l.file)
        .text(l.name);
    }
    $("#logLoad").click();
  }).fail(function(jqxhr, textStatus, error) {
    let err = textStatus + ", " + error;
    console.log("Loading list of server-side logs failed:" + err);
  });
});
