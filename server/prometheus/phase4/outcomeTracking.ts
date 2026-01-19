// @ts-nocheck
/**
 * PROMETHEUS-MIND Phase 4: Outcome Tracking and Feedback Loops
 *
 * Tracks treatment outcomes, validates predictions, and creates
 * feedback loops for continuous learning and improvement.
 *
 * Features:
 * - Treatment outcome tracking
 * - Measurement collection and analysis
 * - Automated feedback loop generation
 * - Prediction accuracy validation
 * - Continuous model improvement
 */

import OpenAI from "openai";
import { db } from "../../db";
import { eq, and, desc, gte, lte, sql, isNull } from "drizzle-orm";
import * as schema from "@shared/schema";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// Types
interface OutcomeTrackingConfig {
  childId: number;
  recommendationId?: number;
  hypothesisId?: number;
  treatmentType: string;
  startDate: Date;
  expectedDuration: number; // days
  primaryOutcomes: string[];
  secondaryOutcomes: string[];
  measurementFrequency: 'daily' | 'weekly' | 'biweekly' | 'monthly';
  baselineMeasurements: Record<string, number>;
}

interface MeasurementEntry {
  trackingId: number;
  measurementType: string;
  value: number;
  unit: string;
  notes?: string;
  measuredBy: 'parent' | 'therapist' | 'system' | 'self';
  confidence: number;
}

interface OutcomeAnalysis {
  trackingId: number;
  overallProgress: 'significant_improvement' | 'moderate_improvement' | 'minimal_improvement' | 'no_change' | 'regression';
  progressPercentage: number;
  measurementSummary: {
    metric: string;
    baseline: number;
    current: number;
    change: number;
    changePercentage: number;
    trend: 'improving' | 'stable' | 'declining';
  }[];
  statisticalSignificance: number;
  recommendations: string[];
  shouldContinue: boolean;
  suggestedAdjustments: string[];
}

interface FeedbackLoopConfig {
  sourceType: 'outcome' | 'prediction' | 'hypothesis' | 'recommendation';
  sourceId: number;
  feedbackType: 'validation' | 'correction' | 'enhancement';
  learningTarget: string;
  priority: number;
}

interface FeedbackAnalysis {
  loopId: number;
  learningsExtracted: string[];
  modelUpdates: {
    component: string;
    updateType: string;
    description: string;
    confidence: number;
  }[];
  knowledgeGraphUpdates: {
    nodeId?: number;
    edgeUpdate?: boolean;
    updateDescription: string;
  }[];
  propagationScope: 'local' | 'related' | 'global';
}

// Outcome Tracking System
export class OutcomeTrackingSystem {

  /**
   * Initialize outcome tracking for a treatment
   */
  async initializeTracking(config: OutcomeTrackingConfig): Promise<{
    trackingId: number;
    measurementSchedule: { date: Date; measurements: string[] }[];
    reminderSettings: any;
  }> {
    // Calculate measurement schedule
    const schedule = this.generateMeasurementSchedule(
      config.startDate,
      config.expectedDuration,
      config.measurementFrequency,
      [...config.primaryOutcomes, ...config.secondaryOutcomes]
    );

    // Create tracking record
    const [tracking] = await db.insert(schema.prometheusOutcomeTracking).values({
      childId: config.childId,
      recommendationId: config.recommendationId,
      hypothesisId: config.hypothesisId,
      treatmentType: config.treatmentType,
      startDate: config.startDate,
      expectedEndDate: new Date(config.startDate.getTime() + config.expectedDuration * 24 * 60 * 60 * 1000),
      primaryOutcomes: config.primaryOutcomes,
      secondaryOutcomes: config.secondaryOutcomes,
      measurementFrequency: config.measurementFrequency,
      baselineMeasurements: config.baselineMeasurements,
      status: 'active',
      metadata: {
        schedule: schedule,
        reminderEnabled: true,
        lastReminderSent: null
      }
    }).returning();

    // Record baseline measurements
    for (const [metric, value] of Object.entries(config.baselineMeasurements)) {
      await db.insert(schema.prometheusOutcomeMeasurements).values({
        trackingId: tracking.id,
        measurementDate: config.startDate,
        measurementType: metric,
        value: value,
        unit: this.getDefaultUnit(metric),
        isBaseline: true,
        measuredBy: 'system',
        confidence: 1.0
      });
    }

    return {
      trackingId: tracking.id,
      measurementSchedule: schedule,
      reminderSettings: {
        enabled: true,
        frequency: config.measurementFrequency,
        methods: ['notification', 'email']
      }
    };
  }

