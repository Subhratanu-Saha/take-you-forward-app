const pageSize = 10;
let currentPage = 1;
let totalPages = 1;
let activeRequestIdFilter = null;
let currentModalLog = null;

// DOM Elements
const activityBody = document.querySelector('#activityBody');
const statusElement = document.querySelector('#status');
const liveStatusElement = document.querySelector('#liveStatus');
const liveStatusBadge = document.querySelector('#liveStatusBadge');
const liveDot = document.querySelector('#liveDot');
const refreshSpinnerIcon = document.querySelector('#refreshSpinnerIcon');
const lastUpdatedElement = document.querySelector('#lastUpdated');
const refreshButton = document.querySelector('#refreshButton');
const filterForm = document.querySelector('#filterForm');
const resetButton = document.querySelector('#resetButton');
const exportButton = document.querySelector('#exportButton');

const getFilters = () => {
  const params = new URLSearchParams(new FormData(filterForm));

  for (const [key, value] of [...params.entries()]) {
    if (!value) params.delete(key);
  }

  return params;
};

// Filter Banner Elements
const filterBanner = document.querySelector('#filterBanner');
const filterRequestId = document.querySelector('#filterRequestId');
const clearFilterBtn = document.querySelector('#clearFilterBtn');

// Diff Modal Elements
const diffModalBackdrop = document.querySelector('#diffModalBackdrop');
const diffModal = document.querySelector('#diffModal');
const closeDiffModalBtn = document.querySelector('#closeDiffModalBtn');
const closeDiffModalBottomBtn = document.querySelector('#closeDiffModalBottomBtn');
const diffEntityBadge = document.querySelector('#diffEntityBadge');
const diffActionBadge = document.querySelector('#diffActionBadge');
const diffModalTitle = document.querySelector('#diffModalTitle');
const diffModalSubtitle = document.querySelector('#diffModalSubtitle');
const diffRequestId = document.querySelector('#diffRequestId');
const diffActor = document.querySelector('#diffActor');
const diffTimestamp = document.querySelector('#diffTimestamp');
const diffOldFields = document.querySelector('#diffOldFields');
const diffNewFields = document.querySelector('#diffNewFields');
const diffModalTraceBtn = document.querySelector('#diffModalTraceBtn');
const toggleOnlyChanged = document.querySelector('#toggleOnlyChanged');

// Tracer Modal Elements
const tracerModalBackdrop = document.querySelector('#tracerModalBackdrop');
const tracerModal = document.querySelector('#tracerModal');
const closeTracerModalBtn = document.querySelector('#closeTracerModalBtn');
const closeTracerModalBottomBtn = document.querySelector('#closeTracerModalBottomBtn');
const tracerRequestId = document.querySelector('#tracerRequestId');
const tracerCountSummary = document.querySelector('#tracerCountSummary');
const filterByThisRequestBtn = document.querySelector('#filterByThisRequestBtn');
const tracerTimeline = document.querySelector('#tracerTimeline');

// Utilities
const formatTimestamp = (value) => {
  if (!value) return '-';
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'medium',
  }).format(new Date(value));
};

const createCell = (value, className = '') => {
  const cell = document.createElement('td');
  cell.textContent = value;
  if (className) cell.className = className;
  return cell;
};

const createActionBadge = (action) => {
  const badge = document.createElement('span');
  const act = String(action || 'UNKNOWN').toUpperCase();
  badge.className = `action action-${act.toLowerCase()}`;
  badge.textContent = act;
  return badge;
};

const createActionCell = (action) => {
  const cell = document.createElement('td');
  cell.appendChild(createActionBadge(action));
  return cell;
};

// Safe JSON parser helper
const parseJsonSafe = (data) => {
  if (!data) return null;
  if (typeof data === 'object') return data;
  try {
    return JSON.parse(data);
  } catch {
    return data;
  }
};

// Formats primitive/complex diff value for display
const formatValueDisplay = (val) => {
  if (val === null || val === undefined) {
    const emptySpan = document.createElement('span');
    emptySpan.className = 'field-empty';
    emptySpan.textContent = val === null ? 'null' : 'undefined';
    return emptySpan;
  }

  const span = document.createElement('span');
  span.className = 'field-value';

  if (typeof val === 'object') {
    span.textContent = JSON.stringify(val, null, 2);
  } else {
    span.textContent = String(val);
  }

  return span;
};

