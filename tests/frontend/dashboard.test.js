const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

const sourcePath = path.join(__dirname, "..", "..", "frontend", "static", "js", "app.js");
const source = fs.readFileSync(sourcePath, "utf8");

function getDashboardMetrics() {
  const context = {
    document: {
      readyState: "loading",
      addEventListener() {},
    },
  };
  vm.runInNewContext(`${source}\nglobalThis.testDashboardMetrics = dashboardMetrics;`, context);
  return context.testDashboardMetrics;
}

test("dashboard metrics prefer complete server aggregates over the visible task snapshot", () => {
  const calculate = getDashboardMetrics();
  const metrics = calculate({
    status_counts: {
      backlog: 2,
      assigned: 3,
      in_progress: 1,
      waiting_engineering: 1,
      review: 1,
      done: 5,
      rejected: 2,
      blocked: 1,
    },
    daily: [
      { date: "2026-11-15", created: 4, completed: 2, blocked: 1 },
      { date: "2026-11-16", created: 3, completed: 1, blocked: 0 },
    ],
    activity_by_hour: [[0, 0, 4], [1], [], [], [], [], []],
    by_agent: [{ agent_id: "agent-1", agent_name: "Engineering", open: 2, completed: 4 }],
  }, [{ status: "done" }]);

  assert.equal(metrics.total, 16);
  assert.equal(metrics.statusCounts.done, 5);
  assert.equal(metrics.completionPercent, 31);
  assert.deepEqual(Array.from(metrics.dailyCreated), [4, 3]);
  assert.deepEqual(Array.from(metrics.dailyCompleted), [2, 1]);
  assert.equal(metrics.activityByHour[0][2], 4);
  assert.equal(metrics.activityByHour[1][0], 1);
  assert.equal(metrics.activityByHour[1][1], 0);
  assert.equal(metrics.byAgent[0].agent_name, "Engineering");
});

test("dashboard metrics fall back to visible tasks and safely zero-fill missing server fields", () => {
  const calculate = getDashboardMetrics();
  const fallback = calculate(null, [
    { status: "done" },
    { status: "in_progress" },
    { status: "unknown" },
  ]);
  assert.equal(fallback.total, 2);
  assert.equal(fallback.completionPercent, 50);

  const empty = calculate({ status_counts: {}, daily: [], activity_by_hour: [] });
  assert.equal(empty.total, 0);
  assert.deepEqual(Array.from(empty.dailyCreated), []);
  assert.equal(empty.activityByHour.length, 7);
  assert.ok(empty.activityByHour.every((row) => row.length === 24 && row.every((value) => value === 0)));
});
