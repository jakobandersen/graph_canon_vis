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
      this.destroyTime != null && parseSettings.withDestroy && ettings.time == this.destroyTime
      ;
    this.pruned = this.pruneTime != null && settings.time >= this.pruneTime;
    this.refineAbort = this.refineAbortTime != null && settings.time >= this.refineAbortTime;
    this.canon = false;
    if(this.canonTime != null && settings.time >= this.canonTime) {
      if(this.canonEndTime == null || settings.time < this.canonEndTime)
        this.canon = true;
    }
    this.wasCanon = this.canonEndTime != null && settings.time >= this.canonEndTime;
    if(this.id == 1000 || this.id == 4) console.log(this);

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
    div.append('span')
      .attr('style', 'white-space: nowrap;')
      .text(header);
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

  addLeafAut(createTime, to) {
    console.assert(to != null, "");
    let a = new AutNode(createTime, this, to);
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
  constructor(createTime, parent, to = null) {
    super(createTime, parent);
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
    let header = "Aut";
    div.append('span')
      .attr('style', 'white-space: nowrap;')
      .text(header);
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

    addLeafAutomorphism(createTime, fromId, toId) {
      let from = this.getNodeFromId(fromId);
      let to   = this.getNodeFromId(toId);
      console.assert(from, "From-id (%d) does not exist.", fromId);
      console.assert(to,     "To-id (%d) does not exist.", toId);
      return from.addLeafAut(createTime, to);
    }

    setSettings(settings, parseSettings) {
      this.root.setSettings(settings, parseSettings);
    }
}

class Visualizer {
  constructor(container, data, parseSettings) {
    this.container = container;
    this.rawData = data;
    this.parseSettings = parseSettings;

    this.container.empty();
    this.compileInput();
    this.createInterface();

    // Set up graphics
    // =========================================================================
    this.duration = 750;
    this.nodeRounding = 5;

    let width = this.width = this.container.width();
    let height = this.height = this.container.height();
    let nodeSize = [100, 12*2*this.n];
    let zoom = d3.zoom().on("zoom", () => {
      this.svg.attr("transform", d3.event.transform);
    });
    this.svg = d3.select(this.container.get(0))
      .append("svg")
      .attr("style", "border: 1px solid;")
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

    // show input
    let t = "Input:";
    for(let e of this.data) {
      t += "<br>" + JSON.stringify(e);
    }
    this.logTxt = $("<p></p>").html(t);
    this.container.append(this.logTxt);
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
          let t = this.tree.addLeafAutomorphism(es.length, e.from, e.to);
          es.push(e);
          break;}
      }
    }
    this.data = data;
  }

  createInterface() {
    let div = d3.select(this.container.get(0))
      .append("div");
    div.append('label').attr("for", "time").text("Time: ");
    div.append('input')
      .attr('id', 'time')
      .attr('required', true)
      .attr('pattern', '[1-9][0-9]*')
      .attr("type", "numeric")
      .attr("value", this.events.length + 1)
      .attr("style", "width: 50; text-align: right;")
      ;


    div.append('input')
      .attr("type", "button")
      .attr("value", "Update")
      .on("click", this.updateSettings.bind(this));
    div.append('input')
      .attr("type", "button")
      .attr("value", "Prev")
      .on("click", () => {
        let time = parseInt($("#time").val());
        if(!time) return;
        --time;
        $("#time").val(time);
        this.updateSettings();
      });
    div.append('input')
      .attr("type", "button")
      .attr("value", "Next")
      .on("click", () => {
        let time = parseInt($("#time").val());
        if(!time) return;
        ++time;
        $("#time").val(time);
        this.updateSettings();
      });

      this.log = d3.select(this.container.get(0))
        .append("div").append("span").text("Final search tree.");
  }

  updateSettings() {
    let time = parseInt($("#time").val());
    if(!time) return;
    if(time <= 0) {
      time = 0;
      $("#time").val(time)
    }
    if(time > this.events.length + 1) {
      time = this.events.length + 1;
      $("#time").val(time)
    }
    --time;
    let msg = "";
    if(time == this.events.length) {
      msg = "Final search tree.";
    } else {
      let event = this.events[time];
      switch(event.type) {
        default:
          msg = "TODO: make pretty messge for event: " + JSON.stringify(event);
          break;
      }
    }
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
        return "translate(" + d.x0 + "," + d.y0 + ")";
      });
    let shape = enter.append('rect')
      .attr('class', d => d.data.cssClass)
      .attr('rx', this.nodeRounding)
      .attr('ry', this.nodeRounding);
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
      .attr("id", d => d.data.key + "_l")
      // https://stackoverflow.com/questions/36776313/chrome-returns-0-for-offsetwidth-of-custom-html-element
      .attr('style', 'display: inline-block;');
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
        .attr('height', h)
        .attr('x', 0)
        .attr('y', -h / 2);
    });

    // Update
    // =========================================================================
    update.transition()
  	  .duration(this.duration)
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
      .duration(this.duration)
      .attr("transform", function(d) {
        let p = d.parent;
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
        let s = {'x': d.x0, 'y': d.y0};
        let t = {'x': d.parent.x0 + d.parent.data.width, 'y': d.parent.y0};
        return this.gfxDiagonal(s, t);
      });

    // Update
    // =========================================================================
    update.transition()
      .duration(this.duration)
      .attr('d', d => {
        let s = {'x': d.x, 'y': d.y};
        let t = {'x': d.parent.x + d.parent.data.width, 'y': d.parent.y};
        return this.gfxDiagonal(s, t);
      });

    // Exit
    // =========================================================================
    exit.transition()
      .duration(this.duration)
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
        let s = {'x': d.data.to.x0 + d.data.to.width, 'y': d.data.to.y0};
        let t = {'x': d.x0, 'y': d.y0};
        return this.gfxDiagonal(s, t);
      });

    // Update
    // =========================================================================
    update.transition()
      .duration(this.duration)
      .attr('d', d => {
        let s = {'x': d.data.to.x + d.data.to.width, 'y': d.data.to.y};
        let t = {'x': d.x, 'y': d.y};
        return this.gfxDiagonal(s, t);
      });

    // Exit
    // =========================================================================
    exit.transition()
      .duration(this.duration)
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
  let body = d3.select("body");
  body.append("input")
    .attr("id", "logUpload")
    .attr("type", "button")
    .attr("value", "Upload log");
  body.append("input")
    .attr("id", "logInput")
    .attr("type", "file");
  body.append("input")
    .attr("id", "logReload")
    .attr("type", "button")
    .attr("value", "Reload log");
  body.append("label")
    .text("Show 'destroy' events");
  body.append("input")
    .attr("id", "withDestroy")
    .attr("type", "checkbox");
  body.append("label")
    .text("Show 'before descend' events");
  body.append("input")
    .attr("id", "withBeforeDescend")
    .attr("type", "checkbox");
  body.append("label")
    .text("Destroy nodes");
  body.append("input")
    .attr("id", "destroyNodes")
    .attr("type", "checkbox");
  body.append("div")
    .attr("id", "container")
    .style("width", "80%")
    .style("height", "700px");


  function getSettings() {
    return {
      withDestroy: $("#withDestroy").prop("checked"),
      withBeforeDescend: $("#withBeforeDescend").prop("checked"),
      destroyNodes: $("#destroyNodes").prop("checked"),
    }
  };
  $("#logUpload").click(function() {
    let reader = new FileReader();
    reader.onload = function(event) {
        var log = JSON.parse(event.target.result);
        visualizer = new Visualizer($("#container"), log, getSettings());
    };
    let fs = $("#logInput").prop("files");
    if(fs.length == 0) return;
    reader.readAsText(fs[0]);
  });
  $("#logReload").click(function() {
    if(!visualizer) return;
    visualizer = new Visualizer($("#container"), visualizer.rawData, getSettings());
  });

  $.getJSON("log.json", log => {
    visualizer = new Visualizer($("#container"), log, getSettings());
  })
});