// Creates a field card for side-by-side comparison
const createFieldCard = (key, value, typeClass = '') => {
  const card = document.createElement('div');
  card.className = `diff-field-card ${typeClass}`.trim();
  card.dataset.field = key;

  const label = document.createElement('span');
  label.className = 'field-name';
  label.textContent = key;

  card.appendChild(label);
  card.appendChild(formatValueDisplay(value));
  return card;
};

// Creates an empty state card when there's no data (e.g. CREATE old or DELETE new)
const createEmptyStateCard = (title, description) => {
  const stateCard = document.createElement('div');
  stateCard.className = 'diff-state-card';

  const icon = document.createElement('span');
  icon.className = 'diff-state-icon';
  icon.textContent = '∅';

  const strong = document.createElement('strong');
  strong.textContent = title;

  const desc = document.createElement('span');
  desc.textContent = description;

  stateCard.appendChild(icon);
  stateCard.appendChild(strong);
  stateCard.appendChild(desc);
  return stateCard;
};

// ==========================================================================
// Diff Modal Rendering
// ==========================================================================

const renderDiffView = () => {
  if (!currentModalLog) return;
  const log = currentModalLog;
  const action = String(log.action || 'UPDATE').toUpperCase();

  diffOldFields.replaceChildren();
  diffNewFields.replaceChildren();

  const oldValues = parseJsonSafe(log.oldvalues) || {};
  const newValues = parseJsonSafe(log.newvalues) || {};
  const changedFieldsList = Array.isArray(log.changedfields)
    ? log.changedfields
    : Object.keys(newValues);

  const changedFieldsSet = new Set(
    changedFieldsList.map((f) => String(f).toLowerCase())
  );

  const onlyChanged = toggleOnlyChanged.checked;

  if (action === 'CREATE') {
    // CREATE: No previous state; all new fields highlighted in green
    diffOldFields.appendChild(
      createEmptyStateCard(
        'Entity Created',
        'No prior values exist for this new record.'
      )
    );

    const keys = Object.keys(newValues);
    if (keys.length === 0) {
      diffNewFields.appendChild(
        createEmptyStateCard('No Attributes', 'Created with empty payload.')
      );
    } else {
      keys.forEach((key) => {
        diffNewFields.appendChild(
          createFieldCard(key, newValues[key], 'field-new-changed')
        );
      });
    }
  } else if (action === 'DELETE') {
    // DELETE: All old fields highlighted in red; no subsequent state
    const keys = Object.keys(oldValues);
    if (keys.length === 0) {
      diffOldFields.appendChild(
        createEmptyStateCard('No Attributes', 'Deleted record had no fields logged.')
      );
    } else {
      keys.forEach((key) => {
        diffOldFields.appendChild(
          createFieldCard(key, oldValues[key], 'field-old-changed')
        );
      });
    }

    diffNewFields.appendChild(
      createEmptyStateCard(
        'Entity Deleted',
        'Record was removed; no current values exist.'
      )
    );
  } else {
    // UPDATE: Compare fields side by side
    const allKeys = Array.from(
      new Set([...Object.keys(oldValues), ...Object.keys(newValues)])
    ).sort();

    let renderedCount = 0;

    allKeys.forEach((key) => {
      const lowerKey = key.toLowerCase();
      const isChanged =
        changedFieldsSet.has(lowerKey) ||
        JSON.stringify(oldValues[key]) !== JSON.stringify(newValues[key]);

      if (onlyChanged && !isChanged) {
        return; // skip unchanged fields when filter toggle is checked
      }

      renderedCount += 1;

      const oldTypeClass = isChanged ? 'field-old-changed' : 'field-unchanged';
      const newTypeClass = isChanged ? 'field-new-changed' : 'field-unchanged';

      diffOldFields.appendChild(
        createFieldCard(key, oldValues[key], oldTypeClass)
      );
      diffNewFields.appendChild(
        createFieldCard(key, newValues[key], newTypeClass)
      );
    });

    if (renderedCount === 0) {
      const noDiffOld = createEmptyStateCard('Identical State', 'No field differences detected.');
      const noDiffNew = createEmptyStateCard('Identical State', 'Uncheck "Only show changed fields" to view full record.');
      diffOldFields.appendChild(noDiffOld);
      diffNewFields.appendChild(noDiffNew);
    }
  }
};

