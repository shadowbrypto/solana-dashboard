CREATE TABLE IF NOT EXISTS protocol_data AS
    SELECT *, 'bullx' AS protocol_name FROM read_csv('public/data/bullx.csv')
    UNION ALL
    SELECT *, 'photon' AS protocol_name FROM read_csv('public/data/photon.csv')
    UNION ALL
    SELECT *, 'trojan' AS protocol_name FROM read_csv('public/data/trojan.csv');

SELECT * FROM protocol_data;