  /**
   * Record a measurement
   */
  async recordMeasurement(entry: MeasurementEntry): Promise<{
    measurementId: number;
    comparisonToBaseline: { change: number; percentage: number };
    trendAnalysis: string;
  }> {
    // Get baseline for comparison
    const baseline = await db.select()
      .from(schema.prometheusOutcomeMeasurements)
      .where(and(
        eq(schema.prometheusOutcomeMeasurements.trackingId, entry.trackingId),
        eq(schema.prometheusOutcomeMeasurements.measurementType, entry.measurementType),
        eq(schema.prometheusOutcomeMeasurements.isBaseline, true)
      ))
      .limit(1);

    const baselineValue = baseline[0]?.value ?? entry.value;
    const change = entry.value - baselineValue;
    const percentage = baselineValue !== 0 ? (change / baselineValue) * 100 : 0;

    // Get recent measurements for trend analysis
    const recentMeasurements = await db.select()
      .from(schema.prometheusOutcomeMeasurements)
      .where(and(
        eq(schema.prometheusOutcomeMeasurements.trackingId, entry.trackingId),
        eq(schema.prometheusOutcomeMeasurements.measurementType, entry.measurementType)
      ))
      .orderBy(desc(schema.prometheusOutcomeMeasurements.measurementDate))
      .limit(5);

    const trend = this.analyzeTrend(recentMeasurements.map(m => m.value ?? 0), entry.value);

    // Record measurement
    const [measurement] = await db.insert(schema.prometheusOutcomeMeasurements).values({
      trackingId: entry.trackingId,
      measurementDate: new Date(),
      measurementType: entry.measurementType,
      value: entry.value,
      unit: entry.unit,
      notes: entry.notes,
      isBaseline: false,
      measuredBy: entry.measuredBy,
      confidence: entry.confidence,
      metadata: {
        comparisonToBaseline: { change, percentage },
        trend
      }
    }).returning();

    // Check for significant changes that might trigger alerts
    if (Math.abs(percentage) > 20) {
      await this.triggerSignificantChangeAlert(entry.trackingId, entry.measurementType, percentage);
    }

    return {
      measurementId: measurement.id,
      comparisonToBaseline: { change, percentage },
      trendAnalysis: trend
    };
  }

  /**
   * Analyze outcomes for a tracking period
   */
  async analyzeOutcomes(trackingId: number): Promise<OutcomeAnalysis> {
    // Get tracking details
    const tracking = await db.select()
      .from(schema.prometheusOutcomeTracking)
      .where(eq(schema.prometheusOutcomeTracking.id, trackingId))
      .limit(1);

    if (!tracking[0]) {
      throw new Error(`Tracking ${trackingId} not found`);
    }

    // Get all measurements
    const measurements = await db.select()
      .from(schema.prometheusOutcomeMeasurements)
      .where(eq(schema.prometheusOutcomeMeasurements.trackingId, trackingId))
      .orderBy(schema.prometheusOutcomeMeasurements.measurementDate);

    // Group by measurement type
    const measurementsByType = new Map<string, typeof measurements>();
    for (const m of measurements) {
      if (!measurementsByType.has(m.measurementType)) {
        measurementsByType.set(m.measurementType, []);
      }
      measurementsByType.get(m.measurementType)!.push(m);
    }

    // Analyze each metric
    const measurementSummary: OutcomeAnalysis['measurementSummary'] = [];
    let totalProgressScore = 0;
    let metricsAnalyzed = 0;

    for (const [metric, metricMeasurements] of measurementsByType) {
      const baseline = metricMeasurements.find(m => m.isBaseline);
      const latest = metricMeasurements[metricMeasurements.length - 1];

      if (baseline && latest && baseline.value !== null && latest.value !== null) {
        const change = latest.value - baseline.value;
        const changePercentage = baseline.value !== 0 ? (change / baseline.value) * 100 : 0;
        const trend = this.determineTrend(metricMeasurements.map(m => m.value ?? 0));

        measurementSummary.push({
          metric,
          baseline: baseline.value,
          current: latest.value,
          change,
          changePercentage,
          trend
        });

        // Calculate progress score (positive change = improvement for most metrics)
        const isHigherBetter = this.isHigherBetter(metric);
        const normalizedProgress = isHigherBetter ? changePercentage : -changePercentage;
        totalProgressScore += normalizedProgress;
        metricsAnalyzed++;
      }
    }

    const avgProgress = metricsAnalyzed > 0 ? totalProgressScore / metricsAnalyzed : 0;
    const overallProgress = this.categorizeProgress(avgProgress);

    // Use AI to generate recommendations
    const aiAnalysis = await this.generateAIOutcomeAnalysis(tracking[0], measurementSummary);

    // Update tracking with analysis
    await db.update(schema.prometheusOutcomeTracking)
      .set({
        currentProgress: avgProgress,
        lastAnalysis: {
          date: new Date(),
          overallProgress,
          summary: measurementSummary,
          recommendations: aiAnalysis.recommendations
        }
      })
      .where(eq(schema.prometheusOutcomeTracking.id, trackingId));

    return {
      trackingId,
      overallProgress,
      progressPercentage: avgProgress,
      measurementSummary,
      statisticalSignificance: this.calculateStatisticalSignificance(measurementSummary),
      recommendations: aiAnalysis.recommendations,
      shouldContinue: aiAnalysis.shouldContinue,
      suggestedAdjustments: aiAnalysis.adjustments
    };
  }

