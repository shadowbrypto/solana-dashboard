import { supabase } from '../lib/supabase.js';
import { format } from 'date-fns';
const CACHE_EXPIRY = 60 * 60 * 1000; // 1 hour in milliseconds
const protocolStatsCache = new Map();
const totalStatsCache = new Map();
const dailyMetricsCache = new Map();
const aggregatedStatsCache = new Map();
function isCacheValid(cache) {
    return Date.now() - cache.timestamp < CACHE_EXPIRY;
}
export function formatDate(isoDate) {
    const [year, month, day] = isoDate.split('-');
    return `${day}-${month}-${year}`;
}
export async function getProtocolStats(protocolName) {
    const cacheKey = Array.isArray(protocolName)
        ? protocolName.sort().join(',')
        : (protocolName || 'all');
    const cachedData = protocolStatsCache.get(cacheKey);
    if (cachedData && isCacheValid(cachedData)) {
        return cachedData.data;
    }
    let allData = [];
    let hasMore = true;
    let page = 0;
    const PAGE_SIZE = 1000;
    while (hasMore) {
        let query = supabase
            .from('protocol_stats')
            .select('*')
            .order('date', { ascending: false })
            .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);
        if (protocolName) {
            if (Array.isArray(protocolName)) {
                const normalizedProtocols = protocolName.map(p => p.toLowerCase());
                query = query.in('protocol_name', normalizedProtocols);
            }
            else {
                const normalizedProtocol = protocolName.toLowerCase();
                query = query.eq('protocol_name', normalizedProtocol);
            }
        }
        const { data, error } = await query;
        if (error) {
            console.error('Error fetching protocol stats:', error);
            throw error;
        }
        if (!data || data.length === 0)
            break;
        allData = allData.concat(data);
        hasMore = data.length === PAGE_SIZE;
        page++;
        console.log(`Fetched ${allData.length} protocol stats records so far...`);
    }
    if (allData.length === 0) {
        return [];
    }
    console.log(`Total protocol stats records fetched: ${allData.length}`);
    const formattedData = allData.map((row) => ({
        ...row,
        formattedDay: formatDate(row.date)
    }));
    protocolStatsCache.set(cacheKey, {
        data: formattedData,
        timestamp: Date.now()
    });
    return formattedData;
}
export async function getTotalProtocolStats(protocolName) {
    const cacheKey = protocolName || 'all';
    const cachedData = totalStatsCache.get(cacheKey);
    if (cachedData && isCacheValid(cachedData)) {
        return cachedData.data;
    }
    let allData = [];
    let hasMore = true;
    let page = 0;
    const PAGE_SIZE = 1000;
    while (hasMore) {
        const query = supabase
            .from('protocol_stats')
            .select('volume_usd, daily_users, new_users, trades, fees_usd')
            .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);
        if (protocolName) {
            query.eq('protocol_name', protocolName);
        }
        const { data, error } = await query;
        if (error)
            throw error;
        if (!data || data.length === 0)
            break;
        allData = allData.concat(data);
        hasMore = data.length === PAGE_SIZE;
        page++;
        console.log(`Fetched ${allData.length} records so far...`);
    }
    if (allData.length === 0) {
        return {
            total_volume_usd: 0,
            daily_users: 0,
            numberOfNewUsers: 0,
            daily_trades: 0,
            total_fees_usd: 0
        };
    }
    console.log(`Total records fetched: ${allData.length}`);
    const metrics = {
        total_volume_usd: allData.reduce((sum, row) => sum + (Number(row.volume_usd) || 0), 0),
        daily_users: allData.reduce((sum, row) => sum + (Number(row.daily_users) || 0), 0),
        numberOfNewUsers: allData.reduce((sum, row) => sum + (Number(row.new_users) || 0), 0),
        daily_trades: allData.reduce((sum, row) => sum + (Number(row.trades) || 0), 0),
        total_fees_usd: allData.reduce((sum, row) => sum + (Number(row.fees_usd) || 0), 0)
    };
    totalStatsCache.set(cacheKey, {
        data: metrics,
        timestamp: Date.now()
    });
    return metrics;
}
export async function getDailyMetrics(date) {
    const formattedDate = format(date, 'yyyy-MM-dd');
    const cacheKey = formattedDate;
    const cachedData = dailyMetricsCache.get(cacheKey);
    if (cachedData && isCacheValid(cachedData)) {
        return cachedData.data;
    }
    const { data, error } = await supabase
        .from('protocol_stats')
        .select('protocol_name, volume_usd, daily_users, new_users, trades, fees_usd')
        .eq('date', formattedDate);
    if (error) {
        console.error('Error fetching daily metrics:', error);
        throw error;
    }
    const metrics = {};
    data?.forEach((row) => {
        const protocol = row.protocol_name;
        metrics[protocol] = {
            total_volume_usd: Number(row.volume_usd) || 0,
            daily_users: Number(row.daily_users) || 0,
            numberOfNewUsers: Number(row.new_users) || 0,
            daily_trades: Number(row.trades) || 0,
            total_fees_usd: Number(row.fees_usd) || 0
        };
    });
    dailyMetricsCache.set(cacheKey, {
        data: metrics,
        timestamp: Date.now()
    });
    return metrics;
}
export async function getAggregatedProtocolStats() {
    const cacheKey = 'all-protocols-aggregated';
    const cachedData = aggregatedStatsCache.get(cacheKey);
    if (cachedData && isCacheValid(cachedData)) {
        return cachedData.data;
    }
    console.log('Fetching aggregated protocol stats from database...');
    // Single optimized query to get all protocol data
    const { data, error } = await supabase
        .from('protocol_stats')
        .select('*')
        .order('date', { ascending: false });
    if (error) {
        console.error('Error fetching aggregated protocol stats:', error);
        throw error;
    }
    if (!data || data.length === 0) {
        return [];
    }
    console.log(`Fetched ${data.length} total records for aggregation`);
    // Group data by date and aggregate all protocols
    const protocols = ["bullx", "photon", "trojan", "axiom", "gmgnai", "bloom", "bonkbot", "nova", "soltradingbot", "maestro", "banana", "padre", "moonshot", "vector"];
    const dataByDate = new Map();
    // Get all unique dates
    const allDates = new Set(data.map(item => item.date));
    // Initialize data structure for each date
    Array.from(allDates).forEach(date => {
        const entry = {
            date,
            formattedDay: formatDate(date)
        };
        // Initialize all protocol metrics to 0
        protocols.forEach(protocol => {
            entry[`${protocol}_volume`] = 0;
            entry[`${protocol}_users`] = 0;
            entry[`${protocol}_new_users`] = 0;
            entry[`${protocol}_trades`] = 0;
            entry[`${protocol}_fees`] = 0;
        });
        dataByDate.set(date, entry);
    });
    // Fill in actual values
    data.forEach(item => {
        const dateEntry = dataByDate.get(item.date);
        if (dateEntry) {
            const protocol = item.protocol_name.toLowerCase();
            if (protocols.includes(protocol)) {
                dateEntry[`${protocol}_volume`] = Number(item.volume_usd) || 0;
                dateEntry[`${protocol}_users`] = Number(item.daily_users) || 0;
                dateEntry[`${protocol}_new_users`] = Number(item.new_users) || 0;
                dateEntry[`${protocol}_trades`] = Number(item.trades) || 0;
                dateEntry[`${protocol}_fees`] = Number(item.fees_usd) || 0;
            }
        }
    });
    // Convert to array and sort by date
    const aggregatedData = Array.from(dataByDate.values())
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    console.log(`Aggregated data for ${aggregatedData.length} unique dates`);
    // Cache the result
    aggregatedStatsCache.set(cacheKey, {
        data: aggregatedData,
        timestamp: Date.now()
    });
    return aggregatedData;
}
//# sourceMappingURL=protocolService.js.map