const openDiffModal = (log) => {
  currentModalLog = log;
  const action = String(log.action || 'UPDATE').toUpperCase();

  // Header & Badges
  diffEntityBadge.textContent = log.entityname || log.entitytype || 'UNKNOWN';
  diffActionBadge.className = `action action-${action.toLowerCase()}`;
  diffActionBadge.textContent = action;

  diffModalTitle.textContent = `${log.entityname || log.entitytype || 'Entity'} Diff`;
  diffModalSubtitle.textContent = `ID: ${log.entityid || 'N/A'} • Audit Log: ${log.auditid || 'N/A'}`;

  // Metadata Bar
  diffRequestId.textContent = log.requestid || 'None';
  diffActor.textContent = log.actor || log.createdby || 'SYSTEM';
  diffTimestamp.textContent = formatTimestamp(log.createdat);

  // Trace Request button
  if (log.requestid) {
    diffModalTraceBtn.style.display = 'inline-block';
    diffModalTraceBtn.onclick = () => {
      closeDiffModal();
      openRequestTracer(log.requestid);
    };
  } else {
    diffModalTraceBtn.style.display = 'none';
  }

  // Render Diff Columns
  renderDiffView();

  // Open Modal
  diffModalBackdrop.classList.remove('hidden');
  diffModalBackdrop.setAttribute('aria-hidden', 'false');
  closeDiffModalBtn.focus();
};

const closeDiffModal = () => {
  diffModalBackdrop.classList.add('hidden');
  diffModalBackdrop.setAttribute('aria-hidden', 'true');
  currentModalLog = null;
};

// ==========================================================================
// Request Correlation Tracer Modal
// ==========================================================================

const openRequestTracer = async (requestId) => {
  if (!requestId) return;

  tracerRequestId.textContent = requestId;
  tracerCountSummary.textContent = 'Loading correlated events...';
  tracerTimeline.replaceChildren();

  tracerModalBackdrop.classList.remove('hidden');
  tracerModalBackdrop.setAttribute('aria-hidden', 'false');
  closeTracerModalBtn.focus();

  filterByThisRequestBtn.onclick = () => {
    applyRequestIdFilter(requestId);
    closeTracerModal();
  };

  try {
    const response = await fetch(
      `/api/v1/audit-logs/request/${encodeURIComponent(requestId)}`
    );

    if (!response.ok) {
      throw new Error(`Failed to load request events (HTTP ${response.status})`);
    }

    const result = await response.json();
    const events = Array.isArray(result.data) ? result.data : [];

    tracerCountSummary.textContent = `${events.length} change event${events.length === 1 ? '' : 's'} triggered in this API request`;

    if (events.length === 0) {
      const emptyCard = createEmptyStateCard('No Correlated Events', 'No audit logs found for this request ID.');
      tracerTimeline.appendChild(emptyCard);
      return;
    }

    events.forEach((evt, index) => {
      const item = document.createElement('div');
      item.className = 'tracer-item';

      const stepNode = document.createElement('div');
      stepNode.className = 'tracer-step-node';
      stepNode.textContent = String(index + 1);

      const details = document.createElement('div');
      details.className = 'tracer-item-details';

      const topRow = document.createElement('div');
      topRow.className = 'tracer-item-top';

      const entityBadge = document.createElement('span');
      entityBadge.className = 'entity-badge';
      entityBadge.textContent = evt.entityname || evt.entitytype || 'UNKNOWN';

      const entityIdSpan = document.createElement('span');
      entityIdSpan.className = 'tracer-entity-id';
      entityIdSpan.textContent = evt.entityid || 'N/A';

      const actionBadge = createActionBadge(evt.action);

      topRow.appendChild(stepNode);
      topRow.appendChild(entityBadge);
      topRow.appendChild(entityIdSpan);
      topRow.appendChild(actionBadge);

      const metaRow = document.createElement('div');
      metaRow.className = 'tracer-item-meta';

      const changedCount = Array.isArray(evt.changedfields) ? evt.changedfields.length : 0;
      let changeSummary = '';
      if (evt.action === 'CREATE') {
        changeSummary = 'New record created';
      } else if (evt.action === 'DELETE') {
        changeSummary = 'Record deleted';
      } else {
        changeSummary = changedCount > 0
          ? `Fields changed: ${evt.changedfields.join(', ')}`
          : 'Record updated';
      }

      metaRow.textContent = `${formatTimestamp(evt.createdat)} • By ${evt.actor || evt.createdby || 'SYSTEM'} • ${changeSummary}`;

      details.appendChild(topRow);
      details.appendChild(metaRow);

      const inspectBtn = document.createElement('button');
      inspectBtn.className = 'tracer-item-diff-btn';
      inspectBtn.type = 'button';
      inspectBtn.textContent = 'View Diff';
      inspectBtn.onclick = () => {
        openDiffModal(evt);
      };

      item.appendChild(details);
      item.appendChild(inspectBtn);
      tracerTimeline.appendChild(item);
    });
  } catch (error) {
    tracerCountSummary.textContent = 'Error loading request correlation.';
    const errorCard = createEmptyStateCard('Error', error.message);
    tracerTimeline.appendChild(errorCard);
  }
};

