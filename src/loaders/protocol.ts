import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

const client = postgres(process.env.DATABASE_URL || "", { prepare: false });
const db = drizzle({ client });

export async function queryProtocolData(protocol = "bullx") {
  try {
    const result = await db
      .execute(
        `SELECT * FROM protocol_data WHERE ${
          protocol !== "all" ? `protocol_name = '${protocol}'` : ""
        }`
      )
      .execute();
    console.log(result);
    return result;
  } catch (error) {
    console.error("Error fetching protocol data:", error);
    return [];
  }
}
