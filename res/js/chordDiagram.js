chordDiagram = function(_parentElement, _data, _region){
    this.parentElement = _parentElement;
    this.data = _data;
    this.displayData = _data;
    this.region = _region;

    this.initVis();
};


chordDiagram.prototype.initVis = function() {
    var vis = this;

    // $("#"+vis.parentElement).empty();
    vis.margin = { top: 60, right: 60, bottom: 30, left: 60};
    vis.width = $("#"+vis.parentElement).width() - vis.margin.left - vis.margin.right;
    vis.height = 500 - vis.margin.top - vis.margin.bottom;


    vis.innerRadius = Math.min(vis.width, vis.height) * .45;
    vis.outerRadius = vis.innerRadius * 1.2;

    vis.colorScheme = d3.schemeSet2;
    vis.opacityDefault = 0.9;

    vis.colorScale = d3.scaleOrdinal()
        // .domain(d3.range(vis.names.length))
        .range(vis.colorScheme);

    vis.chord = d3.chord()
        .padAngle(.01)
        .sortChords(d3.descending);

    vis.arc = d3.arc()
        .innerRadius(vis.innerRadius*1.05)
        .outerRadius(vis.outerRadius);

    vis.path = d3.ribbon()
        .radius(vis.innerRadius);

    vis.svg = d3.select("#" + vis.parentElement).append("svg")
        .attr("width", vis.width + vis.margin.left + vis.margin.right)
        .attr("height", vis.height + vis.margin.top + vis.margin.bottom)
        .append("g")
        .attr("transform", "translate(" + (vis.width/2 + vis.margin.left) + "," + (vis.height/2 + vis.margin.top) + ")");





    vis.wrangleData();
}


chordDiagram.prototype.wrangleData = function(){
    var vis = this;

    vis.indexByName = new Map;
    vis.nameByIndex = new Map;

    vis.station_count = new Map;


    vis.top_stations = [];

    vis.matrix = [];

    vis.n = 0;


    if(vis.region == true){
        //build region matrix

        vis.data.forEach(function (d) {
            if (!vis.station_count.has(d['start_region']) && !vis.station_count.has(d['end_region'])) {
                vis.station_count.set(d['start_region'], 0);
                vis.station_count.set(d['end_region'], 0);

            } else if (!vis.station_count.has(d['start_region'])) {
                vis.station_count.set(d['start_region'], 0);
                vis.station_count.set(d['end_region'], vis.station_count.get(d['end_region']) + 1);

            } else if (!vis.station_count.has(d['end_region'])){
                vis.station_count.set(d['end_region'], 0);

                vis.station_count.set(d['start_region'], vis.station_count.get(d['start_region']) + 1);

            } else{
                vis.station_count.set(d['start_region'], vis.station_count.get(d['start_region']) + 1);
                vis.station_count.set(d['end_region'], vis.station_count.get(d['end_region']) + 1);
            }
        });

        vis.data.forEach(function(d){

            if (!vis.indexByName.has(d = (d['start_region']))) {
                vis.nameByIndex.set(vis.n, d);
                vis.indexByName.set(d, vis.n++);
            }


        });


        vis.data.forEach(function(d){

            var source = vis.indexByName.get(d['start_region']);
            var target = vis.indexByName.get(d['end_region']);
            var row = vis.matrix[source];
            if (!row) row = vis.matrix[source] = Array.from({length: vis.n}).fill(0);
            row[target] ++;


        });

        // vis.displayData = vis.matrix;

    } else{

        var regionSelection = d3.select("#region-drop").property("value");

        if(regionSelection != 'Total'){
            vis.displayData = vis.data.filter(function(d){
                return d['start_region'] == regionSelection && d['end_region'] == regionSelection;
            });
        }


        //building station matrix
        vis.displayData.forEach(function (d) {
            if (!vis.station_count.has(d['start_station']) && !vis.station_count.has(d['end_station'])) {
                vis.station_count.set(d['start_station'], 0);
                vis.station_count.set(d['end_station'], 0);

            } else if (!vis.station_count.has(d['start_station'])) {
                vis.station_count.set(d['start_station'], 0);
                vis.station_count.set(d['end_station'], vis.station_count.get(d['end_station']) + 1);

            } else if (!vis.station_count.has(d['end_station'])){
                vis.station_count.set(d['end_station'], 0);

                vis.station_count.set(d['start_station'], vis.station_count.get(d['start_station']) + 1);

            } else{
                vis.station_count.set(d['start_station'], vis.station_count.get(d['start_station']) + 1);
                vis.station_count.set(d['end_station'], vis.station_count.get(d['end_station']) + 1);
            }
        });


        //sort stations by count, and pick top 5 stations
        vis.station_count[Symbol.iterator] = function* () {
            yield* [...this.entries()].sort((a, b) => b[1] - a[1]);
        };


        var i = 0;
        for (let [key, value] of vis.station_count) {
            if(i == 5){
                break;
            }
            vis.top_stations.push(key);
            i ++;
        };

        //filter data by the top 5 stations
        vis.top_data = vis.displayData.filter(function (d) {
            return vis.top_stations.includes(d['start_station']) && vis.top_stations.includes(d['end_station']);
        });


        vis.top_data.forEach(function(d){


            if (!vis.indexByName.has(d = (d['start_station']))) {
                vis.nameByIndex.set(vis.n, d);
                vis.indexByName.set(d, vis.n++);
            }

        });


        vis.top_data.forEach(function(d){


            var source2 = vis.indexByName.get(d['start_station']);
            var target2 = vis.indexByName.get(d['end_station']);
            var row2 = vis.matrix[source2];
            if (!row2) row2 = vis.matrix[source2] = Array.from({length: vis.n}).fill(0);
            row2[target2] ++;


        });



    }


    vis.displayData = vis.data;
    vis.updateVis();
}