  /**
   * Complete outcome tracking and generate final report
   */
  async completeTracking(trackingId: number, reason: 'completed' | 'discontinued' | 'modified'): Promise<{
    finalAnalysis: OutcomeAnalysis;
    learnings: string[];
    feedbackLoopCreated: boolean;
  }> {
    const finalAnalysis = await this.analyzeOutcomes(trackingId);

    // Extract learnings using AI
    const learnings = await this.extractLearnings(trackingId, finalAnalysis);

    // Update tracking status
    await db.update(schema.prometheusOutcomeTracking)
      .set({
        status: reason === 'completed' ? 'completed' : reason === 'discontinued' ? 'discontinued' : 'active',
        actualEndDate: new Date(),
        finalOutcome: finalAnalysis.overallProgress,
        metadata: sql`metadata || ${JSON.stringify({ completionReason: reason, finalAnalysis })}`
      })
      .where(eq(schema.prometheusOutcomeTracking.id, trackingId));

    // Create feedback loop
    const feedbackLoop = await this.createFeedbackLoop({
      sourceType: 'outcome',
      sourceId: trackingId,
      feedbackType: finalAnalysis.overallProgress === 'significant_improvement' ? 'validation' : 'correction',
      learningTarget: 'treatment_effectiveness',
      priority: this.calculateFeedbackPriority(finalAnalysis)
    });

    return {
      finalAnalysis,
      learnings,
      feedbackLoopCreated: !!feedbackLoop
    };
  }

  // Private helper methods

  private generateMeasurementSchedule(
    startDate: Date,
    durationDays: number,
    frequency: string,
    outcomes: string[]
  ): { date: Date; measurements: string[] }[] {
    const schedule: { date: Date; measurements: string[] }[] = [];
    const intervalDays = frequency === 'daily' ? 1 : frequency === 'weekly' ? 7 : frequency === 'biweekly' ? 14 : 30;

    let currentDate = new Date(startDate);
    const endDate = new Date(startDate.getTime() + durationDays * 24 * 60 * 60 * 1000);

    while (currentDate <= endDate) {
      schedule.push({
        date: new Date(currentDate),
        measurements: outcomes
      });
      currentDate.setDate(currentDate.getDate() + intervalDays);
    }

    return schedule;
  }

  private getDefaultUnit(metric: string): string {
    const units: Record<string, string> = {
      'social_engagement': 'score',
      'verbal_communication': 'words_per_minute',
      'eye_contact': 'seconds',
      'sensory_tolerance': 'scale_1_10',
      'anxiety_level': 'scale_1_10',
      'sleep_quality': 'hours',
      'meltdown_frequency': 'per_week',
      'task_completion': 'percentage'
    };
    return units[metric] || 'unit';
  }

