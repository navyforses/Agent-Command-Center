import { runEvolutionTick, generateDailyReport, completeCycleAndStartNew } from "./evolutionCycleEngine";
import { storage } from "./storage";

let schedulerInterval: NodeJS.Timeout | null = null;
let isRunning = false;

const SCHEDULER_INTERVAL_MS = 30 * 60 * 1000;

export function startEvolutionScheduler(): void {
  if (schedulerInterval) {
    console.log("[Evolution Scheduler] Already running");
    return;
  }

  console.log("[Evolution Scheduler] Starting autonomous scheduler (30 min intervals)");

  setTimeout(() => {
    runSchedulerTick();
  }, 5000);

  schedulerInterval = setInterval(runSchedulerTick, SCHEDULER_INTERVAL_MS);
}

export function stopEvolutionScheduler(): void {
  if (schedulerInterval) {
    clearInterval(schedulerInterval);
    schedulerInterval = null;
    console.log("[Evolution Scheduler] Stopped");
  }
}

export function isSchedulerRunning(): boolean {
  return schedulerInterval !== null;
}

async function runSchedulerTick(): Promise<void> {
  if (isRunning) {
    console.log("[Evolution Scheduler] Previous tick still running, skipping...");
    return;
  }

  isRunning = true;
  const startTime = Date.now();

  try {
    console.log("[Evolution Scheduler] Running tick at", new Date().toISOString());

    const activeCycles = await storage.getAllActiveEvolutionCycles();
    console.log(`[Evolution Scheduler] Found ${activeCycles.length} active cycles`);

    if (activeCycles.length === 0) {
      console.log("[Evolution Scheduler] No active cycles to process");
      return;
    }

    const tickResult = await runEvolutionTick();
    console.log(`[Evolution Scheduler] Tick completed:`, {
      cyclesProcessed: tickResult.cyclesProcessed,
      phasesExecuted: tickResult.phasesExecuted.length,
      errors: tickResult.errors.length,
    });

    for (const cycle of activeCycles) {
      await checkAndGenerateDailyReports(cycle.id);
      await checkAndCompleteCycle(cycle.id, cycle.endDate);
    }

    const duration = Date.now() - startTime;
    console.log(`[Evolution Scheduler] Tick finished in ${duration}ms`);
  } catch (error) {
    console.error("[Evolution Scheduler] Tick error:", error);
  } finally {
    isRunning = false;
  }
}

async function checkAndGenerateDailyReports(cycleId: number): Promise<void> {
  try {
    const dailyRuns = await storage.getEvolutionDailyRuns(cycleId);

    for (const run of dailyRuns) {
      if (run.status === "completed") {
        const existingReport = await storage.getEvolutionReportByDailyRun(run.id);

        if (!existingReport) {
          console.log(`[Evolution Scheduler] Generating report for completed daily run ${run.id}`);
          const report = await generateDailyReport(run.id);

          if (report) {
            console.log(`[Evolution Scheduler] Report ${report.id} generated successfully`);
          } else {
            console.log(`[Evolution Scheduler] Failed to generate report for run ${run.id}`);
          }
        }
      }
    }
  } catch (error) {
    console.error(`[Evolution Scheduler] Error checking reports for cycle ${cycleId}:`, error);
  }
}

async function checkAndCompleteCycle(cycleId: number, endDate: Date | null): Promise<void> {
  try {
    if (!endDate) {
      return;
    }

    const now = new Date();
    const cycleEndDate = new Date(endDate);

    if (now >= cycleEndDate) {
      console.log(`[Evolution Scheduler] Cycle ${cycleId} has reached end date, completing and starting new cycle...`);
      const newCycle = await completeCycleAndStartNew(cycleId);
      
      if (newCycle) {
        console.log(`[Evolution Scheduler] New cycle ${newCycle.id} started automatically from cycle ${cycleId}`);
      } else {
        console.log(`[Evolution Scheduler] Failed to start new cycle from ${cycleId}`);
      }
    }
  } catch (error) {
    console.error(`[Evolution Scheduler] Error checking cycle completion for ${cycleId}:`, error);
  }
}

export async function triggerManualTick(): Promise<{
  cyclesProcessed: number;
  phasesExecuted: string[];
  errors: string[];
}> {
  console.log("[Evolution Scheduler] Manual tick triggered");
  
  const result = await runEvolutionTick();
  
  const activeCycles = await storage.getAllActiveEvolutionCycles();
  for (const cycle of activeCycles) {
    await checkAndGenerateDailyReports(cycle.id);
  }
  
  return result;
}
