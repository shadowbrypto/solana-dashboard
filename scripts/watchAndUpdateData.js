const fs = require("fs");
const path = require("path");
const { parse } = require("csv-parse/sync");
const chokidar = require("chokidar");

function parseCSVFiles() {
  const dataDir = path.join(__dirname, "..", "..", "public", "data");
  const protocols = ["bullx", "photon", "trojan"];
  const timeseriesData = {};

  protocols.forEach((protocol) => {
    const filePath = path.join(dataDir, `${protocol}.csv`);
    try {
      const fileContent = fs.readFileSync(filePath, "utf-8");

      const records = parse(fileContent, {
        columns: true,
        skip_empty_lines: true,
      });

      records.forEach((record) => {
        const date = record.formattedDay;
        if (!timeseriesData[date]) {
          timeseriesData[date] = {};
        }

        const metrics = {
          total_volume_usd: parseFloat(record.total_volume_usd),
          daily_users: parseInt(record.daily_users),
          numberOfNewUsers: parseInt(record.numberOfNewUsers),
          daily_trades: parseInt(record.daily_trades),
          total_fees_usd: parseFloat(record.total_fees_usd),
        };

        timeseriesData[date][protocol] = metrics;
      });
    } catch (error) {
      console.error(`Error processing ${protocol}.csv:`, error.message);
    }
  });

  return timeseriesData;
}

function updateJSONFile() {
  try {
    const data = parseCSVFiles();
    const outputPath = path.join(
      __dirname,
      "..",
      "..",
      "public",
      "data",
      "protocolData.json"
    );

    // Sort the data by date
    const sortedData = {};
    Object.keys(data)
      .sort()
      .forEach((date) => {
        sortedData[date] = data[date];
      });

    // Write to file with pretty formatting
    fs.writeFileSync(outputPath, JSON.stringify(sortedData, null, 2));
    console.log(
      `[${new Date().toLocaleTimeString()}] Data has been updated in ${outputPath}`
    );
  } catch (error) {
    console.error("Error updating JSON file:", error.message);
  }
}

// Initial update
updateJSONFile();

// Watch for changes in CSV files
const watchPath = path.join(__dirname, "..", "..", "public", "data", "*.csv");
const watcher = chokidar.watch(watchPath, {
  persistent: true,
  ignoreInitial: true,
});

console.log(`\nWatching for changes in CSV files at: ${watchPath}`);
console.log("Press Ctrl+C to stop watching.\n");

// Update JSON when any CSV file changes
watcher
  .on("change", (path) => {
    console.log(
      `[${new Date().toLocaleTimeString()}] CSV file changed: ${path}`
    );
    updateJSONFile();
  })
  .on("add", (path) => {
    console.log(
      `[${new Date().toLocaleTimeString()}] New CSV file detected: ${path}`
    );
    updateJSONFile();
  })
  .on("error", (error) => {
    console.error("Error watching files:", error);
  });