  private analyzeTrend(previousValues: number[], currentValue: number): string {
    if (previousValues.length < 2) return 'insufficient_data';

    const allValues = [...previousValues, currentValue];
    const recentAvg = allValues.slice(-3).reduce((a, b) => a + b, 0) / Math.min(3, allValues.length);
    const olderAvg = allValues.slice(0, -3).reduce((a, b) => a + b, 0) / Math.max(1, allValues.length - 3);

    const change = recentAvg - olderAvg;
    const percentChange = olderAvg !== 0 ? (change / olderAvg) * 100 : 0;

    if (percentChange > 10) return 'improving';
    if (percentChange < -10) return 'declining';
    return 'stable';
  }

  private determineTrend(values: number[]): 'improving' | 'stable' | 'declining' {
    if (values.length < 2) return 'stable';

    // Simple linear regression
    const n = values.length;
    const sumX = (n * (n - 1)) / 2;
    const sumY = values.reduce((a, b) => a + b, 0);
    const sumXY = values.reduce((acc, val, idx) => acc + idx * val, 0);
    const sumX2 = (n * (n - 1) * (2 * n - 1)) / 6;

    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);

    if (slope > 0.1) return 'improving';
    if (slope < -0.1) return 'declining';
    return 'stable';
  }

  private isHigherBetter(metric: string): boolean {
    const lowerIsBetter = ['anxiety_level', 'meltdown_frequency', 'stress_level', 'aggression_incidents'];
    return !lowerIsBetter.includes(metric);
  }

  private categorizeProgress(avgProgress: number): OutcomeAnalysis['overallProgress'] {
    if (avgProgress > 30) return 'significant_improvement';
    if (avgProgress > 15) return 'moderate_improvement';
    if (avgProgress > 5) return 'minimal_improvement';
    if (avgProgress >= -5) return 'no_change';
    return 'regression';
  }

  private async generateAIOutcomeAnalysis(
    tracking: any,
    summary: OutcomeAnalysis['measurementSummary']
  ): Promise<{ recommendations: string[]; shouldContinue: boolean; adjustments: string[] }> {
    const prompt = `Analyze treatment outcomes for autism intervention:

Treatment Type: ${tracking.treatmentType}
Duration: ${tracking.startDate} to ${tracking.expectedEndDate}
Primary Outcomes: ${JSON.stringify(tracking.primaryOutcomes)}

Measurement Summary:
${summary.map(s => `- ${s.metric}: ${s.baseline} → ${s.current} (${s.changePercentage.toFixed(1)}% change, trend: ${s.trend})`).join('\n')}

Provide analysis in JSON format:
{
  "recommendations": ["specific actionable recommendations"],
  "shouldContinue": true/false,
  "adjustments": ["suggested treatment adjustments"]
}`;

    try {
      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [{ role: "user", content: prompt }],
        response_format: { type: "json_object" }
      });

      return JSON.parse(response.choices[0].message.content || '{}');
    } catch (error) {
      return {
        recommendations: ['Continue monitoring progress', 'Consult with healthcare provider'],
        shouldContinue: true,
        adjustments: []
      };
    }
  }

  private calculateStatisticalSignificance(summary: OutcomeAnalysis['measurementSummary']): number {
    // Simplified significance calculation
    // In production, use proper statistical tests
    const significantChanges = summary.filter(s => Math.abs(s.changePercentage) > 15);
    return significantChanges.length / Math.max(1, summary.length);
  }

  private async extractLearnings(trackingId: number, analysis: OutcomeAnalysis): Promise<string[]> {
    const prompt = `Extract key learnings from this treatment outcome:

Progress: ${analysis.overallProgress} (${analysis.progressPercentage.toFixed(1)}%)
Metrics: ${JSON.stringify(analysis.measurementSummary)}

What patterns and insights should be stored for future reference? Return as JSON array of strings.`;

    try {
      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [{ role: "user", content: prompt }],
        response_format: { type: "json_object" }
      });

      const result = JSON.parse(response.choices[0].message.content || '{"learnings":[]}');
      return result.learnings || [];
    } catch (error) {
      return [`Treatment showed ${analysis.overallProgress}`];
    }
  }

  private calculateFeedbackPriority(analysis: OutcomeAnalysis): number {
    // Higher priority for unexpected outcomes
    if (analysis.overallProgress === 'regression') return 10;
    if (analysis.overallProgress === 'significant_improvement') return 8;
    if (analysis.statisticalSignificance > 0.8) return 7;
    return 5;
  }

  private async triggerSignificantChangeAlert(
    trackingId: number,
    metric: string,
    percentChange: number
  ): Promise<void> {
    // Get tracking info
    const tracking = await db.select()
      .from(schema.prometheusOutcomeTracking)
      .where(eq(schema.prometheusOutcomeTracking.id, trackingId))
      .limit(1);

    if (tracking[0]) {
      // Create notification
      await db.insert(schema.prometheusNotifications).values({
        childId: tracking[0].childId,
        type: percentChange > 0 ? 'positive_change' : 'concern',
        title: `Significant Change in ${metric}`,
        message: `${metric} has changed by ${percentChange.toFixed(1)}% from baseline`,
        priority: Math.abs(percentChange) > 50 ? 'high' : 'medium',
        category: 'outcome_tracking'
      });
    }
  }

  /**
   * Create a feedback loop for learning
   */
  private async createFeedbackLoop(config: FeedbackLoopConfig): Promise<number> {
    const [loop] = await db.insert(schema.prometheusFeedbackLoops).values({
      sourceType: config.sourceType,
      sourceId: config.sourceId,
      feedbackType: config.feedbackType,
      learningTarget: config.learningTarget,
      priority: config.priority,
      status: 'pending',
      createdAt: new Date()
    }).returning();

    return loop.id;
  }
}

