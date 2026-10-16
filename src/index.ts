import { runDailyTasks } from "./daily";

if (!(await runDailyTasks())) {
  process.exit(1);
}
