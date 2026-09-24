const pageSize = 10;
let currentPage = 1;
let totalPages = 1;
let activeRequestIdFilter = null;
let currentModalLog = null;

// ==========================================================================
// Authentication & RBAC Session State
// ==========================================================================
const getAuthToken = () => {
  const urlParam = new URLSearchParams(window.location.search).get('token');
  if (urlParam) {
    localStorage.setItem('token', urlParam);
    const cleanUrl = window.location.pathname;
    window.history.replaceState({}, document.title, cleanUrl);
    return urlParam;
  }
  return (
    localStorage.getItem('token') ||
    localStorage.getItem('authToken') ||
    sessionStorage.getItem('token') ||
    null
  );
};

const setAuthToken = (token) => {
  localStorage.setItem('token', token);
};

const clearAuthToken = () => {
  localStorage.removeItem('token');
  localStorage.removeItem('authToken');
  sessionStorage.removeItem('token');
};

const parseJwtPayload = (token) => {
  try {
    if (!token || typeof token !== 'string') return null;
    const parts = token.split('.');
    if (parts.length < 2) return null;
    const payloadStr = atob(parts[1].replace(/-/g, '+').replace(/_/g, '/'));
    return JSON.parse(payloadStr);
  } catch {
    return null;
  }
};

const showAuthBarrierModal = (errorMsg = '') => {
  const modal = document.querySelector('#authModalBackdrop');
  const errorElem = document.querySelector('#authErrorMessage');
  if (errorElem) {
    if (errorMsg) {
      errorElem.textContent = errorMsg;
      errorElem.classList.remove('hidden');
    } else {
      errorElem.classList.add('hidden');
    }
  }
  if (modal) {
    modal.classList.remove('hidden');
    modal.setAttribute('aria-hidden', 'false');
  }
};

const hideAuthBarrierModal = () => {
  const modal = document.querySelector('#authModalBackdrop');
  if (modal) {
    modal.classList.add('hidden');
    modal.setAttribute('aria-hidden', 'true');
  }
};

const showAccessDeniedModal = (message) => {
  const modal = document.querySelector('#accessDeniedBackdrop');
  const msgElem = document.querySelector('#accessDeniedMessage');
  if (msgElem && message) msgElem.textContent = message;
  if (modal) {
    modal.classList.remove('hidden');
    modal.setAttribute('aria-hidden', 'false');
  }
};

const hideAccessDeniedModal = () => {
  const modal = document.querySelector('#accessDeniedBackdrop');
  if (modal) {
    modal.classList.add('hidden');
    modal.setAttribute('aria-hidden', 'true');
  }
};

const updateSessionUI = () => {
  const token = getAuthToken();
  const sessionBox = document.querySelector('#userSession');
  const roleBadge = document.querySelector('#userRoleBadge');
  const emailLabel = document.querySelector('#userEmailLabel');

  if (!token) {
    if (sessionBox) sessionBox.classList.add('hidden');
    return;
  }

  const payload = parseJwtPayload(token);
  if (payload) {
    if (roleBadge) roleBadge.textContent = payload.role || 'USER';
    if (emailLabel) emailLabel.textContent = payload.email || payload.userId || '';
    if (sessionBox) sessionBox.classList.remove('hidden');
  }
};

// Authenticated fetch wrapper: injects Authorization Bearer header & handles 401 / 403
const authFetch = async (url, options = {}) => {
  const token = getAuthToken();

  if (!token) {
    showAuthBarrierModal('Authentication required. Please sign in to access audit records.');
    throw new Error('Authentication required');
  }

  const headers = new Headers(options.headers || {});
  headers.set('Authorization', `Bearer ${token}`);

  const response = await fetch(url, { ...options, headers });

  if (response.status === 401) {
    clearAuthToken();
    updateSessionUI();
    showAuthBarrierModal('Session expired or invalid. Please sign in again.');
    throw new Error('Unauthorized');
  }

  if (response.status === 403) {
    const errorData = await response.json().catch(() => ({}));
    const msg =
      errorData.message ||
      'Access Denied: Your account role does not have permission to view audit diffs or security logs. SUPER_ADMIN or AUDITOR role required.';
    showAccessDeniedModal(msg);
    throw new Error('Forbidden: Insufficient permissions');
  }

  return response;
};

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
const previousButton = document.querySelector('#previousButton');
const nextButton = document.querySelector('#nextButton');
const pageLabel = document.querySelector('#pageLabel');

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

