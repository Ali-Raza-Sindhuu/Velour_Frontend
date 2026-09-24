import pool from "../config/db.js";

// Runs `work(connection)` inside a database transaction: commit on success,
// roll back on any error.
//
// When two transactions need the same rows, InnoDB may pick one of them as
// a deadlock victim (ER_LOCK_DEADLOCK) or give up waiting for a lock
// (ER_LOCK_WAIT_TIMEOUT). Both are safe to retry from scratch because the
// failed attempt was fully rolled back, so the whole unit of work is re-run
// a few times with a short, jittered back-off before the error is surfaced.
// `work` must therefore only have side effects inside the transaction
// (send emails etc. after this resolves).

const RETRYABLE = new Set(["ER_LOCK_DEADLOCK", "ER_LOCK_WAIT_TIMEOUT"]);
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export const isRetryableLockError = (error) => RETRYABLE.has(error?.code);

export async function withTransaction(work, { retries = 3 } = {}) {
  for (let attempt = 1; ; attempt++) {
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();
      const result = await work(connection);
      await connection.commit();
      return result;
    } catch (error) {
      await connection.rollback().catch(() => {});
      if (isRetryableLockError(error) && attempt < retries) {
        await sleep(25 * attempt + Math.random() * 50);
        continue;
      }
      if (isRetryableLockError(error)) {
        throw Object.assign(new Error("The store is busy right now. Please try again in a moment."), { status: 503 });
      }
      throw error;
    } finally {
      connection.release();
    }
  }
}
