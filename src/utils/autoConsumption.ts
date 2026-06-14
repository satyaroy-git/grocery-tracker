import { getAutoConsumptionItems, deductQuantity, logConsumption, updateLastAutoDeduction } from '../database';
import { differenceInDays, differenceInWeeks, differenceInMonths } from 'date-fns';

export async function processAutoDeductions(): Promise<void> {
  try {
    const items = await getAutoConsumptionItems();
    const now = new Date();

    for (const item of items) {
      if (!item.autoConsumptionRate || !item.autoConsumptionFrequency) continue;
      const lastDeduction = item.lastAutoDeduction ? new Date(item.lastAutoDeduction) : new Date(item.createdAt);
      let periodsElapsed = 0;

      switch (item.autoConsumptionFrequency) {
        case 'daily': periodsElapsed = differenceInDays(now, lastDeduction); break;
        case 'weekly': periodsElapsed = differenceInWeeks(now, lastDeduction); break;
        case 'monthly': periodsElapsed = differenceInMonths(now, lastDeduction); break;
      }

      if (periodsElapsed > 0) {
        const totalDeduction = item.autoConsumptionRate * periodsElapsed;
        const actualDeduction = Math.min(totalDeduction, item.currentQuantity);
        if (actualDeduction > 0) {
          await deductQuantity(item.id, actualDeduction);
          await logConsumption(item.id, actualDeduction, 'auto', `Auto-deduction: ${item.autoConsumptionRate} ${item.unit}/${item.autoConsumptionFrequency} x ${periodsElapsed}`);
        }
        await updateLastAutoDeduction(item.id, now.toISOString());
      }
    }
  } catch (error) {
    console.error('Auto-deduction processing failed:', error);
  }
}
