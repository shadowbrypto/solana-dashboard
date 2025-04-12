const fs = require('fs');
const path = require('path');
const { parse } = require('csv-parse/sync');

// Make TypeScript treat this as a module
export {};

type CSVRecord = {
    formattedDay: string;
    total_volume_usd: string;
    daily_users: string;
    numberOfNewUsers: string;
    daily_trades: string;
    total_fees_usd: string;
}

type ProtocolMetrics = {
    total_volume_usd: number;
    daily_users: number;
    numberOfNewUsers: number;
    daily_trades: number;
    total_fees_usd: number;
}

type ProtocolData = {
    [protocol: string]: ProtocolMetrics;
}

type TimeseriesData = {
    [date: string]: ProtocolData;
}

function parseCSVFiles(): TimeseriesData {
    const dataDir = path.join(__dirname, '..', '..', 'public', 'data');
    const protocols = ['bullx', 'photon', 'trojan'];
    const timeseriesData: TimeseriesData = {};

    protocols.forEach(protocol => {
        const filePath = path.join(dataDir, `${protocol}.csv`);
        const fileContent = fs.readFileSync(filePath, 'utf-8');
        
        const records = parse(fileContent, {
            columns: true,
            skip_empty_lines: true
        }) as CSVRecord[];

        records.forEach((record: CSVRecord) => {
            const date = record.formattedDay;
            if (!timeseriesData[date]) {
                timeseriesData[date] = {};
            }

            const metrics: ProtocolMetrics = {
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

// Sort the data by date in descending order
const sortedData: TimeseriesData = {};
Object.keys(data).sort().forEach(date => {
    sortedData[date] = data[date];
});

// Convert the sorted data to an array of entries with dates
const combinedData = Object.entries(sortedData).map(([date, metrics]) => ({
    formattedDay: date,
    ...metrics
}));

// Sort by date in descending order
combinedData.sort((a, b) => {
    const [dayA, monthA, yearA] = a.formattedDay.split('/');
    const [dayB, monthB, yearB] = b.formattedDay.split('/');
    const dateA = new Date(`${yearA}-${monthA}-${dayA}`);
    const dateB = new Date(`${yearB}-${monthB}-${dayB}`);
    return dateB.getTime() - dateA.getTime(); // Descending order
});

// Write the combined data to a JSON file
fs.writeFileSync(outputPath, JSON.stringify(combinedData, null, 2));

console.log('Data has been processed, sorted by date in descending order, and saved to protocolData.json');

// Print a sample of the data
const dates = Object.keys(sortedData);
if (dates.length > 0) {
    console.log('Sample data for first date:', sortedData[dates[0]]);
}

export {};