const closeTracerModal = () => {
  tracerModalBackdrop.classList.add('hidden');
  tracerModalBackdrop.setAttribute('aria-hidden', 'true');
};

const closeAllModals = () => {
  closeDiffModal();
  closeTracerModal();
};

// ==========================================================================
// Table & Dashboard Loading
// ==========================================================================

const applyRequestIdFilter = (reqId) => {
  activeRequestIdFilter = reqId;
  currentPage = 1;
  filterRequestId.textContent = reqId;
  filterBanner.classList.remove('hidden');
  loadLogs();
};

const clearRequestIdFilter = () => {
  activeRequestIdFilter = null;
  currentPage = 1;
  filterBanner.classList.add('hidden');
  loadLogs();
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

   const params = getFilters();

  params.set('page', currentPage);
  params.set('pageSize', pageSize);

  const response = await fetch(
    `/api/v1/audit-logs?${params.toString()}`);

  if (!response.ok) {
    throw new Error('Unable to load audit activity.');
  }

  const result = await response.json();
  const logs = Array.isArray(result.data) ? result.data : [];

  totalPages = result.pagination?.totalPages || 1;
  activityBody.replaceChildren();

  if (logs.length === 0) {
    const emptyRow = document.createElement('tr');
    const emptyCell = document.createElement('td');
    emptyCell.colSpan = 7;
    emptyCell.style.textAlign = 'center';
    emptyCell.style.padding = '30px';
    emptyCell.textContent = activeRequestIdFilter
      ? `No audit logs match Request ID "${activeRequestIdFilter}".`
      : 'No audit activity found.';
    emptyRow.appendChild(emptyCell);
    activityBody.appendChild(emptyRow);
  } else {
    logs.forEach((log) => {
      const row = document.createElement('tr');

      // 1. Timestamp
      row.appendChild(createCell(formatTimestamp(log.createdat)));

      // 2. Entity
      row.appendChild(createCell(log.entityname || log.entitytype || 'UNKNOWN'));

      // 3. Entity ID
      row.appendChild(createCell(log.entityid || 'UNKNOWN'));

      // 4. Action Badge
      row.appendChild(createActionCell(log.action || 'UNKNOWN'));

      // 5. Performed By
      row.appendChild(createCell(log.actor || log.createdby || 'SYSTEM'));

      // 6. Request ID (Interactive badge for single-request correlation)
      const reqCell = document.createElement('td');
      if (log.requestid) {
        const reqBtn = document.createElement('button');
        reqBtn.className = 'request-id-badge';
        reqBtn.type = 'button';
        reqBtn.title = `Trace all changes for Request ID ${log.requestid}`;
        reqBtn.textContent = log.requestid;
        reqBtn.onclick = () => openRequestTracer(log.requestid);
        reqCell.appendChild(reqBtn);
      } else {
        const emptySpan = document.createElement('span');
        emptySpan.className = 'request-id-empty';
        emptySpan.textContent = 'None';
        reqCell.appendChild(emptySpan);
      }
      row.appendChild(reqCell);

      // 7. Actions ("View Diff" button)
      const actionsCell = document.createElement('td');
      const diffBtn = document.createElement('button');
      diffBtn.className = 'view-diff-btn';
      diffBtn.type = 'button';
      diffBtn.textContent = 'View Diff';
      diffBtn.onclick = () => openDiffModal(log);
      actionsCell.appendChild(diffBtn);
      row.appendChild(actionsCell);

      activityBody.appendChild(row);
    });
  }

  pageLabel.textContent = `Page ${currentPage} of ${totalPages}`;
  previousButton.disabled = currentPage <= 1;
  nextButton.disabled = currentPage >= totalPages;

  statusElement.textContent = logs.length
    ? `${logs.length} events shown`
    : 'No audit activity found.';

  lastUpdatedElement.textContent = `Updated ${new Date().toLocaleTimeString()}`;
};

