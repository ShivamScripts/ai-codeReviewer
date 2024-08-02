import { EntityManager } from 'typeorm';
import {
  addMonths,
  addDays,
  startOfYear,
  subYears,
  format,
  addYears,
} from 'date-fns';
import { EventStatus, Frequency, Months } from 'src/common/constants';
import { User } from 'src/github/entities/user.entity';
import { FilterDto } from 'src/analytics/dto/filter.dto';

export const buildQueryBuilder = (
  entityManager: EntityManager,
  userId: string,
  filter: FilterDto,
) => {
  const queryBuilder = entityManager
    .getRepository(User)
    .createQueryBuilder('user')
    .leftJoinAndSelect('user.repo', 'repo')
    .leftJoinAndSelect('repo.pullRequests', 'pullRequest')
    .where('user.githubUserId = :githubUserId', { githubUserId: userId });

  if (filter?.repoName) {
    queryBuilder.andWhere('repo.name = :name', { name: filter.repoName });
  }

  return queryBuilder;
};

export const setDateFilters = (filter: FilterDto, frequency: Frequency) => {
  let startDate: string;
  let endDate: string;
  const now = new Date();

  if (filter?.startDate && filter?.endDate) {
    const start = new Date(filter.startDate);
    const end = new Date(filter.endDate);
    start.setHours(0, 0, 0, 0);
    end.setHours(23, 59, 59, 999);
    startDate = start.toISOString();
    endDate = end.toISOString();
  } else {
    let start;
    if (frequency === Frequency.MONTH) {
      start = addMonths(now, -2);
    } else if (frequency === Frequency.YEAR) {
      start = startOfYear(subYears(now, 2));
    } else {
      start = addDays(now, -6);
    }
    start.setHours(0, 0, 0, 0);
    now.setHours(23, 59, 59, 999);
    startDate = start.toISOString();
    endDate = now.toISOString();
  }

  return { startDate, endDate };
};

export const setGroupBy = (frequency: Frequency) => {
  if (frequency === Frequency.MONTH) {
    return "TO_CHAR(event.createdAt, 'YYYY-MM')";
  } else if (frequency === Frequency.YEAR) {
    return "TO_CHAR(event.createdAt, 'YYYY')";
  }
  return "TO_CHAR(event.createdAt, 'YYYY-MM-DD')";
};

export const formatData = (
  data: { period: string; value: number }[],
  startDate: string,
  endDate: string,
  frequency: Frequency,
) => {
  const periods = generatePeriods(
    new Date(startDate),
    new Date(endDate),
    frequency,
  );

  const dataMap = new Map(data.map((entry) => [entry.period, entry.value]));

  return periods.map((period) => ({
    label:
      frequency === Frequency.MONTH
        ? Months[new Date(period).getMonth()]
        : period,
    data: dataMap.get(period) || 0,
  }));
};

export function generatePeriods(
  startDate: Date,
  endDate: Date,
  frequency: Frequency,
): string[] {
  const periods = [];
  let currentDate = startDate;

  while (currentDate <= endDate) {
    if (frequency === Frequency.MONTH) {
      periods.push(format(currentDate, 'yyyy-MM'));
      currentDate = addMonths(currentDate, 1);
    } else if (frequency === Frequency.YEAR) {
      periods.push(format(currentDate, 'yyyy'));
      currentDate = addYears(currentDate, 1);
    } else {
      periods.push(format(currentDate, 'yyyy-MM-dd'));
      currentDate = addDays(currentDate, 1);
    }
  }

  return periods;
}