// Feedback Loop Processor
export class FeedbackLoopProcessor {

  /**
   * Process pending feedback loops
   */
  async processPendingLoops(): Promise<{
    processed: number;
    learningsGenerated: number;
    updatesApplied: number;
  }> {
    const pendingLoops = await db.select()
      .from(schema.prometheusFeedbackLoops)
      .where(eq(schema.prometheusFeedbackLoops.status, 'pending'))
      .orderBy(desc(schema.prometheusFeedbackLoops.priority))
      .limit(10);

    let processed = 0;
    let learningsGenerated = 0;
    let updatesApplied = 0;

    for (const loop of pendingLoops) {
      try {
        const analysis = await this.analyzeFeedbackLoop(loop);

        // Apply learnings
        for (const learning of analysis.learningsExtracted) {
          await this.storeLearning(loop, learning);
          learningsGenerated++;
        }

        // Apply model updates
        for (const update of analysis.modelUpdates) {
          await this.applyModelUpdate(update);
          updatesApplied++;
        }

        // Apply knowledge graph updates
        for (const kgUpdate of analysis.knowledgeGraphUpdates) {
          await this.applyKnowledgeGraphUpdate(kgUpdate);
        }

        // Mark loop as processed
        await db.update(schema.prometheusFeedbackLoops)
          .set({
            status: 'processed',
            processedAt: new Date(),
            learnings: analysis.learningsExtracted,
            metadata: {
              modelUpdates: analysis.modelUpdates,
              knowledgeGraphUpdates: analysis.knowledgeGraphUpdates
            }
          })
          .where(eq(schema.prometheusFeedbackLoops.id, loop.id));

        processed++;
      } catch (error) {
        console.error(`Failed to process feedback loop ${loop.id}:`, error);

        await db.update(schema.prometheusFeedbackLoops)
          .set({
            status: 'failed',
            metadata: sql`metadata || ${JSON.stringify({ error: String(error) })}`
          })
          .where(eq(schema.prometheusFeedbackLoops.id, loop.id));
      }
    }

    return { processed, learningsGenerated, updatesApplied };
  }

  /**
   * Analyze a feedback loop
   */
  private async analyzeFeedbackLoop(loop: any): Promise<FeedbackAnalysis> {
    // Get source data
    const sourceData = await this.getSourceData(loop.sourceType, loop.sourceId);

    const prompt = `Analyze this feedback for learning extraction:

Source Type: ${loop.sourceType}
Feedback Type: ${loop.feedbackType}
Learning Target: ${loop.learningTarget}
Source Data: ${JSON.stringify(sourceData)}

Extract learnings and suggest updates in JSON format:
{
  "learningsExtracted": ["key insights and patterns"],
  "modelUpdates": [
    {
      "component": "which system component",
      "updateType": "weight_adjustment|rule_addition|threshold_change",
      "description": "what to update",
      "confidence": 0.0-1.0
    }
  ],
  "knowledgeGraphUpdates": [
    {
      "updateDescription": "what to update in knowledge graph"
    }
  ],
  "propagationScope": "local|related|global"
}`;

    try {
      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [{ role: "user", content: prompt }],
        response_format: { type: "json_object" }
      });

