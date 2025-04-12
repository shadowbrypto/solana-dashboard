const fs = require('fs');
const path = require('path');
const { parse } = require('csv-parse/sync');

function parseCSVFiles() {
    const dataDir = path.join(__dirname, '..', '..', 'public', 'data');
    const protocols = ['bullx', 'photon', 'trojan'];
    const timeseriesData = {};

    protocols.forEach(protocol => {
        const filePath = path.join(dataDir, `${protocol}.csv`);
        const fileContent = fs.readFileSync(filePath, 'utf-8');
        
        const records = parse(fileContent, {
            columns: true,
            skip_empty_lines: true
        });

        records.forEach(record => {
            const date = record.formattedDay;
            if (!timeseriesData[date]) {
                timeseriesData[date] = {};
            }

            const metrics = {
                total_volume_usd: parseFloat(record.total_volume_usd),
                daily_users: parseInt(record.daily_users),
                numberOfNewUsers: parseInt(record.numberOfNewUsers),
                daily_trades: parseInt(record.daily_trades),
                total_fees_usd: parseFloat(record.total_fees_usd)
            };

            timeseriesData[date][protocol] = metrics;
        });
    });

    return timeseriesData;
}

// Process the data and write to JSON file
const data = parseCSVFiles();
const outputPath = path.join(__dirname, '..', '..', 'public', 'data', 'protocolData.json');

// Sort the data by date
const sortedData = {};
Object.keys(data).sort().forEach(date => {
    sortedData[date] = data[date];
});

// Write to file with pretty formatting
fs.writeFileSync(outputPath, JSON.stringify(sortedData, null, 2));
console.log(`Data has been written to ${outputPath}`);

// Print a sample of the data
const dates = Object.keys(sortedData);
const firstDate = dates[0];
console.log('\nSample data for first date:', firstDate);
console.log(sortedData[firstDate]);
