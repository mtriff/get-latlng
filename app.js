var fs = require('fs');
var request = require('request-promise');
var mysql = require('mysql');
var mssql = require('mssql');

// Setup exit conditions
process.on('SIGINT', function() {
  console.log('==== Geocoded ' + logged + ' rows successfully ====');
  process.exit();
});
process.on('exit', function() {
  console.log('==== Geocoded ' + logged + ' rows successfully ====');
});

// Load settings
var SETTINGS = JSON.parse(fs.readFileSync('settings.json', 'utf8').trim());
if (SETTINGS.apikey == "") {
  console.log("API key was not set in settings.json. Exiting.");
}

// Setup helper functions
var logged = 0;
function printRow(postcode, latitude, longitude) {
  var output = postcode;
  output += ',';
  if (latitude) output += latitude;
  output += ',';
  if (longitude) output += longitude;
  fs.appendFileSync('./output.csv', output + '\n');
  logged++;
  if (logged % 100 == 0) console.log("Completed " + logged + " rows.");
}

function printError(postcode, latitude, longitude) {
  var output = postcode;
  output += ',';
  if (latitude) output += latitude;
  output += ',';
  if (longitude) output += longitude;
  fs.appendFileSync('./error.csv', output + '\n');
  logged++;
}

function insertLookupMysql(postcode, latitude, longitude) {
  connection.query(SETTINGS.database.setPostcodeSql, [latitude, longitude, postcode], function(err, result) {
    if (err) {
      console.log(err);
      printError(postcode, country, prov);
    }
    console.log('Inserted row '+ postcode + ','+latitude+ ','+longitude);
    printRow(postcode, latitude, longitude);
  });
}

function insertLookupMssql(postcode, latitude, longitude) {
  return mssqlPool.request()
              .input('postcode', mssql.NVarChar, postcode)
              .input('latitude', mssql.NVarChar, latitude)
              .input('longitude', mssql.NVarChar, longitude)
              .query(SETTINGS.database.setPostcodeSql)
    .then(result => {
      console.log('Inserted row '+ postcode + ','+latitude+ ','+longitude);
      printRow(postcode, latitude, longitude);
    });
}

// Main script logic
if (SETTINGS.database.type === "mysql") {
  
  var connection = mysql.createConnection(SETTINGS.database.connectionDetails);
  connection.connect(function(err) {
    if (err) {
      console.error('error connecting: ' + err.stack);
      return;
    }
    console.log('connected to db as id ' + connection.threadId);
  });
  var selectAllSql = SETTINGS.database.selectAllPostcodesSql;
  connection.query(selectAllSql, function(error, results, fields) {
    if (error) return console.log(error);
    console.log("Processing " + results.length + " rows");
    var batches = []
    while (results.length) {
      batches.push(results.splice(0, 100));
    }
    for (var i = 0; i<batches.length; i++) {
      getLocation(batches[i], insertLookupMysql)
    }
  });

} else {

  var mssqlPool = null;
  mssql.connect(SETTINGS.database.connectionDetails)
    .then(pool => {
      mssqlPool = pool;
      return pool.request()
              .query(SETTINGS.database.selectAllPostcodesSql);
    })
    .then(result => {
      console.log("Processing " + result.recordset.length + " rows");
      var batches = [];
      while (result.recordset.length) {
        batches.push(result.recordset.splice(0, 100));
      }
      var batchPromises = [];
      for (var i = 0; i<batches.length; i++) {
        batchPromises.push(getLocation(batches[i], insertLookupMssql));
      }
      return Promise.all(batchPromises);
    })
    .then(() => {
      console.log("All postcodes have been geocoded. Exiting...");
      process.exit();
    })
    .catch(err => {
      console.log("An error occurred.");
      console.log(err);
    });

}

function getLocation(batch, insertLookup) {
  var url = 'http://www.mapquestapi.com/geocoding/v1/batch?key=' + SETTINGS.apikey;
  for (var i = 0; i<batch.length; i++) {
    url += '&location=' + batch[i]["postcode"] + ',Canada'
  }
  var options = {
    uri: url,
    json: true
  }
  return request(options)
    .then(function(body) {
      if (!body.results) return;
      if (!body.results.length) return;
      for (var i = 0; i < body.results.length; i++) {
        var postcode;
        var latitude;
        var longitude;
        if (body.results[i].providedLocation) {
          postcode = body.results[i].providedLocation.location.split(',')[0]
        } else {
          continue;
        }
        if (body.results[i].locations[0]) {
          if (body.results[i].locations[0].latLng.lat) latitude = body.results[i].locations[0].latLng.lat;
          if (body.results[i].locations[0].latLng.lng) longitude = body.results[i].locations[0].latLng.lng;
        }
        return insertLookup(postcode, latitude, longitude);
      }
    })
    .catch(function(error) {
      console.log("Error with request: " + options.uri);
      console.log(error);
    });
}