      const result = JSON.parse(response.choices[0].message.content || '{}');
      return {
        loopId: loop.id,
        learningsExtracted: result.learningsExtracted || [],
        modelUpdates: result.modelUpdates || [],
        knowledgeGraphUpdates: result.knowledgeGraphUpdates || [],
        propagationScope: result.propagationScope || 'local'
      };
    } catch (error) {
      return {
        loopId: loop.id,
        learningsExtracted: [],
        modelUpdates: [],
        knowledgeGraphUpdates: [],
        propagationScope: 'local'
      };
    }
  }

  /**
   * Get source data for feedback analysis
   */
  private async getSourceData(sourceType: string, sourceId: number): Promise<any> {
    switch (sourceType) {
      case 'outcome':
        const outcome = await db.select()
          .from(schema.prometheusOutcomeTracking)
          .where(eq(schema.prometheusOutcomeTracking.id, sourceId))
          .limit(1);
        return outcome[0] || {};

      case 'prediction':
        const prediction = await db.select()
          .from(schema.prometheusPredictions)
          .where(eq(schema.prometheusPredictions.id, sourceId))
          .limit(1);
        return prediction[0] || {};

      case 'hypothesis':
        const hypothesis = await db.select()
          .from(schema.prometheusHypotheses)
          .where(eq(schema.prometheusHypotheses.id, sourceId))
          .limit(1);
        return hypothesis[0] || {};

      case 'recommendation':
        const recommendation = await db.select()
          .from(schema.prometheusTreatmentRecommendations)
          .where(eq(schema.prometheusTreatmentRecommendations.id, sourceId))
          .limit(1);
        return recommendation[0] || {};

      default:
        return {};
    }
  }

  /**
   * Store a learning in the knowledge base
   */
  private async storeLearning(loop: any, learning: string): Promise<void> {
    // Store in memory system
    await db.insert(schema.prometheusMemory).values({
      childId: 0, // System-wide learning
      memoryType: 'learned_pattern',
      content: learning,
      importance: loop.priority / 10,
      source: `feedback_loop_${loop.id}`,
      metadata: {
        sourceType: loop.sourceType,
        feedbackType: loop.feedbackType,
        learningTarget: loop.learningTarget
      }
    });
  }

  /**
   * Apply a model update
   */
  private async applyModelUpdate(update: any): Promise<void> {
    // Record autonomous action
    await db.insert(schema.prometheusAutonomousActions).values({
      actionType: 'model_update',
      description: update.description,
      targetComponent: update.component,
      parameters: {
        updateType: update.updateType,
        confidence: update.confidence
      },
      status: 'completed',
      executedAt: new Date()
    });

    // In production, this would actually update model weights or rules
    console.log(`Model update applied: ${update.component} - ${update.description}`);
  }

  /**
   * Apply knowledge graph update
   */
  private async applyKnowledgeGraphUpdate(update: any): Promise<void> {
    // Record the update intention
    await db.insert(schema.prometheusAutonomousActions).values({
      actionType: 'knowledge_graph_update',
      description: update.updateDescription,
      targetComponent: 'knowledge_graph',
      parameters: update,
      status: 'completed',
      executedAt: new Date()
    });

    console.log(`Knowledge graph update: ${update.updateDescription}`);
  }

  /**
   * Validate predictions against actual outcomes
   */
  async validatePredictions(): Promise<{
    validated: number;
    accurate: number;
    accuracyRate: number;
    feedbackLoopsCreated: number;
  }> {
    // Find predictions that should have outcomes by now
    const pendingValidation = await db.select()
      .from(schema.prometheusPredictions)
      .where(and(
        eq(schema.prometheusPredictions.status, 'active'),
        lte(schema.prometheusPredictions.predictionDate, new Date())
      ))
      .limit(50);

    let validated = 0;
    let accurate = 0;
    let feedbackLoopsCreated = 0;

    for (const prediction of pendingValidation) {
      // Find related outcomes
      const outcomes = await db.select()
        .from(schema.prometheusOutcomeTracking)
        .where(and(
          eq(schema.prometheusOutcomeTracking.childId, prediction.childId),
          eq(schema.prometheusOutcomeTracking.status, 'completed'),
          gte(schema.prometheusOutcomeTracking.createdAt, prediction.createdAt)
        ))
        .limit(1);

      if (outcomes[0]) {
        const isAccurate = await this.comparePredictionToOutcome(prediction, outcomes[0]);

        await db.update(schema.prometheusPredictions)
          .set({
            status: 'validated',
            actualOutcome: outcomes[0].finalOutcome,
            wasAccurate: isAccurate,
            validatedAt: new Date()
          })
          .where(eq(schema.prometheusPredictions.id, prediction.id));

        validated++;
        if (isAccurate) accurate++;

        // Create feedback loop for learning
        await db.insert(schema.prometheusFeedbackLoops).values({
          sourceType: 'prediction',
          sourceId: prediction.id,
          feedbackType: isAccurate ? 'validation' : 'correction',
          learningTarget: 'prediction_accuracy',
          priority: isAccurate ? 5 : 8,
          status: 'pending',
          createdAt: new Date()
        });
        feedbackLoopsCreated++;
      }
    }

    return {
      validated,
      accurate,
      accuracyRate: validated > 0 ? accurate / validated : 0,
      feedbackLoopsCreated
    };
  }

  /**
   * Compare prediction to actual outcome
   */
  private async comparePredictionToOutcome(prediction: any, outcome: any): Promise<boolean> {
    // Simple comparison - in production would be more sophisticated
    const predictedOutcome = prediction.prediction?.expectedOutcome || '';
    const actualOutcome = outcome.finalOutcome || '';

    // Use AI for nuanced comparison
    const prompt = `Compare prediction to actual outcome:

Predicted: ${JSON.stringify(prediction.prediction)}
Actual: ${actualOutcome}
Confidence: ${prediction.confidence}

Was the prediction accurate? Return JSON: {"accurate": true/false, "matchPercentage": 0-100}`;

    try {
      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [{ role: "user", content: prompt }],
        response_format: { type: "json_object" }
      });

      const result = JSON.parse(response.choices[0].message.content || '{}');
      return result.accurate || result.matchPercentage > 70;
    } catch (error) {
      return predictedOutcome.toLowerCase().includes(actualOutcome.toLowerCase());
    }
  }
}