chordDiagram.prototype.updateVis = function () {
    var vis = this;

    vis.svg.datum(vis.chord(vis.matrix));

    vis.colorScale.domain(d3.range(vis.nameByIndex.length));

    vis.tip = d3.tip()
        .attr("class", "d3-tip-chord")
        .offset([0, 5])
        .html(function(d) {
            var result = vis.nameByIndex.get(d.index)+"<br/>";

            //compute total num of rides
            var totalRides = 0;
            for(var i = 0; i < vis.matrix[0].length; i ++){
                totalRides += vis.matrix[d.index][i];
            }

            for(var i = 0; i < vis.matrix.length; i ++){
                totalRides += vis.matrix[i][d.index];
            }

            totalRides -= vis.matrix[d.index][d.index];

            result += 'number of rides: ' + totalRides + '<br/>';
            return result;
        });

    vis.svg.call(vis.tip);



    vis.outerArcs = vis.svg.selectAll("g.group")
        .data(function(chords) { return chords.groups; });


    vis.outerGroup = vis.outerArcs.enter().append("g");




    vis.outerGroup
        .append("path")
        .attr("class", "group")
        .merge(vis.outerArcs)
        .style("fill", function(d) { return vis.colorScale(d.index); })
        .style('opacity', vis.opacityDefault)
        .attr("id", function(d, i) { return "group" + d.index; })
        .attr("d", vis.arc)
        .on("mouseover", function(d,i){

            vis.tip.show(d);

            vis.svg.selectAll("path.chord")
                .filter(function(d) { return d.source.index != i && d.target.index != i; })
                .transition()
                .style("opacity", 0.07);
        })
        .on("mouseout", function(d,i) {
            vis.tip.hide(d);

            vis.svg.selectAll("path.chord")
                .filter(function (d) {
                    return d.source.index != i && d.target.index != i;
                })
                .transition()
                .style("opacity", vis.opacityDefault);
        });


    vis.outerArcs.exit().remove();

    vis.paths = vis.svg.selectAll("path.chord")
        .data(function(chords) {
            return chords; });

    vis.paths.enter().append("path")
        .attr("class", "chord")
        .merge(vis.paths)
        .style("fill", function(d) {
            return vis.colorScale(d.source.index); })
        .style("opacity", vis.opacityDefault)
        // .style('stroke', 'black')
        .attr("d", vis.path);


    vis.paths.exit().remove();

};