//Global variables
let map = null;
let paths = null;
const width = 450;
const height = 600;

//Define SVG and Tooltip
const tooltip = d3.select('.tooltip');
const svg = d3.select('#map');
svg.attr('width', width + 'px');
svg.attr('height', height + 'px').on('mouseout', () => {
  const event = d3.event;
  const element = event.toElement || event.relatedTarget;
  if (element == d3.event.target.parentNode) {
    tooltip.style('visibility', 'hidden');
  }
});

//Map is a group element
map = svg.append('g');
map.attr(
  'transform',
  'translate(-17033.78143960883,-16166.124911584475) scale(52.34573174769838)'
);

//Load data
d3.queue()
  .defer(d3.json, './data/sacramento.geojson')
  .defer(d3.csv, './data/tree_canopy.csv')
  .awaitAll(drawMap);

//Define color picker based on range
const colorPicker = d3
  .scaleThreshold()
  .domain([0, 10, 15, 20, 25, 30, 35, 40])
  .range([
    '#D7301F',
    '#EF6548',
    '#FBB676',
    '#FEF4B9',
    '#A8C87D',
    '#359A4B',
    '#1B532D',
    '#12351F'
  ]);

//Draw map once data is loaded
function drawMap(error, data) {
  const mapData = data[0]; //Geo JSon
  const mapInfo = data[1]; //CSV

  //Add Canopy Percentage to map geo json data
  mapData.features.map(el => {
    const name = el.properties.name;
    const info = mapInfo.find(item => {
      return item.Neighborhood === name;
    });
    if (info) {
      el.properties.canopyPercent = info['Canopy%'];
    }
    return el;
  });

  //Create projection
  const projection = d3
    .geoMercator()
    .center([-122.433701, 37.767683])
    .scale(1750)
    .translate([width / 1.5, height / 1.74]);

  //create geo path
  const path = d3.geoPath().projection(projection);

  //Assign all paths for later use
  paths = map
    .selectAll('path')
    .data(mapData.features)
    .enter()
    .append('path')
    .attr('d', path)
    .attr('stroke', 'white')
    .attr('stroke-width', 0.02)
    .attr('fill', d => {
      return colorPicker(d.properties.canopyPercent);
    })
    .on('mousemove', d => {
      showTooltip(d);
    });

  //Attach event handler for keydown
  d3.select('body').on('keydown', () => {
    const event = d3.event;
    //Press 'c' for animation
    if (event.keyCode === 67) {
      animation();
    }
  });

  drawLegend();
}

//Implement Legend
function drawLegend() {
  let formatNumber = d3.format('.0f');
  let x = d3
    .scaleLinear()
    .domain([0, 40])
    .range([0, 240]);
  let xAxis = d3
    .axisBottom(x)
    .tickSize(13)
    .tickValues(colorPicker.domain())
    .tickFormat(d => {
      return formatNumber(d);
    });
  let legend = svg.append('g').call(xAxis);

  legend
    .selectAll('rect')
    .data(
      colorPicker.range().map(color => {
        let d = colorPicker.invertExtent(color);
        if (d[0] == null) d[0] = x.domain()[0];
        if (d[1] == null) d[1] = x.domain()[1];
        return d;
      })
    )
    .enter()
    .insert('rect', '.tick')
    .attr('height', 8)
    .attr('x', d => {
      return x(d[0]);
    })
    .attr('width', d => {
      return x(d[1]) - x(d[0]);
    })
    .attr('fill', d => {
      return colorPicker(d[0]);
    });

  legend
    .append('text')
    .attr('fill', '#000')
    .attr('font-weight', 'bold')
    .attr('text-anchor', 'start')
    .attr('y', -6)
    .text('Tree Canopy Percentage');

  legend.style('transform', 'translate(100px, 550px)');
}
//Show tooltip on mousemove
function showTooltip(d) {
  const html = `
    <p class="head"> </p>
    <p class="name"> ${d.properties.name} <p>
    <p> Canopy Percentage: ${d.properties.canopyPercent} </p>
  `;
  tooltip.html(html);
  tooltip
    .style('visibility', 'visible')
    .style('top', `${d3.event.layerY + 12}px`)
    .style('left', `${d3.event.layerX - 70}px`);
}

//Create animation when 'c' key is pressed
function animation() {
  paths.transition(1000).attr('fill', 'white');
  //Start the fill
  let minState = 0;
  let maxState = 10;
  let interval = d3.interval(() => {
    if (maxState > 45) {
      //End the fill
      interval.stop();
      return;
    }
    const filteredPath = paths.filter(d => {
      if (maxState <= 40) {
        return (
          d.properties.canopyPercent >= minState &&
          d.properties.canopyPercent < maxState
        );
      } else {
        return d.properties.canopyPercent > 40;
      }
    });
    filteredPath.transition(1000).attr('fill', d => {
      return colorPicker(d.properties.canopyPercent);
    });
    minState = maxState;
    maxState += 5;
  }, 1500);
}