const loadDashboard = async () => {
  refreshButton.disabled = true;
  if (liveStatusBadge) liveStatusBadge.classList.add('is-refreshing');
  if (liveDot) liveDot.classList.add('hidden');
  if (refreshSpinnerIcon) refreshSpinnerIcon.classList.remove('hidden');
  liveStatusElement.textContent = 'Refreshing';
  statusElement.textContent = 'Loading activity...';

  try {
    await Promise.all([loadStats(), loadLogs()]);
    if (liveStatusBadge) liveStatusBadge.classList.remove('is-refreshing');
    if (liveDot) liveDot.classList.remove('hidden');
    if (refreshSpinnerIcon) refreshSpinnerIcon.classList.add('hidden');
    liveStatusElement.textContent = 'Live feed';
  } catch (error) {
    if (liveStatusBadge) liveStatusBadge.classList.remove('is-refreshing');
    if (liveDot) liveDot.classList.remove('hidden');
    if (refreshSpinnerIcon) refreshSpinnerIcon.classList.add('hidden');
    liveStatusElement.textContent = 'Unavailable';
    statusElement.textContent = error.message;
  } finally {
    refreshButton.disabled = false;
  }
};

// ==========================================================================
// Event Listeners
// ==========================================================================

// Pagination
previousButton.addEventListener('click', () => {
  if (currentPage > 1) {
    currentPage -= 1;
    loadLogs();
  }
});

nextButton.addEventListener('click', () => {
  if (currentPage < totalPages) {
    currentPage += 1;
    loadLogs();
  }
});

refreshButton.addEventListener('click', loadDashboard);
clearFilterBtn.addEventListener('click', clearRequestIdFilter);

// Diff Modal Controls
closeDiffModalBtn.addEventListener('click', closeDiffModal);
closeDiffModalBottomBtn.addEventListener('click', closeDiffModal);
diffModalBackdrop.addEventListener('click', (e) => {
  if (e.target === diffModalBackdrop) {
    closeDiffModal();
  }
});

// Tracer Modal Controls
closeTracerModalBtn.addEventListener('click', closeTracerModal);
closeTracerModalBottomBtn.addEventListener('click', closeTracerModal);
tracerModalBackdrop.addEventListener('click', (e) => {
  if (e.target === tracerModalBackdrop) {
    closeTracerModal();
  }
});

// Toggle only changed fields in Diff Modal
toggleOnlyChanged.addEventListener('change', renderDiffView);

// Keyboard Esc handler to close modals smoothly
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' || e.key === 'Esc') {
    closeAllModals();
  }
});

let searchTimer;

filterForm.addEventListener('input', (event) => {
  if (event.target.id !== 'searchInput') return;

  clearTimeout(searchTimer);

  searchTimer = setTimeout(() => {
    currentPage = 1;
    loadLogs();
  }, 250);
});

filterForm.addEventListener('change', () => {
  currentPage = 1;
  loadLogs();
});

resetButton.addEventListener('click', () => {
  setTimeout(() => {
    currentPage = 1;
    loadLogs();
  });
});

exportButton.addEventListener('click', () => {
  const params = getFilters();

  window.location.href =
    `/api/v1/audit-logs/export?${params.toString()}`;
});

loadDashboard();