import { EventName, EventStatus, StatusMessages } from 'src/common/constants';
import { FormattedData } from 'src/common/types/webhook.event.types';

export function isPayloadValid(payload: any): boolean {
  return (
    payload?.action &&
    payload?.pull_request &&
    payload?.repository &&
    payload?.sender &&
    payload?.installation
  );
}

export function createFormattedData(
  partialData: Partial<FormattedData>,
): FormattedData {
  const defaultData: FormattedData = {
    token: '',
    eventId: '',
    backendOptions: { organizationPractices: null },
    context: {
      eventName: EventName.PULL_REQUEST,
      payload: {},
      issue: { owner: '', repo: '', number: 1 },
      repo: { owner: '', repo: '' },
      sha: '',
      ref: '',
      workflow: '',
      action: '',
      actor: '',
      job: '',
      runNumber: 1,
      runId: 1,
      apiUrl: '',
      serverUrl: '',
      graphqlUrl: '',
    },
  };

  return {
    ...defaultData,
    ...partialData,
    context: {
      ...defaultData.context,
      ...partialData.context,
    },
  };
}

export function getStatusMessage(status: EventStatus): string {
  switch (status) {
    case EventStatus.PENDING:
      return StatusMessages.PENDING;
    case EventStatus.SUCCESS:
      return StatusMessages.SUCCESS;
    case EventStatus.FAILURE:
      return StatusMessages.FAILURE;
    default:
      return '';
  }
}

export function calculateOffset(page, limit) {
  page = page ? page : 1;
  limit = limit ? limit : 20;

  return (page - 1) * limit;
}