// Autonomous Action System
export class AutonomousActionSystem {

  /**
   * Record an autonomous action
   */
  async recordAction(
    actionType: string,
    description: string,
    targetComponent: string,
    parameters: Record<string, any>,
    requiresApproval: boolean = false
  ): Promise<number> {
    const [action] = await db.insert(schema.prometheusAutonomousActions).values({
      actionType,
      description,
      targetComponent,
      parameters,
      status: requiresApproval ? 'pending_approval' : 'pending',
      createdAt: new Date()
    }).returning();

    return action.id;
  }

  /**
   * Execute pending autonomous actions
   */
  async executePendingActions(): Promise<{
    executed: number;
    failed: number;
    pendingApproval: number;
  }> {
    const pending = await db.select()
      .from(schema.prometheusAutonomousActions)
      .where(eq(schema.prometheusAutonomousActions.status, 'pending'))
      .limit(20);

    let executed = 0;
    let failed = 0;

    for (const action of pending) {
      try {
        await this.executeAction(action);

        await db.update(schema.prometheusAutonomousActions)
          .set({
            status: 'completed',
            executedAt: new Date()
          })
          .where(eq(schema.prometheusAutonomousActions.id, action.id));

        executed++;
      } catch (error) {
        await db.update(schema.prometheusAutonomousActions)
          .set({
            status: 'failed',
            metadata: sql`metadata || ${JSON.stringify({ error: String(error) })}`
          })
          .where(eq(schema.prometheusAutonomousActions.id, action.id));

        failed++;
      }
    }

    // Count pending approvals
    const pendingApprovalCount = await db.select({ count: sql<number>`count(*)` })
      .from(schema.prometheusAutonomousActions)
      .where(eq(schema.prometheusAutonomousActions.status, 'pending_approval'));

    return {
      executed,
      failed,
      pendingApproval: Number(pendingApprovalCount[0]?.count ?? 0)
    };
  }