const extractRequestId = (log, fallbackId = null) => {
  if (!log && !fallbackId) return null;
  const id =
    log?.requestid ||
    log?.requestId ||
    log?.request_id ||
    log?.metadata?.requestid ||
    log?.metadata?.requestId ||
    log?.metadata?.request_id ||
    fallbackId;
  return id ? String(id).trim() : null;
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

const formatActor = (log) => {
  const meta = parseJsonSafe(log?.metadata);
  const role = meta?.userRole || log?.userRole || log?.role;
  if (role) {
    return String(role).replace(/_/g, ' ').toUpperCase();
  }
  const raw = String(log?.performedby || log?.actor || log?.createdby || 'SYSTEM');
  const match = raw.match(/\(([A-Z_]+)\)/i);
  if (match && match[1]) {
    return match[1].replace(/_/g, ' ').toUpperCase();
  }
  return raw;
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

  const oldValues = parseJsonSafe(log.oldvalues ?? log.oldervalue ?? log.oldValue) || {};
  const newValues = parseJsonSafe(log.newvalues ?? log.newvalue ?? log.newValue) || {};
  const changedFieldsList = Array.isArray(log.changedfields)
    ? log.changedfields
    : (Array.isArray(log.metadata?.changedfields) ? log.metadata.changedfields : Object.keys(newValues));

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

const openDiffModal = async (log, contextualRequestId = null) => {
  let fullLog = log;
  const action = String(log?.action || 'UPDATE').toUpperCase();

  // Header & Badges
  diffEntityBadge.textContent = log?.entityname || log?.entitytype || 'UNKNOWN';
  diffActionBadge.className = `action action-${action.toLowerCase()}`;
  diffActionBadge.textContent = action;

  diffModalTitle.textContent = `${log?.entityname || log?.entitytype || 'Entity'} Diff`;
  diffModalSubtitle.textContent = `ID: ${log?.entityid || 'N/A'} • Audit Log: ${log?.auditid || 'N/A'}`;

  // If old/new values are missing from list payload, fetch full record
  if (
    log?.auditid &&
    log.oldvalues === undefined &&
    log.newvalues === undefined &&
    log.oldervalue === undefined &&
    log.newvalue === undefined
  ) {
    try {
      const response = await authFetch(
        `/api/v1/audit-logs/${encodeURIComponent(log.auditid)}`
      );
      if (response.ok) {
        const result = await response.json();
        if (result?.data) {
          fullLog = { ...log, ...result.data };
        }
      }
    } catch (err) {
      console.warn('Could not fetch full audit log details:', err.message);
    }
  }

  currentModalLog = fullLog;

  // Metadata Bar
  const resolvedRequestId = extractRequestId(fullLog, contextualRequestId);
  diffRequestId.textContent = resolvedRequestId || 'None';
  const modalActor = formatActor(fullLog);
  diffActor.textContent = modalActor;
  if (fullLog?.actor && fullLog.actor !== modalActor) {
    diffActor.title = `User ID: ${fullLog.actor}`;
  }
  diffTimestamp.textContent = formatTimestamp(fullLog?.createdat);

  // Trace Request button
  if (resolvedRequestId) {
    diffModalTraceBtn.style.display = 'inline-block';
    diffModalTraceBtn.onclick = () => {
      closeDiffModal();
      openRequestTracer(resolvedRequestId);
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
    const response = await authFetch(
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

      metaRow.textContent = `${formatTimestamp(evt.createdat)} • By ${formatActor(evt)} • ${changeSummary}`;

      details.appendChild(topRow);
      details.appendChild(metaRow);

      const inspectBtn = document.createElement('button');
      inspectBtn.className = 'tracer-item-diff-btn';
      inspectBtn.type = 'button';
      inspectBtn.textContent = 'View Diff';
      inspectBtn.onclick = () => {
        openDiffModal(evt, requestId);
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
  if (filterRequestId) filterRequestId.textContent = reqId;
  if (filterBanner) filterBanner.classList.remove('hidden');
  loadLogs();
};

const clearRequestIdFilter = () => {
  activeRequestIdFilter = null;
  currentPage = 1;
  if (filterBanner) filterBanner.classList.add('hidden');
  loadLogs();
};

const loadStats = async () => {
  const response = await authFetch('/api/v1/audit-logs/stats');

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

  if (activeRequestIdFilter) {
    params.set('requestId', activeRequestIdFilter);
  }

  params.set('page', currentPage);
  params.set('pageSize', pageSize);

  const response = await authFetch(
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
      const actorCell = document.createElement('td');
      const actorDisplay = formatActor(log);
      actorCell.textContent = actorDisplay;
      if (log.actor && log.actor !== actorDisplay) {
        actorCell.title = `User ID: ${log.actor}`;
      }
      row.appendChild(actorCell);

      // 6. Request ID (Interactive badge for single-request correlation)
      const reqId = extractRequestId(log);
      const reqCell = document.createElement('td');
      if (reqId) {
        const reqBtn = document.createElement('button');
        reqBtn.className = 'request-id-badge';
        reqBtn.type = 'button';
        reqBtn.title = `Trace all changes for Request ID ${reqId}`;
        reqBtn.textContent = reqId;
        reqBtn.onclick = () => openRequestTracer(reqId);
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
      diffBtn.onclick = () => openDiffModal(log, reqId);
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
  updateSessionUI();
  const token = getAuthToken();
  if (!token) {
    showAuthBarrierModal('Authentication required. Please sign in to access audit records.');
    return;
  }

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
if (previousButton) {
  previousButton.addEventListener('click', () => {
    if (currentPage > 1) {
      currentPage -= 1;
      loadLogs();
    }
  });
}

if (nextButton) {
  nextButton.addEventListener('click', () => {
    if (currentPage < totalPages) {
      currentPage += 1;
      loadLogs();
    }
  });
}

if (refreshButton) {
  refreshButton.addEventListener('click', loadDashboard);
}

if (clearFilterBtn) {
  clearFilterBtn.addEventListener('click', clearRequestIdFilter);
}

// Diff Modal Controls
if (closeDiffModalBtn) {
  closeDiffModalBtn.addEventListener('click', closeDiffModal);
}
if (closeDiffModalBottomBtn) {
  closeDiffModalBottomBtn.addEventListener('click', closeDiffModal);
}
if (diffModalBackdrop) {
  diffModalBackdrop.addEventListener('click', (e) => {
    if (e.target === diffModalBackdrop) {
      closeDiffModal();
    }
  });
}

// Tracer Modal Controls
if (closeTracerModalBtn) {
  closeTracerModalBtn.addEventListener('click', closeTracerModal);
}
if (closeTracerModalBottomBtn) {
  closeTracerModalBottomBtn.addEventListener('click', closeTracerModal);
}
if (tracerModalBackdrop) {
  tracerModalBackdrop.addEventListener('click', (e) => {
    if (e.target === tracerModalBackdrop) {
      closeTracerModal();
    }
  });
}

// Toggle only changed fields in Diff Modal
if (toggleOnlyChanged) {
  toggleOnlyChanged.addEventListener('change', renderDiffView);
}

// Keyboard Esc handler to close modals smoothly
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' || e.key === 'Esc') {
    closeAllModals();
  }
});

let searchTimer;

if (filterForm) {
  filterForm.addEventListener('input', (event) => {
    if (event.target.id !== 'searchInput') return;

    clearTimeout(searchTimer);

    searchTimer = setTimeout(() => {
      currentPage = 1;
      loadLogs();
      updateExportUrl();
    }, 250);
  });

  filterForm.addEventListener('change', () => {
    currentPage = 1;
    loadLogs();
    updateExportUrl();
  });
}

const updateExportUrl = () => {
  const exportBtn = document.querySelector('#exportButton');
  if (!exportBtn) return;
  const params = getFilters();
  const qs = params.toString();
  exportBtn.href = `/api/v1/audit-logs/export${qs ? '?' + qs : ''}`;
};

if (resetButton) {
  resetButton.addEventListener('click', () => {
    if (typeof activeRequestIdFilter !== 'undefined' && activeRequestIdFilter) {
      clearRequestIdFilter();
    }
    setTimeout(() => {
      currentPage = 1;
      loadLogs();
      updateExportUrl();
    });
  });
}

if (exportButton) {
  exportButton.addEventListener('click', async (e) => {
    e.preventDefault();
    try {
      const params = getFilters();
      const qs = params.toString();
      const response = await authFetch(`/api/v1/audit-logs/export${qs ? '?' + qs : ''}`);
      if (!response.ok) {
        throw new Error(`Export failed (HTTP ${response.status})`);
      }
      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = downloadUrl;
      a.download = `audit-logs-${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(downloadUrl);
    } catch (err) {
      console.error('CSV Export Error:', err.message);
    }
  });
}

// Auth Barrier & Session Event Listeners
const authLoginForm = document.querySelector('#authLoginForm');
const signOutBtn = document.querySelector('#signOutBtn');
const accessDeniedSwitchBtn = document.querySelector('#accessDeniedSwitchBtn');

if (authLoginForm) {
  authLoginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const emailInput = document.querySelector('#authEmail');
    const passwordInput = document.querySelector('#authPassword');
    const submitBtn = document.querySelector('#authLoginBtn');
    const email = emailInput?.value?.trim();
    const password = passwordInput?.value;

    if (!email || !password) return;

    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.textContent = 'Signing in...';
    }

    try {
      const res = await fetch('/api/v1/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();
      const token = data.data?.token || data.token;

      if (!res.ok || !token) {
        showAuthBarrierModal(data.message || 'Invalid email or password.');
        return;
      }

      setAuthToken(token);
      hideAuthBarrierModal();
      hideAccessDeniedModal();
      updateSessionUI();
      loadDashboard();
    } catch (err) {
      showAuthBarrierModal(err.message || 'Failed to authenticate.');
    } finally {
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Sign In to Dashboard';
      }
    }
  });
}

if (signOutBtn) {
  signOutBtn.addEventListener('click', () => {
    clearAuthToken();
    updateSessionUI();
    showAuthBarrierModal('Signed out successfully.');
  });
}

if (accessDeniedSwitchBtn) {
  accessDeniedSwitchBtn.addEventListener('click', () => {
    clearAuthToken();
    hideAccessDeniedModal();
    updateSessionUI();
    showAuthBarrierModal('Please sign in with an authorized AUDITOR or SUPER_ADMIN account.');
  });
}

updateExportUrl();
loadDashboard();