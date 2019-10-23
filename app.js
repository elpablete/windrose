// ADD THIS PART TO YOUR CODE
const CosmosClient = require('@azure/cosmos').CosmosClient;
const moment = require('moment');
const d3 = require('d3')
const fs = require('fs');

const config = require('./config');

// ADD THIS PART TO YOUR CODE
const endpoint = config.endpoint;
const key = config.key;

const client = new CosmosClient({ endpoint, key });



// ADD THIS PART TO YOUR CODE
const HttpStatusCodes = { NOTFOUND: 404 };

const databaseId = config.database.id;
const containerId = config.container.id;


var svg = d3.select("svg"),
width = +svg.attr("width"),
height = +svg.attr("height"),
margin = {top: 40, right: 80, bottom: 40, left: 40},
innerRadius = 20,
chartWidth = width - margin.left - margin.right,
chartHeight= height - margin.top - margin.bottom,
outerRadius = (Math.min(chartWidth, chartHeight) / 2),
g = svg.append("g").attr("transform", "translate(" + width / 2 + "," + height / 2 + ")");

var angle = d3.scaleLinear()
.range([0, 2 * Math.PI]);

var radius = d3.scaleLinear()
.range([innerRadius, outerRadius]);

var x = d3.scaleBand()
.range([0, 2 * Math.PI])
.align(0);

var y = d3.scaleLinear() //you can try scaleRadial but it scales differently
.range([innerRadius, outerRadius]);

var z = d3.scaleOrdinal()
.range(["#4242f4", "#42c5f4", "#42f4ce", "#42f456", "#adf442", "#f4e242", "#f4a142", "#f44242"]);

/**
* Query the container using SQL
 */
async function queryContainer() {
    console.log(`Querying container:\n${config.container.id}`);
    var today = moment().add(-5, 'minutes');
    console.log("today: " + today.toISOString());
    // query to return data in a report
    const querySpec = {
       query: `
        SELECT
          --*
          r.nombre_variable
          --,r.dispositivo
          ,r.fecha
          ,r.valor
          --,r.unidades
        FROM
          r
        WHERE
          r.dispositivo = @disp
          AND r.fecha >= @since
          --AND r.nombre_variable IN @variables
          AND ARRAY_CONTAINS(@variables, r.nombre_variable)
        OFFSET
          1
        LIMIT
          10
       `,
       parameters: [
           {
               name: "@disp",
               value: "Darien"
           },
           {
               name: "@since",
               value: moment().local().add(-60, 'minutes').toISOString(true)
           },
           {
               name: "@variables",
               value: ["VelocidadViento", "DireccionViento"]
           }
       ]
   };
   console.log("Query:")
   console.log(querySpec.query);
   const { resources } = await client.database(databaseId).container(containerId).items.query(querySpec, {enableCrossPartitionQuery:true}).fetchAll();
//    for (var queryResult of resources) {
//        let resultString = JSON.stringify(queryResult);
//        console.log(`\tQuery returned ${resultString}\n`);
//    }
//    console.table(resources);
   return resources;
   // TRANSFORM DATA
  };


async function readCompassRose(path){
    let rawdata = fs.readFileSync(path);
    let compass_rose = JSON.parse(rawdata);
    // console.table(compass_rose);
    return compass_rose;
};

async function windrose(data){
    var windRose = data;
    queryContainer().then( data => {
        x.domain(data.map(function(d) { return d.angle; }));
        y.domain([0, d3.max(data, function(d) { return d.total; })]);
        z.domain(data.columns.slice(1));
        // Extend the domain slightly to match the range of [0, 2π].
        angle.domain([0, d3.max(data, function(d,i) { return i + 1; })]);
        radius.domain([0, d3.max(data, function(d) { return d.y0 + d.y; })]);
        angleOffset = -360.0/data.length/2.0;
        g.append("g")
            .selectAll("g")
            .data(d3.stack().keys(data.columns.slice(1))(data))
            .enter().append("g")
            .attr("fill", function(d) { return z(d.key); })
            .selectAll("path")
            .data(function(d) { return d; })
            .enter().append("path")
            .attr("d", d3.arc()
                .innerRadius(function(d) { return y(d[0]); })
                .outerRadius(function(d) { return y(d[1]); })
                .startAngle(function(d) { return x(d.data.angle); })
                .endAngle(function(d) { return x(d.data.angle) + x.bandwidth(); })
                .padAngle(0.01)
                .padRadius(innerRadius))
            .attr("transform", function() {return "rotate("+ angleOffset + ")"});
    }
    )
};

/**
 * Exit the app with a prompt
 * @param {string} message - The message to display
 */
function exit(message) {
    console.log(message)
    console.log('Press any key to exit')
    process.stdin.setRawMode(true)
    process.stdin.resume()
    process.stdin.on('data', process.exit.bind(process, 0))
  }

readCompassRose('compass_rose.json')
  .then((data) => {
    console.log("Compass Rose:")
    console.table(data);

  })
  .then(

  )
  .catch(error => {
    exit(`Completed with error ${JSON.stringify(error)}`)
  });

// queryContainer()
//   .then(() => {
//     exit(`Completed successfully`)
//   })
//   .catch(error => {
//     exit(`Completed with error ${JSON.stringify(error)}`)
//   })