  /**
   * Execute a specific action
   */
  private async executeAction(action: any): Promise<void> {
    switch (action.actionType) {
      case 'knowledge_update':
        await this.executeKnowledgeUpdate(action);
        break;
      case 'model_update':
        await this.executeModelUpdate(action);
        break;
      case 'notification':
        await this.executeNotification(action);
        break;
      case 'data_collection':
        await this.executeDataCollection(action);
        break;
      default:
        console.log(`Unknown action type: ${action.actionType}`);
    }
  }

  private async executeKnowledgeUpdate(action: any): Promise<void> {
    // Update knowledge graph based on action parameters
    console.log(`Executing knowledge update: ${action.description}`);
  }

  private async executeModelUpdate(action: any): Promise<void> {
    // Apply model updates
    console.log(`Executing model update: ${action.description}`);
  }

  private async executeNotification(action: any): Promise<void> {
    if (action.parameters?.childId) {
      await db.insert(schema.prometheusNotifications).values({
        childId: action.parameters.childId,
        type: action.parameters.notificationType || 'info',
        title: action.parameters.title || 'System Notification',
        message: action.description,
        priority: action.parameters.priority || 'medium',
        category: 'autonomous_action'
      });
    }
  }

  private async executeDataCollection(action: any): Promise<void> {
    // Trigger data collection process
    console.log(`Executing data collection: ${action.description}`);
  }

  /**
   * Approve a pending action
   */
  async approveAction(actionId: number, approvedBy: string): Promise<boolean> {
    const [updated] = await db.update(schema.prometheusAutonomousActions)
      .set({
        status: 'pending',
        metadata: sql`metadata || ${JSON.stringify({ approvedBy, approvedAt: new Date() })}`
      })
      .where(and(
        eq(schema.prometheusAutonomousActions.id, actionId),
        eq(schema.prometheusAutonomousActions.status, 'pending_approval')
      ))
      .returning();

    return !!updated;
  }

  /**
   * Reject a pending action
   */
  async rejectAction(actionId: number, rejectedBy: string, reason: string): Promise<boolean> {
    const [updated] = await db.update(schema.prometheusAutonomousActions)
      .set({
        status: 'rejected',
        metadata: sql`metadata || ${JSON.stringify({ rejectedBy, rejectedAt: new Date(), reason })}`
      })
      .where(and(
        eq(schema.prometheusAutonomousActions.id, actionId),
        eq(schema.prometheusAutonomousActions.status, 'pending_approval')
      ))
      .returning();

    return !!updated;
  }

  /**
   * Get action statistics
   */
  async getActionStatistics(): Promise<{
    total: number;
    byStatus: Record<string, number>;
    byType: Record<string, number>;
    successRate: number;
  }> {
    const stats = await db.select({
      status: schema.prometheusAutonomousActions.status,
      actionType: schema.prometheusAutonomousActions.actionType,
      count: sql<number>`count(*)`
    })
    .from(schema.prometheusAutonomousActions)
    .groupBy(schema.prometheusAutonomousActions.status, schema.prometheusAutonomousActions.actionType);

    const byStatus: Record<string, number> = {};
    const byType: Record<string, number> = {};
    let total = 0;
    let completed = 0;
    let failed = 0;

    for (const stat of stats) {
      const count = Number(stat.count);
      total += count;

      byStatus[stat.status || 'unknown'] = (byStatus[stat.status || 'unknown'] || 0) + count;
      byType[stat.actionType || 'unknown'] = (byType[stat.actionType || 'unknown'] || 0) + count;

      if (stat.status === 'completed') completed += count;
      if (stat.status === 'failed') failed += count;
    }

    return {
      total,
      byStatus,
      byType,
      successRate: completed + failed > 0 ? completed / (completed + failed) : 1
    };
  }
}

// Export instances
export const outcomeTracking = new OutcomeTrackingSystem();
export const feedbackProcessor = new FeedbackLoopProcessor();
export const autonomousActions = new AutonomousActionSystem();
