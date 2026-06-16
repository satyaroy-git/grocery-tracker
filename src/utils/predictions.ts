import { getAllItems, getConsumptionLogs } from '../database';
import { GroceryItemWithStatus, ConsumptionLog } from '../database/types';

export interface ReorderPrediction {
  itemId: string;
  name: string;
  daysUntilEmpty: number;
  urgency: 'critical' | 'soon' | 'ok';
}

function getUrgency(days: number): 'critical' | 'soon' | 'ok' {
  if (days <= 2) return 'critical';
  if (days <= 7) return 'soon';
  return 'ok';
}

function urgencyOrder(urgency: 'critical' | 'soon' | 'ok'): number {
  switch (urgency) {
    case 'critical': return 0;
    case 'soon': return 1;
    case 'ok': return 2;
  }
}

function estimateDaysFromLogs(item: GroceryItemWithStatus, logs: ConsumptionLog[]): number | null {
  const consumptionLogs = logs.filter(
    (log) => log.type === 'manual' || log.type === 'auto'
  );
  if (consumptionLogs.length < 2) return null;

  const sortedLogs = [...consumptionLogs].sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  );

  const firstDate = new Date(sortedLogs[0].createdAt).getTime();
  const lastDate = new Date(sortedLogs[sortedLogs.length - 1].createdAt).getTime();
  const daySpan = (lastDate - firstDate) / (1000 * 60 * 60 * 24);

  if (daySpan < 1) return null;

  const totalConsumed = consumptionLogs.reduce((sum, log) => sum + log.quantity, 0);
  const dailyRate = totalConsumed / daySpan;

  if (dailyRate <= 0) return null;

  return Math.floor(item.currentQuantity / dailyRate);
}

export async function getReorderPredictions(): Promise<ReorderPrediction[]> {
  const items = await getAllItems();
  const predictions: ReorderPrediction[] = [];

  for (const item of items) {
    if (item.currentQuantity <= 0) {
      predictions.push({
        itemId: item.id,
        name: item.name,
        daysUntilEmpty: 0,
        urgency: 'critical',
      });
      continue;
    }

    if (item.consumptionMode === 'auto' && item.autoConsumptionRate && item.autoConsumptionRate > 0) {
      let dailyRate: number;
      switch (item.autoConsumptionFrequency) {
        case 'daily': dailyRate = item.autoConsumptionRate; break;
        case 'weekly': dailyRate = item.autoConsumptionRate / 7; break;
        case 'monthly': dailyRate = item.autoConsumptionRate / 30; break;
        default: continue;
      }
      if (dailyRate <= 0) continue;

      const daysUntilEmpty = Math.floor(item.currentQuantity / dailyRate);
      predictions.push({
        itemId: item.id,
        name: item.name,
        daysUntilEmpty,
        urgency: getUrgency(daysUntilEmpty),
      });
    } else {
      const logs = await getConsumptionLogs(item.id, 30);
      const daysUntilEmpty = estimateDaysFromLogs(item, logs);
      if (daysUntilEmpty !== null) {
        predictions.push({
          itemId: item.id,
          name: item.name,
          daysUntilEmpty,
          urgency: getUrgency(daysUntilEmpty),
        });
      }
    }
  }

  predictions.sort((a, b) => {
    const orderDiff = urgencyOrder(a.urgency) - urgencyOrder(b.urgency);
    if (orderDiff !== 0) return orderDiff;
    return a.daysUntilEmpty - b.daysUntilEmpty;
  });

  return predictions;
}
