import mysql, {
  type Connection,
  type Pool,
  type PoolConnection,
  type PoolOptions,
  type ResultSetHeader,
  type RowDataPacket,
} from "mysql2/promise";

export type QueryResultRow = Record<string, unknown>;

export type QueryResult<T extends QueryResultRow = QueryResultRow> = {
  rowCount: number;
  rows: T[];
};

export type PoolClient = {
  query<T extends QueryResultRow = QueryResultRow>(text: string, values?: unknown[]): Promise<QueryResult<T>>;
};

type DatabaseConfig = {
  host: string;
  port: number;
  user: string;
  password: string;
  database: string;
};

let pool: Pool | null = null;

function parseUrlConfig(databaseUrl: string): DatabaseConfig {
  const url = new URL(databaseUrl);
  const database = decodeURIComponent(url.pathname.replace(/^\//, "")) || "smartmeal";

  return {
    host: url.hostname || "127.0.0.1",
    port: url.port ? Number(url.port) : 3306,
    user: decodeURIComponent(url.username || "root"),
    password: decodeURIComponent(url.password || ""),
    database,
  };
}

export function getDatabaseConfig(): DatabaseConfig {
  const databaseUrl = process.env.DATABASE_URL;
  if (databaseUrl) {
    return parseUrlConfig(databaseUrl);
  }

  return {
    host: process.env.MYSQL_HOST ?? "127.0.0.1",
    port: Number(process.env.MYSQL_PORT ?? "3306"),
    user: process.env.MYSQL_USER ?? "root",
    password: process.env.MYSQL_PASSWORD ?? "",
    database: process.env.MYSQL_DATABASE ?? "smartmeal",
  };
}

function buildPoolOptions(config: DatabaseConfig, overrides?: Partial<PoolOptions>): PoolOptions {
  return {
    host: config.host,
    port: config.port,
    user: config.user,
    password: config.password,
    database: config.database,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    namedPlaceholders: false,
    timezone: "Z",
    dateStrings: true,
    multipleStatements: true,
    ...overrides,
  };
}

function getRowCount(result: RowDataPacket[] | RowDataPacket[][] | ResultSetHeader): number {
  if (Array.isArray(result)) {
    return result.length;
  }
  return result.affectedRows ?? 0;
}

function normalizeRows<T extends QueryResultRow>(result: RowDataPacket[] | RowDataPacket[][] | ResultSetHeader): T[] {
  if (!Array.isArray(result)) {
    return [];
  }
  if (result.length > 0 && Array.isArray(result[0])) {
    return (result[0] as T[]) ?? [];
  }
  return result as T[];
}

function normalizeDateTimeValue(value: unknown): unknown {
  if (typeof value !== "string") {
    return value;
  }

  const isoDateTimeMatch = value.match(/^(\d{4}-\d{2}-\d{2})T(\d{2}:\d{2}:\d{2})(?:\.(\d{1,3}))?Z$/);
  if (!isoDateTimeMatch) {
    return value;
  }

  return `${isoDateTimeMatch[1]} ${isoDateTimeMatch[2]}.${(isoDateTimeMatch[3] ?? "000").padEnd(3, "0")}`;
}

function normalizeValues(values?: unknown[]) {
  return (values ?? []).map(normalizeDateTimeValue) as unknown as Parameters<Pool["execute"]>[1];
}

async function runQuery<T extends QueryResultRow>(
  executor: Pool | PoolConnection,
  text: string,
  values?: unknown[],
): Promise<QueryResult<T>> {
  const [result] = values && values.length > 0
    ? await executor.execute<RowDataPacket[] | RowDataPacket[][] | ResultSetHeader>(text, normalizeValues(values))
    : await executor.query<RowDataPacket[] | RowDataPacket[][] | ResultSetHeader>(text);
  return {
    rowCount: getRowCount(result),
    rows: normalizeRows<T>(result),
  };
}

export function getPool() {
  if (!pool) {
    pool = mysql.createPool(buildPoolOptions(getDatabaseConfig()));
  }

  return pool;
}

export async function query<T extends QueryResultRow = QueryResultRow>(text: string, values?: unknown[]): Promise<QueryResult<T>> {
  return runQuery<T>(getPool(), text, values);
}

export async function withTransaction<T>(handler: (client: PoolClient) => Promise<T>): Promise<T> {
  const connection = await getPool().getConnection();
  const client: PoolClient = {
    query: (text, values) => runQuery(connection, text, values),
  };

  try {
    await connection.beginTransaction();
    const result = await handler(client);
    await connection.commit();
    return result;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

export async function createAdminConnection(database?: string): Promise<Connection> {
  const config = getDatabaseConfig();
  return mysql.createConnection(
    buildPoolOptions(
      {
        ...config,
        database: database ?? config.database,
      },
      {
        database,
      },
    ),
  );
}

export async function closePool() {
  if (!pool) {
    return;
  }

  const currentPool = pool;
  pool = null;
  await currentPool.end();
}
