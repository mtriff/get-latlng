get-latlng
==========
A script to retrieve the latitude and longitude for a set of Canadian postal codes using batch geocoding from the MapQuest API. Inserts the mapping into the database. Script could easily be modified to support any batch geocoding, if desired (simply change the URL request).

Supports connecting a MySQL or MSSQL database (specified in the settings.json file, see below).

Prerequisites
==============
1. A MapQuest API key: https://developer.mapquest.com/user/me/profile

2. Copy the correct settings file to `settings.json`. Example files are included.

3. Update `settings.json` so that the values match your database configuration. See details below.

4. Ensure your postal codes are cleansed (correct format), with no space between characters (script expects `A#A#A#` format)

5. Ensure your SQL query syntax is correct, you may want to only geocode 1 postal code at a time until you are done debugging to preserve your MapQuest quota. 

6. Install node modules `npm install`

settings.json
=============
You must use the following settings:

* `apikey`: The API key obtained from the MapQuest developer portal.
* `database.type`: `mysql` or `mssql`
* `database.connectionDetails`: 
  * For `mysql` databases, follow the format here (either as a connection string or JSON option object): https://www.npmjs.com/package/mysql#connection-options
  * For `mssql` databases, follow the format here (either as a connection string or JSON option object): https://www.npmjs.com/package/mssql#general-same-for-all-drivers
* `database.selectAllPostcodesSql`: A `SELECT` statement that only selects a column named `postcode` (use an alias if necessary). All postcodes selected will be geocoded. It is recommended you limit your `SELECT` statement to 5000 at a time for performance reasons.
* `database.setPostcodeSql`: An `INSERT` or `UPDATE` statement to set the latitude and longitude values. The statement will be passed 3 variables (`latitude`, `longitude`, and `postalcode`), and so must contain three parameterized-variables (`?`s in the previous order for `mysql`, `@latitude, @longitude, @postcode` for `mssql`).

Notes
=====
* If using a `mysql` database. The script will not exit until you press `Ctrl+C`.
* Example `settings.json` files use a database with a single `postalcode` table with three columns:
  * `postcode` VARCHAR(6)
  * `latitude` FLOAT
  * `longitude` FLOAT

Execution
=========
To run the script, run `node app.js`.