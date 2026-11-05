import ActivityEvent from '../models/ActivityEvent.js';

// Issue fields worth showing in the timeline when they change.
const TRACKED_FIELDS = ['title', 'description', 'severity', 'wcag', 'ruleId', 'selector', 'status'];

export function recordActivity({ workspace, issue, actor, action, changes = [], meta = {} }) {
  return ActivityEvent.create({ workspace, issue, actor, action, changes, meta });
}

// Compares the issue before and after an update and returns only the fields that really changed,
// so a PATCH that resends the same values doesn't add noise to the timeline.
export function diffIssue(before, after) {
  return TRACKED_FIELDS.filter((field) => before[field] !== after[field]).map((field) => ({
    field,
    from: before[field],
    to: after[field],
  }));
}
