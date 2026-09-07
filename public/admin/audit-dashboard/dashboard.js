const pageSize = 10;
let currentPage = 1;
let totalPages = 1;

const activityBody = document.querySelector('#activityBody');
const statusElement = document.querySelector('#status');
const liveStatusElement = document.querySelector('#liveStatus');
const lastUpdatedElement = document.querySelector('#lastUpdated');
const refreshButton = document.querySelector('#refreshButton');

const formatTimestamp = (value) =>
  new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));

const createCell = (value, className = '') => {
  const cell = document.createElement('td');
  cell.textContent = value;
  if (className) cell.className = className;
  return cell;
};

const createActionCell = (action) => {
  const cell = document.createElement('td');
  const badge = document.createElement('span');

  badge.className = `action action-${String(action).toLowerCase()}`;
  badge.textContent = action;

  cell.appendChild(badge);
  return cell;
};

const loadStats = async () => {
  const response = await fetch('/api/v1/audit-logs/stats');

  if (!response.ok) {
    throw new Error('Unable to load audit statistics.');
  }

  const result = await response.json();

  document.querySelector('#totalEvents').textContent =
    Number(result.data.totalEvents || 0).toLocaleString();

  document.querySelector('#updatesToday').textContent =
    Number(result.data.updatesToday || 0).toLocaleString();

  document.querySelector('#deletions').textContent =
    Number(result.data.deletions || 0).toLocaleString();
};

const loadLogs = async () => {
  const response = await fetch(
    `/api/v1/audit-logs?page=${currentPage}&pageSize=${pageSize}`
  );

  if (!response.ok) {
    throw new Error('Unable to load audit activity.');
  }

  const result = await response.json();
  const logs = Array.isArray(result.data) ? result.data : [];

  totalPages = result.pagination?.totalPages || 1;
  activityBody.replaceChildren();

  logs.forEach((log) => {
    const row = document.createElement('tr');

    row.appendChild(createCell(formatTimestamp(log.createdat)));
    row.appendChild(createCell(log.entityname || 'UNKNOWN'));
    row.appendChild(createCell(log.entityid || 'UNKNOWN'));
    row.appendChild(createActionCell(log.action || 'UNKNOWN'));
    row.appendChild(createCell(log.actor || log.createdby || 'SYSTEM'));

    activityBody.appendChild(row);
  });

  document.querySelector('#pageLabel').textContent =
    `Page ${currentPage} of ${totalPages}`;

  document.querySelector('#previousButton').disabled = currentPage <= 1;
  document.querySelector('#nextButton').disabled = currentPage >= totalPages;

  statusElement.textContent = logs.length
    ? `${logs.length} events shown`
    : 'No audit activity found.';

  lastUpdatedElement.textContent =
    `Updated ${new Date().toLocaleTimeString()}`;
};

const loadDashboard = async () => {
  refreshButton.disabled = true;
  liveStatusElement.textContent = 'Refreshing';
  statusElement.textContent = 'Loading activity...';

  try {
    await Promise.all([loadStats(), loadLogs()]);
    liveStatusElement.textContent = 'Live feed';
  } catch (error) {
    liveStatusElement.textContent = 'Unavailable';
    statusElement.textContent = error.message;
  } finally {
    refreshButton.disabled = false;
  }
};

document.querySelector('#previousButton').addEventListener('click', () => {
  if (currentPage > 1) {
    currentPage -= 1;
    loadLogs();
  }
});

document.querySelector('#nextButton').addEventListener('click', () => {
  if (currentPage < totalPages) {
    currentPage += 1;
    loadLogs();
  }
});

refreshButton.addEventListener('click', loadDashboard);

loadDashboard();