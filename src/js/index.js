"strict";

var vis = null;

class Visualizer {
  constructor(container, log) {
    this.container = container;
    this.log = log;

    // create gui
    

    this.logTxt = $("<p></p>").html("Input:<br>" + JSON.stringify(log));
    this.container.append(this.logTxt);
  }
}

$(document).ready(function() {
  $("#logUpload").click(function() {
    var reader = new FileReader();
    reader.onload = function(event) {
        var log = JSON.parse(event.target.result);
        vis = new Visualizer($("#container"), log);
    };
    var fs = $("#logInput").prop("files");
    if(fs.length == 0) return;
    reader.readAsText(fs[0]);
  });
});
